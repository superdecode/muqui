import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Button from '../common/Button'
import Alert from '../common/Alert'
import LoadingSpinner from '../common/LoadingSpinner'
import { Package, CheckCircle, AlertCircle, X, Search, Filter } from 'lucide-react'
import dataService from '../../services/dataService'

export default function ConteoExecute({ conteo, onClose, onSave, isLoading: isSaving = false }) {
  const [productosConteo, setProductosConteo] = useState([])
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('todos') // 'todos', 'pendientes', 'contados'

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

  // Inicializar productos cuando se cargan productos e inventario
  useEffect(() => {
    if (productos.length > 0 && conteo.ubicacion_id) {
      // Filtrar productos que están asignados a esta ubicación
      const productosUbicacion = productos.filter(producto => {
        const productUbicaciones = Array.isArray(producto.ubicacion_id) 
          ? producto.ubicacion_id 
          : (producto.ubicacion_id ? producto.ubicacion_id.split(',').map(id => id.trim()) : [])
        
        return productUbicaciones.includes(conteo.ubicacion_id)
      })

      const productosIniciales = productosUbicacion.map(producto => {
        // Buscar stock actual en inventario
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
  }, [productos, inventario, conteo.ubicacion_id])

  const handleStockChange = (index, value) => {
    const newProductos = [...productosConteo]
    newProductos[index].stock_fisico = value === '' ? '' : parseInt(value)
    setProductosConteo(newProductos)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validar que todos los productos tengan stock físico
    const allFilled = productosConteo.every(p => p.stock_fisico !== '' && p.stock_fisico !== null)
    if (!allFilled) {
      setError('Por favor ingresa el stock físico de todos los productos antes de completar el conteo')
      return
    }

    // Validar que los valores sean números válidos
    const invalidValues = productosConteo.filter(p => isNaN(p.stock_fisico) || p.stock_fisico < 0)
    if (invalidValues.length > 0) {
      setError('Los valores de stock físico deben ser números positivos')
      return
    }

    // Preparar datos para enviar
    const datosConteo = {
      productos: productosConteo.map(p => ({
        producto_id: p.producto_id,
        cantidad_sistema: p.stock_sistema,
        cantidad_fisica: p.stock_fisico
      }))
    }

    try {
      await onSave(datosConteo)
    } catch (err) {
      setError('Error al completar el conteo. Por favor intenta nuevamente.')
    }
  }

  const getDiferencia = (producto) => {
    if (producto.stock_fisico === '' || producto.stock_fisico === null) return null
    return producto.stock_fisico - producto.stock_sistema
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl shadow-card-hover max-w-4xl w-full p-12">
          <LoadingSpinner text="Cargando productos para conteo..." />
        </div>
      </div>
    )
  }

  if (productosConteo.length === 0) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl shadow-card-hover max-w-2xl w-full p-8">
          <div className="text-center">
            <Package size={64} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              No hay productos en esta ubicación
            </h3>
            <p className="text-slate-600 mb-6">
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

  // Calcular estadísticas
  const totalProductos = productosConteo.length
  const productosContados = productosConteo.filter(p => p.stock_fisico !== '' && p.stock_fisico !== null).length
  const productosPendientes = totalProductos - productosContados

  // Filtrar productos
  const productosFiltrados = productosConteo.filter(producto => {
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

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-card-hover max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-ocean p-6 flex-shrink-0">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
          <div className="relative z-10 flex items-center justify-between">
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
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-slate-200 bg-white hover:border-primary-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-sm text-slate-600 font-medium">Total Productos</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{totalProductos}</p>
                  </div>
                  <Package className="text-primary-600" size={32} />
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFilterStatus('contados')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  filterStatus === 'contados'
                    ? 'border-green-500 bg-green-50'
                    : 'border-slate-200 bg-white hover:border-green-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-sm text-slate-600 font-medium">Contados</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">{productosContados}</p>
                  </div>
                  <CheckCircle className="text-green-600" size={32} />
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFilterStatus('pendientes')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  filterStatus === 'pendientes'
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-slate-200 bg-white hover:border-yellow-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-sm text-slate-600 font-medium">Pendientes</p>
                    <p className="text-3xl font-bold text-yellow-600 mt-1">{productosPendientes}</p>
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
                className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              />
            </div>

            {/* Filter Info */}
            <div className="flex items-center justify-between text-sm">
              <p className="text-slate-600">
                Mostrando <span className="font-semibold text-slate-900">{productosFiltrados.length}</span> de <span className="font-semibold">{totalProductos}</span> productos
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
                <div key={producto.producto_id} className={`bg-white rounded-lg p-3 border-2 transition-all ${
                  isCounted ? 'border-green-200 bg-green-50/30' : 'border-slate-200 hover:border-primary-300'
                }`}>
                  <div className="grid grid-cols-12 gap-3 items-center">
                    {/* Producto Info - Más compacto */}
                    <div className="col-span-5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-gradient-ocean rounded-lg flex-shrink-0">
                          <Package className="text-white" size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-900 text-sm truncate">{producto.nombre}</h4>
                          <p className="text-xs text-slate-500">{producto.producto_id} • {producto.unidad_medida}</p>
                        </div>
                      </div>
                    </div>

                    {/* Stock Sistema */}
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-500 mb-0.5">Sistema</label>
                      <div className="bg-slate-100 rounded-lg px-2 py-1.5 text-center">
                        <p className="text-base font-bold text-slate-900">{producto.stock_sistema}</p>
                      </div>
                    </div>

                    {/* Stock Físico */}
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-500 mb-0.5">Físico *</label>
                      <input
                        type="number"
                        min="0"
                        value={producto.stock_fisico}
                        onChange={(e) => handleStockChange(productoIndex, e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-center font-semibold"
                        placeholder="0"
                      />
                    </div>

                    {/* Diferencia - Inline */}
                    <div className="col-span-3">
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
                        <div className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-400 text-center">
                          <p className="text-xs font-medium">Pendiente</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
              })}
            </div>
          </div>

          {/* Botones - Fixed at bottom */}
          <div className="p-6 border-t border-slate-200 flex-shrink-0">
            <div className="flex gap-4">
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
      </div>
    </div>
  )
}
