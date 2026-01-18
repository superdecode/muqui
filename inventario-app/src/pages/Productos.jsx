import { useState } from 'react'
import { Package, Plus, Edit2, Trash2, Search, Download } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Button from '../components/common/Button'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ProductoForm from '../components/productos/ProductoForm'
import { useToastStore } from '../stores/toastStore'
import dataService from '../services/dataService'

export default function Productos() {
  const toast = useToastStore()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [categoriaFilter, setCategoriaFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selectedProducto, setSelectedProducto] = useState(null)

  // Cargar PRODUCTOS (no inventario)
  const { data: productos = [], isLoading } = useQuery({
    queryKey: ['productos'],
    queryFn: () => dataService.getProductos()
  })

  // Filtrar productos
  const filteredProductos = productos.filter(item => {
    const matchesSearch = item.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !categoriaFilter || item.categoria === categoriaFilter
    return matchesSearch && matchesCategory
  })

  // Mutation para crear producto
  const createMutation = useMutation({
    mutationFn: (data) => dataService.createProducto(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries(['productos'])
      queryClient.invalidateQueries(['inventario'])
      toast.success('Producto Creado', response.message || 'El producto se ha creado correctamente')
      handleCloseForm()
    },
    onError: (error) => {
      toast.error('Error al Crear', error.message || 'No se pudo crear el producto')
    }
  })

  // Mutation para actualizar producto
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => dataService.updateProducto(id, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries(['productos'])
      queryClient.invalidateQueries(['inventario'])
      toast.success('Producto Actualizado', response.message || 'El producto se ha actualizado correctamente')
      handleCloseForm()
    },
    onError: (error) => {
      toast.error('Error al Actualizar', error.message || 'No se pudo actualizar el producto')
    }
  })

  // Mutation para eliminar producto
  const deleteMutation = useMutation({
    mutationFn: (id) => dataService.deleteProducto(id),
    onSuccess: (response) => {
      queryClient.invalidateQueries(['productos'])
      queryClient.invalidateQueries(['inventario'])
      toast.success('Producto Eliminado', response.message || 'El producto se ha eliminado correctamente')
    },
    onError: (error) => {
      toast.error('Error al Eliminar', error.message || 'No se pudo eliminar el producto')
    }
  })

  const handleEdit = (producto) => {
    setSelectedProducto(producto)
    setShowForm(true)
  }

  const handleDelete = async (productoId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este producto?')) {
      deleteMutation.mutate(productoId)
    }
  }

  const handleSave = async (productoData) => {
    if (selectedProducto) {
      updateMutation.mutate({ id: selectedProducto.id, data: productoData })
    } else {
      createMutation.mutate(productoData)
    }
  }

  const handleExportar = () => {
    // TODO: Implementar exportación de productos
    toast.info('Exportar', 'Función de exportación en desarrollo')
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setSelectedProducto(null)
  }

  const categorias = [...new Set(productos.map(item => item.categoria))]

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-light-blue p-6 shadow-card">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Package className="text-white" size={28} />
                <h1 className="text-3xl font-bold text-white">Catálogo de Productos</h1>
              </div>
              <p className="text-white/90">Gestiona el catálogo completo de productos</p>
            </div>
            <Button
              variant="white"
              onClick={() => setShowForm(true)}
            >
              <Plus size={20} className="mr-2" />
              Nuevo Producto
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-card p-6 border border-slate-100">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              />
            </div>
          </div>

          <div className="w-full md:w-64">
            <select
              value={categoriaFilter}
              onChange={(e) => setCategoriaFilter(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            >
              <option value="">Todas las categorías</option>
              {categorias.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <Button
            variant="outline"
            className="md:w-auto"
            onClick={handleExportar}
            disabled={filteredProductos.length === 0}
          >
            <Download size={20} className="mr-2" />
            Exportar
          </Button>
        </div>

        <div className="mt-4 flex items-center gap-4 text-sm text-slate-600">
          <span className="font-medium">{filteredProductos.length} productos</span>
          {searchTerm && <span>• Búsqueda: "{searchTerm}"</span>}
          {categoriaFilter && <span>• Categoría: {categoriaFilter}</span>}
        </div>
      </div>

      {/* Products Table */}
      {isLoading ? (
        <div className="bg-white rounded-2xl shadow-card p-12">
          <LoadingSpinner text="Cargando productos..." />
        </div>
      ) : filteredProductos.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card p-12 text-center">
          <Package size={64} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No hay productos</h3>
          <p className="text-slate-600 mb-6">
            {searchTerm || categoriaFilter
              ? 'No se encontraron productos con los filtros seleccionados'
              : 'Comienza agregando tu primer producto'}
          </p>
          <Button variant="primary" onClick={() => setShowForm(true)}>
            <Plus size={20} className="mr-2" />
            Agregar Producto
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Especificación
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Unidad
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Stock Mínimo
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProductos.map((item, index) => (
                  <tr
                    key={item.id || index}
                    className="hover:bg-gradient-to-r hover:from-slate-50 hover:to-transparent transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-ocean rounded-lg">
                          <Package className="text-white" size={20} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{item.nombre}</p>
                          <p className="text-xs text-slate-500">{item.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">{item.especificacion || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">{item.unidad_medida}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-900">{item.stock_minimo || 0}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
                        {item.categoria}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        item.estado === 'ACTIVO'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {item.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                          title="Eliminar"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Product Form Modal */}
      {showForm && (
        <ProductoForm
          producto={selectedProducto}
          onClose={handleCloseForm}
          onSave={handleSave}
          isLoading={isSaving}
        />
      )}
    </div>
  )
}
