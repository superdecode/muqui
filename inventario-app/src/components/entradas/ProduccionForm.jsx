import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Button from '../common/Button'
import Alert from '../common/Alert'
import LoadingSpinner from '../common/LoadingSpinner'
import { Search, Plus, X, AlertCircle, Package, Factory, ArrowRight, Trash2 } from 'lucide-react'
import dataService from '../../services/dataService'
import { useAuthStore } from '../../stores/authStore'
import { getUserAllowedUbicacionIds } from '../../utils/userFilters'
import UoMBadge from '../common/UoMBadge'

export default function ProduccionForm({ onClose, onSave, isLoading = false, editMode = false, initialData = null }) {
  const { user } = useAuthStore()
  const [formData, setFormData] = useState(initialData || {
    ubicacion_id: '',
    numero_documento: '',
    observaciones: ''
  })
  const [lineas, setLineas] = useState(initialData?.lineas || [])
  const [error, setError] = useState('')

  // Cargar ubicaciones
  const { data: todasUbicaciones = [], isLoading: isLoadingUbicaciones } = useQuery({
    queryKey: ['ubicaciones'],
    queryFn: () => dataService.getUbicaciones()
  })

  const { data: empresas = [] } = useQuery({
    queryKey: ['empresas'],
    queryFn: () => dataService.getEmpresas()
  })

  // Filtrar ubicaciones asignadas al usuario
  const ubicacionesPermitidas = todasUbicaciones.filter(ubicacion => {
    if (!user?.ubicaciones_asignadas) return false
    let ubicacionIds = []
    if (typeof user.ubicaciones_asignadas === 'string') {
      try { ubicacionIds = JSON.parse(user.ubicaciones_asignadas) } catch { ubicacionIds = user.ubicaciones_asignadas.split(',').map(id => id.trim().replace(/"/g, '')) }
    } else if (Array.isArray(user.ubicaciones_asignadas)) {
      ubicacionIds = user.ubicaciones_asignadas
    }
    return ubicacionIds.includes(ubicacion.id)
  })

  // Cargar productos
  const { data: productos = [], isLoading: isLoadingProductos } = useQuery({
    queryKey: ['productos'],
    queryFn: () => dataService.getProductos()
  })

  // Cargar unidades y equivalencias para el selector de unidad de consumo
  const { data: unidadesDB = [] } = useQuery({
    queryKey: ['config-unidades'],
    queryFn: () => dataService.getUnidadesMedida()
  })
  const { data: equivalencias = [] } = useQuery({
    queryKey: ['config-equivalencias'],
    queryFn: () => dataService.getUnitEquivalences()
  })

  // Cargar inventario de la ubicación seleccionada
  const { data: inventario = [] } = useQuery({
    queryKey: ['inventario', formData.ubicacion_id],
    queryFn: () => dataService.getInventario(formData.ubicacion_id),
    enabled: !!formData.ubicacion_id
  })

  // Helper: devuelve IDs de unidades compatibles con la unidad base de un producto
  const getCompatibleUnitIds = useMemo(() => (baseUnitId) => {
    if (!baseUnitId) return []
    const compatible = new Set([baseUnitId])
    equivalencias.forEach(eq => {
      if (eq.from_unit_id === baseUnitId) compatible.add(eq.to_unit_id)
      if (eq.to_unit_id === baseUnitId) compatible.add(eq.from_unit_id)
    })
    return [...compatible]
  }, [equivalencias])

  const getProductoStock = (productoId) => {
    const inv = inventario.find(i => String(i.producto_id) === String(productoId))
    return inv?.stock_actual || inv?.cantidad || 0
  }

  const getProductoInfo = (productoId) => {
    return productos.find(p => p.id === productoId) || null
  }

  const filterProducts = (searchTerm, excludeIds = []) => {
    if (!formData.ubicacion_id || !searchTerm) return []
    return productos
      .filter(p => {
        if (excludeIds.includes(p.id)) return false
        const ubicPermitidas = p.ubicaciones_permitidas || []
        const matchUbicacion = ubicPermitidas.length === 0 || ubicPermitidas.includes(formData.ubicacion_id)
        if (!matchUbicacion) return false
        return p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(p.id).toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.especificacion && p.especificacion.toLowerCase().includes(searchTerm.toLowerCase()))
      })
      .slice(0, 8)
      .map(p => ({ ...p, stock: getProductoStock(p.id) }))
  }

  // Line management
  const addLinea = () => {
    setLineas([...lineas, {
      id: Date.now(),
      producto_id: '',
      producto_nombre: '',
      cantidad: 1,
      searchTerm: '',
      showDropdown: false,
      insumos: [],
      insumoSearch: '',
      showInsumoDropdown: false
    }])
  }

  const removeLinea = (lineaId) => {
    setLineas(lineas.filter(l => l.id !== lineaId))
  }

  const updateLinea = (lineaId, updates) => {
    setLineas(lineas.map(l => l.id === lineaId ? { ...l, ...updates } : l))
  }

  const selectProductoProducido = (lineaId, producto) => {
    updateLinea(lineaId, {
      producto_id: producto.id,
      producto_nombre: producto.nombre,
      searchTerm: '',
      showDropdown: false
    })
  }

  // Insumo management
  const addInsumo = (lineaId, producto) => {
    setLineas(lineas.map(l => {
      if (l.id !== lineaId) return l
      if (l.insumos.find(i => i.producto_id === producto.id)) return l
      // Resolver unidad base y símbolo del producto
      const unit = unidadesDB.find(u => u.id === producto.purchase_unit_id)
      const unitSymbol = unit?.abreviatura || unit?.nombre || producto.unidad_medida || ''
      const especificacion = producto.purchase_unit_qty && unitSymbol
        ? `${producto.purchase_unit_qty} ${unitSymbol}`.trim()
        : (producto.especificacion || '')
      return {
        ...l,
        insumos: [...l.insumos, {
          producto_id: producto.id,
          producto_nombre: producto.nombre,
          cantidad: 1,
          stock: producto.stock,
          unidad_medida: unit?.nombre || producto.unidad_medida,
          purchase_unit_id: producto.purchase_unit_id,
          especificacion,
          // Forzar a elegir la unidad de consumo en BOM, sin valor por defecto
          consumption_unit_id: ''
        }],
        insumoSearch: '',
        showInsumoDropdown: false
      }
    }))
  }

  const removeInsumo = (lineaId, productoId) => {
    setLineas(lineas.map(l => {
      if (l.id !== lineaId) return l
      return { ...l, insumos: l.insumos.filter(i => i.producto_id !== productoId) }
    }))
  }

  const updateInsumoCantidad = (lineaId, productoId, cantidad) => {
    setLineas(lineas.map(l => {
      if (l.id !== lineaId) return l
      return {
        ...l,
        insumos: l.insumos.map(i =>
          i.producto_id === productoId ? { ...i, cantidad: Math.max(0.01, cantidad) } : i
        )
      }
    }))
  }

  const updateInsumoUnidad = (lineaId, productoId, consumption_unit_id) => {
    setLineas(lineas.map(l => {
      if (l.id !== lineaId) return l
      return {
        ...l,
        insumos: l.insumos.map(i =>
          i.producto_id === productoId ? { ...i, consumption_unit_id } : i
        )
      }
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.ubicacion_id) {
      setError('Por favor selecciona una ubicación de producción')
      return
    }
    if (lineas.length === 0) {
      setError('Por favor agrega al menos una línea de producción')
      return
    }
    for (const linea of lineas) {
      if (!linea.producto_id) {
        setError('Todas las líneas deben tener un producto producido seleccionado')
        return
      }
      if (linea.cantidad <= 0) {
        setError('La cantidad producida debe ser mayor a 0')
        return
      }
    }

    if (!editMode && !window.confirm('¿Confirmar orden de producción? Se creará en estado "Por Recibir" y deberá ser confirmada para afectar el inventario.')) {
      return
    }

    if (editMode && !window.confirm('¿Guardar cambios en la orden de producción?')) {
      return
    }

    const saveData = {
      tipo_entrada: 'PRODUCCION',
      tipo_movimiento: 'PRODUCCION',
      ubicacion_id: formData.ubicacion_id,
      numero_documento: formData.numero_documento,
      observaciones: formData.observaciones,
      usuario_creacion_id: user?.id || 'USR001',
      lineas: lineas.map(l => ({
        producto_id: l.producto_id,
        cantidad: parseFloat(l.cantidad),
        insumos: l.insumos.map(i => ({
          producto_id: i.producto_id,
          cantidad: parseFloat(i.cantidad)
        }))
      }))
    }

    
    try {
      await onSave(saveData)
    } catch (err) {
            setError(editMode ? 'Error al actualizar la orden de producción. Por favor intenta nuevamente.' : 'Error al crear la orden de producción. Por favor intenta nuevamente.')
    }
  }

  // Get all used product IDs for exclusion in producido selector
  const usedProducidoIds = lineas.filter(l => l.producto_id).map(l => l.producto_id)

  return (
    <form onSubmit={handleSubmit} className="space-y-6 h-full flex flex-col">
      {error && (
        <Alert type="error" className="mb-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} />
            {error}
          </div>
        </Alert>
      )}

      {/* Ubicación + Número */}
      {isLoadingUbicaciones ? (
        <div className="py-8">
          <LoadingSpinner text="Cargando ubicaciones..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Ubicación de Producción
            </label>
            <select
              value={formData.ubicacion_id}
              onChange={(e) => {
                setFormData({ ...formData, ubicacion_id: e.target.value })
                setLineas([])
              }}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value="">Seleccionar ubicación</option>
              {ubicacionesPermitidas.map(ubicacion => (
                <option key={ubicacion.id} value={ubicacion.id}>
                  {ubicacion.nombre} ({ubicacion.tipo})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Número / Nota (Opcional)
            </label>
            <input
              type="text"
              value={formData.numero_documento}
              onChange={(e) => setFormData({ ...formData, numero_documento: e.target.value })}
              placeholder="Lote, orden, referencia..."
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      )}

      {/* Líneas de Producción */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Líneas de Producción</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {lineas.length} línea{lineas.length !== 1 ? 's' : ''} de producción
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={addLinea}
            disabled={!formData.ubicacion_id}
          >
            <Plus size={16} className="mr-1" />
            Agregar Línea
          </Button>
        </div>

        {lineas.length === 0 && (
          <div className="text-center py-12 bg-slate-50 dark:bg-slate-700/50 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600">
            <Factory size={56} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600 dark:text-slate-400 font-medium mb-1">No hay líneas de producción</p>
            <p className="text-sm text-slate-500 dark:text-slate-500 mb-4">
              {formData.ubicacion_id
                ? 'Haz clic en "Agregar Línea" para comenzar'
                : 'Selecciona una ubicación primero'}
            </p>
          </div>
        )}

        {/* Líneas */}
        <div className="space-y-4 overflow-y-auto flex-1 min-h-0">
          {lineas.map((linea, lineaIndex) => {
          const productoInfo = linea.producto_id ? getProductoInfo(linea.producto_id) : null
          const insumoExcludeIds = [linea.producto_id, ...linea.insumos.map(i => i.producto_id)].filter(Boolean)

          return (
            <div key={linea.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm relative">
              {/* Header */}
              <div className="bg-gradient-to-r from-cyan-400 to-sky-500 px-4 py-2.5 flex items-center justify-between rounded-t-xl">
                <span className="text-white font-semibold text-sm flex items-center gap-2">
                  <Factory size={16} />
                  Línea {lineaIndex + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeLinea(linea.id)}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                >
                  <X size={16} className="text-white" />
                </button>
              </div>

              <div className="p-4 space-y-4 overflow-visible">
                {/* Producto Producido */}
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-green-800 dark:text-green-300 mb-3 flex items-center gap-2">
                    <Package size={16} />
                    Producto Producido (Entrada)
                  </h4>

                  {linea.producto_id ? (
                    <div className="flex items-center gap-4">
                      <div className="flex-1 flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                          <Package size={18} className="text-green-600 dark:text-green-300" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{productoInfo?.nombre || linea.producto_nombre}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 flex-wrap">
                            <span>{productoInfo?.codigo_legible || productoInfo?.id}</span>
                            <span className="text-slate-300">|</span>
                            <UoMBadge qty={productoInfo?.purchase_unit_qty} symbol={unidadesDB.find(u => u.id === productoInfo?.purchase_unit_id)?.abreviatura} unitName={unidadesDB.find(u => u.id === productoInfo?.purchase_unit_id)?.nombre || productoInfo?.unidad_medida} size="sm" />
                            <span className="text-slate-300">|</span>
                            <span>Stock: {productoInfo?.stock ?? 0}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Cantidad:</label>
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          value={linea.cantidad}
                          onChange={(e) => updateLinea(linea.id, { cantidad: Math.max(0.01, parseFloat(e.target.value) || 0) })}
                          className="w-24 px-3 py-2 border-2 border-green-300 dark:border-green-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-center font-bold focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => updateLinea(linea.id, { producto_id: '', producto_nombre: '' })}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="relative z-30">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="text"
                        placeholder="Buscar producto a producir..."
                        value={linea.searchTerm}
                        onChange={(e) => updateLinea(linea.id, { searchTerm: e.target.value, showDropdown: true })}
                        onFocus={() => updateLinea(linea.id, { showDropdown: true })}
                        onBlur={() => setTimeout(() => updateLinea(linea.id, { showDropdown: false }), 200)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                      {linea.showDropdown && linea.searchTerm && (
                        <div className="absolute z-[60] w-full mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-xl">
                          {filterProducts(linea.searchTerm, usedProducidoIds).length === 0 ? (
                            <div className="p-3 text-center text-slate-500 text-sm">No se encontraron productos</div>
                          ) : (
                            filterProducts(linea.searchTerm, usedProducidoIds).map(p => (
                              <div
                                key={p.id}
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  selectProductoProducido(linea.id, p)
                                }}
                                className="p-3 hover:bg-green-50 dark:hover:bg-green-900/20 cursor-pointer border-b last:border-b-0 border-slate-100 dark:border-slate-600"
                              >
                                <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{p.nombre}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 flex-wrap">
                                  <span>{p.codigo_legible || p.id}</span>
                                  <span className="text-slate-300">|</span>
                                  <UoMBadge qty={p.purchase_unit_qty} symbol={unidadesDB.find(u => u.id === p.purchase_unit_id)?.abreviatura} unitName={unidadesDB.find(u => u.id === p.purchase_unit_id)?.nombre || p.unidad_medida} size="sm" />
                                  <span className="text-slate-300">|</span>
                                  <span>Stock: {p.stock ?? 0}</span>
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Flecha separadora */}
                <div className="flex items-center justify-center">
                  <div className="flex items-center gap-2 text-slate-400">
                    <div className="h-px w-12 bg-slate-300"></div>
                    <span className="text-xs font-semibold uppercase tracking-wide">Consume</span>
                    <ArrowRight size={14} />
                    <div className="h-px w-12 bg-slate-300"></div>
                  </div>
                </div>

                {/* Insumos Consumidos */}
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
                  <h4 className="text-sm font-bold text-orange-800 dark:text-orange-300 mb-3 flex items-center gap-2">
                    <Package size={16} />
                    Insumos Consumidos (Salida)
                  </h4>

                  {/* Lista de insumos */}
                  {linea.insumos.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {linea.insumos.map(insumo => {
                        const insumoInfo = getProductoInfo(insumo.producto_id)
                        const stock = getProductoStock(insumo.producto_id)
                        const exceedsStock = insumo.cantidad > stock
                        const compatibleIds = getCompatibleUnitIds(insumo.purchase_unit_id)
                        const compatibleUnits = unidadesDB.filter(u => compatibleIds.includes(u.id))
                        const hasEquivalencias = compatibleUnits.length > 1
                        return (
                          <div key={insumo.producto_id} className="flex flex-col gap-2 bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                            {/* Fila superior: icono + nombre + stock + cant */}
                            <div className="flex items-center gap-3">
                              <div className="p-1.5 bg-orange-100 dark:bg-orange-800 rounded-lg flex-shrink-0">
                                <Package size={14} className="text-orange-600 dark:text-orange-300" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">{insumoInfo?.nombre || insumo.producto_nombre}</p>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  {/* Especificación: read-only */}
                                  {insumo.especificacion && (
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">{insumo.especificacion}</span>
                                  )}
                                  {/* Unidad de Medida: read-only */}
                                  {insumo.unidad_medida && (
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">{insumo.unidad_medida}</span>
                                  )}
                                  <span className="text-xs text-slate-500">Stock: {stock}</span>
                                </div>
                              </div>
                              <div className="flex flex-col items-center">
                                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Cant. Uso</span>
                                <input
                                  type="number"
                                  min="0.01"
                                  step="any"
                                  value={insumo.cantidad}
                                  title="Cantidad Uso"
                                  onChange={(e) => updateInsumoCantidad(linea.id, insumo.producto_id, parseFloat(e.target.value) || 0)}
                                  className={`w-20 px-2 py-1.5 border-2 rounded-lg text-center font-bold text-sm focus:ring-2 focus:ring-orange-500 ${
                                    exceedsStock
                                      ? 'border-red-400 bg-red-50 text-red-700'
                                      : 'border-orange-300 dark:border-orange-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                                  }`}
                                />
                              </div>
                              {hasEquivalencias ? (
                                <select
                                  value={insumo.consumption_unit_id || ''}
                                  onChange={e => updateInsumoUnidad(linea.id, insumo.producto_id, e.target.value)}
                                  className="w-24 px-2 py-1.5 border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                                >
                                  <option value="" disabled>Unid. Uso</option>
                                  {compatibleUnits.map(u => (
                                    <option key={u.id} value={u.id}>{u.abreviatura || u.nombre}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-xs text-amber-600 dark:text-amber-400 max-w-[80px] leading-tight">Solo 1 unid. conf.</span>
                              )}
                              {exceedsStock && (
                                <span className="text-xs text-red-600 font-medium">!</span>
                              )}
                              <button
                                type="button"
                                onClick={() => removeInsumo(linea.id, insumo.producto_id)}
                                className="p-1 hover:bg-red-50 rounded text-red-500" // -> Changed to eliminate the bottom row
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Buscador de insumos */}
                  <div className="relative z-10">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder="Buscar insumo a consumir..."
                      value={linea.insumoSearch}
                      onChange={(e) => updateLinea(linea.id, { insumoSearch: e.target.value, showInsumoDropdown: true })}
                      onFocus={() => updateLinea(linea.id, { showInsumoDropdown: true })}
                      onBlur={() => setTimeout(() => updateLinea(linea.id, { showInsumoDropdown: false }), 200)}
                      className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                    />
                    {linea.showInsumoDropdown && linea.insumoSearch && (
                      <div className="absolute z-50 w-full mt-1 max-h-40 overflow-y-auto bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-xl">
                        {filterProducts(linea.insumoSearch, insumoExcludeIds).length === 0 ? (
                          <div className="p-3 text-center text-slate-500 text-sm">No se encontraron productos</div>
                        ) : (
                          filterProducts(linea.insumoSearch, insumoExcludeIds).map(p => (
                            <div
                              key={p.id}
                              onMouseDown={(e) => {
                                e.preventDefault()
                                addInsumo(linea.id, p)
                              }}
                              className="p-2.5 hover:bg-orange-50 dark:hover:bg-orange-900/20 cursor-pointer border-b last:border-b-0 border-slate-100 dark:border-slate-600"
                            >
                              <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{p.nombre}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 flex-wrap">
                                <span>{p.codigo_legible || p.id}</span>
                                <span className="text-slate-300">|</span>
                                <UoMBadge qty={p.purchase_unit_qty} symbol={unidadesDB.find(u => u.id === p.purchase_unit_id)?.abreviatura} unitName={unidadesDB.find(u => u.id === p.purchase_unit_id)?.nombre || p.unidad_medida} size="sm" />
                                <span className="text-slate-300">|</span>
                                <span>Stock: {p.stock ?? 0}</span>
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {linea.insumos.length === 0 && !linea.insumoSearch && (
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-2 italic">
                      Usa el buscador para agregar los insumos que se consumen
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        </div>
      </div>

      {/* Observaciones */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Observaciones (Opcional)
        </label>
        <textarea
          value={formData.observaciones}
          onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
          placeholder="Notas adicionales sobre la producción..."
          rows={3}
          className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {/* Botones */}
      <div className="flex gap-4 mt-8 flex-shrink-0">
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          className="flex-1"
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={isLoading}
          className="flex-1"
        >
          {isLoading ? (editMode ? 'Actualizando...' : 'Registrando...') : (editMode ? 'Guardar Cambios' : 'Registrar Producción')}
        </Button>
      </div>
    </form>
  )
}
