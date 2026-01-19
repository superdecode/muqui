import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Button from '../common/Button'
import Input from '../common/Input'
import Alert from '../common/Alert'
import LoadingSpinner from '../common/LoadingSpinner'
import { Search, Package, ArrowRight, AlertCircle, X } from 'lucide-react'
import dataService from '../../services/dataService'
import { useAuthStore } from '../../stores/authStore'

export default function TransferenciaForm({ onClose, onSave, isLoading = false }) {
  const { user } = useAuthStore()
  const [formData, setFormData] = useState({
    origen_id: '',
    destino_id: '',
    observaciones: ''
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProductos, setSelectedProductos] = useState([])
  const [error, setError] = useState('')

  // Cargar ubicaciones desde la base de datos
  const { data: todasUbicaciones = [], isLoading: isLoadingUbicaciones } = useQuery({
    queryKey: ['ubicaciones'],
    queryFn: () => dataService.getUbicaciones()
  })

  // Filtrar ubicaciones asignadas al usuario
  const ubicaciones = todasUbicaciones.filter(ubicacion => {
    if (!user?.ubicaciones_asignadas) return false
    
    let ubicacionIds = []
    if (typeof user.ubicaciones_asignadas === 'string') {
      try {
        ubicacionIds = JSON.parse(user.ubicaciones_asignadas)
      } catch {
        ubicacionIds = user.ubicaciones_asignadas.split(',').map(id => id.trim().replace(/"/g, ''))
      }
    } else if (Array.isArray(user.ubicaciones_asignadas)) {
      ubicacionIds = user.ubicaciones_asignadas
    }
    
    return ubicacionIds.includes(ubicacion.id)
  })

  // Cargar productos desde la base de datos
  const { data: productos = [], isLoading: isLoadingProductos } = useQuery({
    queryKey: ['productos'],
    queryFn: () => dataService.getProductos()
  })

  // Cargar inventario de la ubicación origen para obtener stock disponible
  const { data: inventarioOrigen = [] } = useQuery({
    queryKey: ['inventario', formData.origen_id],
    queryFn: () => dataService.getInventario(formData.origen_id),
    enabled: !!formData.origen_id
  })

  // Filtrar productos por búsqueda y agregar stock disponible
  const filteredProducts = productos
    .filter(product => {
      // Verificar que el producto esté asignado a la ubicación de origen
      if (!formData.origen_id) return false
      
      // product.ubicacion_id es un array de ubicaciones
      const productUbicaciones = Array.isArray(product.ubicacion_id) 
        ? product.ubicacion_id 
        : (product.ubicacion_id ? product.ubicacion_id.split(',').map(id => id.trim()) : [])
      
      if (!productUbicaciones.includes(formData.origen_id)) return false
      
      // Filtrar por búsqueda
      return product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(product.id).toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.especificacion && product.especificacion.toLowerCase().includes(searchTerm.toLowerCase()))
    })
    .map(product => {
      // Convertir IDs a string para comparación
      const inventarioItem = inventarioOrigen.find(inv => String(inv.producto_id) === String(product.id))
      return {
        ...product,
        stock: inventarioItem?.stock_actual || 0
      }
    })

  const handleAddProducto = (producto) => {
    if (!selectedProductos.find(p => p.id === producto.id)) {
      setSelectedProductos([...selectedProductos, { ...producto, cantidad: 1 }])
    }
  }

  const handleRemoveProducto = (productoId) => {
    setSelectedProductos(selectedProductos.filter(p => p.id !== productoId))
  }

  const handleCantidadChange = (productoId, cantidad) => {
    setSelectedProductos(selectedProductos.map(p =>
      p.id === productoId ? { ...p, cantidad: Math.max(1, cantidad) } : p
    ))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validaciones
    if (!formData.origen_id) {
      setError('Por favor selecciona una ubicación de origen')
      return
    }
    if (!formData.destino_id) {
      setError('Por favor selecciona una ubicación de destino')
      return
    }
    if (formData.origen_id === formData.destino_id) {
      setError('La ubicación de origen y destino no pueden ser la misma')
      return
    }
    if (selectedProductos.length === 0) {
      setError('Por favor agrega al menos un producto a la transferencia')
      return
    }

    // Validar que los productos estén asignados a la ubicación destino
    const productosNoAsignados = selectedProductos.filter(producto => {
      const productoCompleto = productos.find(p => p.id === producto.id)
      if (!productoCompleto) return true
      
      const productUbicaciones = Array.isArray(productoCompleto.ubicacion_id) 
        ? productoCompleto.ubicacion_id 
        : (productoCompleto.ubicacion_id ? productoCompleto.ubicacion_id.split(',').map(id => id.trim()) : [])
      
      return !productUbicaciones.includes(formData.destino_id)
    })

    if (productosNoAsignados.length > 0) {
      const nombresProductos = productosNoAsignados.map(p => p.nombre).join(', ')
      setError(`ALERTA: Los siguientes productos no están asignados a la ubicación destino: ${nombresProductos}. No se puede completar la transferencia.`)
      return
    }

    try {
      await onSave({
        ...formData,
        productos: selectedProductos.map(p => ({
          producto_id: p.id,
          cantidad: p.cantidad
        }))
      })
    } catch (err) {
      setError('Error al crear la transferencia. Por favor intenta nuevamente.')
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-card-hover max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-ocean p-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Nueva Transferencia</h2>
              <p className="text-white/90">Crear movimiento entre ubicaciones</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors"
            >
              <X className="text-white" size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] space-y-6">
          {/* Error Alert */}
          {error && (
            <Alert type="error" className="mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle size={18} />
                {error}
              </div>
            </Alert>
          )}

          {/* Ubicaciones */}
          {isLoadingUbicaciones ? (
            <div className="py-8">
              <LoadingSpinner text="Cargando ubicaciones..." />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Ubicación Origen
                </label>
                <select
                  value={formData.origen_id}
                  onChange={(e) => {
                    setFormData({ ...formData, origen_id: e.target.value })
                    setSelectedProductos([]) // Limpiar productos seleccionados al cambiar origen
                  }}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                >
                  <option value="">Seleccionar origen</option>
                  {ubicaciones.map(ubicacion => (
                    <option key={ubicacion.id} value={ubicacion.id}>
                      {ubicacion.nombre} ({ubicacion.tipo})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Ubicación Destino
                </label>
                <select
                  value={formData.destino_id}
                  onChange={(e) => setFormData({ ...formData, destino_id: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                >
                  <option value="">Seleccionar destino</option>
                  {ubicaciones.map(ubicacion => (
                    <option key={ubicacion.id} value={ubicacion.id}>
                      {ubicacion.nombre} ({ubicacion.tipo})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Buscar productos */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Buscar Productos
            </label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Buscar productos para transferir..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Lista de productos */}
            {searchTerm && (
              <div className="mt-3 max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
                {!formData.origen_id ? (
                  <div className="p-4 text-center text-slate-600">
                    <AlertCircle size={20} className="mx-auto mb-2" />
                    <p className="text-sm">Selecciona una ubicación de origen primero</p>
                  </div>
                ) : isLoadingProductos ? (
                  <div className="p-4">
                    <LoadingSpinner text="Cargando productos..." />
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="p-4 text-center text-slate-600">
                    <Package size={20} className="mx-auto mb-2" />
                    <p className="text-sm">No se encontraron productos con stock disponible</p>
                  </div>
                ) : (
                  filteredProducts.map(product => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0"
                      onClick={() => handleAddProducto(product)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Package size={20} className="text-primary-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">{product.nombre}</p>
                          <p className="text-xs text-slate-500 truncate">
                            ID: {product.id} | {product.especificacion || 'Sin especificación'}
                          </p>
                          <p className="text-sm text-slate-600">Stock: {product.stock} {product.unidad_medida}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="flex-shrink-0">
                        Agregar
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Productos seleccionados */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Productos a Transferir
            </label>
            {selectedProductos.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl">
                <Package size={48} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-600">No hay productos seleccionados</p>
                <p className="text-sm text-slate-500">Busca y agrega productos arriba</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedProductos.map(producto => (
                  <div key={producto.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                    <Package size={20} className="text-primary-600" />
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{producto.nombre}</p>
                      <p className="text-xs text-slate-500">ID: {producto.id} | {producto.especificacion || 'Sin especificación'}</p>
                      <p className="text-sm text-slate-600">Stock disponible: {producto.stock} {producto.unidad_medida}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-slate-600">Cantidad:</label>
                      <input
                        type="number"
                        min="1"
                        max={producto.stock}
                        value={producto.cantidad}
                        onChange={(e) => handleCantidadChange(producto.id, parseInt(e.target.value))}
                        className="w-20 px-2 py-1 border border-slate-300 rounded-lg text-center"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleRemoveProducto(producto.id)}
                    >
                      Eliminar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Observaciones (Opcional)
            </label>
            <textarea
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              placeholder="Notas adicionales sobre la transferencia..."
              rows={3}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Botones */}
          <div className="flex gap-4 mt-8">
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
              {isLoading ? 'Creando...' : 'Crear Transferencia'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
