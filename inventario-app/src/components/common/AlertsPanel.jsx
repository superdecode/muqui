import { useState, useEffect, useRef } from 'react'
import { X, AlertCircle, AlertTriangle, Info, CheckCircle, ExternalLink } from 'lucide-react'
import { useAlertasStore } from '../../stores/alertasStore'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const AlertsPanel = ({ isOpen, onClose, anchorRef }) => {
  const navigate = useNavigate()
  const panelRef = useRef(null)
  const { alertas, alertasNoLeidas, marcarComoLeida, marcarComoResuelta } = useAlertasStore()

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target) &&
        anchorRef?.current &&
        !anchorRef.current.contains(event.target)
      ) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.addEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose, anchorRef])

  if (!isOpen) return null

  const alertasActivas = alertas.filter(a => a.estado === 'ACTIVA')

  const getAlertIcon = (tipo, prioridad) => {
    if (tipo === 'STOCK_BAJO') {
      return <AlertTriangle className="text-yellow-600" size={20} />
    }
    if (tipo === 'TRANSFERENCIA_PENDIENTE') {
      return <AlertCircle className="text-blue-600" size={20} />
    }
    if (tipo === 'CONTEO_PENDIENTE') {
      return <Info className="text-purple-600" size={20} />
    }
    if (prioridad === 'ALTA') {
      return <AlertCircle className="text-red-600" size={20} />
    }
    return <Info className="text-gray-600" size={20} />
  }

  const getPriorityBadge = (prioridad) => {
    const colors = {
      ALTA: 'bg-red-100 text-red-800',
      MEDIA: 'bg-yellow-100 text-yellow-800',
      BAJA: 'bg-blue-100 text-blue-800'
    }
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${colors[prioridad] || colors.BAJA}`}>
        {prioridad}
      </span>
    )
  }

  const handleAlertClick = (alerta) => {
    // Marcar como leída
    marcarComoLeida(alerta.id)

    // Navegar según el tipo de alerta
    if (alerta.tipo === 'TRANSFERENCIA_PENDIENTE' && alerta.tipo_entidad === 'MOVIMIENTO') {
      navigate('/transferencias')
      onClose()
    } else if (alerta.tipo === 'CONTEO_PENDIENTE' && alerta.tipo_entidad === 'CONTEO') {
      navigate('/conteos')
      onClose()
    } else if (alerta.tipo === 'STOCK_BAJO' && alerta.tipo_entidad === 'INVENTARIO') {
      navigate('/inventario')
      onClose()
    }
  }

  const handleMarkAsResolved = (e, alertaId) => {
    e.stopPropagation()
    marcarComoResuelta(alertaId)
  }

  const handleMarkAllAsRead = () => {
    alertasActivas.forEach(alerta => {
      if (alerta.estado === 'ACTIVA') {
        marcarComoLeida(alerta.id)
      }
    })
  }

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-12 w-96 bg-white rounded-lg shadow-xl border border-slate-200 z-50 max-h-[600px] flex flex-col"
      style={{ marginRight: '-1rem' }}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">Notificaciones</h3>
          {alertasNoLeidas > 0 && (
            <p className="text-xs text-slate-600 mt-0.5">
              {alertasNoLeidas} sin leer
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {alertasNoLeidas > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium"
            >
              Marcar todas como leídas
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={18} className="text-slate-600" />
          </button>
        </div>
      </div>

      {/* Alertas List */}
      <div className="flex-1 overflow-y-auto">
        {alertasActivas.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle size={48} className="mx-auto text-green-500 mb-3" />
            <p className="text-slate-600 font-medium">¡Todo al día!</p>
            <p className="text-sm text-slate-500 mt-1">No tienes notificaciones pendientes</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {alertasActivas.map((alerta) => (
              <div
                key={alerta.id}
                onClick={() => handleAlertClick(alerta)}
                className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer ${
                  alerta.leida ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getAlertIcon(alerta.tipo, alerta.prioridad)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className={`text-sm font-medium text-slate-900 ${!alerta.leida ? 'font-semibold' : ''}`}>
                        {alerta.mensaje}
                      </p>
                      {getPriorityBadge(alerta.prioridad)}
                    </div>

                    {alerta.fecha_creacion && (
                      <p className="text-xs text-slate-500">
                        {format(new Date(alerta.fecha_creacion), "d 'de' MMM, HH:mm", { locale: es })}
                      </p>
                    )}

                    {alerta.ubicacion_id && (
                      <p className="text-xs text-slate-600 mt-1">
                        Ubicación: {alerta.ubicacion_id}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-2">
                      {!alerta.leida && (
                        <span className="inline-block w-2 h-2 bg-primary-600 rounded-full"></span>
                      )}
                      <button
                        onClick={(e) => handleMarkAsResolved(e, alerta.id)}
                        className="text-xs text-slate-600 hover:text-primary-600 font-medium flex items-center gap-1"
                      >
                        <CheckCircle size={12} />
                        Resolver
                      </button>
                      <button className="text-xs text-slate-600 hover:text-primary-600 font-medium flex items-center gap-1">
                        <ExternalLink size={12} />
                        Ver detalles
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {alertasActivas.length > 0 && (
        <div className="p-3 border-t border-slate-200 bg-slate-50">
          <button
            onClick={() => {
              navigate('/alertas')
              onClose()
            }}
            className="w-full text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Ver todas las notificaciones
          </button>
        </div>
      )}
    </div>
  )
}

export default AlertsPanel
