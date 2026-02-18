/**
 * Real-time alerts hook
 * - Listens directly to movimientos collection for incoming transfers
 * - Checks conteo schedule time and triggers reminders
 * - Plays sound and shows toast notifications
 */
import { useEffect, useRef, useCallback } from 'react'
import { collection, query, where, onSnapshot, orderBy, limit, Timestamp } from 'firebase/firestore'
import { getDB } from '../config/firebase.config'
import { useAuthStore } from '../stores/authStore'
import { useToastStore } from '../stores/toastStore'
import { playNotificationSound, sendBrowserNotification, getNotificationConfig } from '../services/notificationService'
import { getUserAllowedUbicacionIds } from '../utils/userFilters'

/**
 * Hook to listen for real-time transfer alerts
 * Triggers when:
 * 1. A new movimiento is created with destino_id matching user's locations
 * 2. A movimiento changes estado to "ENVIADO" or "PENDIENTE" with destino_id matching
 */
export function useRealtimeAlerts(ubicaciones = [], empresas = []) {
  const { user, isAuthenticated } = useAuthStore()
  const toast = useToastStore()

  // Track seen movimientos to detect new ones
  const seenMovimientosRef = useRef(new Set())
  const lastSnapshotRef = useRef(null)
  const conteoIntervalRef = useRef(null)
  const notificationConfigRef = useRef(null)
  const isFirstLoadRef = useRef(true)

  // Get user's assigned location IDs
  const userUbicacionIds = getUserAllowedUbicacionIds(user, ubicaciones, empresas)

  // Show transfer alert with sound
  const showTransferAlert = useCallback((movimiento, ubicacionNombre) => {
    const config = notificationConfigRef.current
    const soundEnabled = config?.soundEnabled !== false // Default true
    const browserEnabled = config?.browserNotifications !== false // Default true

    // Play critical sound
    if (soundEnabled) {
      playNotificationSound('critical')
    }

    // Show toast
    toast.warning(
      'Nueva Transferencia Entrante',
      `Transferencia ${movimiento.codigo_legible || movimiento.id?.slice(0, 8)} desde ${movimiento.origen_nombre || 'origen'} hacia ${ubicacionNombre || 'tu sede'}`,
      { duration: 10000 }
    )

    // Browser notification
    if (browserEnabled) {
      sendBrowserNotification(
        'Nueva Transferencia por Recibir',
        `${movimiento.codigo_legible || 'Transferencia'} desde ${movimiento.origen_nombre || 'origen'}`,
        { tag: `transfer-${movimiento.id}` }
      )
    }
  }, [toast])

  // Show conteo reminder with sound
  const showConteoReminder = useCallback(() => {
    const config = notificationConfigRef.current
    const soundEnabled = config?.soundEnabled !== false

    if (soundEnabled) {
      playNotificationSound('critical')
    }

    toast.info(
      'Recordatorio de Conteo',
      'Es hora de iniciar el conteo de inventario diario',
      { duration: 15000 }
    )

    if (config?.browserNotifications !== false) {
      sendBrowserNotification(
        'Hora de Conteo de Inventario',
        'Es hora de iniciar el conteo de inventario diario',
        { tag: 'conteo-reminder' }
      )
    }
  }, [toast])

  // Load notification config
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return

    getNotificationConfig(user.id).then(config => {
      notificationConfigRef.current = config || {}
    }).catch(() => {
      notificationConfigRef.current = {}
    })
  }, [isAuthenticated, user?.id])

  // Listen to movimientos collection for incoming transfers
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return
    if (userUbicacionIds.length === 0) return // No locations to watch

    const db = getDB()

    // Query for recent movimientos where destino matches user's locations
    // Only get movimientos from the last 24 hours to avoid processing old data
    const oneDayAgo = new Date()
    oneDayAgo.setHours(oneDayAgo.getHours() - 24)
    const oneDayAgoTimestamp = Timestamp.fromDate(oneDayAgo)

    // We need to query for each destino_id separately since Firestore
    // doesn't support "in" with other compound queries efficiently
    const unsubscribers = []

    userUbicacionIds.forEach(ubicacionId => {
      const q = query(
        collection(db, 'movimientos'),
        where('destino_id', '==', ubicacionId),
        where('fecha_creacion', '>=', oneDayAgoTimestamp),
        orderBy('fecha_creacion', 'desc'),
        limit(20)
      )

      const unsub = onSnapshot(q, (snapshot) => {
        // Skip first load to avoid alerting on existing data
        if (isFirstLoadRef.current) {
          snapshot.docs.forEach(doc => {
            seenMovimientosRef.current.add(doc.id)
          })
          return
        }

        snapshot.docChanges().forEach(change => {
          const movimiento = { id: change.doc.id, ...change.doc.data() }
          const estado = (movimiento.estado || '').toString().toUpperCase()

          // Only alert for PENDIENTE or ENVIADO status (incoming transfers)
          const isIncomingStatus = estado === 'PENDIENTE' || estado === 'ENVIADO'
          if (!isIncomingStatus) return

          if (change.type === 'added') {
            // New movimiento created
            if (!seenMovimientosRef.current.has(movimiento.id)) {
              seenMovimientosRef.current.add(movimiento.id)

              // Find ubicacion name
              const ubicacion = ubicaciones.find(u => u.id === ubicacionId)
              showTransferAlert(movimiento, ubicacion?.nombre)
            }
          } else if (change.type === 'modified') {
            // Movimiento was updated - check if it just became PENDIENTE/ENVIADO
            const previousData = lastSnapshotRef.current?.get(movimiento.id)
            const previousEstado = (previousData?.estado || '').toString().toUpperCase()

            // If estado changed TO pendiente/enviado, alert
            if (previousEstado !== estado && isIncomingStatus) {
              const ubicacion = ubicaciones.find(u => u.id === ubicacionId)
              showTransferAlert(movimiento, ubicacion?.nombre)
            }
          }
        })

        // Store current snapshot for comparison
        const snapshotMap = new Map()
        snapshot.docs.forEach(doc => {
          snapshotMap.set(doc.id, doc.data())
        })
        lastSnapshotRef.current = snapshotMap

      }, (error) => {
        // Silently handle errors - might be missing index
        console.warn('Error in movimientos listener:', error.message)
      })

      unsubscribers.push(unsub)
    })

    // Mark first load as complete after a short delay
    const firstLoadTimeout = setTimeout(() => {
      isFirstLoadRef.current = false
    }, 2000)

    return () => {
      clearTimeout(firstLoadTimeout)
      unsubscribers.forEach(unsub => unsub())
    }
  }, [isAuthenticated, user?.id, userUbicacionIds.join(','), ubicaciones, showTransferAlert])

  // Check conteo reminder time
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return

    const checkConteoTime = () => {
      const config = notificationConfigRef.current
      if (!config?.conteoReminder) return

      const reminderTime = config.conteoReminderTime || '08:00'
      const [hours, minutes] = reminderTime.split(':').map(Number)

      const now = new Date()
      const currentHours = now.getHours()
      const currentMinutes = now.getMinutes()

      // Check if current time matches reminder time (within 1 minute window)
      if (currentHours === hours && currentMinutes === minutes) {
        // Check if we already showed this reminder today
        const lastReminderDate = localStorage.getItem('lastConteoReminderDate')
        const today = now.toDateString()

        if (lastReminderDate !== today) {
          localStorage.setItem('lastConteoReminderDate', today)
          showConteoReminder()
        }
      }
    }

    // Check every minute
    conteoIntervalRef.current = setInterval(checkConteoTime, 60000)

    // Also check immediately on mount
    setTimeout(checkConteoTime, 5000)

    return () => {
      if (conteoIntervalRef.current) {
        clearInterval(conteoIntervalRef.current)
      }
    }
  }, [isAuthenticated, user?.id, showConteoReminder])

  return {
    // Expose method to manually trigger test alert
    testAlert: () => {
      playNotificationSound('critical')
      toast.warning('Test de Alerta', 'El sistema de alertas está funcionando correctamente')
    }
  }
}

export default useRealtimeAlerts
