import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Select from 'react-select'
import { PackageCheck, Search, Download, AlertTriangle, Edit2, Check, X, Package } from 'lucide-react'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import LoadingSpinner from '../components/common/LoadingSpinner'
import DataTable from '../components/common/DataTable'
import MultiSelectUbicaciones from '../components/reportes/MultiSelectUbicaciones'
import ProductoForm from '../components/productos/ProductoForm'
import { useToastStore } from '../stores/toastStore'
import { usePermissions } from '../hooks/usePermissions'
import { useAuthStore } from '../stores/authStore'
import { safeParseDate } from '../utils/formatters'
import { exportToCSV } from '../utils/exportUtils'
import { getUserAllowedUbicacionIds } from '../utils/userFilters'
import dataService from '../services/dataService'

export default function Stock() {
  const toast = useToastStore()
  const qc = useQueryClient()
  const { canView, canEdit, isAdmin } = usePermissions()
  const canViewStock = canView('productos') || isAdmin()
  const canWriteStock = canEdit('productos') || isAdmin()
  const { user } = useAuthStore()

  // State
  const [searchTerm, setSearchTerm] = useState('')
  const [filterUbicaciones, setFilterUbicaciones] = useState([])
  const [filterProductos, setFilterProductos] = useState([])
  const [filterCategoria, setFilterCategoria] = useState('')
  const [editingProducto, setEditingProducto] = useState(null)
  const [editingStockMin, setEditingStockMin] = useState(null)
  const [stockMinValue, setStockMinValue] = useState('')

  // Data queries (same as Reportes)
  const { data: inventario = [], isLoading: isLoadingInv } = useQuery({ queryKey: ['inventario'], queryFn: () => dataService.getInventario() })
  const { data: movimientos = [] } = useQuery({ queryKey: ['movimientos'], queryFn: () => dataService.getMovimientos() })
  const { data: productos = [] } = useQuery({ queryKey: ['productos'], queryFn: () => dataService.getProductos() })
  const { data: ubicaciones = [] } = useQuery({ queryKey: ['ubicaciones'], queryFn: () => dataService.getUbicaciones() })
  const { data: conteos = [] } = useQuery({ queryKey: ['conteos'], queryFn: () => dataService.getConteos() })
  const { data: detalleConteos = [] } = useQuery({ queryKey: ['detalle-conteos-all'], queryFn: () => dataService.getDetalleConteos() })
  const { data: detalleMovimientos = [] } = useQuery({ queryKey: ['detalle-movimientos-all'], queryFn: () => dataService.getDetalleMovimientos() })

  const updateProductoMut = useMutation({
    mutationFn: ({ id, data }) => dataService.updateProducto(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['productos'] }); toast.success('Actualizado', 'Producto actualizado') },
    onError: (e) => toast.error('Error', e.message)
  })

  // User ubicaciones
  const userUbicaciones = useMemo(() => {
    const asignadas = user?.ubicaciones_asignadas
    if (Array.isArray(asignadas) && asignadas.length > 0) {
      return ubicaciones.filter(u => asignadas.includes(u.id))
    }
    return ubicaciones
  }, [user, ubicaciones])

  // Auto-select all user ubicaciones on first load
  useMemo(() => {
    if (filterUbicaciones.length === 0 && userUbicaciones.length > 0) {
      setFilterUbicaciones(userUbicaciones.map(u => u.id))
    }
  }, [userUbicaciones])

  // Categorías únicas
  const categorias = useMemo(() => {
    const cats = [...new Set(productos.filter(p => p.categoria).map(p => p.categoria))].sort()
    return cats
  }, [productos])

  // Opciones para selector de productos
  const productosOptions = useMemo(() => {
    return [...productos]
      .filter(p => p.estado !== 'INACTIVO' && p.estado !== 'ELIMINADO')
      .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
      .map(p => ({ value: p.id, label: p.especificacion ? `${p.nombre} (${p.especificacion})` : p.nombre }))
  }, [productos])

  // ========== SAME CALCULATION LOGIC AS REPORTES ==========
  const calcularStockActual = (productoId, ubicacionId) => {
    const estadosValidos = ['COMPLETADO', 'PARCIALMENTE_COMPLETADO']
    const estadosMovValidos = ['COMPLETADO', 'PARCIAL', 'EN_PROCESO']

    const conteosUbicacion = conteos.filter(c =>
      c.ubicacion_id === ubicacionId && estadosValidos.includes(c.estado?.toUpperCase())
    )

    const conteosConProducto = conteosUbicacion
      .map(c => {
        const det = detalleConteos.find(d => d.conteo_id === c.id && d.producto_id === productoId)
        if (!det) return null
        const fecha = safeParseDate(c.fecha_completado || c.fecha_programada)
        return { conteo: c, detalle: det, fecha }
      })
      .filter(Boolean)
      .sort((a, b) => (b.fecha || 0) - (a.fecha || 0))

    if (conteosConProducto.length === 0) {
      const invItem = inventario.find(i => i.producto_id === productoId && i.ubicacion_id === ubicacionId)
      return { stock_actual: invItem?.stock_actual ?? 0, metodo: 'sin_conteo' }
    }

    const ultimo = conteosConProducto[0]
    const fechaConteo = ultimo.fecha
    const stockBase = ultimo.detalle.cantidad_fisica ?? ultimo.detalle.cantidad_sistema ?? 0
    const ahora = new Date()
    const msDesdeConteo = fechaConteo ? ahora - fechaConteo : null

    if (msDesdeConteo !== null && msDesdeConteo < 24 * 60 * 60 * 1000) {
      return { stock_actual: stockBase, metodo: 'conteo_reciente' }
    }

    let entradas = 0
    let salidas = 0
    if (fechaConteo) {
      movimientos.forEach(mov => {
        const estadoMov = (mov.estado || '').toUpperCase()
        if (!estadosMovValidos.includes(estadoMov)) return
        const fechaMov = safeParseDate(mov.fecha_confirmacion || mov.fecha_creacion)
        if (!fechaMov || fechaMov <= fechaConteo) return
        const dets = detalleMovimientos.filter(d => d.movimiento_id === mov.id && d.producto_id === productoId)
        dets.forEach(det => {
          if (mov.destino_id === ubicacionId) entradas += det.cantidad_recibida ?? det.cantidad ?? 0
          if (mov.origen_id === ubicacionId) salidas += det.cantidad_enviada ?? det.cantidad ?? 0
        })
      })
    }

    return { stock_actual: stockBase + entradas - salidas, metodo: 'calculado' }
  }

  // Build stock data
  const stockData = useMemo(() => {
    if (filterUbicaciones.length === 0) return []

    const rows = []
    
    // Include all products for selected locations, even if they don't have inventory records
    filterUbicaciones.forEach(ubicacionId => {
      const ubicacion = ubicaciones.find(u => u.id === ubicacionId)
      const ubicacionNombre = ubicacion?.nombre || ubicacionId
      
      // Get inventory items for this location
      const invUbicacion = inventario.filter(i => i.ubicacion_id === ubicacionId)
      
      // Create a set of all product IDs that have inventory records for this location
      const productIdsWithInventory = new Set(invUbicacion.map(i => i.producto_id))
      
      // Add all active products to ensure complete coverage
      productos.forEach(producto => {
        // Skip inactive products
        if (producto.estado === 'INACTIVO' || producto.estado === 'ELIMINADO') return
        
        // Check if this product should be shown for this location
        // Either it has inventory, or we should create a default entry
        let stockActual = 0
        let hasInventoryRecord = false
        
        if (productIdsWithInventory.has(producto.id)) {
          // Use existing inventory record
          const invItem = invUbicacion.find(i => i.producto_id === producto.id)
          if (invItem) {
            const calc = calcularStockActual(producto.id, ubicacionId)
            stockActual = calc.stock_actual
            hasInventoryRecord = true
          }
        } else {
          // No inventory record - calculate stock anyway or default to 0
          const calc = calcularStockActual(producto.id, ubicacionId)
          stockActual = calc.stock_actual
        }
        
        const stockMin = parseInt(producto.stock_minimo) || 0
        
        rows.push({
          id: `${producto.id}_${ubicacionId}`,
          producto_id: producto.id,
          ubicacion_id: ubicacionId,
          nombre: producto.nombre || producto.id,
          especificacion: producto.especificacion || '',
          categoria: producto.categoria || '',
          ubicacion_nombre: ubicacionNombre,
          stock_actual: stockActual,
          stock_minimo: stockMin,
          estado: stockActual <= 0 ? 'Agotado' : stockActual <= stockMin ? 'Bajo' : 'Normal',
          hasInventoryRecord
        })
      })
    })

    // Apply filters
    let result = rows

    if (filterProductos.length > 0) {
      result = result.filter(r => filterProductos.includes(r.producto_id))
    }

    if (filterCategoria) {
      result = result.filter(r => r.categoria === filterCategoria)
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(r =>
        r.nombre.toLowerCase().includes(term) ||
        r.especificacion.toLowerCase().includes(term) ||
        r.ubicacion_nombre.toLowerCase().includes(term) ||
        r.categoria.toLowerCase().includes(term)
      )
    }

    result.sort((a, b) => a.nombre.localeCompare(b.nombre) || a.ubicacion_nombre.localeCompare(b.ubicacion_nombre))
    return result
  }, [inventario, productos, ubicaciones, conteos, detalleConteos, movimientos, detalleMovimientos, filterUbicaciones, filterProductos, filterCategoria, searchTerm])

  // Stats
  const stats = useMemo(() => ({
    total: stockData.length,
    normal: stockData.filter(r => r.estado === 'Normal').length,
    bajo: stockData.filter(r => r.estado === 'Bajo').length,
    agotado: stockData.filter(r => r.estado === 'Agotado').length,
    totalUnidades: stockData.reduce((s, r) => s + r.stock_actual, 0)
  }), [stockData])

  // Inline stock_minimo save
  const handleSaveStockMin = (productoId) => {
    const val = parseFloat(stockMinValue)
    if (isNaN(val) || val < 0) {
      toast.error('Valor inválido', 'El stock mínimo debe ser un número >= 0')
      return
    }
    updateProductoMut.mutate({ id: productoId, data: { stock_minimo: val } })
    setEditingStockMin(null)
  }

  // Export
  const handleExportar = () => {
    if (stockData.length === 0) { toast.error('Sin datos', 'No hay datos para exportar'); return }
    const data = stockData.map(r => ({
      Producto: r.nombre,
      Especificación: r.especificacion,
      Categoría: r.categoria,
      Ubicación: r.ubicacion_nombre,
      'Stock Actual': r.stock_actual,
      'Stock Mínimo': r.stock_minimo,
      Estado: r.estado
    }))
    exportToCSV(data, `stock_${new Date().toISOString().split('T')[0]}`)
    toast.success('Exportado', 'Stock exportado a CSV')
  }

  // Product edit save handler
  const handleSaveProducto = async (productoData) => {
    try {
      await dataService.updateProducto(editingProducto.id, productoData)
      qc.invalidateQueries({ queryKey: ['productos'] })
      toast.success('Producto Actualizado', 'Los cambios se han guardado')
      setEditingProducto(null)
    } catch (err) {
      toast.error('Error', err.message)
    }
  }

  // Define columns for DataTable
  const columns = [
    {
      header: 'Producto',
      accessor: 'nombre',
      sortKey: 'nombre',
      render: (value) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">{value}</span>
      )
    },
    {
      header: 'Especificación',
      accessor: 'especificacion',
      sortKey: 'especificacion',
      render: (value) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">{value || '—'}</span>
      )
    },
    {
      header: 'Categoría',
      accessor: 'categoria',
      sortKey: 'categoria',
      render: (value) => (
        <span className="text-xs text-slate-600 dark:text-slate-400">{value || '—'}</span>
      )
    },
    {
      header: 'Ubicación',
      accessor: 'ubicacion_nombre',
      sortKey: 'ubicacion_nombre',
      render: (value) => (
        <span className="text-slate-700 dark:text-slate-300">{value}</span>
      )
    },
    {
      header: 'Stock',
      accessor: 'stock_actual',
      sortKey: 'stock_actual',
      render: (value) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100 text-center block">{value}</span>
      )
    },
    {
      header: 'Stock Mín.',
      accessor: 'stock_minimo',
      sortKey: 'stock_minimo',
      render: (value, row) => (
        <div className="text-center">
          {editingStockMin === row.id ? (
            <div className="flex items-center justify-center gap-1">
              <input
                type="number"
                min="0"
                step="0.01"
                value={stockMinValue}
                onChange={(e) => setStockMinValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveStockMin(row.producto_id); if (e.key === 'Escape') setEditingStockMin(null) }}
                autoFocus
                className="w-16 px-2 py-1 border border-primary-400 rounded text-center text-sm font-bold focus:ring-2 focus:ring-primary-500"
              />
              <button onClick={() => handleSaveStockMin(row.producto_id)} className="p-1 hover:bg-green-50 rounded text-green-600"><Check size={14} /></button>
              <button onClick={() => setEditingStockMin(null)} className="p-1 hover:bg-red-50 rounded text-red-600"><X size={14} /></button>
            </div>
          ) : (
            <span
              className={`cursor-pointer hover:underline text-slate-600 dark:text-slate-400 ${canWriteStock ? 'hover:text-primary-600' : ''}`}
              onClick={() => { if (canWriteStock) { setEditingStockMin(row.id); setStockMinValue(String(row.stock_minimo)) } }}
              title={canWriteStock ? 'Click para editar' : ''}
            >
              {value}
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Estado',
      accessor: 'estado',
      sortKey: 'estado',
      render: (value) => {
        if (value === 'Agotado') {
          return <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">Agotado</span>
        }
        if (value === 'Bajo') {
          return <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">Bajo</span>
        }
        return <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Normal</span>
      }
    },
    ...(canWriteStock ? [{
      header: 'Acciones',
      accessor: 'id',
      render: (value, row) => (
        <div className="text-center">
          <button
            onClick={() => {
              const prod = productos.find(p => p.id === row.producto_id)
              if (prod) setEditingProducto(prod)
            }}
            className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
            title="Editar producto"
          >
            <Edit2 size={14} />
          </button>
        </div>
      )
    }] : [])
  ]

  const isLoading = isLoadingInv

  if (!canViewStock) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-slate-600 dark:text-slate-400">No tienes permisos para ver el stock</p>
      </div>
    )
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-96"><LoadingSpinner size="lg" /></div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 shadow-card">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <PackageCheck className="text-white" size={28} />
                <h1 className="text-3xl font-bold text-white">Stock</h1>
              </div>
              <p className="text-white/90">Control de inventario por ubicación</p>
            </div>
            <Button variant="white" onClick={handleExportar} disabled={stockData.length === 0}>
              <Download size={20} className="mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Registros</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Unidades</p>
          <p className="text-2xl font-bold text-primary-600">{stats.totalUnidades}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-green-200 dark:border-green-900/30">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Normal</p>
          <p className="text-2xl font-bold text-green-600">{stats.normal}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-yellow-200 dark:border-yellow-900/30">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Stock Bajo</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.bajo}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-red-200 dark:border-red-900/30">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Agotados</p>
          <p className="text-2xl font-bold text-red-600">{stats.agotado}</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Search size={18} className="text-primary-600" />
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Filtros</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ubicaciones</label>
            <MultiSelectUbicaciones
              ubicaciones={userUbicaciones}
              selected={filterUbicaciones}
              onChange={setFilterUbicaciones}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Productos</label>
            <Select
              isMulti isSearchable isClearable
              placeholder="Todos los productos..."
              noOptionsMessage={() => 'Sin resultados'}
              options={productosOptions}
              value={productosOptions.filter(opt => filterProductos.includes(opt.value))}
              onChange={(selected) => setFilterProductos(selected ? selected.map(s => s.value) : [])}
              classNamePrefix="rs"
              styles={{
                control: (base) => ({ ...base, borderRadius: '0.75rem', borderColor: '#cbd5e1', minHeight: '42px', fontSize: '0.875rem' }),
                menu: (base) => ({ ...base, borderRadius: '0.75rem', zIndex: 50, fontSize: '0.875rem' }),
                multiValue: (base) => ({ ...base, borderRadius: '0.375rem' })
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Categoría</label>
            <select value={filterCategoria} onChange={e => setFilterCategoria(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm">
              <option value="">Todas</option>
              {categorias.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Nombre, ubicación..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <DataTable
          columns={columns}
          data={stockData}
          defaultSortKey="nombre"
          defaultSortDir="asc"
          className="border-0"
        />
      </Card>

      {/* Product Edit Modal */}
      {editingProducto && (
        <ProductoForm
          producto={editingProducto}
          onClose={() => setEditingProducto(null)}
          onSave={handleSaveProducto}
        />
      )}
    </div>
  )
}
