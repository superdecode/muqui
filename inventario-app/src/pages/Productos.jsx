import { useState } from 'react'
import { Package, Plus, Edit2, Trash2, Search, Download, ChevronUp, ChevronDown, X, MapPin, Building2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Button from '../components/common/Button'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ProductoForm from '../components/productos/ProductoForm'
import { useToastStore } from '../stores/toastStore'
import { useAuthStore } from '../stores/authStore'
import { usePermissions } from '../hooks/usePermissions'
import dataService from '../services/dataService'
import { formatLabel } from '../utils/formatters'
import { filtrarProductosPorUbicacion, getUbicacionesPermitidasParaProducto } from '../utils/productosPorUbicacion'

export default function Productos() {
  const toast = useToastStore()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [categoriaFilter, setCategoriaFilter] = useState('')
  const [unidadFilter, setUnidadFilter] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('')
  const [especificacionFilter, setEspecificacionFilter] = useState('')
  const [sortColumn, setSortColumn] = useState('')
  const [sortDirection, setSortDirection] = useState('asc')
  const [showForm, setShowForm] = useState(false)
  const [selectedProducto, setSelectedProducto] = useState(null)
  const [ubicacionFilter, setUbicacionFilter] = useState('')
  const [empresaFilter, setEmpresaFilter] = useState('')

  const { hasPermission } = useAuthStore()
  const { canEdit } = usePermissions()
  const canDeleteProduct = () => hasPermission('productos.eliminar')
  const canWriteProductos = canEdit('productos')

  // Cargar PRODUCTOS (no inventario)
  const { data: productos = [], isLoading } = useQuery({
    queryKey: ['productos'],
    queryFn: () => dataService.getProductos()
  })

  // Cargar empresas y ubicaciones para filtros
  const { data: empresas = [] } = useQuery({
    queryKey: ['empresas'],
    queryFn: () => dataService.getEmpresas()
  })
  const { data: ubicaciones = [] } = useQuery({
    queryKey: ['ubicaciones'],
    queryFn: () => dataService.getUbicaciones()
  })

  // Filtrar productos
  const filteredProductos = productos.filter(item => {
    const matchesSearch = !searchTerm || item.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) || (item.especificacion || '').toLowerCase().includes(searchTerm.toLowerCase()) || (item.id || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !categoriaFilter || item.categoria === categoriaFilter
    const matchesUnidad = !unidadFilter || item.unidad_medida === unidadFilter
    const matchesEstado = !estadoFilter || item.estado === estadoFilter
    const matchesEspec = !especificacionFilter || item.especificacion === especificacionFilter
    
    // Filtrar por ubicación o empresa
    let matchesUbicacion = true
    if (ubicacionFilter) {
      matchesUbicacion = filtrarProductosPorUbicacion([item], ubicacionFilter, ubicaciones).length > 0
    }
    
    let matchesEmpresa = true
    if (empresaFilter) {
      const empresa = empresas.find(e => e.id === empresaFilter)
      if (empresa) {
        const ubicacionesEmpresa = ubicaciones.filter(u => u.empresa_id === empresaFilter)
        matchesEmpresa = filtrarProductosPorUbicacion([item], null, ubicacionesEmpresa).length > 0
      } else {
        matchesEmpresa = false
      }
    }
    
    return matchesSearch && matchesCategory && matchesUnidad && matchesEstado && matchesEspec && matchesUbicacion && matchesEmpresa
  }).sort((a, b) => {
    if (!sortColumn) return 0
    const valA = a[sortColumn] ?? ''
    const valB = b[sortColumn] ?? ''
    const cmp = typeof valA === 'number' ? valA - valB : String(valA).localeCompare(String(valB))
    return sortDirection === 'asc' ? cmp : -cmp
  })

  // Mutation para crear producto
  const createMutation = useMutation({
    mutationFn: (data) => {
      console.log('🔍 Creando producto con datos:', data)
      return dataService.createProducto(data)
    },
    onSuccess: (response) => {
      console.log('✅ Respuesta de creación:', response)
      queryClient.invalidateQueries({ queryKey: ['productos'] })
      queryClient.invalidateQueries({ queryKey: ['inventario'] })
      toast.success('Producto Creado', response.message || 'El producto se ha creado correctamente')
      handleCloseForm()
    },
    onError: (error) => {
      console.error('❌ Error creando producto:', error)
      toast.error('Error al Crear', error.message || 'No se pudo crear el producto')
    }
  })

  // Mutation para actualizar producto
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => {
      console.log('🔍 Actualizando producto:', { id, data })
      return dataService.updateProducto(id, data)
    },
    onSuccess: (response) => {
      console.log('✅ Respuesta de actualización:', response)
      queryClient.invalidateQueries({ queryKey: ['productos'] })
      queryClient.invalidateQueries({ queryKey: ['inventario'] })
      toast.success('Producto Actualizado', response.message || 'El producto se ha actualizado correctamente')
      handleCloseForm()
    },
    onError: (error) => {
      console.error('❌ Error actualizando producto:', error)
      toast.error('Error al Actualizar', error.message || 'No se pudo actualizar el producto')
    }
  })

  // Mutation para eliminar producto
  const deleteMutation = useMutation({
    mutationFn: (id) => dataService.deleteProducto(id),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['productos'] })
      queryClient.invalidateQueries({ queryKey: ['inventario'] })
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

  const handleLimpiarFiltros = () => {
    setSearchTerm('')
    setCategoriaFilter('')
    setUnidadFilter('')
    setEstadoFilter('')
    setEspecificacionFilter('')
    setUbicacionFilter('')
    setEmpresaFilter('')
    toast.success('Filtros Limpiados', 'Todos los filtros han sido eliminados')
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setSelectedProducto(null)
  }

  const categorias = [...new Set(productos.map(item => item.categoria).filter(Boolean))]
  const unidades = [...new Set(productos.map(item => item.unidad_medida).filter(Boolean))]
  const especificaciones = [...new Set(productos.map(item => item.especificacion).filter(Boolean))]
  const estados = [...new Set(productos.map(item => item.estado).filter(Boolean))]

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ column }) => (
    <span className="inline-flex flex-col ml-1 -space-y-1">
      <ChevronUp size={12} className={sortColumn === column && sortDirection === 'asc' ? 'text-primary-600' : 'text-slate-300'} />
      <ChevronDown size={12} className={sortColumn === column && sortDirection === 'desc' ? 'text-primary-600' : 'text-slate-300'} />
    </span>
  )

  const activeFilters = [categoriaFilter, unidadFilter, estadoFilter, especificacionFilter, ubicacionFilter, empresaFilter].filter(Boolean).length

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
              disabled={!canWriteProductos}
              title={!canWriteProductos ? 'Sin permisos de escritura' : undefined}
            >
              <Plus size={20} className="mr-2" />
              Nuevo Producto
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card p-6 border border-slate-100 dark:border-slate-700">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              />
            </div>
          </div>

          <div className="w-full md:w-64">
            <select
              value={categoriaFilter}
              onChange={(e) => setCategoriaFilter(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
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
          <Button
            variant="outline"
            className="md:w-auto"
            onClick={handleLimpiarFiltros}
            disabled={activeFilters === 0}
          >
            <X size={20} className="mr-2" />
            Limpiar Filtros
          </Button>
        </div>

        {/* Filter Chips */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{filteredProductos.length} productos</span>
          
          {/* Filtros de ubicación y empresa */}
          <div className="flex flex-wrap gap-1.5 ml-2">
            <select value={empresaFilter} onChange={e => setEmpresaFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-primary-500 cursor-pointer">
              <option value="">Todas las empresas</option>
              {empresas.filter(e => e.estado !== 'INACTIVO').map(e => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </select>
            <select value={ubicacionFilter} onChange={e => setUbicacionFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-primary-500 cursor-pointer">
              <option value="">Todas las ubicaciones</option>
              {ubicaciones.filter(u => u.estado !== 'INACTIVO').map(u => {
                const empresa = empresas.find(e => e.id === u.empresa_id)
                return (
                  <option key={u.id} value={u.id}>
                    {u.nombre} {empresa ? `(${empresa.nombre})` : ''}
                  </option>
                )
              })}
            </select>
            
            {/* Especificación chips */}
            {especificaciones.length > 0 && (
              <select value={especificacionFilter} onChange={e => setEspecificacionFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium rounded-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-primary-500 cursor-pointer">
                <option value="">Especificación</option>
                {especificaciones.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            )}
            <select value={unidadFilter} onChange={e => setUnidadFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-primary-500 cursor-pointer">
              <option value="">Unidad</option>
              {unidades.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <select value={estadoFilter} onChange={e => setEstadoFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-primary-500 cursor-pointer">
              <option value="">Estado</option>
              {estados.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          
          {/* Active filter badges */}
          {activeFilters > 0 && (
            <button onClick={() => { 
              setCategoriaFilter(''); 
              setUnidadFilter(''); 
              setEstadoFilter(''); 
              setEspecificacionFilter('');
              setUbicacionFilter('');
              setEmpresaFilter('');
            }}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-full transition-colors">
              <X size={12} /> Limpiar filtros ({activeFilters})
            </button>
          )}
        </div>
      </div>

      {/* Products Table */}
      {isLoading ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card p-12">
          <LoadingSpinner text="Cargando productos..." />
        </div>
      ) : filteredProductos.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card p-12 text-center">
          <Package size={64} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">No hay productos</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {searchTerm || categoriaFilter
              ? 'No se encontraron productos con los filtros seleccionados'
              : 'Comienza agregando tu primer producto'}
          </p>
          {canWriteProductos && (
            <Button variant="primary" onClick={() => setShowForm(true)}>
              <Plus size={20} className="mr-2" />
              Agregar Producto
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-700">
                <tr>
                  <th onClick={() => handleSort('nombre')} className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:text-primary-600 select-none">
                    <span className="inline-flex items-center">Producto<SortIcon column="nombre" /></span>
                  </th>
                  <th onClick={() => handleSort('especificacion')} className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:text-primary-600 select-none">
                    <span className="inline-flex items-center">Especificación<SortIcon column="especificacion" /></span>
                  </th>
                  <th onClick={() => handleSort('unidad_medida')} className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:text-primary-600 select-none">
                    <span className="inline-flex items-center">Unidad<SortIcon column="unidad_medida" /></span>
                  </th>
                  <th onClick={() => handleSort('stock_minimo')} className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:text-primary-600 select-none">
                    <span className="inline-flex items-center">Stock Mínimo<SortIcon column="stock_minimo" /></span>
                  </th>
                  <th onClick={() => handleSort('categoria')} className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:text-primary-600 select-none">
                    <span className="inline-flex items-center">Categoría<SortIcon column="categoria" /></span>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={14} />
                      Ubicaciones
                    </span>
                  </th>
                  <th onClick={() => handleSort('estado')} className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:text-primary-600 select-none">
                    <span className="inline-flex items-center">Estado<SortIcon column="estado" /></span>
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredProductos.map((item, index) => (
                  <tr
                    key={item.id || index}
                    className="hover:bg-gradient-to-r hover:from-slate-50 dark:hover:from-slate-700/50 hover:to-transparent transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                          <Package className="text-blue-600" size={20} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{item.nombre}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{item.codigo_legible || item.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600 dark:text-slate-400">{item.especificacion || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600 dark:text-slate-400">{item.unidad_medida}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.stock_minimo || 0}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-xs font-medium">
                        {item.categoria}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {(() => {
                          const ubicacionesPermitidas = getUbicacionesPermitidasParaProducto(item, ubicaciones, empresas)
                          if (ubicacionesPermitidas.length === 0) {
                            return <span className="text-xs text-slate-500">Todas las ubicaciones</span>
                          }
                          if (ubicacionesPermitidas.length <= 2) {
                            return (
                              <div className="space-y-1">
                                {ubicacionesPermitidas.slice(0, 2).map(ub => {
                                  const empresa = empresas.find(e => e.id === ub.empresa_id)
                                  return (
                                    <div key={ub.id} className="text-xs text-slate-600 dark:text-slate-400">
                                      {ub.nombre}
                                      {empresa && <span className="text-xs text-slate-400 ml-1">({empresa.nombre.substring(0, 3)})</span>}
                                    </div>
                                  )
                                })}
                              </div>
                            )
                          }
                          return (
                            <div>
                              <div className="text-xs text-slate-600 dark:text-slate-400">
                                {ubicacionesPermitidas.slice(0, 2).map(ub => {
                                  const empresa = empresas.find(e => e.id === ub.empresa_id)
                                  return `${ub.nombre}${empresa ? `(${empresa.nombre.substring(0, 3)})` : ''}`
                                }).join(', ')}
                              </div>
                              <div className="text-xs text-primary-600 font-medium">
                                +{ubicacionesPermitidas.length - 2} más
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        item.estado === 'ACTIVO'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : 'bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300'
                      }`}>
                        {formatLabel(item.estado)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className={`p-2 rounded-lg transition-colors ${canWriteProductos ? 'text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30' : 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-50'}`}
                          title={canWriteProductos ? 'Editar' : 'Sin permisos de escritura'}
                          disabled={!canWriteProductos}
                        >
                          <Edit2 size={18} />
                        </button>
                        {canDeleteProduct() && (
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                            title="Eliminar"
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
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
