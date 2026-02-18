import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { Download, FileBarChart, TrendingUp, Package, AlertCircle, ArrowUp, ArrowDown, Printer, ChevronLeft, Filter, Lock } from 'lucide-react'
import { exportToCSV } from '../utils/exportUtils'
import { useToastStore } from '../stores/toastStore'
import { safeFormatDate, safeParseDate } from '../utils/formatters'
import { useAuthStore } from '../stores/authStore'
import dataService from '../services/dataService'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { usePermissions } from '../hooks/usePermissions'

const getDefaultDates = () => {
  const hoy = new Date()
  const ayer = new Date()
  ayer.setDate(ayer.getDate() - 1)
  return {
    fechaInicio: ayer.toISOString().split('T')[0],
    fechaFin: hoy.toISOString().split('T')[0]
  }
}

const REPORTS = [
  { id: 'stock', name: 'Reporte de Stock Actual', description: 'Estado actual del inventario por ubicación', icon: Package, color: 'blue' },
  { id: 'consumo', name: 'Reporte de Consumo', description: 'Análisis de consumo por periodo', icon: TrendingUp, color: 'green' },
  { id: 'rotacion', name: 'Rotación de Inventario', description: 'Productos más y menos rotados', icon: FileBarChart, color: 'purple' },
  { id: 'transferencias', name: 'Reporte de Movimientos', description: 'Historial de movimientos entre ubicaciones', icon: FileBarChart, color: 'orange' }
]

const COLOR_CLASSES = {
  blue: 'bg-blue-100 text-blue-600 border-blue-200',
  green: 'bg-green-100 text-green-600 border-green-200',
  purple: 'bg-purple-100 text-purple-600 border-purple-200',
  orange: 'bg-orange-100 text-orange-600 border-orange-200'
}

// Badge component for estado values
function EstadoBadge({ value }) {
  if (!value) return <span className="text-slate-400">-</span>
  const v = value.toString().toUpperCase()
  if (v === 'NORMAL' || v === 'ACTIVO') return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Normal</span>
  if (v === 'BAJO') return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">Bajo</span>
  if (v.startsWith('CONFIRM')) return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">{value}</span>
  if (v.startsWith('PENDIEN')) return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">{value}</span>
  if (v.startsWith('CANCEL')) return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">{value}</span>
  return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{value}</span>
}

export default function Reportes() {
  const toast = useToastStore()
  const { user } = useAuthStore()
  const reportRef = useRef(null)
  const { canEdit, isReadOnly } = usePermissions()
  const canGenerarReporte = canEdit('reportes')

  const [selectedReport, setSelectedReport] = useState(null)
  const [showResults, setShowResults] = useState(false)
  const [dateRange, setDateRange] = useState(getDefaultDates())
  const [filterUbicacion, setFilterUbicacion] = useState('')

  // Cargar datos
  const { data: inventario = [], isLoading: isLoadingInventario } = useQuery({ queryKey: ['inventario'], queryFn: () => dataService.getInventario() })
  const { data: movimientos = [], isLoading: isLoadingMovimientos } = useQuery({ queryKey: ['movimientos'], queryFn: () => dataService.getMovimientos() })
  const { data: productos = [] } = useQuery({ queryKey: ['productos'], queryFn: () => dataService.getProductos() })
  const { data: ubicaciones = [] } = useQuery({ queryKey: ['ubicaciones'], queryFn: () => dataService.getUbicaciones() })
  const { data: conteos = [] } = useQuery({ queryKey: ['conteos'], queryFn: () => dataService.getConteos() })
  const { data: detalleConteos = [] } = useQuery({ queryKey: ['detalle-conteos-all'], queryFn: () => dataService.getDetalleConteos() })
  const { data: detalleMovimientos = [] } = useQuery({ queryKey: ['detalle-movimientos-all'], queryFn: () => dataService.getDetalleMovimientos() })

  // Ubicaciones del usuario (si tiene asignadas, solo esas; si no, todas)
  const userUbicaciones = (() => {
    const asignadas = user?.ubicaciones_asignadas
    if (Array.isArray(asignadas) && asignadas.length > 0) {
      return ubicaciones.filter(u => asignadas.includes(u.id))
    }
    return ubicaciones
  })()

  const getReportData = (reportType) => {
    const ubFilter = filterUbicacion || null
    switch (reportType) {
      case 'stock': {
        let data = inventario
        if (ubFilter) data = data.filter(i => i.ubicacion_id === ubFilter)
        return data.map(item => {
          const producto = productos.find(p => p.id === item.producto_id)
          const ubicacion = ubicaciones.find(u => u.id === item.ubicacion_id)
          return {
            Producto: producto?.nombre || item.producto_id,
            Ubicación: ubicacion?.nombre || item.ubicacion_id,
            Stock: item.stock_actual,
            'Stock Mínimo': producto?.stock_minimo || 0,
            Estado: item.stock_actual <= (producto?.stock_minimo || 0) ? 'Bajo' : 'Normal'
          }
        })
      }
      case 'transferencias': {
        let data = movimientos
        if (ubFilter) data = data.filter(m => m.origen_id === ubFilter || m.destino_id === ubFilter)
        return data.map(mov => {
          const origen = ubicaciones.find(u => u.id === mov.origen_id)
          const destino = ubicaciones.find(u => u.id === mov.destino_id)
          return {
            ID: mov.id,
            Fecha: safeFormatDate(mov.fecha_creacion, 'dd/MM/yyyy'),
            Origen: origen?.nombre || mov.origen_id,
            Destino: destino?.nombre || mov.destino_id,
            Estado: mov.estado
          }
        })
      }
      case 'consumo': {
        // Consumo = Conteo Inicial + Entradas - Salidas - Conteo Final
        // Group by producto + ubicacion
        const fi = new Date(dateRange.fechaInicio)
        const ff = new Date(dateRange.fechaFin)
        ff.setHours(23, 59, 59, 999)

        // Find completed conteos in the date range
        const conteosEnRango = conteos.filter(c => {
          if (c.estado !== 'COMPLETADO' && c.estado !== 'PARCIALMENTE_COMPLETADO') return false
          const fecha = safeParseDate(c.fecha_programada || c.fecha_completado)
          return fecha && fecha >= fi && fecha <= ff
        })

        // Sort conteos by date to find first (initial) and last (final) per ubicacion
        const conteosSorted = [...conteosEnRango].sort((a, b) => {
          const da = safeParseDate(a.fecha_programada || a.fecha_completado) || new Date(0)
          const db = safeParseDate(b.fecha_programada || b.fecha_completado) || new Date(0)
          return da - db
        })

        // Build product-level data from conteo details
        const productUbMap = {} // key: `${producto_id}_${ubicacion_id}`
        conteosSorted.forEach(conteo => {
          const dets = detalleConteos.filter(d => d.conteo_id === conteo.id)
          dets.forEach(det => {
            const key = `${det.producto_id}_${conteo.ubicacion_id}`
            if (!productUbMap[key]) {
              productUbMap[key] = { producto_id: det.producto_id, ubicacion_id: conteo.ubicacion_id, conteoInicial: null, conteoFinal: null, entradas: 0, salidas: 0 }
            }
            // First conteo = initial, last conteo = final (overwritten as we iterate sorted)
            if (productUbMap[key].conteoInicial === null) {
              productUbMap[key].conteoInicial = det.cantidad_fisica ?? det.cantidad_sistema ?? 0
            }
            productUbMap[key].conteoFinal = det.cantidad_fisica ?? det.cantidad_sistema ?? 0
          })
        })

        // Calculate entradas and salidas from confirmed movements in date range
        const movsConfirmados = movimientos.filter(m => {
          const estado = m.estado?.toUpperCase() || ''
          if (!estado.startsWith('CONFIRM')) return false
          const fecha = safeParseDate(m.fecha_creacion || m.fecha_confirmacion)
          return fecha && fecha >= fi && fecha <= ff
        })

        movsConfirmados.forEach(mov => {
          const dets = detalleMovimientos.filter(d => d.movimiento_id === mov.id)
          dets.forEach(det => {
            const keySalida = `${det.producto_id}_${mov.origen_id}`
            const keyEntrada = `${det.producto_id}_${mov.destino_id}`
            if (productUbMap[keySalida]) productUbMap[keySalida].salidas += (det.cantidad || 0)
            if (productUbMap[keyEntrada]) productUbMap[keyEntrada].entradas += (det.cantidad || 0)
          })
        })

        let results = Object.values(productUbMap)
        if (ubFilter) results = results.filter(r => r.ubicacion_id === ubFilter)

        if (results.length === 0) {
          // Fallback: show current inventory if no conteos found
          let data = inventario
          if (ubFilter) data = data.filter(i => i.ubicacion_id === ubFilter)
          return data.map(item => {
            const producto = productos.find(p => p.id === item.producto_id)
            const ubicacion = ubicaciones.find(u => u.id === item.ubicacion_id)
            return {
              Producto: producto?.nombre || item.producto_id,
              Ubicación: ubicacion?.nombre || item.ubicacion_id,
              'Conteo Inicial': '-',
              Entradas: '-',
              Salidas: '-',
              'Conteo Final': '-',
              Consumo: 'Sin conteos en período'
            }
          })
        }

        return results.map(r => {
          const producto = productos.find(p => p.id === r.producto_id)
          const ubicacion = ubicaciones.find(u => u.id === r.ubicacion_id)
          const ci = r.conteoInicial ?? 0
          const cf = r.conteoFinal ?? 0
          const consumo = ci + r.entradas - r.salidas - cf
          return {
            Producto: producto?.nombre || r.producto_id,
            Ubicación: ubicacion?.nombre || r.ubicacion_id,
            'Conteo Inicial': ci,
            Entradas: r.entradas,
            Salidas: r.salidas,
            'Conteo Final': cf,
            Consumo: consumo
          }
        })
      }
      case 'rotacion': {
        const movsByProduct = {}
        movimientos.forEach(mov => {
          if (mov.detalles && Array.isArray(mov.detalles)) {
            mov.detalles.forEach(d => {
              movsByProduct[d.producto_id] = (movsByProduct[d.producto_id] || 0) + (d.cantidad || 1)
            })
          }
        })
        return productos.map(p => ({
          Producto: p.nombre,
          Categoría: p.categoria || '-',
          Movimientos: movsByProduct[p.id] || 0,
          Rotación: movsByProduct[p.id] > 5 ? 'Alta' : movsByProduct[p.id] > 0 ? 'Media' : 'Baja'
        })).sort((a, b) => b.Movimientos - a.Movimientos)
      }
      default:
        return []
    }
  }

  const handleGenerateReport = () => {
    if (!dateRange.fechaInicio || !dateRange.fechaFin) {
      toast.error('Fechas Requeridas', 'Selecciona fecha de inicio y fin')
      return
    }
    const fi = new Date(dateRange.fechaInicio)
    const ff = new Date(dateRange.fechaFin)
    if (ff < fi) {
      toast.error('Rango Inválido', 'La fecha final no puede ser anterior a la inicial')
      return
    }
    setShowResults(true)
    const r = REPORTS.find(r => r.id === selectedReport)
    toast.success(`${r?.name || 'Reporte'} Generado`, `Período: ${format(fi, 'dd/MM/yyyy')} al ${format(ff, 'dd/MM/yyyy')}`)
  }

  const handleExport = (reportType) => {
    try {
      const data = getReportData(reportType || selectedReport)
      if (data.length === 0) { toast.error('Sin Datos', 'No hay datos para exportar'); return }
      exportToCSV(data, `reporte_${reportType || selectedReport}_${new Date().toISOString().split('T')[0]}`)
      toast.success('Exportado', 'Reporte exportado a CSV')
    } catch (err) {
      toast.error('Error', err.message || 'No se pudo exportar')
    }
  }

  const handlePrint = () => {
    const report = REPORTS.find(r => r.id === selectedReport)
    const data = getReportData(selectedReport)
    if (!data.length) { toast.error('Sin Datos', 'No hay datos para imprimir'); return }

    const headers = Object.keys(data[0])
    const fechaInicioStr = dateRange.fechaInicio ? format(new Date(dateRange.fechaInicio), 'dd/MM/yyyy') : '-'
    const fechaFinStr = dateRange.fechaFin ? format(new Date(dateRange.fechaFin), 'dd/MM/yyyy') : '-'
    const ubNombre = filterUbicacion ? (ubicaciones.find(u => u.id === filterUbicacion)?.nombre || 'Todas') : 'Todas'

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${report.name}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;color:#1e293b;padding:0}
.header{background:#0ea5e9;color:white;padding:32px 40px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.header h1{font-size:24px;font-weight:700}.header p{font-size:13px;opacity:.85;margin-top:4px}
.meta{display:flex;gap:24px;padding:16px 40px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:12px;color:#475569}
.meta strong{color:#1e293b}
.summary{display:flex;gap:16px;padding:20px 40px}
.scard{flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;text-align:center}
.scard .v{font-size:24px;font-weight:700;color:#0ea5e9}.scard .l{font-size:11px;color:#64748b;margin-top:2px;text-transform:uppercase}
table{width:100%;border-collapse:collapse;font-size:12px;margin:0 auto}
thead th{background:#0ea5e9;color:white;padding:10px 14px;text-align:left;font-weight:600;text-transform:uppercase;font-size:10px;letter-spacing:.5px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
tbody td{padding:8px 14px;border-bottom:1px solid #e2e8f0}tbody tr:nth-child(even){background:#fafbfc}
.badge{display:inline-block;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:600}
.badge-ok{background:#dcfce7;color:#166534}.badge-bad{background:#fee2e2;color:#991b1b}
.footer{text-align:center;padding:20px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:11px;margin-top:20px}
.tc{padding:0 40px 20px}
@media print{@page{margin:10mm}}
</style></head><body>
<div class="header"><h1>${report.name}</h1><p>${report.description} — Sistema de Control de Inventario</p></div>
<div class="meta"><div><strong>Período:</strong> ${fechaInicioStr} — ${fechaFinStr}</div><div><strong>Ubicación:</strong> ${ubNombre}</div><div><strong>Registros:</strong> ${data.length}</div><div><strong>Generado:</strong> ${format(new Date(), "d 'de' MMMM yyyy, HH:mm", { locale: es })}</div></div>
<div class="summary"><div class="scard"><div class="v">${data.length}</div><div class="l">Total</div></div>
${selectedReport === 'stock' ? `<div class="scard"><div class="v">${data.filter(d => d.Estado === 'Normal').length}</div><div class="l">Normal</div></div><div class="scard"><div class="v" style="color:#dc2626">${data.filter(d => d.Estado === 'Bajo').length}</div><div class="l">Bajo</div></div>` : ''}
</div>
<div class="tc"><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
<tbody>${data.map(row => `<tr>${headers.map(h => {
  const val = row[h] ?? '-'
  if (h === 'Estado' && val === 'Normal') return '<td><span class="badge badge-ok">Normal</span></td>'
  if (h === 'Estado' && val === 'Bajo') return '<td><span class="badge badge-bad">Bajo</span></td>'
  return `<td>${val}</td>`
}).join('')}</tr>`).join('')}</tbody></table></div>
<div class="footer">Sistema de Control de Inventario &copy; ${new Date().getFullYear()}</div>
</body></html>`

    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 300) }
    else toast.error('Bloqueado', 'Permite ventanas emergentes para imprimir')
  }

  const getStockStats = () => {
    const stockBajo = inventario.filter(item => {
      const producto = productos.find(p => p.id === item.producto_id)
      return item.stock_actual <= (producto?.stock_minimo || 0)
    }).length
    return { stockBajo, stockNormal: inventario.length - stockBajo, total: inventario.length }
  }

  const stockStats = getStockStats()
  const isLoading = isLoadingInventario || isLoadingMovimientos
  const currentReport = REPORTS.find(r => r.id === selectedReport)
  const reportData = selectedReport && showResults ? getReportData(selectedReport) : []
  const reportHeaders = reportData.length > 0 ? Object.keys(reportData[0]) : []

  if (isLoading) return <div className="flex items-center justify-center h-96"><LoadingSpinner size="lg" /></div>

  // ========== REPORT VIEW (when a report is selected) ==========
  if (selectedReport) {
    return (
      <div className="space-y-6">
        {/* Back + Title */}
        <div className="flex items-center gap-4">
          <button onClick={() => { setSelectedReport(null); setShowResults(false) }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
            <ChevronLeft size={24} className="text-slate-600 dark:text-slate-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{currentReport?.name}</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">{currentReport?.description}</p>
          </div>
        </div>

        {/* Filters Bar */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Filter size={18} className="text-primary-600" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Filtros del Reporte</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha Inicio</label>
              <input type="date" value={dateRange.fechaInicio} onChange={e => setDateRange({ ...dateRange, fechaInicio: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha Fin</label>
              <input type="date" value={dateRange.fechaFin} onChange={e => setDateRange({ ...dateRange, fechaFin: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ubicación</label>
              <select value={filterUbicacion} onChange={e => setFilterUbicacion(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm">
                <option value="">Todas las ubicaciones</option>
                {userUbicaciones.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleGenerateReport} className="flex-1" disabled={!canGenerarReporte}>Generar</Button>
              <Button variant="outline" onClick={() => { setDateRange(getDefaultDates()); setFilterUbicacion(''); setShowResults(false) }}>Limpiar</Button>
            </div>
          </div>
          {isReadOnly('reportes') && (
            <div className="flex items-center gap-2 mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl text-sm text-amber-700 dark:text-amber-400">
              <Lock size={15} className="flex-shrink-0" />
              <span>Tu rol de solo lectura no permite generar ni exportar reportes.</span>
            </div>
          )}
        </Card>

        {/* Report Results */}
        {showResults && (
          <div ref={reportRef}>
            {/* Summary Cards */}
            {selectedReport === 'stock' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 text-center">
                  <p className="text-3xl font-bold text-blue-600">{reportData.length}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wide">Total Registros</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-green-200 dark:border-green-900/30 p-5 text-center">
                  <p className="text-3xl font-bold text-green-600">{reportData.filter(d => d.Estado === 'Normal').length}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wide">Stock Normal</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-red-200 dark:border-red-900/30 p-5 text-center">
                  <p className="text-3xl font-bold text-red-600">{reportData.filter(d => d.Estado === 'Bajo').length}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wide">Stock Bajo</p>
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                <span className="font-semibold">{reportData.length}</span> registros encontrados
                {filterUbicacion && <span> — Ubicación: <strong>{ubicaciones.find(u => u.id === filterUbicacion)?.nombre}</strong></span>}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleExport(selectedReport)} disabled={!canGenerarReporte}>
                  <Download size={14} className="mr-1.5" />CSV
                </Button>
                <Button size="sm" variant="outline" onClick={handlePrint} disabled={!canGenerarReporte}>
                  <Printer size={14} className="mr-1.5" />Imprimir
                </Button>
              </div>
            </div>

            {/* Data Table */}
            <Card>
              {reportData.length === 0 ? (
                <div className="text-center py-16">
                  <AlertCircle size={48} className="mx-auto text-yellow-400 mb-4" />
                  <p className="text-slate-700 dark:text-slate-300 font-semibold mb-1">No hay datos disponibles</p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Ajusta los filtros e intenta de nuevo.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider w-10">#</th>
                        {reportHeaders.map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {reportData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                          <td className="px-4 py-3 text-xs text-slate-400 font-mono">{idx + 1}</td>
                          {reportHeaders.map(h => (
                            <td key={h} className="px-4 py-3 text-slate-900 dark:text-slate-100">
                              {h === 'Estado' ? <EstadoBadge value={row[h]} /> : (row[h] ?? '-')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Placeholder when no results yet */}
        {!showResults && (
          <div className="text-center py-20">
            <FileBarChart size={64} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-600 dark:text-slate-400 font-medium">Configura los filtros y haz clic en "Generar"</p>
            <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">El reporte se mostrará aquí debajo</p>
          </div>
        )}
      </div>
    )
  }

  // ========== REPORT SELECTION VIEW ==========
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-ocean p-6 shadow-card">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <FileBarChart className="text-white" size={32} />
            <div>
              <h1 className="text-3xl font-bold text-white">Reportes</h1>
              <p className="text-white/90 mt-1">Analiza y exporta datos del sistema</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-slate-800 border-blue-100 dark:border-blue-900/30">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Productos</p><p className="text-3xl font-bold text-blue-600">{productos.length}</p></div>
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center"><Package className="text-blue-600" size={24} /></div>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-slate-800 border-green-100 dark:border-green-900/30">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Stock Normal</p><p className="text-3xl font-bold text-green-600">{stockStats.stockNormal}</p></div>
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center"><ArrowUp className="text-green-600" size={24} /></div>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-white dark:from-red-900/20 dark:to-slate-800 border-red-100 dark:border-red-900/30">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Stock Bajo</p><p className="text-3xl font-bold text-red-600">{stockStats.stockBajo}</p></div>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center"><ArrowDown className="text-red-600" size={24} /></div>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-slate-800 border-purple-100 dark:border-purple-900/30">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Movimientos</p><p className="text-3xl font-bold text-purple-600">{movimientos.length}</p></div>
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center"><TrendingUp className="text-purple-600" size={24} /></div>
          </div>
        </Card>
      </div>

      {/* Report Cards */}
      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Selecciona un Reporte</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {REPORTS.map(report => {
          const Icon = report.icon
          return (
            <button key={report.id} onClick={() => setSelectedReport(report.id)}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 text-left hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-600 transition-all duration-200 group">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${COLOR_CLASSES[report.color]} group-hover:scale-110 transition-transform`}>
                  <Icon size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary-600 transition-colors">{report.name}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{report.description}</p>
                  <p className="text-xs text-primary-600 font-medium mt-3 opacity-0 group-hover:opacity-100 transition-opacity">Haz clic para configurar →</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
