/**
 * NotificationPopups Component
 * Shows popup notifications for new alerts
 * - 1 notification: Individual popup
 * - 2-4 notifications: Stacked popups
 * - 5+ notifications: Consolidated "You have X new notifications"
 */
import { useState, useEffect } from 'react'
import { X, Bell, ExternalLink, AlertTriangle, Package, ArrowRightLeft, ClipboardList } from 'lucide-react'
import { useAlertasStore } from '../../stores/alertasStore'
import { useNavigate } from 'react-router-dom'
import { markAsRead } from '../../services/notificationService'
import { NOTIFICATION_TYPES } from '../../services/notificationService'

const POPUP_DURATION = 5000 // 5 seconds auto-close
const MAX_STACKED = 4

// Get icon based on notification type
function getNotificationIcon(tipo) {
  switch (tipo) {
    case NOTIFICATION_TYPES.STOCK_BAJO:
      return <AlertTriangle className="text-red-500" size={20} />
    case NOTIFICATION_TYPES.TRANSFERENCIA_RECIBIDA:
    case NOTIFICATION_TYPES.TRANSFERENCIA_PENDIENTE:
      return <ArrowRightLeft className="text-blue-500" size={20} />
    case NOTIFICATION_TYPES.CONTEO_RECORDATORIO:
    case NOTIFICATION_TYPES.CONTEO_INVENTARIO:
      return <ClipboardList className="text-purple-500" size={20} />
    default:
      return <Bell className="text-primary-500" size={20} />
  }
}

// Get background color based on priority
function getPriorityBg(prioridad) {
  switch (prioridad) {
    case 'alta':
      return 'border-l-4 border-l-red-500'
    case 'media':
      return 'border-l-4 border-l-yellow-500'
    default:
      return 'border-l-4 border-l-blue-500'
  }
}

export default function NotificationPopups() {
  const navigate = useNavigate()
  const {
    popupNotifications,
    clearPopupNotifications,
    userId,
    marcarComoLeida,
    setShowPanel
  } = useAlertasStore()

  const [visiblePopups, setVisiblePopups] = useState([])
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    if (popupNotifications.length === 0) {
      setVisiblePopups([])
      return
    }

    if (popupNotifications.length >= 5) {
      // Consolidated popup
      setVisiblePopups([{
        id: 'consolidated',
        type: 'consolidated',
        count: popupNotifications.length,
        notifications: popupNotifications
      }])
    } else {
      // Individual or stacked popups (1-4)
      setVisiblePopups(popupNotifications.slice(0, MAX_STACKED).map(n => ({
        ...n,
        type: 'individual'
      })))
    }

    // Auto-close after duration
    const timer = setTimeout(() => {
      handleCloseAll()
    }, POPUP_DURATION)

    return () => clearTimeout(timer)
  }, [popupNotifications])

  const handleCloseAll = () => {
    setIsClosing(true)
    setTimeout(() => {
      setVisiblePopups([])
      clearPopupNotifications()
      setIsClosing(false)
    }, 300)
  }

  const handleClose = (popupId) => {
    setVisiblePopups(prev => prev.filter(p => p.id !== popupId))
    // If last popup, clear all
    if (visiblePopups.length <= 1) {
      clearPopupNotifications()
    }
  }

  const handleClick = async (popup) => {
    if (popup.type === 'consolidated') {
      // Open alerts panel
      setShowPanel(true)
      handleCloseAll()
    } else {
      // Individual notification
      marcarComoLeida(popup.id)
      await markAsRead(popup.id, userId)

      // Navigate to action URL if available
      const accionUrl = popup.accionUrl || popup.datos_adicionales?.accionUrl
      if (accionUrl) {
        navigate(accionUrl)
      }
      handleClose(popup.id)
    }
  }

  const handleViewAll = () => {
    setShowPanel(true)
    handleCloseAll()
  }

  if (visiblePopups.length === 0) return null

  return (
    <div className={`fixed top-20 right-4 z-[9998] flex flex-col gap-2 transition-all duration-300 ${isClosing ? 'opacity-0 translate-x-4' : 'opacity-100'}`}>
      {visiblePopups.map((popup, index) => (
        <div
          key={popup.id}
          className={`
            bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700
            p-4 min-w-[320px] max-w-md animate-slide-in-right
            ${popup.type === 'individual' ? getPriorityBg(popup.prioridad) : ''}
          `}
          style={{
            animationDelay: `${index * 100}ms`,
            transform: `translateY(${index * 4}px)`,
            zIndex: 9998 - index
          }}
        >
          {popup.type === 'consolidated' ? (
            // Consolidated view
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <Bell className="text-primary-600" size={20} />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    Tienes {popup.count} nuevas notificaciones
                  </p>
                  <button
                    onClick={handleViewAll}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 mt-1"
                  >
                    Ver todas <ExternalLink size={12} />
                  </button>
                </div>
              </div>
              <button
                onClick={() => handleClose(popup.id)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X size={18} className="text-slate-400" />
              </button>
            </div>
          ) : (
            // Individual notification
            <div
              className="flex items-start justify-between cursor-pointer"
              onClick={() => handleClick(popup)}
            >
              <div className="flex items-start gap-3 flex-1">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                  {getNotificationIcon(popup.tipo)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {popup.titulo}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                    {popup.mensaje}
                  </p>
                  {(popup.accionUrl || popup.datos_adicionales?.accionUrl) && (
                    <p className="text-xs text-primary-600 mt-1 flex items-center gap-1">
                      Click para ver detalles <ExternalLink size={10} />
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleClose(popup.id)
                }}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors ml-2"
              >
                <X size={16} className="text-slate-400" />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
