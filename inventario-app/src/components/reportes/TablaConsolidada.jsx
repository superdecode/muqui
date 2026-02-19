import React, { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { format } from 'date-fns'

function MetodoBadge({ metodo }) {
  if (metodo === 'conteo_reciente') {
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Conteo Reciente</span>
  }
  if (metodo === 'calculado') {
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Calculado</span>
  }
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Sin Conteo</span>
}

function EstadoBadge({ cantidad, stockMinimo }) {
  if (cantidad <= stockMinimo) {
    return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Bajo</span>
  }
  return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Normal</span>
}

function formatFecha(fecha) {
  if (!fecha) return <span className="text-slate-400">Sin conteo</span>
  try { return format(fecha, 'dd/MM/yyyy') } catch { return <span className="text-slate-400">—</span> }
}

export default function TablaConsolidada({ consolidatedData, ubicaciones }) {
  const [expandedRows, setExpandedRows] = useState(new Set())

  const toggleRow = (productoId) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(productoId)) {
      newExpanded.delete(productoId)
    } else {
      newExpanded.add(productoId)
    }
    setExpandedRows(newExpanded)
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider w-10">#</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Producto</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Total Unidades</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Stock Mín.</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Estado</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Último Conteo</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Días</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Método</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Sedes</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider w-16">Desglose</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {consolidatedData.map((item, idx) => {
            const isExpanded = expandedRows.has(item.producto_id)

            return (
              <React.Fragment key={item.producto_id}>
                <tr
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <td className="px-4 py-3 text-xs text-slate-400 font-mono">{idx + 1}</td>
                  <td className="px-4 py-3 text-slate-900 dark:text-slate-100 font-medium">{item.nombre}</td>
                  <td className="px-4 py-3 text-center text-slate-900 dark:text-slate-100 font-semibold">{item.total_unidades}</td>
                  <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">{item.stock_minimo}</td>
                  <td className="px-4 py-3 text-center">
                    <EstadoBadge cantidad={item.total_unidades} stockMinimo={item.stock_minimo} />
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400 text-xs">
                    {formatFecha(item.fecha_ultimo_conteo)}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">
                    {item.dias_desde_conteo !== null && item.dias_desde_conteo !== undefined
                      ? item.dias_desde_conteo
                      : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <MetodoBadge metodo={item.metodo} />
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">
                    {item.por_ubicacion.length}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleRow(item.producto_id)}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors"
                      title={isExpanded ? 'Ocultar desglose' : 'Ver desglose por sede'}
                    >
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        : <ChevronDown className="w-4 h-4 text-slate-600 dark:text-slate-400" />}
                    </button>
                  </td>
                </tr>

                {isExpanded && (
                  <tr key={`${item.producto_id}-desglose`} className="bg-slate-50 dark:bg-slate-800/50">
                    <td colSpan="10" className="px-4 py-3">
                      <div className="ml-8">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-2">
                          Desglose por Sede
                        </p>
                        <div className="bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-100 dark:bg-slate-600">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-300">Sede</th>
                                <th className="px-4 py-2 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">Cantidad</th>
                                <th className="px-4 py-2 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">Fecha Conteo</th>
                                <th className="px-4 py-2 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">Días</th>
                                <th className="px-4 py-2 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">Método</th>
                                <th className="px-4 py-2 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">Estado</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-600">
                              {item.por_ubicacion.map(ub => {
                                const ubicacion = ubicaciones.find(u => u.id === ub.ubicacion_id)
                                return (
                                  <tr key={ub.ubicacion_id} className="hover:bg-slate-50 dark:hover:bg-slate-600/30">
                                    <td className="px-4 py-2 text-slate-700 dark:text-slate-300">
                                      {ubicacion?.nombre || ub.ubicacion_id}
                                    </td>
                                    <td className="px-4 py-2 text-center font-medium text-slate-900 dark:text-slate-100">
                                      {ub.cantidad}
                                    </td>
                                    <td className="px-4 py-2 text-center text-slate-600 dark:text-slate-400 text-xs">
                                      {formatFecha(ub.fecha_ultimo_conteo)}
                                    </td>
                                    <td className="px-4 py-2 text-center text-slate-600 dark:text-slate-400">
                                      {ub.dias_desde_conteo !== null && ub.dias_desde_conteo !== undefined
                                        ? ub.dias_desde_conteo
                                        : <span className="text-slate-400">—</span>}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      <MetodoBadge metodo={ub.metodo} />
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      <EstadoBadge cantidad={ub.cantidad} stockMinimo={item.stock_minimo} />
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
