import { useState, useRef } from 'react'
import { Package, Plus, Edit2, Trash2, Search, Download, ChevronUp, ChevronDown, X, MapPin, Building2, Upload, FileSpreadsheet, CheckCircle, Save } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import Button from '../components/common/Button'
import LoadingSpinner from '../components/common/LoadingSpinner'
import UoMBadge from '../components/common/UoMBadge'
import ProductoForm from '../components/productos/ProductoForm'
import { useToastStore } from '../stores/toastStore'
import { useAuthStore } from '../stores/authStore'
import { usePermissions } from '../hooks/usePermissions'
import dataService from '../services/dataService'
import { formatLabel, getUoMCompra } from '../utils/formatters'
import { filtrarProductosPorUbicacion, getUbicacionesPermitidasParaProducto } from '../utils/productosPorUbicacion'

const getCategoryColor = (category) => {
  const cat = String(category || '').trim().toUpperCase();
  if (!cat) return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
  
  const colors = [
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
    'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300',
    'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300',
    'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
    'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
  ];
  
  // Custom hash with multiple shifts for high variance
  let hash = 0;
  for (let i = 0; i < cat.length; i++) {
    const char = cat.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = (hash ^ (hash >> 3)) * (i + 1); // Add position-based noise
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export default function Productos() {
  const toast = useToastStore()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [categoriaFilter, setCategoriaFilter] = useState('')
  const [tipoConteoFilter, setTipoConteoFilter] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('')
  const [especificacionFilter, setEspecificacionFilter] = useState('')
  const [sortColumn, setSortColumn] = useState('nombre')
  const [sortDirection, setSortDirection] = useState('asc')
  const [showForm, setShowForm] = useState(false)
  const [selectedProducto, setSelectedProducto] = useState(null)
  const [ubicacionFilter, setUbicacionFilter] = useState('')
  const [empresaFilter, setEmpresaFilter] = useState('')
  
  // States Modal Importación Excel
  const [modalImport, setModalImport] = useState(false)
  const [previewData, setPreviewData] = useState(null)
  const [importando, setImportando] = useState(false)
  const fileRef = useRef()

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

  // Cargar unidades de medida para enriquecer la tabla
  const { data: unidadesDB = [] } = useQuery({
    queryKey: ['config-unidades'],
    queryFn: () => dataService.getUnidadesMedida()
  })

  // Filtrar productos
  const filteredProductos = productos.filter(item => {
    const matchesSearch = !searchTerm || item.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) || (item.especificacion || '').toLowerCase().includes(searchTerm.toLowerCase()) || (item.id || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !categoriaFilter || item.categoria === categoriaFilter
    const matchesTipoConteo = !tipoConteoFilter || item.frecuencia_inventario === tipoConteoFilter
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
    
    return matchesSearch && matchesCategory && matchesTipoConteo && matchesEstado && matchesEspec && matchesUbicacion && matchesEmpresa
  }).sort((a, b) => {
    if (!sortColumn) return 0
    const valA = a[sortColumn] ?? ''
    const valB = b[sortColumn] ?? ''
    const cmp = typeof valA === 'number' ? valA - valB : String(valA).localeCompare(String(valB))
    return sortDirection === 'asc' ? cmp : -cmp
  })

  // Mutation para crear producto
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const res = await dataService.createProducto(data)
      if (!res.success) throw new Error(res.message)
      return res
    },
    onSuccess: (response) => {
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
    mutationFn: async ({ id, data }) => {
      const res = await dataService.updateProducto(id, data)
      if (!res.success) throw new Error(res.message)
      return res
    },
    onSuccess: (response) => {
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
    mutationFn: async (id) => {
      const res = await dataService.deleteProducto(id)
      if (!res.success) throw new Error(res.message)
      return res
    },
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
    if (filteredProductos.length === 0) {
      toast.warning('Sin datos', 'No hay productos para exportar')
      return
    }

    // Preparar datos para exportación — resolviendo unidades desde catálogo
    const dataToExport = filteredProductos.map(prod => {
      const unit = unidadesDB.find(u => u.id === prod.purchase_unit_id)
      const unitNombre = unit?.nombre || prod.unidad_medida || ''
      const unitSymbol = unit?.abreviatura || unit?.nombre || prod.unidad_medida || ''
      const especificacion = prod.purchase_unit_qty && unitSymbol
        ? `${prod.purchase_unit_qty} ${unitSymbol}`.trim()
        : (prod.especificacion || '')

      return {
        'ID Interno': prod.id || '',
        'Código Legible': prod.codigo_legible || '',
        'Nombre': prod.nombre || '',
        'Categoría': prod.categoria || '',
        'Estado': prod.estado || '',
        'Frecuencia Inventario': (prod.frecuencia_inventario || '').toUpperCase(),
        'Costo Unitario': prod.costo_unidad || 0,
        'Unidad de Medida': unitNombre,
        'Cant. por Unidad': prod.purchase_unit_qty || '',
        'Especificación': especificacion,
        'Stock Mínimo': prod.stock_minimo || 0,
        'Etiquetas': Array.isArray(prod.etiquetas) ? prod.etiquetas.join(', ') : (prod.etiquetas || ''),
        'Proveedor': prod.proveedor || '',
        'N° Ubicaciones': (prod.ubicaciones_permitidas || []).length
      }
    })

    // Crear workbook y worksheet
    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Productos')

    // Ajustar ancho de columnas
    ws['!cols'] = [
      { wch: 15 }, // ID Interno
      { wch: 15 }, // Código Legible
      { wch: 28 }, // Nombre
      { wch: 15 }, // Categoría
      { wch: 12 }, // Estado
      { wch: 20 }, // Frecuencia Inventario
      { wch: 13 }, // Costo Unitario
      { wch: 20 }, // Unidad de Medida
      { wch: 14 }, // Cant. por Unidad
      { wch: 16 }, // Especificación
      { wch: 13 }, // Stock Mínimo
      { wch: 22 }, // Etiquetas
      { wch: 15 }, // Proveedor
      { wch: 13 }  // N° Ubicaciones
    ]

    // Determinar secuencia creciente
    const currSeq = parseInt(localStorage.getItem('export_sequence') || '0', 10) + 1
    localStorage.setItem('export_sequence', currSeq.toString())
    const seqStr = currSeq.toString().padStart(3, '0')

    // Descargar archivo
    const timestamp = new Date().toISOString().split('T')[0]
    XLSX.writeFile(wb, `productos_${seqStr}_${timestamp}.xlsx`)
    toast.success('Exportado', `${filteredProductos.length} productos exportados correctamente`)
  }

  const handleLimpiarFiltros = () => {
    setSearchTerm('')
    setCategoriaFilter('')
    setTipoConteoFilter('')
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

  // LÓGICA IMPORTAR/ACTUALIZAR DESDE EXCEL ──────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 })
      
      if (data.length < 2) throw new Error("El archivo está vacío o sin datos.")

      const headers = data[0].map(h => String(h).toLowerCase().trim())
      const idxId = headers.findIndex(h => h.includes('id interno') || h === 'id')
      const idxNombre = headers.findIndex(h => h.includes('nombre') || h.includes('producto'))
      const idxCodigo = headers.findIndex(h => h.includes('codigo') || h.includes('código'))
      const idxCosto = headers.findIndex(h => h === 'costo unitario' || h === 'costo')
      const idxCostoNuevo = headers.findIndex(h => h.includes('costo nuevo'))
      const idxUnidad = headers.findIndex(h => h.includes('unidad') && !h.includes('cant') && !h.includes('costo'))
      const idxStockMin = headers.findIndex(h => h.includes('stock min') || h.includes('stock mín'))
      const idxTipoConteo = headers.findIndex(h => h.includes('frecuencia') || h.includes('tipo conteo'))
      const idxCategoria = headers.findIndex(h => h.includes('categoria') || h.includes('categoría'))
      const idxEspecificacion = headers.findIndex(h => h.includes('especificacion') || h.includes('especificación'))
      const idxEtiquetas = headers.findIndex(h => h.includes('etiqueta') || h.includes('tags'))
      const idxPurchaseUnitQty = headers.findIndex(h => h.includes('cant. por unidad') || h.includes('cant x compra') || h.includes('cant'))

      if (idxId === -1 && idxNombre === -1) {
        throw new Error("El archivo debe contener al menos la columna 'ID Interno' o 'Nombre'")
      }

      // Filtramos filas que tengan al menos ID o Nombre
      const validRows = data.slice(1).filter(r => (idxId !== -1 && r[idxId]) || (idxNombre !== -1 && r[idxNombre]))

      const previewArr = validRows.map(row => {
        const id = idxId !== -1 ? (row[idxId] || null) : null
        const nombre = idxNombre !== -1 ? row[idxNombre] : null
        const codigo_legible = idxCodigo !== -1 ? row[idxCodigo] : null
        const costo_unidad = idxCostoNuevo !== -1 && row[idxCostoNuevo] !== undefined ? row[idxCostoNuevo] : 
                             (idxCosto !== -1 && row[idxCosto] !== undefined ? row[idxCosto] : undefined)
        const unidad_medida = idxUnidad !== -1 ? row[idxUnidad] : undefined
        const stock_minimo = idxStockMin !== -1 && row[idxStockMin] !== undefined ? parseInt(row[idxStockMin]) : undefined
        const frecuencia_inventario = idxTipoConteo !== -1 ? row[idxTipoConteo] : undefined
        const categoria = idxCategoria !== -1 ? row[idxCategoria] : undefined
        const especificacion = idxEspecificacion !== -1 ? row[idxEspecificacion] : undefined
        const etiquetasStr = idxEtiquetas !== -1 ? (row[idxEtiquetas] || '') : ''
        const etiquetas = etiquetasStr ? String(etiquetasStr).split(',').map(s => s.trim()).filter(Boolean) : []
        const purchase_unit_qty = idxPurchaseUnitQty !== -1 ? parseFloat(row[idxPurchaseUnitQty]) || undefined : undefined
        
        // Reconocimiento inteligente de unidad de medida
        let purchase_unit_id = undefined
        if (unidad_medida) {
          const uStr = String(unidad_medida).trim().toLowerCase()
          const matched = unidadesDB.find(u => 
            u.nombre.toLowerCase() === uStr || 
            (u.abreviatura && u.abreviatura.toLowerCase() === uStr) ||
            (u.simbolo && u.simbolo.toLowerCase() === uStr)
          )
          if (matched) purchase_unit_id = matched.id
        }

        const existe = (id ? productos.find(p => String(p.id).trim() === String(id).trim()) : null) || 
                       (nombre ? productos.find(p => String(p.nombre).trim().toLowerCase() === String(nombre).trim().toLowerCase()) : null)
        
        let accion = existe ? 'ACTUALIZAR' : 'NUEVO'
        if (accion === 'NUEVO' && !nombre) {
          accion = 'ERROR (Falta Nombre)'
        }
        
        return {
          id: id ? String(id).trim() : (existe ? String(existe.id).trim() : null),
          nombre: nombre || (existe ? existe.nombre : '—'),
          codigo_legible,
          costo_unidad: costo_unidad !== undefined ? parseFloat(costo_unidad) || 0 : undefined,
          unidad_medida,
          stock_minimo: stock_minimo !== undefined && !isNaN(stock_minimo) ? stock_minimo : undefined,
          frecuencia_inventario,
          categoria,
          especificacion,
          etiquetas,
          purchase_unit_id,
          purchase_unit_qty,
          accion,
          original: existe || null
        }
      })
      setPreviewData(previewArr)
    } catch (err) {
      toast.error('Error', `Error al leer Excel: ${err.message}`)
    }
  }

  const handleDescargarPlantilla = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['ID Interno', 'Código Legible', 'Nombre', 'Categoría', 'Estado', 'Frecuencia Inventario', 'Costo Unitario', 'Unidad de Medida', 'Cant. por Unidad', 'Especificación', 'Stock Mínimo', 'Etiquetas'],
      ['', 'PRD-001', 'Ejemplo Producto', 'Insumos', 'ACTIVO', 'MENSUAL', 15500, 'Kilogramos', 1, 'Bolsa 1 KG', 5, 'Urgente, Frágil']
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Importar')
    XLSX.writeFile(wb, 'plantilla_productos.xlsx')
  }

  const handleConfirmarImport = async () => {
    if (!previewData?.length) return
    setImportando(true)
    let exitos = 0
    let erroresList = []
    try {
      for (const item of previewData) {
        if (item.accion.includes('ERROR')) {
          erroresList.push(`${item.nombre || 'Fila s/nombre'} (Dato faltante)`)
          continue
        }
        
        const dataPayload = {
          ...(item.nombre && { nombre: item.nombre }),
          ...(item.codigo_legible && { codigo_legible: item.codigo_legible }),
          ...(item.costo_unidad !== undefined && { costo_unidad: item.costo_unidad }),
          ...(item.unidad_medida && { unidad_medida: item.unidad_medida }),
          ...(item.stock_minimo !== undefined && { stock_minimo: item.stock_minimo }),
          ...(item.especificacion && { especificacion: item.especificacion }),
          ...(item.frecuencia_inventario && { frecuencia_inventario: item.frecuencia_inventario }),
          ...(item.categoria && { categoria: item.categoria }),
          ...(item.etiquetas && { etiquetas: item.etiquetas }),
          ...(item.purchase_unit_id && { purchase_unit_id: item.purchase_unit_id }),
          ...(item.purchase_unit_qty && { purchase_unit_qty: item.purchase_unit_qty })
        }
        try {
          if (item.accion === 'ACTUALIZAR') {
            await dataService.updateProducto(item.id, dataPayload)
          } else {
            await dataService.createProducto(dataPayload)
          }
          exitos++
        } catch (e) { 
          erroresList.push(`${item.nombre || item.id} (Fallo al guardar)`) 
        }
      }
      queryClient.invalidateQueries({ queryKey: ['productos'] })
      queryClient.invalidateQueries({ queryKey: ['inventario'] })
      
      if (erroresList.length > 0) {
        const trunc = erroresList.length > 4 ? erroresList.slice(0, 4).join(', ') + ` ...y ${erroresList.length - 4} más` : erroresList.join(', ')
        toast.error('Importación con observaciones', `${exitos} exitosos. Errores en: ${trunc}`)
      } else {
        toast.success('Importación finalizada', `${exitos} procesados.`)
      }
      
      setModalImport(false)
      setPreviewData(null)
    } finally { setImportando(false) }
  }
  // ────────────────────────────────────────────────────────────────────────

  const categorias = [...new Set(productos.map(item => item.categoria).filter(Boolean))]
  const tiposConteo = [...new Set(productos.map(item => item.frecuencia_inventario).filter(Boolean))]
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

  const activeFilters = [categoriaFilter, tipoConteoFilter, estadoFilter, especificacionFilter, ubicacionFilter, empresaFilter].filter(Boolean).length

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
            <div className="flex items-center gap-3">

              <Button
                variant="white"
                className="shadow-sm h-11"
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

          {canWriteProductos && (
            <Button
              variant="outline"
              className="md:w-auto"
              onClick={() => { setModalImport(true); setPreviewData(null); if (fileRef.current) fileRef.current.value = '' }}
            >
              <Upload size={20} className="mr-2" />
              Importar
            </Button>
          )}
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
            <select value={tipoConteoFilter} onChange={e => setTipoConteoFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-primary-500 cursor-pointer">
              <option value="">Tipo de Conteo</option>
              {tiposConteo.map(t => <option key={t} value={t}>{formatLabel(t)}</option>)}
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
              setTipoConteoFilter(''); 
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
            <table className="w-full table-fixed min-w-[1100px]">
              <colgroup>
                <col style={{width: '22%'}} />
                <col style={{width: '9%'}} />
                <col style={{width: '9%'}} />
                <col style={{width: '7%'}} />
                <col style={{width: '13%'}} />
                <col style={{width: '11%'}} />
                <col style={{width: '10%'}} />
                <col style={{width: '11%'}} />
                <col style={{width: '8%'}} />
              </colgroup>
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-700">
                <tr>
                  <th onClick={() => handleSort('nombre')} className="px-3 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:text-primary-600 select-none">
                    <span className="inline-flex items-center">Producto<SortIcon column="nombre" /></span>
                  </th>
                  <th onClick={() => handleSort('especificacion')} className="px-4 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:text-primary-600 select-none">
                    <span className="inline-flex items-center">UoM de Compra<SortIcon column="especificacion" /></span>
                  </th>
                  <th onClick={() => handleSort('costo_unidad')} className="px-3 py-4 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:text-primary-600 select-none">
                    <span className="inline-flex items-center">Costo/Unidad<SortIcon column="costo_unidad" /></span>
                  </th>
                  <th onClick={() => handleSort('stock_minimo')} className="px-3 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:text-primary-600 select-none">
                    <span className="inline-flex items-center">Stock Mínimo<SortIcon column="stock_minimo" /></span>
                  </th>
                  <th onClick={() => handleSort('categoria')} className="px-3 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:text-primary-600 select-none">
                    <span className="inline-flex items-center">Categoría<SortIcon column="categoria" /></span>
                  </th>
                  <th onClick={() => handleSort('frecuencia_inventario')} className="px-3 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:text-primary-600 select-none">
                    <span className="inline-flex items-center">Tipo de Conteo<SortIcon column="frecuencia_inventario" /></span>
                  </th>
                  <th className="px-3 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Ubicaciones
                  </th>
                  <th onClick={() => handleSort('estado')} className="px-3 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:text-primary-600 select-none">
                    <span className="inline-flex items-center">Estado<SortIcon column="estado" /></span>
                  </th>
                  <th className="px-3 py-4 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
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
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                          <Package className="text-blue-600" size={20} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{item.nombre}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{item.codigo_legible || item.id}</p>
                          {item.inventariable === false && (
                            <span className="inline-flex items-center mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                              No inventariable
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <UoMBadge
                        qty={item.purchase_unit_qty}
                        symbol={unidadesDB.find(u => u.id === item.purchase_unit_id)?.abreviatura}
                        unitName={unidadesDB.find(u => u.id === item.purchase_unit_id)?.nombre || item.unidad_medida}
                        size="sm"
                      />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {item.costo_unidad ? `$${Number(item.costo_unidad).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : '-'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.stock_minimo || 0}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getCategoryColor(item.categoria)}`}>
                        {item.categoria || 'SIN CATEGORÍA'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium">
                        {item.frecuencia_inventario ? item.frecuencia_inventario.toUpperCase() : '-'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
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
                    <td className="px-3 py-3">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        item.estado === 'ACTIVO'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : 'bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300'
                      }`}>
                        {formatLabel(item.estado)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
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

      {/* Modal: Importar/Actualizar Excel */}
      {modalImport && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="relative overflow-hidden bg-gradient-ocean p-6 shrink-0 rounded-t-3xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16" />
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="text-white" size={24} />
                  <h3 className="text-xl font-bold text-white">Importar Productos</h3>
                </div>
                <button onClick={() => setModalImport(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                  <X size={20} className="text-white" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-2xl border border-blue-100 dark:border-blue-800/30 text-blue-800 dark:text-blue-300">
                <h4 className="font-bold flex items-center gap-2 mb-2"><CheckCircle size={16} /> Instrucciones Inteligentes</h4>
                <div className="text-sm space-y-2 ml-6">
                  <p><strong>Para Crear:</strong> Deja "ID Interno" vacío. <strong>(Obligatorio: Nombre)</strong></p>
                  <p><strong>Para Actualizar Masivamente:</strong> Coloca el "ID Interno" de tus productos. Puedes dejar vacías las columnas en las que no haya cambios, usando el Excel para actualizar solo precios o stocks mínimos.</p>
                  <p className="text-xs pt-2 text-blue-600 dark:text-blue-400">Columnas clave: <span className="font-mono bg-blue-100 dark:bg-blue-800/50 px-1.5 py-0.5 rounded text-[11px]">ID Interno | ... | Costo Unitario | Unidad Medida | Stock Minimo | Tipo Conteo | Categoria</span></p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <button onClick={handleDescargarPlantilla} className="flex items-center gap-2 px-4 py-2 text-sm font-bold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-all shadow-sm">
                  <Download size={16} /> Descargar plantilla
                </button>
                <div className="flex-1 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2 relative hover:border-primary-500 transition-colors cursor-pointer">
                  <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-500 font-medium">
                    <Upload size={16} /> {fileRef.current?.files?.[0]?.name || 'Haz clic para seleccionar o arrastra tu archivo Excel aquí'}
                  </div>
                </div>
              </div>
              
              {previewData && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="flex items-center justify-between mb-3 border-t border-slate-200 dark:border-slate-700 pt-6">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={18} className="text-green-600 shadow-sm rounded-full" />
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-lg">Resultados del Análisis</h4>
                    </div>
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold rounded-full">{previewData.length} productos</span>
                  </div>
                  
                  <div className="max-h-72 overflow-y-auto border border-slate-200 dark:border-slate-600 rounded-2xl shadow-inner bg-slate-50/50 dark:bg-slate-800/50">
                    <table className="w-full text-sm">
                      <thead className="bg-white dark:bg-slate-700 sticky top-0 shadow-sm z-10 border-b border-slate-200 dark:border-slate-600">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase w-28">Acción</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Producto (Nombre)</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">ID Inteligente</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Datos Detectados</th>
                          <th className="px-2 py-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 bg-white dark:bg-slate-800">
                        {previewData.map((r, i) => (
                          <tr key={i} className="group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                            <td className="px-4 py-3">
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider ${r.accion === 'ACTUALIZAR' ? 'bg-amber-100 text-amber-700 border border-amber-200' : r.accion.includes('ERROR') ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-700 border border-green-200'}`}>
                                {r.accion}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                              <span className="block">{r.nombre}</span>
                              {r.especificacion && <span className="block text-xs font-normal text-slate-500">{r.especificacion}</span>}
                              
                              {r.accion === 'ACTUALIZAR' && r.original && (
                                <div className="mt-1.5 p-1.5 bg-slate-100 dark:bg-slate-900/50 rounded-lg text-[10px] text-slate-500 font-normal">
                                  <span className="font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">Versión Actual (BD)</span>
                                  {r.original.nombre} {r.original.especificacion ? `(${r.original.especificacion})` : ''} • {r.original.unidad_medida || 'S/U'}
                                </div>
                              )}
                              
                              {r.accion.includes('ERROR') && <span className="block text-[10px] text-red-500 font-normal mt-1">Falta nombre para la creación.</span>}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-500 bg-slate-50 dark:bg-slate-900/50">{r.id || 'NUEVO'}</td>
                            <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 space-x-3">
                              {r.costo_unidad !== undefined && <span className="inline-flex bg-white dark:bg-slate-700 px-2 py-1 rounded border border-slate-200 dark:border-slate-600 shadow-sm">Costo: <strong className="text-slate-800 dark:text-slate-200 ml-1">${Number(r.costo_unidad).toLocaleString()}</strong></span>}
                              {r.unidad_medida && <span className="inline-flex bg-white dark:bg-slate-700 px-2 py-1 rounded border border-slate-200 dark:border-slate-600 shadow-sm">U: <strong className="text-slate-800 dark:text-slate-200 ml-1">{r.unidad_medida}</strong></span>}
                              {r.stock_minimo !== undefined && <span className="inline-flex bg-white dark:bg-slate-700 px-2 py-1 rounded border border-slate-200 dark:border-slate-600 shadow-sm">Min: <strong className="text-slate-800 dark:text-slate-200 ml-1">{r.stock_minimo}</strong></span>}
                              {r.frecuencia_inventario && <span className="inline-flex bg-white dark:bg-slate-700 px-2 py-1 rounded border border-slate-200 dark:border-slate-600 shadow-sm">Conteo: <strong className="text-slate-800 dark:text-slate-200 ml-1">{r.frecuencia_inventario}</strong></span>}
                              {r.categoria && <span className="inline-flex bg-white dark:bg-slate-700 px-2 py-1 rounded border border-slate-200 dark:border-slate-600 shadow-sm">Cat: <strong className="text-slate-800 dark:text-slate-200 ml-1">{r.categoria}</strong></span>}
                            </td>
                            <td className="px-2 py-3 text-right">
                              <button 
                                onClick={() => setPreviewData(prev => prev.filter((_, idx) => idx !== i))}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg opacity-0 group-hover:opacity-100 transition-all outline-none"
                                title="Descartar fila"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 shrink-0">
              <Button variant="outline" onClick={() => { setModalImport(false); setPreviewData(null) }}>Cancelar y Cerrar</Button>
              <Button onClick={handleConfirmarImport} disabled={!previewData?.length || importando} loading={importando}>
                <Save size={16} className="mr-2" /> Ejecutar Cambios ({previewData?.length || 0})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
