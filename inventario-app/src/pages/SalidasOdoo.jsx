import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import {
  BookOpen, Plus, Search, Download, Upload, Edit2, Trash2,
  ChevronDown, ChevronUp, X, Save, Package, DollarSign,
  FileSpreadsheet, CheckCircle, ArrowDownLeft,
  MapPin, Clock, CheckCircle2, XCircle, Store
} from 'lucide-react'
import { useSalidasOdoo } from '../hooks/useSalidasOdoo'
import { useToastStore } from '../stores/toastStore'
import { usePermissions } from '../hooks/usePermissions'
import dataService from '../services/dataService'
import LoadingSpinner from '../components/common/LoadingSpinner'
import Button from '../components/common/Button'

// ─── Utils ────────────────────────────────────────────────────────────────────

function calcularCostoTotal(ingredientes = []) {
  return ingredientes.reduce((s, i) => s + (i.costo_unitario || 0) * (i.cantidad || 0), 0)
}

function fmtCosto(n) {
  return typeof n === 'number' ? `$${n.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00'
}

function exportarRecetarios(recetarios) {
  if (!recetarios || recetarios.length === 0) return 0

  const dataToExport = recetarios.map(rec => ({
    'ID Interno': rec.id || '',
    'Nombre': rec.nombre || '',
    'SKU Odoo': rec.sku_odoo || '',
    'SKU Template': rec.sku_template || '',
    'Cantidad Ingredientes': rec.ingredientes?.length || 0,
    'Costo Total': rec.costo_total || 0,
    'Activo': rec.activo !== false ? 'Sí' : 'No'
  }))

  const ws = XLSX.utils.json_to_sheet(dataToExport)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Recetas')
  XLSX.writeFile(wb, `recetas_${new Date().toISOString().split('T')[0]}.xlsx`)
  return recetarios.length
}

function parseExcelRecetarios(buffer, productos = []) {
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  const dataRows = rows.slice(1).filter(r => r[0] || r[1])

  // Build lookup by codigo_legible (uppercase) for auto-linking
  const prodByCodigo = new Map()
  for (const p of productos) {
    if (p.codigo_legible) prodByCodigo.set(p.codigo_legible.toUpperCase(), p)
  }

  const map = new Map()
  for (const row of dataRows) {
    const nombre    = String(row[0] || '').trim()
    const skuOdoo   = String(row[1] || '').trim().toUpperCase()
    const ingNombre = String(row[2] || '').trim()
    const ingSku    = String(row[3] || '').trim().toUpperCase()
    const cantidad  = parseFloat(row[4]) || 0
    const unidad    = String(row[5] || '').trim()
    const costo     = parseFloat(row[6]) || 0
    if (!skuOdoo || !ingNombre) continue
    if (!map.has(skuOdoo)) map.set(skuOdoo, { nombre, sku_odoo: skuOdoo, ingredientes: [] })

    // Auto-link: match SKU_Ing against producto.codigo_legible
    const matchedProd = ingSku ? prodByCodigo.get(ingSku) : null
    map.get(skuOdoo).ingredientes.push({
      nombre: matchedProd ? matchedProd.nombre : ingNombre,
      sku: ingSku || null,
      producto_id: matchedProd ? matchedProd.id : null,
      especificacion: matchedProd?.especificacion || '',
      cantidad,
      unidad_medida: matchedProd ? (matchedProd.unidad_medida || unidad) : unidad,
      costo_unitario: matchedProd ? (matchedProd.costo_unidad || costo) : costo
    })
  }
  return Array.from(map.values())
}

const TABS = [
  { id: 'recetas', label: 'Recetas (BOM)', icon: BookOpen },
  { id: 'mapeo_pos', label: 'Mapeo POS', icon: MapPin },
  { id: 'salidas', label: 'Salidas', icon: ArrowDownLeft }
]

// ─── Componente principal: Salidas Odoo (módulo unificado) ────────────────────

export default function SalidasOdoo() {
  const [activeTab, setActiveTab] = useState('recetas')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-ocean p-6 shadow-card">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <Store className="text-white" size={28} />
            <h1 className="text-3xl font-bold text-white">Salidas Odoo</h1>
          </div>
          <p className="text-white/90">Recetas BOM, mapeo de puntos de venta y salidas automáticas de inventario</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-100 dark:border-slate-700">
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
                  isActive
                    ? 'border-primary-600 text-primary-700 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-900/10'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/30'
                }`}>
                <Icon size={18} />{tab.label}
              </button>
            )
          })}
        </div>
        <div className="p-6">
          {activeTab === 'recetas' && <TabRecetas />}
          {activeTab === 'mapeo_pos' && <TabMapeoPOS />}
          {activeTab === 'salidas' && <TabSalidas />}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1: RECETAS (BOM)
// ═══════════════════════════════════════════════════════════════════════════════

function TabRecetas() {
  const { recetas: recetarios, isLoading, crearReceta: crearRecetario, actualizarReceta: actualizarRecetario, eliminarReceta: eliminarRecetario, importarRecetas: importarRecetarios } = useSalidasOdoo()
  const toast = useToastStore()
  const { canEdit, canDelete: canDeletePerm, isReadOnly } = usePermissions()
  const { data: productosParaImport = [] } = useQuery({ queryKey: ['productos'], queryFn: () => dataService.getProductos() })
  const canWrite = canEdit('salidas_odoo')
  const canDel   = canDeletePerm('salidas_odoo')
  const readOnly = isReadOnly('recetarios')

  const [busqueda, setBusqueda] = useState('')
  const [expandido, setExpandido] = useState(null)
  const [modalForm, setModalForm] = useState(false)
  const [modalImport, setModalImport] = useState(false)
  const [editando, setEditando] = useState(null)
  const [preview, setPreview] = useState(null)
  const [importando, setImportando] = useState(false)
  const fileRef = useRef()

  const recetasFiltradas = (recetarios || []).filter(r => {
    if (!busqueda) return r.activo !== false
    const b = busqueda.toLowerCase()
    return r.activo !== false && (r.nombre?.toLowerCase().includes(b) || r.sku_odoo?.toLowerCase().includes(b))
  })

  const handleEliminar = async (id, nombre) => {
    if (!window.confirm(`¿Eliminar receta "${nombre}"?`)) return
    try { await eliminarRecetario.mutateAsync(id); toast.success('Eliminada', `Receta "${nombre}" eliminada`) }
    catch { toast.error('Error', 'Error al eliminar') }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try { setPreview(parseExcelRecetarios(await file.arrayBuffer(), productosParaImport)) }
    catch (err) { toast.error('Error', `Error al leer Excel: ${err.message}`) }
  }

  const handleConfirmarImport = async () => {
    if (!preview?.length) return
    setImportando(true)
    try { await importarRecetarios.mutateAsync(preview); toast.success('Importadas', `${preview.length} recetas importadas`); setModalImport(false); setPreview(null) }
    catch { toast.error('Error', 'Error al importar') }
    finally { setImportando(false) }
  }

  const handleDescargarPlantilla = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Producto', 'SKU_Odoo', 'Ingrediente', 'SKU_Ing (codigo_legible)', 'Cantidad', 'Unidad', 'Costo_Unit'],
      ['Bubble Tea', 'BB-TEA-M', 'Té Negro Base', 'PROD00001', 200, 'ml', 0.012],
      ['Bubble Tea', 'BB-TEA-M', 'Perlas de Tapioca', 'PROD00003', 50, 'g', 0.08],
      ['Yogo Fresa', 'YG-FRESA-M', 'Base de Yogur', 'PROD00005', 250, 'ml', 0.02],
      ['Yogo Fresa', 'YG-FRESA-M', 'Fresas Congeladas', 'PROD00006', 80, 'g', 0.06],
      ['Maracuya Fusion', 'MA-FUSION-M', 'Jugo de Maracuyá', 'PROD00008', 150, 'ml', 0.025],
      ['Maracuya Fusion', 'MA-FUSION-M', 'Leche de Coco', 'PROD00009', 100, 'ml', 0.015],
      ['Taro Boba', 'TA-BOBA-M', 'Polvo de Taro', 'PROD00002', 30, 'g', 0.15],
      ['Taro Boba', 'TA-BOBA-M', 'Perlas de Tapioca', 'PROD00003', 50, 'g', 0.08],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Recetas')
    XLSX.writeFile(wb, 'plantilla_recetas.xlsx')
  }

  return (
    <div className="space-y-5">
      {/* Actions bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Buscar receta por nombre o SKU..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { const c = exportarRecetarios(recetasFiltradas); if (c) toast.success('Exportado', `${c} recetas exportadas`) }}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors">
            <Download size={15} /> Exportar
          </button>
          {canWrite && (
            <>
              <button onClick={() => { setModalImport(true); setPreview(null) }}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors">
                <Upload size={15} /> Importar
              </button>
              <Button size="sm" onClick={() => { setEditando(null); setModalForm(true) }}>
                <Plus size={15} className="mr-1.5" /> Nueva Receta
              </Button>
            </>
          )}
        </div>
      </div>
      <p className="text-xs text-slate-500">{recetasFiltradas.length} receta{recetasFiltradas.length !== 1 ? 's' : ''}</p>

      {/* Table */}
      {isLoading ? <LoadingSpinner text="Cargando recetas..." /> : recetasFiltradas.length === 0 ? (
        <div className="py-12 text-center">
          <BookOpen size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">{busqueda ? 'Sin resultados' : 'No hay recetas. Crea una nueva o importa desde Excel.'}</p>
          {canWrite && !busqueda && (
            <Button variant="primary" className="mt-4" onClick={() => { setEditando(null); setModalForm(true) }}>
              <Plus size={16} className="mr-1.5" /> Nueva Receta
            </Button>
          )}
        </div>
      ) : (
        <div className="border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-4 py-3 w-8"></th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Producto Odoo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">SKU Odoo</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Ingredientes</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Costo Total</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {recetasFiltradas.map(rec => (
                <RecetaRow key={rec.id} rec={rec} expandido={expandido} setExpandido={setExpandido}
                  canWrite={canWrite} canDel={canDel}
                  onEdit={() => { setEditando(rec); setModalForm(true) }}
                  onDelete={() => handleEliminar(rec.id, rec.nombre)} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalForm && (
        <ModalReceta receta={editando} readOnly={readOnly}
          onClose={() => { setModalForm(false); setEditando(null) }}
          onCreate={async (data) => { await crearRecetario.mutateAsync(data); toast.success('Creada', 'Receta creada'); setModalForm(false) }}
          onUpdate={async (id, data) => { await actualizarRecetario.mutateAsync({ id, data }); toast.success('Actualizada', 'Receta actualizada'); setModalForm(false); setEditando(null) }}
        />
      )}

      {modalImport && (
        <ModalImportExcel fileRef={fileRef} preview={preview} importando={importando}
          onFileChange={handleFileChange} onDescargar={handleDescargarPlantilla}
          onConfirmar={handleConfirmarImport} onClose={() => { setModalImport(false); setPreview(null) }} />
      )}
    </div>
  )
}

// ─── Receta Row (expandable) ──────────────────────────────────────────────────

function RecetaRow({ rec, expandido, setExpandido, canWrite, canDel, onEdit, onDelete }) {
  const isOpen = expandido === rec.id
  return (
    <>
      <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors"
        onClick={() => setExpandido(isOpen ? null : rec.id)}>
        <td className="px-4 py-3">{isOpen ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-blue-500 shrink-0" />
            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">{rec.nombre}</span>
          </div>
        </td>
        <td className="px-4 py-3"><span className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-semibold">{rec.sku_odoo}</span></td>
        <td className="px-4 py-3 text-center"><span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-xs font-semibold">{rec.ingredientes?.length || 0}</span></td>
        <td className="px-4 py-3 text-right font-bold text-sm text-slate-900 dark:text-slate-100">{fmtCosto(rec.costo_total)}</td>
        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
          <div className="flex justify-end gap-1">
            <button onClick={onEdit} disabled={!canWrite} className={`p-1.5 rounded-lg transition-colors ${canWrite ? 'text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30' : 'text-slate-300 cursor-not-allowed'}`}><Edit2 size={14} /></button>
            {canDel && <button onClick={onDelete} className="p-1.5 text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded-lg transition-colors"><Trash2 size={14} /></button>}
          </div>
        </td>
      </tr>
      {isOpen && (
        <tr>
          <td colSpan={6} className="px-4 pb-3 bg-slate-50 dark:bg-slate-700/20">
            <div className="rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-100 dark:bg-slate-600/50">
                  {['Ingrediente', 'SKU', 'Espec.', 'Cantidad', 'Unidad', 'Costo/u', 'Subtotal'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-600 bg-white dark:bg-slate-800">
                  {(rec.ingredientes || []).map((ing, j) => (
                    <tr key={j}>
                      <td className="px-3 py-2"><div className="flex items-center gap-1.5"><Package size={13} className="text-slate-400" /><span className="font-medium text-slate-800 dark:text-slate-200">{ing.nombre}</span></div></td>
                      <td className="px-3 py-2 text-xs text-slate-500 font-mono">{ing.sku || '—'}</td>
                      <td className="px-3 py-2 text-xs text-slate-500">{ing.especificacion || '—'}</td>
                      <td className="px-3 py-2 text-right font-semibold">{ing.cantidad}</td>
                      <td className="px-3 py-2 text-xs text-slate-500">{ing.unidad_medida}</td>
                      <td className="px-3 py-2 text-right">{fmtCosto(ing.costo_unitario)}</td>
                      <td className="px-3 py-2 text-right font-bold">{fmtCosto((ing.costo_unitario || 0) * (ing.cantidad || 0))}</td>
                    </tr>
                  ))}
                  <tr className="bg-primary-50 dark:bg-primary-900/20">
                    <td colSpan={6} className="px-3 py-2 text-right text-xs font-bold text-primary-700 dark:text-primary-300">Costo total:</td>
                    <td className="px-3 py-2 text-right font-bold text-primary-700 dark:text-primary-300">{fmtCosto(rec.costo_total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Modal: Nueva / Editar Receta ─────────────────────────────────────────────

function ModalReceta({ receta, readOnly, onClose, onCreate, onUpdate }) {
  const initial = receta || { nombre: '', sku_odoo: '', sku_template: '', ingredientes: [] }
  const [form, setForm] = useState({
    nombre: initial.nombre || '', sku_odoo: initial.sku_odoo || '', sku_template: initial.sku_template || '',
    ingredientes: initial.ingredientes?.length ? initial.ingredientes.map(ing => ({ ...ing })) : []
  })
  const [guardando, setGuardando] = useState(false)
  const [activeSearchRow, setActiveSearchRow] = useState(null)
  const [prodSearchTerm, setProdSearchTerm] = useState('')

  const { data: productos = [], isLoading: loadingProductos } = useQuery({ queryKey: ['productos'], queryFn: () => dataService.getProductos() })
  const productosActivos = productos.filter(p => p.estado !== 'INACTIVO' && p.estado !== 'ELIMINADO')
  const productosFiltrados = prodSearchTerm.length > 1
    ? productosActivos.filter(p =>
        p.nombre?.toLowerCase().includes(prodSearchTerm.toLowerCase()) ||
        String(p.codigo_legible || p.id).toLowerCase().includes(prodSearchTerm.toLowerCase()) ||
        (p.especificacion || '').toLowerCase().includes(prodSearchTerm.toLowerCase())
      ).slice(0, 15)
    : []

  const costoTotal = calcularCostoTotal(form.ingredientes)
  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const addIngrediente = () => {
    setForm(f => ({ ...f, ingredientes: [...f.ingredientes, { nombre: '', sku: '', producto_id: null, especificacion: '', cantidad: 0, unidad_medida: '', costo_unitario: 0 }] }))
    setTimeout(() => { setActiveSearchRow(form.ingredientes.length); setProdSearchTerm('') }, 50)
  }

  const selectProductForIngrediente = (i, prod) => {
    setForm(f => ({ ...f, ingredientes: f.ingredientes.map((ing, idx) => idx === i ? {
      ...ing, nombre: prod.nombre, sku: prod.codigo_legible || prod.id, producto_id: prod.id,
      especificacion: prod.especificacion || '', unidad_medida: prod.unidad_medida || '', costo_unitario: prod.costo_unidad || 0
    } : ing) }))
    setActiveSearchRow(null); setProdSearchTerm('')
  }

  const clearProduct = (i) => {
    setForm(f => ({ ...f, ingredientes: f.ingredientes.map((ing, idx) => idx === i ? { ...ing, nombre: '', sku: '', producto_id: null, especificacion: '', unidad_medida: '', costo_unitario: 0 } : ing) }))
    setActiveSearchRow(i); setProdSearchTerm('')
  }

  const updateCantidad = (i, v) => {
    const val = v === '' ? 0 : parseFloat(parseFloat(v).toFixed(3)) || 0
    setForm(f => ({ ...f, ingredientes: f.ingredientes.map((ing, idx) => idx === i ? { ...ing, cantidad: val } : ing) }))
  }

  const removeIngrediente = (i) => {
    setForm(f => ({ ...f, ingredientes: f.ingredientes.filter((_, idx) => idx !== i) }))
    if (activeSearchRow === i) setActiveSearchRow(null)
  }

  const handleSubmit = async () => {
    if (!form.nombre || !form.sku_odoo) return
    setGuardando(true)
    try { receta ? await onUpdate(receta.id, form) : await onCreate(form) }
    finally { setGuardando(false) }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[85vh] flex flex-col">
        <div className="relative overflow-hidden bg-gradient-ocean p-5 shrink-0 rounded-t-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3"><BookOpen className="text-white" size={22} /><h2 className="text-xl font-bold text-white">{receta ? 'Editar Receta' : 'Nueva Receta'}</h2></div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-xl"><X className="text-white" size={20} /></button>
          </div>
        </div>
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
              <div className="md:col-span-3">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nombre del producto Odoo</label>
                <input value={form.nombre} onChange={e => setField('nombre', e.target.value)} disabled={readOnly} placeholder="ej: Bubble Tea Taro"
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 disabled:opacity-60" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">SKU Odoo</label>
                <input value={form.sku_odoo} onChange={e => setField('sku_odoo', e.target.value.toUpperCase())} disabled={readOnly} placeholder="ej: BB-TARO-M"
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 font-mono disabled:opacity-60" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">SKU Template <span className="text-slate-400 font-normal">(opcional)</span></label>
                <input value={form.sku_template} onChange={e => setField('sku_template', e.target.value.toUpperCase())} disabled={readOnly} placeholder="ej: BB-TARO"
                  className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 font-mono disabled:opacity-60" />
              </div>
            </div>
            <div className="flex flex-col" style={{ minHeight: '300px', maxHeight: '500px' }}>
              <div className="flex items-center justify-between mb-3 shrink-0">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Package size={18} className="text-primary-600" /> Ingredientes (Materiales)
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-full text-xs font-semibold">{form.ingredientes.length}</span>
                </h4>
                {!readOnly && <Button size="sm" onClick={addIngrediente}><Plus size={15} className="mr-1.5" /> Agregar</Button>}
              </div>
              <div className="border border-slate-200 dark:border-slate-600 rounded-xl flex-1 flex flex-col overflow-hidden">
                {form.ingredientes.length === 0 ? (
                  <div className="py-10 text-center"><Package size={36} className="mx-auto text-slate-300 mb-2" /><p className="text-sm text-slate-500">Sin ingredientes. Busca y agrega productos del inventario.</p></div>
                ) : (
                  <div className="overflow-y-auto overflow-x-visible flex-1">
                  <table className="w-full table-fixed">
                    <colgroup>
                      <col className="w-[35%]" />
                      <col className="w-[12%]" />
                      <col className="w-[8%]" />
                      <col className="w-[13%]" />
                      <col className="w-[12%]" />
                      <col className="w-[14%]" />
                      <col className="w-[6%]" />
                    </colgroup>
                    <thead className="bg-slate-50 dark:bg-slate-700/50 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Producto</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Espec.</th>
                        <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Unidad</th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Costo/u</th>
                        <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Cantidad</th>
                        <th className="px-3 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Subtotal</th>
                        <th className="px-2 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
                      {form.ingredientes.map((ing, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2">
                            <div className="relative">
                              {ing.producto_id && activeSearchRow !== i ? (
                                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                                  <Package size={13} className="text-green-600 shrink-0" />
                                  <span className="text-sm font-medium text-green-800 dark:text-green-300 truncate flex-1">{ing.nombre}</span>
                                  {!readOnly && <button type="button" onClick={() => clearProduct(i)} className="shrink-0 p-0.5 hover:bg-green-200 rounded"><X size={11} className="text-green-600" /></button>}
                                </div>
                              ) : (
                                <div>
                                  <div className="relative">
                                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input type="text" placeholder={loadingProductos ? 'Cargando...' : 'Buscar producto...'}
                                      value={activeSearchRow === i ? prodSearchTerm : (ing.nombre || '')}
                                      onFocus={() => { setActiveSearchRow(i); setProdSearchTerm(ing.nombre || '') }}
                                      onChange={e => { setActiveSearchRow(i); setProdSearchTerm(e.target.value) }}
                                      onBlur={() => setTimeout(() => setActiveSearchRow(prev => prev === i ? null : prev), 200)}
                                      disabled={readOnly}
                                      className="w-full pl-7 pr-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500 disabled:opacity-60" />
                                  </div>
                                  {activeSearchRow === i && prodSearchTerm.length > 1 && (
                                    <div className="absolute z-[100] left-0 right-0 mt-1 max-h-[500px] overflow-y-auto bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl shadow-xl">
                                      {productosFiltrados.length === 0 ? (
                                        <div className="p-3 text-center text-sm text-slate-500">No se encontraron productos</div>
                                      ) : productosFiltrados.map(prod => (
                                        <button key={prod.id} type="button" onMouseDown={() => selectProductForIngrediente(i, prod)}
                                          className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-primary-50 dark:hover:bg-slate-600 text-left border-b border-slate-100 dark:border-slate-600 last:border-0">
                                          <Package size={14} className="text-primary-600 shrink-0" />
                                          <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{prod.nombre}</p>
                                            <p className="text-xs text-slate-400">{prod.codigo_legible || prod.id}{prod.especificacion ? ` · ${prod.especificacion}` : ''}{prod.unidad_medida ? ` · ${prod.unidad_medida}` : ''}{prod.costo_unidad ? ` · $${Number(prod.costo_unidad).toLocaleString()}` : ''}</p>
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400 truncate">{ing.especificacion || '—'}</td>
                          <td className="px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400">{ing.unidad_medida || '—'}</td>
                          <td className="px-3 py-2.5 text-sm text-right font-medium text-slate-700 dark:text-slate-300">{fmtCosto(ing.costo_unitario)}</td>
                          <td className="px-3 py-2.5">
                            <input type="number" value={ing.cantidad || ''} onChange={e => updateCantidad(i, e.target.value)}
                              disabled={readOnly} min={0} step="0.001" placeholder="0.000"
                              className="w-full px-2.5 py-2 text-sm text-center font-bold border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 disabled:opacity-60" />
                          </td>
                          <td className="px-3 py-2.5 text-right text-sm font-bold text-slate-900 dark:text-slate-100">{fmtCosto((ing.costo_unitario || 0) * (ing.cantidad || 0))}</td>
                          <td className="px-2 py-2.5 text-center">
                            {!readOnly && <button type="button" onClick={() => removeIngrediente(i)} className="p-1.5 text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded-lg transition-colors"><Trash2 size={14} /></button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between px-6 py-3 mx-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl shrink-0">
            <span className="text-sm font-semibold text-green-800 dark:text-green-300 flex items-center gap-2"><DollarSign size={16} /> Costo total de la receta</span>
            <span className="text-lg font-bold text-green-800 dark:text-green-300">{fmtCosto(costoTotal)}</span>
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-700 shrink-0">
          <Button variant="outline" onClick={onClose} disabled={guardando}>{readOnly ? 'Cerrar' : 'Cancelar'}</Button>
          {!readOnly && <Button onClick={handleSubmit} disabled={!form.nombre || !form.sku_odoo || guardando} loading={guardando}><Save size={16} className="mr-2" /> {receta ? 'Actualizar' : 'Crear Receta'}</Button>}
        </div>
      </div>
    </div>
  )
}

// ─── Modal: Importar Excel ────────────────────────────────────────────────────

function ModalImportExcel({ fileRef, preview, importando, onFileChange, onDescargar, onConfirmar, onClose }) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3"><FileSpreadsheet size={22} className="text-green-600" /><h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Importar Recetas desde Excel</h3></div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X size={20} className="text-slate-500" /></button>
        </div>
        <div className="p-5 overflow-y-auto max-h-[calc(90vh-80px)] space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">Columnas: <span className="font-semibold">Producto | SKU_Odoo | Ingrediente | SKU_Ing | Cantidad | Unidad | Costo_Unit</span></p>
          <button onClick={onDescargar} className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl"><Download size={16} /> Descargar plantilla</button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={onFileChange} className="block text-sm text-slate-600" />
          {preview && (
            <div>
              <div className="flex items-center gap-2 mb-2"><CheckCircle size={18} className="text-green-600" /><p className="font-semibold text-slate-800 dark:text-slate-200">{preview.length} recetas detectadas</p></div>
              <div className="max-h-52 overflow-y-auto border border-slate-200 dark:border-slate-600 rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-700 sticky top-0"><tr>
                    {['Nombre', 'SKU Odoo', 'Ing.', 'Costo'].map(h => <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-600">
                    {preview.map((r, i) => <tr key={i}><td className="px-3 py-2 font-medium">{r.nombre}</td><td className="px-3 py-2"><span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">{r.sku_odoo}</span></td><td className="px-3 py-2 text-center">{r.ingredientes.length}</td><td className="px-3 py-2 font-semibold">{fmtCosto(calcularCostoTotal(r.ingredientes))}</td></tr>)}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={onConfirmar} disabled={!preview?.length || importando} loading={importando}><Upload size={16} className="mr-2" /> Confirmar ({preview?.length || 0})</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2: MAPEO POS (Odoo POS ↔ App Ubicación)
// ═══════════════════════════════════════════════════════════════════════════════

function TabMapeoPOS() {
  const queryClient = useQueryClient()
  const toast = useToastStore()
  const { canEdit } = usePermissions()
  const canWrite = canEdit('salidas_odoo')

  const { data: mapeos = [], isLoading } = useQuery({ queryKey: ['mapeo-pos'], queryFn: () => dataService.getMapeoPOS() })
  const { data: ubicaciones = [] } = useQuery({ queryKey: ['ubicaciones'], queryFn: () => dataService.getUbicaciones() })
  const { data: empresas = [] } = useQuery({ queryKey: ['empresas'], queryFn: () => dataService.getEmpresas() })

  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState({ odoo_pos_name: '', odoo_pos_id: '', ubicacion_id: '', notas: '' })
  const [sincronizando, setSincronizando] = useState(false)

  const ubicacionesActivas = ubicaciones.filter(u => u.estado !== 'INACTIVO' && u.estado !== 'ELIMINADO')

  const crearMapeo = useMutation({
    mutationFn: (data) => dataService.createMapeoPOS(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['mapeo-pos'] }); toast.success('Creado', 'Mapeo POS creado'); resetForm() },
    onError: () => toast.error('Error', 'Error al crear mapeo')
  })

  const actualizarMapeo = useMutation({
    mutationFn: ({ id, data }) => dataService.updateMapeoPOS(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['mapeo-pos'] }); toast.success('Actualizado', 'Mapeo actualizado'); resetForm() },
    onError: () => toast.error('Error', 'Error al actualizar')
  })

  const eliminarMapeo = useMutation({
    mutationFn: (id) => dataService.deleteMapeoPOS(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['mapeo-pos'] }); toast.success('Eliminado', 'Mapeo eliminado') },
    onError: () => toast.error('Error', 'Error al eliminar')
  })

  const resetForm = () => { setShowForm(false); setEditando(null); setForm({ odoo_pos_name: '', odoo_pos_id: '', ubicacion_id: '', notas: '' }) }

  const handleEdit = (mapeo) => {
    setEditando(mapeo)
    setForm({ odoo_pos_name: mapeo.odoo_pos_name || '', odoo_pos_id: mapeo.odoo_pos_id || '', ubicacion_id: mapeo.ubicacion_id || '', notas: mapeo.notas || '' })
    setShowForm(true)
  }

  const handleSubmit = () => {
    if (!form.odoo_pos_name || !form.ubicacion_id) return
    editando ? actualizarMapeo.mutate({ id: editando.id, data: form }) : crearMapeo.mutate(form)
  }

  const getUbicacionNombre = (id) => {
    const ub = ubicaciones.find(u => u.id === id)
    const emp = ub ? empresas.find(e => e.id === ub.empresa_id) : null
    return ub ? `${ub.nombre}${emp ? ` (${emp.nombre})` : ''}` : id
  }

  const handleSincronizarOdoo = async () => {
    setSincronizando(true)
    try {
      const response = await dataService.getOdooPOS()
      const posList = response.posList || []
      
      if (posList.length === 0) {
        toast.info('Sin datos', 'No se encontraron puntos de venta en Odoo')
        return
      }

      let creados = 0
      for (const pos of posList) {
        const existe = mapeos.find(m => 
          m.odoo_pos_name === pos.name || 
          String(m.odoo_pos_id) === String(pos.id)
        )
        
        if (!existe) {
          await dataService.createMapeoPOS({
            odoo_pos_name: pos.name,
            odoo_pos_id: String(pos.id),
            ubicacion_id: '',
            notas: 'Importado automáticamente desde Odoo'
          })
          creados++
        }
      }
      
      if (creados > 0) {
        queryClient.invalidateQueries({ queryKey: ['mapeo-pos'] })
        toast.success('Sincronizado', `Se importaron ${creados} nuevos puntos de venta`)
      } else {
        toast.info('Ya sincronizado', 'Todos los puntos de venta ya están configurados')
      }
    } catch (error) {
      console.error('Error sincronizando POS:', error)
      toast.error('Error', 'No se pudo conectar con Odoo. Verifica las credenciales.')
    } finally {
      setSincronizando(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-600 dark:text-slate-400">Configura qué Punto de Venta de Odoo corresponde a cada ubicación en la app.</p>
          <p className="text-xs text-slate-400 mt-1">Esto determina de qué ubicación se descuentan los ingredientes cuando llega una venta.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSincronizarOdoo} loading={sincronizando} disabled={sincronizando}>
            <Download size={15} className="mr-1.5" /> Sincronizar con Odoo
          </Button>
          {canWrite && <Button size="sm" onClick={() => { resetForm(); setShowForm(true) }}><Plus size={15} className="mr-1.5" /> Nuevo Mapeo</Button>}
        </div>
      </div>

      {showForm && (
        <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-5 border border-slate-200 dark:border-slate-600 space-y-4">
          <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{editando ? 'Editar Mapeo' : 'Nuevo Mapeo POS'}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Nombre del POS en Odoo</label>
              <input value={form.odoo_pos_name} onChange={e => setForm(f => ({ ...f, odoo_pos_name: e.target.value }))} placeholder="ej: Tienda Centro"
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">ID del POS en Odoo <span className="text-slate-400 font-normal">(opcional)</span></label>
              <input value={form.odoo_pos_id} onChange={e => setForm(f => ({ ...f, odoo_pos_id: e.target.value }))} placeholder="ej: 5"
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500 font-mono" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Ubicación en la App <span className="text-danger-500">*</span></label>
              <select value={form.ubicacion_id} onChange={e => setForm(f => ({ ...f, ubicacion_id: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500">
                <option value="">Seleccionar ubicación...</option>
                {ubicacionesActivas.map(ub => {
                  const emp = empresas.find(e => e.id === ub.empresa_id)
                  return <option key={ub.id} value={ub.id}>{ub.nombre}{emp ? ` (${emp.nombre})` : ''}</option>
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Notas</label>
              <input value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} placeholder="Notas opcionales"
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={resetForm}>Cancelar</Button>
            <Button size="sm" onClick={handleSubmit} disabled={!form.odoo_pos_name || !form.ubicacion_id}><Save size={14} className="mr-1.5" /> {editando ? 'Actualizar' : 'Guardar'}</Button>
          </div>
        </div>
      )}

      {isLoading ? <LoadingSpinner text="Cargando mapeos..." /> : mapeos.length === 0 ? (
        <div className="py-12 text-center"><MapPin size={48} className="mx-auto text-slate-300 mb-3" /><p className="text-slate-500">No hay mapeos POS configurados.</p></div>
      ) : (
        <div className="border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700/50"><tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">POS Odoo</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">ID Odoo</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Ubicación App</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Notas</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Acciones</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {mapeos.filter(m => m.activo !== false).map(m => (
                <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><Store size={16} className="text-purple-500" /><span className="font-semibold text-sm text-slate-900 dark:text-slate-100">{m.odoo_pos_name}</span></div></td>
                  <td className="px-4 py-3 text-sm font-mono text-slate-500">{m.odoo_pos_id || '—'}</td>
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><MapPin size={14} className="text-green-500" /><span className="text-sm text-slate-700 dark:text-slate-300">{getUbicacionNombre(m.ubicacion_id)}</span></div></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{m.notas || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {canWrite && <button onClick={() => handleEdit(m)} className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg"><Edit2 size={14} /></button>}
                      {canWrite && <button onClick={() => { if (window.confirm('¿Eliminar este mapeo?')) eliminarMapeo.mutate(m.id) }} className="p-1.5 text-danger-600 hover:bg-danger-50 rounded-lg"><Trash2 size={14} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3: SALIDAS (Auto-generated exits from Odoo sales)
// ═══════════════════════════════════════════════════════════════════════════════

function TabSalidas() {
  const { data: salidas = [], isLoading } = useQuery({ queryKey: ['salidas-odoo'], queryFn: () => dataService.getSalidasOdoo() })
  const [filtroEstado, setFiltroEstado] = useState('')

  const salidasFiltradas = filtroEstado ? salidas.filter(s => s.estado === filtroEstado) : salidas

  const formatFecha = (ts) => {
    if (!ts) return '—'
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const estadoBadge = (estado) => {
    const map = { PENDIENTE: 'bg-amber-100 text-amber-700', PROCESADA: 'bg-green-100 text-green-700', COMPLETADA: 'bg-green-100 text-green-700', ERROR: 'bg-red-100 text-red-700' }
    return map[estado] || 'bg-slate-100 text-slate-700'
  }

  const pendientes = salidas.filter(s => s.estado === 'PENDIENTE').length
  const procesadas = salidas.filter(s => s.estado === 'PROCESADA' || s.estado === 'COMPLETADA').length
  const errores    = salidas.filter(s => s.estado === 'ERROR').length

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
          <p className="text-xs text-slate-500 uppercase font-semibold">Total</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{salidas.length}</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-4 border border-amber-200 dark:border-amber-800 cursor-pointer hover:ring-2 hover:ring-amber-300"
          onClick={() => setFiltroEstado(f => f === 'PENDIENTE' ? '' : 'PENDIENTE')}>
          <p className="text-xs text-amber-600 uppercase font-semibold flex items-center gap-1"><Clock size={12} /> Pendientes</p>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{pendientes}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/10 rounded-xl p-4 border border-green-200 dark:border-green-800 cursor-pointer hover:ring-2 hover:ring-green-300"
          onClick={() => setFiltroEstado(f => f === 'PROCESADA' ? '' : 'PROCESADA')}>
          <p className="text-xs text-green-600 uppercase font-semibold flex items-center gap-1"><CheckCircle2 size={12} /> Procesadas</p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">{procesadas}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/10 rounded-xl p-4 border border-red-200 dark:border-red-800 cursor-pointer hover:ring-2 hover:ring-red-300"
          onClick={() => setFiltroEstado(f => f === 'ERROR' ? '' : 'ERROR')}>
          <p className="text-xs text-red-600 uppercase font-semibold flex items-center gap-1"><XCircle size={12} /> Errores</p>
          <p className="text-2xl font-bold text-red-700 dark:text-red-300">{errores}</p>
        </div>
      </div>

      {filtroEstado && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Filtrando por:</span>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${estadoBadge(filtroEstado)}`}>{filtroEstado}</span>
          <button onClick={() => setFiltroEstado('')} className="p-1 hover:bg-slate-100 rounded"><X size={14} className="text-slate-400" /></button>
        </div>
      )}

      {isLoading ? <LoadingSpinner text="Cargando salidas..." /> : salidasFiltradas.length === 0 ? (
        <div className="py-12 text-center">
          <ArrowDownLeft size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">{salidas.length === 0 ? 'No hay salidas registradas. Se generan automáticamente al recibir ventas desde Odoo.' : 'No hay salidas con ese filtro.'}</p>
        </div>
      ) : (
        <div className="border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700/50"><tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Orden</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Producto Odoo</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Ubicación</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Cantidad</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Fecha</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Estado</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {salidasFiltradas.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3 font-mono text-sm font-semibold text-slate-800 dark:text-slate-200">#{s.sale_order_id || s.orden_id || '—'}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{s.nombre_producto || s.producto_nombre || '—'}</p>
                    <p className="text-xs text-slate-400">{s.sku || s.sku_odoo || ''}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{s.ubicacion_nombre || s.ubicacion_id || '—'}</td>
                  <td className="px-4 py-3 text-center font-bold text-sm">{s.cantidad || 0}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatFecha(s.fecha_creacion)}</td>
                  <td className="px-4 py-3 text-center"><span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${estadoBadge(s.estado)}`}>{s.estado || 'PENDIENTE'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
