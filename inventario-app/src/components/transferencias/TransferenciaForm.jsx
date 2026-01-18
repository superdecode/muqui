import { useState } from 'react'
import Button from '../common/Button'
import Input from '../common/Input'
import Modal from '../common/Modal'
import Alert from '../common/Alert'
import { Search, Package, ArrowRight, AlertCircle } from 'lucide-react'

export default function TransferenciaForm({ onClose, onSave }) {
  const [formData, setFormData] = useState({
    origen: '',
    destino: '',
    productos: [],
    observaciones: ''
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProductos, setSelectedProductos] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Mock products for demo
  const mockProducts = [
    { id: 1, nombre: 'Laptop Dell XPS', stock: 10 },
    { id: 2, nombre: 'Mouse Logitech', stock: 25 },
    { id: 3, nombre: 'Teclado Mecánico', stock: 15 },
    { id: 4, nombre: 'Monitor 24"', stock: 8 },
    { id: 5, nombre: 'Webcam HD', stock: 30 }
  ]

  const filteredProducts = mockProducts.filter(product =>
    product.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
    if (!formData.origen) {
      setError('Por favor selecciona una ubicación de origen')
      return
    }
    if (!formData.destino) {
      setError('Por favor selecciona una ubicación de destino')
      return
    }
    if (formData.origen === formData.destino) {
      setError('La ubicación de origen y destino no pueden ser la misma')
      return
    }
    if (selectedProductos.length === 0) {
      setError('Por favor agrega al menos un producto a la transferencia')
      return
    }
    
    setLoading(true)
    try {
      await onSave({
        ...formData,
        productos: selectedProductos,
        fecha: new Date(),
        estado: 'PENDIENTE'
      })
      onClose()
    } catch (err) {
      setError('Error al crear la transferencia. Por favor intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-card max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-ocean p-6 rounded-t-2xl">
          <h2 className="text-2xl font-bold text-white">Nueva Transferencia</h2>
          <p className="text-white/90">Registra el movimiento de productos entre ubicaciones</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Ubicación Origen
              </label>
              <select
                value={formData.origen}
                onChange={(e) => setFormData({ ...formData, origen: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              >
                <option value="">Seleccionar origen</option>
                <option value="Bodega Principal">Bodega Principal</option>
                <option value="Punto de Venta 1">Punto de Venta 1</option>
                <option value="Punto de Venta 2">Punto de Venta 2</option>
                <option value="Tienda Centro">Tienda Centro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Ubicación Destino
              </label>
              <select
                value={formData.destino}
                onChange={(e) => setFormData({ ...formData, destino: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              >
                <option value="">Seleccionar destino</option>
                <option value="Bodega Principal">Bodega Principal</option>
                <option value="Punto de Venta 1">Punto de Venta 1</option>
                <option value="Punto de Venta 2">Punto de Venta 2</option>
                <option value="Tienda Centro">Tienda Centro</option>
              </select>
            </div>
          </div>

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
              <div className="mt-3 max-h-40 overflow-y-auto border border-slate-200 rounded-xl">
                {filteredProducts.map(product => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0"
                    onClick={() => handleAddProducto(product)}
                  >
                    <div className="flex items-center gap-3">
                      <Package size={20} className="text-primary-600" />
                      <div>
                        <p className="font-medium text-slate-900">{product.nombre}</p>
                        <p className="text-sm text-slate-500">Stock: {product.stock}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      Agregar
                    </Button>
                  </div>
                ))}
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
                      <p className="text-sm text-slate-500">Stock disponible: {producto.stock}</p>
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
          <div className="flex justify-end gap-4 pt-4 border-t border-slate-200">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={loading}>
              {loading ? 'Creando...' : 'Crear Transferencia'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
