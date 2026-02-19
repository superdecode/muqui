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
    setPopupNotifications,
    setError
  } = useAlertasStore()
  const seenIdsRef = useRef(new Set()) // Track which notification IDs we've already shown as popups
  const subscribeTimeRef = useRef(null) // Timestamp when subscription started
  const initialLoadDoneRef = useRef(false)

  const RECENT_WINDOW_MS = 2 * 60 * 1000 // 2 minutos

  const subscriptionKey = (() => {
    const ids = Array.isArray(usuarioId) ? usuarioId : [usuarioId]
    return [...new Set(ids.filter(Boolean).map(v => String(v).trim()))].sort().join('|')
  })()

  // Set user ID and subscribe to real-time notifications
  useEffect(() => {
    const ids = Array.isArray(usuarioId) ? usuarioId : [usuarioId]
    const userIds = [...new Set(ids.filter(Boolean).map(v => String(v).trim()))]
    if (userIds.length === 0) return

    const primaryUserId = userIds[0]

    setUserId(primaryUserId)
    setLoading(true)
    setError(null)
    seenIdsRef.current.clear()
    initialLoadDoneRef.current = false
    // Record time BEFORE subscribing — notifications created after this are "new"
    subscribeTimeRef.current = Date.now()

    const unsub = subscribeToNotifications(userIds, (notifs) => {
      // Filter active unread notifications
      const activeUnread = notifs.filter(n => {
        if (n.activa === false) return false
        const leidoPor = Array.isArray(n.leido_por) ? n.leido_por : []
        return !leidoPor.includes(primaryUserId)
      })

      const now = Date.now()
      const isRecent = (n) => {
        let createdMs = null
        if (n.fecha_creacion?.toDate) createdMs = n.fecha_creacion.toDate().getTime()
        else if (n.fecha_creacion?.seconds) createdMs = n.fecha_creacion.seconds * 1000
        if (createdMs === null) return true // sin timestamp: tratar como reciente
        return (now - createdMs) <= RECENT_WINDOW_MS
      }

      // Detect NEW notifications: not seen before, and either:
      // - initial snapshot already done, OR
      // - it's recent (covers late first snapshot)
      const newNotifications = activeUnread.filter(n => {
        if (seenIdsRef.current.has(n.id)) return false
        if (initialLoadDoneRef.current) return true
        return isRecent(n)
      })

      if (newNotifications.length > 0) {
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

      // Mark all current notification IDs as seen (prevents duplicate popups)
      activeUnread.forEach(n => seenIdsRef.current.add(n.id))

      if (!initialLoadDoneRef.current) {
        initialLoadDoneRef.current = true
      }

      setAlertas(notifs)
      setLoading(false)
    }, (err) => {
      // Propagar error (p. ej. permission-denied) para diagnóstico
      setLoading(false)
      setError(err)
    })

    setUnsubscribe(() => unsub)

    return () => {
      if (typeof unsub === 'function') unsub()
    }
  }, [subscriptionKey])

  // Mark as read in Firebase + local store
  const marcarLeida = async (alertaId) => {
    marcarComoLeida(alertaId)
    const ids = Array.isArray(usuarioId) ? usuarioId : [usuarioId]
    const primaryUserId = ids.filter(Boolean).map(String)[0]
    await markAsRead(alertaId, primaryUserId)
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
    const ids = Array.isArray(usuarioId) ? usuarioId : [usuarioId]
    const primaryUserId = ids.filter(Boolean).map(String)[0]
    await markAllAsReadFB(primaryUserId)
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
