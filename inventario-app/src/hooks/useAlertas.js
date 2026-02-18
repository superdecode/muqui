import { useEffect, useRef } from 'react'
import { useAlertasStore } from '../stores/alertasStore'
import {
  subscribeToNotifications,
  markAsRead,
  resolveNotification,
  markAllAsRead as markAllAsReadFB,
  playNotificationSound,
  sendBrowserNotification
} from '../services/notificationService'

export const useAlertas = (usuarioId) => {
  const {
    alertas, alertasNoLeidas, loading, error,
    setAlertas, setUserId, setUnsubscribe, setLoading,
    marcarComoLeida, marcarComoResuelta,
    setPopupNotifications
  } = useAlertasStore()
  const initialLoadDoneRef = useRef(false) // Flag to skip popups on initial load
  const seenIdsRef = useRef(new Set()) // Track which notification IDs we've already shown as popups

  // Set user ID and subscribe to real-time notifications
  useEffect(() => {
    if (!usuarioId) return

    setUserId(usuarioId)
    setLoading(true)
    initialLoadDoneRef.current = false
    seenIdsRef.current.clear()

    const unsub = subscribeToNotifications(usuarioId, (notifs) => {
      // Filter active unread notifications
      const activeUnread = notifs.filter(n => {
        if (!n.activa) return false
        const leidoPor = Array.isArray(n.leido_por) ? n.leido_por : []
        return !leidoPor.includes(usuarioId)
      })

      // Detect truly NEW notifications (not seen before in this session)
      const newNotifications = activeUnread.filter(n => !seenIdsRef.current.has(n.id))

      // Show popup for new notifications (only AFTER initial load is complete)
      if (newNotifications.length > 0 && initialLoadDoneRef.current) {
        console.log('🔔 New notifications detected:', newNotifications.length)
        setPopupNotifications(newNotifications)

        // Play sound and browser notification for critical ones
        const newest = newNotifications[0]
        if (newest) {
          const isCritical = newest.prioridad === 'alta' ||
            newest.tipo === 'stock_bajo' ||
            newest.tipo === 'transferencia_recibida' ||
            newest.tipo === 'transferencia_pendiente'

          if (isCritical) {
            playNotificationSound('critical')
            sendBrowserNotification(newest.titulo || 'Nueva alerta', newest.mensaje || '', {
              tag: `notif-${newest.tipo}-${Date.now()}`
            })
          }
        }
      }

      // Mark all current notification IDs as seen
      activeUnread.forEach(n => seenIdsRef.current.add(n.id))

      // Mark initial load as complete after first callback
      if (!initialLoadDoneRef.current) {
        initialLoadDoneRef.current = true
        console.log('🔔 Initial notification load complete, seen IDs:', seenIdsRef.current.size)
      }

      setAlertas(notifs)
      setLoading(false)
    })

    setUnsubscribe(() => unsub)

    return () => {
      if (typeof unsub === 'function') unsub()
    }
  }, [usuarioId])

  // Mark as read in Firebase + local store
  const marcarLeida = async (alertaId) => {
    marcarComoLeida(alertaId)
    await markAsRead(alertaId, usuarioId)
  }

  // Mark as resolved in Firebase + local store
  const marcarResuelta = async (alertaId) => {
    marcarComoResuelta(alertaId)
    await resolveNotification(alertaId)
  }

  // Mark all as read
  const marcarTodasLeidas = async () => {
    const activas = alertas.filter(a => a.activa)
    activas.forEach(a => marcarComoLeida(a.id))
    await markAllAsReadFB(usuarioId)
  }

  return {
    alertas,
    alertasNoLeidas,
    isLoading: loading,
    error,
    marcarLeida,
    marcarResuelta,
    marcarTodasLeidas
  }
}

export default useAlertas
