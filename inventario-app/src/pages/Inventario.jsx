import { useState } from 'react'
import { Package, Plus, Edit2, Trash2, Search, Filter, Download } from 'lucide-react'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ProductoForm from '../components/productos/ProductoForm'
import useInventario from '../hooks/useInventario'
import { useToastStore } from '../stores/toastStore'
import { useQueryClient } from '@tanstack/react-query'
import dataService from '../services/dataService'
import { exportInventarioToCSV } from '../utils/exportUtils'

export default function Inventario() {
  const { inventario, isLoading } = useInventario()
  const toast = useToastStore()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [categoriaFilter, setCategoriaFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selectedProducto, setSelectedProducto] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  // Filtrar inventario
  const filteredInventario = inventario?.filter(item => {
    const matchesSearch = item.producto?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !categoriaFilter || item.categoria === categoriaFilter
    return matchesSearch && matchesCategory
  }) || []

  const handleEdit = (producto) => {
    setSelectedProducto(producto)
    setShowForm(true)
  }

  const handleDelete = async (productoId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este producto?')) {
      try {
        setIsSaving(true)
        const response = await dataService.deleteProducto(productoId)

        if (response.success) {
          toast.success('Producto Eliminado', response.message || 'El producto se ha eliminado correctamente')
          queryClient.invalidateQueries(['inventario'])
          queryClient.invalidateQueries(['productos'])
        } else {
          toast.error('Error al Eliminar', response.message || 'No se pudo eliminar el producto')
        }
      } catch (error) {
        toast.error('Error al Eliminar', error.message || 'No se pudo eliminar el producto. Intenta nuevamente.')
      } finally {
        setIsSaving(false)
      }
    }
  }

  const handleSave = async (productoData) => {
    try {
      setIsSaving(true)
      let response

      if (selectedProducto) {
        // Actualizar producto existente
        response = await dataService.updateProducto(selectedProducto.id, productoData)
        if (response.success) {
          toast.success('Producto Actualizado', response.message || 'El producto se ha actualizado correctamente')
        }
      } else {
        // Crear nuevo producto
        response = await dataService.createProducto(productoData)
        if (response.success) {
          toast.success('Producto Creado', response.message || 'El producto se ha creado correctamente')
        }
      }

      if (response.success) {
        queryClient.invalidateQueries(['inventario'])
        queryClient.invalidateQueries(['productos'])
        handleCloseForm()
      } else {
        toast.error('Error al Guardar', response.message || 'No se pudo guardar el producto')
      }
    } catch (error) {
      toast.error('Error al Guardar', error.message || 'No se pudo guardar el producto. Intenta nuevamente.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleExportar = () => {
    try {
      exportInventarioToCSV(filteredInventario)
      toast.success('Exportación Exitosa', 'El inventario se ha exportado a CSV correctamente')
    } catch (error) {
      toast.error('Error al Exportar', error.message || 'No se pudo exportar el inventario')
    }
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setSelectedProducto(null)
  }

  const getStockBadge = (stockActual, stockMinimo) => {
    if (stockActual === 0) {
      return (
        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-500 text-white shadow-soft">
          SIN STOCK
        </span>
      )
    } else if (stockActual <= stockMinimo) {
      return (
        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-500 text-white shadow-soft">
          BAJO
        </span>
      )
    } else {
      return (
        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-500 text-white shadow-soft">
          OK
        </span>
      )
    }
  }

  const categorias = [...new Set(inventario?.map(item => item.categoria) || [])]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-ocean p-4 shadow-card">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-24 -mt-24"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Package className="text-white" size={24} />
                <h1 className="text-2xl font-bold text-white">Gestión de Productos</h1>
              </div>
              <p className="text-white/90 text-sm">Administra tu catálogo de productos</p>
            </div>
            <Button
              variant="secondary"
              onClick={() => setShowForm(true)}
              className="bg-white/20 hover:bg-white/30 text-white border-0"
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
            disabled={filteredInventario.length === 0}
          >
            <Download size={20} className="mr-2" />
            Exportar
          </Button>
        </div>

        <div className="mt-4 flex items-center gap-4 text-sm text-slate-600">
          <span className="font-medium">{filteredInventario.length} productos</span>
          {searchTerm && <span>• Búsqueda: "{searchTerm}"</span>}
          {categoriaFilter && <span>• Categoría: {categoriaFilter}</span>}
        </div>
      </div>

      {/* Products Table */}
      {isLoading ? (
        <div className="bg-white rounded-2xl shadow-card p-12">
          <LoadingSpinner text="Cargando productos..." />
        </div>
      ) : filteredInventario.length === 0 ? (
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
                    Stock Actual
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
                {filteredInventario.map((item, index) => (
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
                          <p className="font-semibold text-slate-900">{item.producto || item.nombre}</p>
                          <p className="text-xs text-slate-500">{item.unidad_medida}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">{item.especificacion || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-lg font-bold ${
                        item.stock_actual === 0 ? 'text-danger-600' :
                        item.stock_actual <= item.stock_minimo ? 'text-warning-600' :
                        'text-success-600'
                      }`}>
                        {item.stock_actual || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">{item.stock_minimo || 0}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
                        {item.categoria}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {getStockBadge(item.stock_actual || 0, item.stock_minimo || 0)}
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
