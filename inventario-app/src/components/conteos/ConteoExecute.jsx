import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Button from '../common/Button'
import Alert from '../common/Alert'
import LoadingSpinner from '../common/LoadingSpinner'
import { Package, CheckCircle, AlertCircle, X, Search, Save, Clock, Trash2 } from 'lucide-react'
import dataService from '../../services/dataService'
import { usePermissions } from '../../hooks/usePermissions'
import { useToastStore } from '../../stores/toastStore'

export default function ConteoExecute({ conteo, onClose, onSave, isLoading: isSaving = false }) {
  const { canEdit } = usePermissions()
  const toast = useToastStore()
  const [productosConteo, setProductosConteo] = useState([])
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('todos')
  const [showPartialModal, setShowPartialModal] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)
  const [tempValues, setTempValues] = useState({}) // Valores temporales mientras se edita
  const [confirmEliminar, setConfirmEliminar] = useState(null) // Producto a confirmar eliminación
  const [eliminandoId, setEliminandoId] = useState(null)
  const autoSaveTimer = useRef(null)

  // Cargar todos los productos
  const { data: productos = [], isLoading: isLoadingProductos } = useQuery({
    queryKey: ['productos'],
    queryFn: () => dataService.getProductos()
  })

  // Cargar inventario de la ubicación del conteo
  const { data: inventario = [], isLoading: isLoadingInventario } = useQuery({
    queryKey: ['inventario', conteo.ubicacion_id],
    queryFn: () => dataService.getInventario(conteo.ubicacion_id),
    enabled: !!conteo.ubicacion_id
  })

  const isLoading = isLoadingProductos || isLoadingInventario

  // Calcular estadísticas y filtrar productos con useMemo para optimizar rendimiento
  const estadisticas = useMemo(() => {
    const totalProductos = productosConteo.length
    const productosContados = productosConteo.filter(p => p.stock_fisico !== '' && p.stock_fisico !== null).length
    const productosPendientes = totalProductos - productosContados
    const porcentajeCompletado = totalProductos > 0 ? Math.round((productosContados / totalProductos) * 100) : 0
    
    return {
      totalProductos,
      productosContados,
      productosPendientes,
      porcentajeCompletado
    }
  }, [productosConteo])

  // Filtrar productos con useMemo para optimizar rendimiento
  const productosFiltrados = useMemo(() => {
    return productosConteo.filter(producto => {
      // Filtro por búsqueda
      const matchSearch = searchTerm === '' || 
        producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(producto.producto_id).toLowerCase().includes(searchTerm.toLowerCase())
      
      // Filtro por estado
      if (filterStatus === 'pendientes') {
        return matchSearch && (producto.stock_fisico === '' || producto.stock_fisico === null)
      }
      if (filterStatus === 'contados') {
        return matchSearch && (producto.stock_fisico !== '' && producto.stock_fisico !== null)
      }
      return matchSearch
    })
  }, [productosConteo, searchTerm, filterStatus])

  // Guardar progreso en localStorage
  const saveProgress = useCallback(() => {
    if (!autoSaveEnabled || productosConteo.length === 0) return

    const progressKey = `conteo_progress_${conteo.id}`
    const progressData = {
      productos: productosConteo,
      timestamp: new Date().toISOString(),
      ubicacion_id: conteo.ubicacion_id,
      tipo_conteo: conteo.tipo_conteo
    }

    try {
      localStorage.setItem(progressKey, JSON.stringify(progressData))
      setLastSaved(new Date())
    } catch (error) {
      console.error('Error guardando progreso:', error)
    }
  }, [autoSaveEnabled, conteo.id, conteo.ubicacion_id, conteo.tipo_conteo]) // Quitamos productosConteo para evitar bucles

  // Auto-guardar cada 30 segundos
  useEffect(() => {
    if (autoSaveEnabled && productosConteo.length > 0) {
      autoSaveTimer.current = setInterval(() => {
        saveProgress()
      }, 30000) // 30 segundos

      return () => {
        if (autoSaveTimer.current) {
          clearInterval(autoSaveTimer.current)
        }
      }
    }
  }, [autoSaveEnabled, productosConteo.length]) // Only depend on length, not the whole array

  // Cargar progreso guardado o inicializar productos
  useEffect(() => {
    if (!isLoading && productos.length > 0) {
      const progressKey = `conteo_progress_${conteo.id}`
      const savedProgress = localStorage.getItem(progressKey)

      if (savedProgress) {
        try {
          const { productos: savedProductos, timestamp, ubicacion_id: savedUbic, tipo_conteo: savedTipo } = JSON.parse(savedProgress)
          // Validar que el progreso guardado corresponde al mismo conteo/tipo
          const mismoContexto = savedUbic === conteo.ubicacion_id && savedTipo === conteo.tipo_conteo
          if (mismoContexto) {
            setProductosConteo(savedProductos)
            setLastSaved(new Date(timestamp))
            return
          } else {
            console.log('⚠️ Progreso guardado no coincide con el conteo actual, regenerando...')
            localStorage.removeItem(progressKey)
          }
        } catch (error) {
          console.error('Error cargando progreso guardado:', error)
        }
      }

      // Inicializar productos filtrados por ubicación y tipo de conteo
      console.log('📅 Tipo de conteo:', conteo.tipo_conteo)

      const productosUbicacion = productos.filter(producto => {
        if (producto.estado === 'INACTIVO' || producto.estado === 'ELIMINADO') return false

        // Filtrar por ubicaciones_permitidas
        const ubicPermitidas = producto.ubicaciones_permitidas || []
        const matchUbicacion = ubicPermitidas.length === 0 || ubicPermitidas.includes(conteo.ubicacion_id)

        // Filtrar por frecuencia_inventario (tipo de conteo)
        const frecuencia = (producto.frecuencia_inventario || '').toLowerCase()
        const tipoConteo = (conteo.tipo_conteo || '').toLowerCase()
        // El producto aparece si coincide el tipo O si el producto es "Todos los conteos"
        // Si tiene frecuencia específica, solo aparece en ese tipo
        // Si el producto es "todos", aparece en todos los conteos
        // Si el conteo es "todos", aparecen todos los productos con tipo
        const matchFrecuencia = frecuencia === tipoConteo || frecuencia === 'todos' || tipoConteo === 'todos'

        const pasaFiltro = matchUbicacion && matchFrecuencia

        if (pasaFiltro || !matchFrecuencia) {
          return producto
        }

        return pasaFiltro
      })

      
      const productosIniciales = productosUbicacion.map(producto => {
        const inventarioItem = inventario.find(inv => String(inv.producto_id) === String(producto.id))

        return {
          producto_id: producto.id,
          nombre: producto.nombre,
          especificacion: producto.especificacion || '',
          stock_sistema: inventarioItem?.stock_actual || 0,
          stock_fisico: '',
          unidad_medida: producto.unidad_medida
        }
      })

      setProductosConteo(productosIniciales)
    }
  }, [isLoading, productos, inventario, conteo.ubicacion_id, conteo.tipo_conteo]) // Agregado tipo_conteo para evitar inconsistencias

  // Función para mostrar modal de confirmación de eliminación
  const handleEliminarProducto = (productoId) => {
    const producto = productosConteo.find(p => p.producto_id === productoId)
    if (!producto) return
    setConfirmEliminar(producto)
  }

  // Función para confirmar y ejecutar la eliminación
  const confirmarEliminacion = async () => {
    if (!confirmEliminar) return
    
    const productoId = confirmEliminar.producto_id
    const productoNombre = confirmEliminar.nombre
    setEliminandoId(productoId)
    
    try {
      // Buscar si ya existe un detalle para este producto en la base de datos
      const detalles = await dataService.getDetalleConteos(conteo.id)
      const detalleExistente = detalles.find(d => d.producto_id === productoId)
      
      // Si existe un detalle, eliminarlo de la base de datos
      if (detalleExistente) {
        await dataService.deleteDetalleConteo(detalleExistente.id)
      }
      
      // Eliminar del estado local
      setProductosConteo(prev => prev.filter(p => p.producto_id !== productoId))
      
      // Limpiar valor temporal si existe
      setTempValues(prev => {
        const newTemp = { ...prev }
        delete newTemp[productoId]
        return newTemp
      })
      
      // Guardar progreso después de eliminar
      saveProgress()
      
      // Mostrar notificación de éxito
      toast.success('Producto Eliminado', `"${productoNombre}" ha sido eliminado del conteo`)
      
      setConfirmEliminar(null)
      setEliminandoId(null)
    } catch (error) {
      console.error('❌ Error eliminando producto:', error)
      const errorMsg = error.message || 'No se pudo eliminar el producto'
      setError(errorMsg)
      toast.error('Error al Eliminar', errorMsg)
      setEliminandoId(null)
    }
  }

  // Temporal onChange solo para actualizar UI (no afecta filtros)
  const handleStockChange = (productoId, value) => {
    setTempValues(prev => ({ ...prev, [productoId]: value }))
  }

  // Manejar cambio de stock con onBlur (actualiza valores reales y afecta filtros)
  const handleStockBlur = (index, productoId, value) => {
    const newProductos = [...productosConteo]
    newProductos[index].stock_fisico = value === '' ? '' : parseInt(value)
    setProductosConteo(newProductos)

    // Limpiar valor temporal
    setTempValues(prev => {
      const newTemp = { ...prev }
      delete newTemp[productoId]
      return newTemp
    })

    saveProgress() // Guardar al perder foco
  }

  // Obtener el valor a mostrar (temporal si existe, sino el real)
  const getDisplayValue = (producto) => {
    if (tempValues[producto.producto_id] !== undefined) {
      return tempValues[producto.producto_id]
    }
    return producto.stock_fisico
  }

  // Completar conteo COMPLETO (todos los productos)
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const allFilled = productosConteo.every(p => p.stock_fisico !== '' && p.stock_fisico !== null)
    if (!allFilled) {
      setError('Por favor ingresa el stock físico de todos los productos antes de completar el conteo')
      return
    }

    const invalidValues = productosConteo.filter(p => isNaN(p.stock_fisico) || p.stock_fisico < 0)
    if (invalidValues.length > 0) {
      setError('Los valores de stock físico deben ser números positivos')
      return
    }

    const datosConteo = {
      estado: 'COMPLETADO',
      productos: productosConteo.map(p => ({
        producto_id: p.producto_id,
        cantidad_sistema: p.stock_sistema,
        cantidad_fisica: parseInt(p.stock_fisico)
      }))
    }

    try {
      await onSave(datosConteo)
      // Limpiar progreso guardado
      localStorage.removeItem(`conteo_progress_${conteo.id}`)
    } catch (err) {
      setError('Error al completar el conteo. Por favor intenta nuevamente.')
    }
  }

  // Finalizar conteo PARCIAL
  const handlePartialSubmit = async () => {
    const productosContados = productosConteo.filter(p => p.stock_fisico !== '' && p.stock_fisico !== null)

    if (productosContados.length === 0) {
      setError('Debes contar al menos un producto para finalizar el conteo parcialmente')
      setShowPartialModal(false)
      return
    }

    const datosConteo = {
      estado: 'PARCIALMENTE_COMPLETADO',
      productos: productosContados.map(p => ({
        producto_id: p.producto_id,
        cantidad_sistema: p.stock_sistema,
        cantidad_fisica: parseInt(p.stock_fisico)
      }))
    }

    try {
      await onSave(datosConteo)
      localStorage.removeItem(`conteo_progress_${conteo.id}`)
      setShowPartialModal(false)
    } catch (err) {
      setError('Error al finalizar el conteo parcial. Por favor intenta nuevamente.')
      setShowPartialModal(false)
    }
  }

  const getDiferencia = (producto) => {
    if (producto.stock_fisico === '' || producto.stock_fisico === null) return null
    return parseInt(producto.stock_fisico) - producto.stock_sistema
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-card-hover max-w-4xl w-full p-12">
          <LoadingSpinner text="Cargando productos para conteo..." />
        </div>
      </div>
    )
  }

  if (productosConteo.length === 0) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-card-hover max-w-2xl w-full p-8">
          <div className="text-center">
            <Package size={64} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
              No hay productos en esta ubicación
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              No se encontraron productos en el inventario de {conteo.ubicacion || 'esta ubicación'}.
            </p>
            <Button variant="ghost" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-card-hover max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-ocean p-6 flex-shrink-0">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Ejecutar Conteo</h2>
                <p className="text-white/90">{conteo.ubicacion || conteo.ubicacion_id} - {conteo.tipo_conteo}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
              >
                <X className="text-white" size={24} />
              </button>
            </div>
          </div>
        </div>

        {/* Indicador de Progreso */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Package className="text-white" size={20} />
              <span className="text-white font-semibold">
                {estadisticas.productosContados}/{estadisticas.totalProductos} productos contados
              </span>
            </div>
            <span className="text-white font-bold text-xl">{estadisticas.porcentajeCompletado}%</span>
          </div>
          <div className="w-full bg-white/30 rounded-full h-3 overflow-hidden">
            <div
              className="bg-white h-full rounded-full transition-all duration-300 shadow-lg"
              style={{ width: `${estadisticas.porcentajeCompletado}%` }}
            />
          </div>
          {lastSaved && (
            <div className="flex items-center gap-1 mt-2 text-white/90 text-xs">
              <Clock size={12} />
              <span>Último guardado: {lastSaved.toLocaleTimeString()}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-6 space-y-4 flex-shrink-0">
            {/* Error Alert */}
            {error && (
              <Alert type="error" onClose={() => setError('')}>
                <div className="flex items-center gap-2">
                  <AlertCircle size={18} />
                  {error}
                </div>
              </Alert>
            )}

            {/* Summary Badges */}
            <div className="grid grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setFilterStatus('todos')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  filterStatus === 'todos'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Total Productos</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{estadisticas.totalProductos}</p>
                  </div>
                  <Package className="text-primary-600" size={32} />
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFilterStatus('contados')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  filterStatus === 'contados'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-green-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Contados</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">{estadisticas.productosContados}</p>
                  </div>
                  <CheckCircle className="text-green-600" size={32} />
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFilterStatus('pendientes')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  filterStatus === 'pendientes'
                    ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-yellow-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Pendientes</p>
                    <p className="text-3xl font-bold text-yellow-600 mt-1">{estadisticas.productosPendientes}</p>
                  </div>
                  <AlertCircle className="text-yellow-600" size={32} />
                </div>
              </button>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Buscar producto por nombre o ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              />
            </div>

            {/* Filter Info */}
            <div className="flex items-center justify-between text-sm">
              <p className="text-slate-600 dark:text-slate-400">
                Mostrando <span className="font-semibold text-slate-900 dark:text-slate-100">{productosFiltrados.length}</span> de <span className="font-semibold">{estadisticas.totalProductos}</span> productos
              </p>
              {filterStatus !== 'todos' && (
                <button
                  type="button"
                  onClick={() => setFilterStatus('todos')}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>

          {/* Lista de Productos - Scrollable */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <div className="space-y-3">
              {productosFiltrados.map((producto, index) => {
              const productoIndex = productosConteo.findIndex(p => p.producto_id === producto.producto_id)
              const diferencia = getDiferencia(producto)
              const isNegative = diferencia !== null && diferencia < 0
              const isPositive = diferencia !== null && diferencia > 0
              const isCounted = producto.stock_fisico !== '' && producto.stock_fisico !== null

              return (
                <div key={producto.producto_id} className={`bg-white dark:bg-slate-800 rounded-lg p-3 border-2 transition-all ${
                  isCounted ? 'border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-900/10' : 'border-slate-200 dark:border-slate-700 hover:border-primary-300'
                }`}>
                  <div className="grid grid-cols-12 gap-3 items-center">
                    {/* Producto Info - Más compacto */}
                    <div className="col-span-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-gradient-ocean rounded-lg flex-shrink-0">
                          <Package className="text-white" size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">{producto.nombre}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{producto.producto_id} • {producto.unidad_medida}</p>
                        </div>
                      </div>
                    </div>

                    {/* Stock Sistema */}
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">Sistema</label>
                      <div className="bg-slate-100 dark:bg-slate-700 rounded-lg px-2 py-1.5 text-center">
                        <p className="text-base font-bold text-slate-900 dark:text-slate-100">{producto.stock_sistema}</p>
                      </div>
                    </div>

                    {/* Stock Físico */}
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">Físico *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        data-conteo-index={index}
                        value={getDisplayValue(producto)}
                        onChange={(e) => handleStockChange(producto.producto_id, e.target.value)}
                        onBlur={(e) => handleStockBlur(productoIndex, producto.producto_id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            const nextInput = document.querySelector(`[data-conteo-index="${index + 1}"]`)
                            if (nextInput) nextInput.focus()
                          }
                        }}
                        className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-center font-semibold"
                        placeholder="0"
                      />
                    </div>

                    {/* Diferencia - Inline */}
                    <div className="col-span-2">
                      {diferencia !== null ? (
                        <div className={`px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 ${
                          isNegative ? 'bg-red-100 text-red-700' :
                          isPositive ? 'bg-green-100 text-green-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {isNegative ? (
                            <AlertCircle size={14} />
                          ) : (
                            <CheckCircle size={14} />
                          )}
                          <p className="text-sm font-bold">
                            {diferencia > 0 ? '+' : ''}{diferencia}
                          </p>
                        </div>
                      ) : (
                        <div className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-400 text-center">
                          <p className="text-xs font-medium">Pendiente</p>
                        </div>
                      )}
                    </div>

                    {/* Botón Eliminar - Solo con permisos de escritura */}
                    {canEdit('conteos') && (
                      <div className="col-span-2">
                        <button
                          type="button"
                          onClick={() => handleEliminarProducto(producto.producto_id)}
                          className="w-full p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center justify-center"
                          title="Eliminar del conteo"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
              })}
            </div>
          </div>

          {/* Botones - Fixed at bottom */}
          <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
            <div className="flex gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="flex-1"
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="warning"
                onClick={() => setShowPartialModal(true)}
                className="flex-1"
                disabled={isSaving || estadisticas.productosContados === 0}
              >
                <Save size={20} className="mr-2" />
                Finalizar Parcial
              </Button>
              <Button
                type="submit"
                variant="success"
                loading={isSaving}
                className="flex-1"
              >
                <CheckCircle size={20} className="mr-2" />
                {isSaving ? 'Completando...' : 'Completar Conteo'}
              </Button>
            </div>
          </div>
        </form>

        {/* Modal de Confirmación para Conteo Parcial */}
        {showPartialModal && (
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-10 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-yellow-100 rounded-full">
                  <AlertCircle className="text-yellow-600" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                    Finalizar Conteo Parcial
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                    Has contado <span className="font-bold text-green-600">{estadisticas.productosContados}</span> de{' '}
                    <span className="font-bold">{estadisticas.totalProductos}</span> productos{' '}
                    (<span className="font-bold">{estadisticas.porcentajeCompletado}%</span> completado).
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                    <span className="font-bold text-yellow-600">{estadisticas.productosPendientes}</span> productos quedarán pendientes.
                  </p>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
                    <p className="text-sm text-yellow-800">
                      <strong>⚠️ Nota:</strong> Los productos no contados mantendrán su stock actual del sistema.
                      Podrás completar el conteo más tarde o crear uno nuevo.
                    </p>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 font-medium">
                    ¿Deseas finalizar este conteo como parcial?
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowPartialModal(false)}
                  className="flex-1"
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="warning"
                  onClick={handlePartialSubmit}
                  loading={isSaving}
                  className="flex-1"
                >
                  {isSaving ? 'Finalizando...' : 'Confirmar'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmación para eliminar producto */}
        {confirmEliminar && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full flex-shrink-0">
                  <Trash2 className="text-red-600" size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                    Eliminar producto del conteo
                  </h3>
                  <p className="text-slate-700 dark:text-slate-300 font-medium mb-2">
                    {confirmEliminar.nombre}
                    {confirmEliminar.especificacion && (
                      <span className="text-sm text-slate-500 dark:text-slate-400 ml-2">
                        ({confirmEliminar.especificacion})
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Elimina este producto si no corresponde a la frecuencia de conteo configurada o a la empresa. Puedes ajustar su configuración en el módulo <strong>Productos</strong>.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button
                  variant="ghost"
                  onClick={() => setConfirmEliminar(null)}
                  className="flex-1"
                  disabled={eliminandoId !== null}
                >
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  onClick={confirmarEliminacion}
                  loading={eliminandoId !== null}
                  className="flex-1"
                >
                  {eliminandoId !== null ? 'Eliminando...' : 'Eliminar'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
