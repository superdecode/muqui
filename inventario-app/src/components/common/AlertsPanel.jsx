import { useState, useEffect, useRef } from 'react'
import { X, AlertCircle, AlertTriangle, Info, CheckCircle, Package, ArrowRightLeft, ClipboardList, Trash2 } from 'lucide-react'
import { useAlertasStore } from '../../stores/alertasStore'
import { useNavigate } from 'react-router-dom'
import { safeFormatDate } from '../../utils/formatters'
import { markAsRead, markAsOpened, resolveNotification, markAllAsRead, deleteNotification } from '../../services/notificationService'

const AlertsPanel = ({ isOpen, onClose, anchorRef }) => {
  const navigate = useNavigate()
  const panelRef = useRef(null)
  const [detailModal, setDetailModal] = useState(null)
  const {
    alertas,
    alertasNoLeidas,
    error,
    userId,
    marcarComoLeida,
    marcarComoAbierta,
    marcarComoResuelta,
    eliminarAlerta,
    panelTab,
    setPanelTab
  } = useAlertasStore()

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target) && anchorRef?.current && !anchorRef.current.contains(event.target)) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose, anchorRef])

  // Update panel when notifications change
  useEffect(() => {
    // Force re-render when alertas change to ensure read status is reflected
    if (isOpen) {
      // Panel is open, ensure it reflects current state
    }
  }, [alertas, isOpen])

  if (!isOpen) return null

  // Historial: mantener lista completa.
  // "No leídas" se limita a activas; "Todas" muestra activas + resueltas (si existen).
  const alertasActivas = alertas.filter(a => a.activa !== false)

  const isUnread = (a) => {
    const leidoPor = Array.isArray(a.leido_por) ? a.leido_por : []
    return !leidoPor.includes(userId)
  }

  // Filter based on active tab
  const alertasFiltradas = panelTab === 'no_leidas'
    ? alertasActivas.filter(a => isUnread(a))
    : alertas

  const getAlertIcon = (tipo, prioridad) => {
    if (tipo === 'stock_bajo') return <AlertTriangle className="text-amber-500" size={20} />
    if (tipo === 'transferencia_recibida') return <ArrowRightLeft className="text-green-600" size={20} />
    if (tipo === 'transferencia_pendiente') return <AlertCircle className="text-blue-600" size={20} />
    if (tipo === 'conteo_recordatorio' || tipo === 'conteo_inventario') return <ClipboardList className="text-purple-600" size={20} />
    if (prioridad === 'alta') return <AlertCircle className="text-red-600" size={20} />
    return <Info className="text-slate-500" size={20} />
  }

  const getPriorityBadge = (prioridad) => {
    const colors = { alta: 'bg-red-100 text-red-800', media: 'bg-yellow-100 text-yellow-800', baja: 'bg-blue-100 text-blue-800' }
    return <span className={`text-xs px-2 py-0.5 rounded-full ${colors[prioridad] || colors.baja}`}>{(prioridad || 'media').toUpperCase()}</span>
  }

  const handleAlertClick = (alerta) => {
    // Mark as read
    marcarComoLeida(alerta.id)
    markAsRead(alerta.id, userId)

    // Mark as opened (clicked/viewed)
    marcarComoAbierta(alerta.id)
    markAsOpened(alerta.id, userId)

    // Grouped notification: open detail modal
    if (alerta.agrupada && Array.isArray(alerta.productos_afectados) && alerta.productos_afectados.length > 0) {
      setDetailModal(alerta)
      return
    }

    // Check for accionUrl first
    const accionUrl = alerta.accionUrl || alerta.datos_adicionales?.accionUrl
    if (accionUrl) {
      navigate(accionUrl)
      onClose()
      return
    }

    // Fallback: navigate based on type
    if (alerta.tipo === 'transferencia_pendiente' || alerta.tipo === 'transferencia_recibida') {
      navigate('/transferencias'); onClose()
    } else if (alerta.tipo === 'conteo_recordatorio' || alerta.tipo === 'conteo_inventario') {
      navigate('/conteos'); onClose()
    } else if (alerta.tipo === 'stock_bajo') {
      navigate('/inventario'); onClose()
    }
  }

  const handleDelete = async (e, alertaId) => {
    e.stopPropagation()
    eliminarAlerta(alertaId)
    await deleteNotification(alertaId)
  }

  const handleResolve = (e, alertaId) => {
    e.stopPropagation()
    marcarComoResuelta(alertaId)
    resolveNotification(alertaId)
  }

  const handleMarkAllAsRead = () => {
    alertasActivas.forEach(a => { if (isUnread(a)) marcarComoLeida(a.id) })
    markAllAsRead(userId)
  }

  return (
    <>
      <div ref={panelRef} className="absolute right-0 top-12 w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 max-h-[600px] flex flex-col" style={{ marginRight: '-1rem' }}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Notificaciones</h3>
            <div className="flex items-center gap-2">
              {alertasNoLeidas > 0 && <button onClick={handleMarkAllAsRead} className="text-xs text-primary-600 hover:text-primary-700 font-medium">Marcar todas leídas</button>}
              <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X size={18} className="text-slate-600 dark:text-slate-400" /></button>
            </div>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
            <button
              onClick={() => setPanelTab('no_leidas')}
              className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                panelTab === 'no_leidas'
                  ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              No leídas {alertasNoLeidas > 0 && <span className="ml-1 px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 text-xs rounded-full">{alertasNoLeidas}</span>}
            </button>
            <button
              onClick={() => setPanelTab('todas')}
              className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                panelTab === 'todas'
                  ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Todas
            </button>
          </div>

          {error && (
            <div className="mt-3 p-2 rounded-lg bg-red-50 border border-red-200">
              <p className="text-xs text-red-800 font-medium">Error cargando notificaciones</p>
              <p className="text-xs text-red-700 mt-0.5">{error.code || 'error'}: {error.message || String(error)}</p>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {alertasFiltradas.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle size={48} className="mx-auto text-green-500 mb-3" />
              <p className="text-slate-600 dark:text-slate-400 font-medium">
                {panelTab === 'no_leidas' ? '¡Todo al día!' : 'Sin notificaciones'}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                {panelTab === 'no_leidas' ? 'No tienes notificaciones sin leer' : 'No hay notificaciones'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {alertasFiltradas.map((alerta) => {
                const unread = isUnread(alerta)
                return (
                  <div key={alerta.id} onClick={() => handleAlertClick(alerta)} className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group ${!unread ? 'opacity-60' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">{getAlertIcon(alerta.tipo, alerta.prioridad)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className={`text-sm text-slate-900 dark:text-slate-100 ${unread ? 'font-semibold' : 'font-medium'}`}>{alerta.titulo || alerta.mensaje}</p>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {getPriorityBadge(alerta.prioridad)}
                            <button
                              onClick={(e) => handleDelete(e, alerta.id)}
                              className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all"
                              title="Eliminar notificación"
                            >
                              <Trash2 size={14} className="text-red-500" />
                            </button>
                          </div>
                        </div>
                        {alerta.titulo && alerta.mensaje && alerta.titulo !== alerta.mensaje && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{alerta.mensaje}</p>
                        )}
                        {alerta.agrupada && alerta.cantidad_items > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full mb-1">
                            <Package size={10} />{alerta.cantidad_items} productos
                          </span>
                        )}
                        <div className="flex items-center gap-3 mt-1.5">
                          {alerta.fecha_creacion && <p className="text-xs text-slate-400">{safeFormatDate(alerta.fecha_creacion, "d MMM, HH:mm")}</p>}
                          {unread && <span className="inline-block w-2 h-2 bg-primary-600 rounded-full"></span>}
                          <button onClick={(e) => handleResolve(e, alerta.id)} className="text-xs text-slate-500 hover:text-primary-600 font-medium flex items-center gap-0.5 ml-auto">
                            <CheckCircle size={11} />Resolver
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal for grouped notifications */}
      {detailModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={() => setDetailModal(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{detailModal.titulo}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{detailModal.mensaje}</p>
              </div>
              <button onClick={() => setDetailModal(null)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X size={20} className="text-slate-500 dark:text-slate-400" /></button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[calc(80vh-120px)]">
              {Array.isArray(detailModal.productos_afectados) && detailModal.productos_afectados.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-semibold text-slate-700 dark:text-slate-300">Producto</th>
                      {detailModal.tipo === 'stock_bajo' && <>
                        <th className="px-4 py-2.5 text-right font-semibold text-slate-700 dark:text-slate-300">Stock Actual</th>
                        <th className="px-4 py-2.5 text-right font-semibold text-slate-700 dark:text-slate-300">Stock Mínimo</th>
                      </>}
                      {(detailModal.tipo === 'transferencia_recibida') && <th className="px-4 py-2.5 text-right font-semibold text-slate-700 dark:text-slate-300">Cantidad</th>}
                      {detailModal.tipo === 'conteo_recordatorio' && <th className="px-4 py-2.5 text-right font-semibold text-slate-700 dark:text-slate-300">Frecuencia (días)</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {detailModal.productos_afectados.map((p, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100">{p.nombre || p.producto_id}</td>
                        {detailModal.tipo === 'stock_bajo' && <>
                          <td className="px-4 py-2.5 text-right text-red-600 font-semibold">{p.stock_actual ?? '-'}</td>
                          <td className="px-4 py-2.5 text-right text-slate-600">{p.stock_minimo ?? '-'}</td>
                        </>}
                        {(detailModal.tipo === 'transferencia_recibida') && <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">{p.cantidad ?? '-'}</td>}
                        {detailModal.tipo === 'conteo_recordatorio' && <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">{p.frecuencia_dias ?? '-'}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-center text-slate-500 py-8">No hay detalles disponibles</p>
              )}
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
              <button onClick={() => { handleResolve({ stopPropagation: () => {} }, detailModal.id); setDetailModal(null) }} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Resolver</button>
              <button onClick={() => {
                setDetailModal(null)
                if (detailModal.tipo === 'stock_bajo') navigate('/inventario')
                else if (detailModal.tipo?.includes('transferencia')) navigate('/transferencias')
                else if (detailModal.tipo?.includes('conteo')) navigate('/conteos')
                onClose()
              }} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg">Ir al módulo</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default AlertsPanel
