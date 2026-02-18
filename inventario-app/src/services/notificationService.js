/**
 * Notification Service
 * Handles real-time Firebase notifications, triggers, deduplication, and grouping
 */
import {
  collection, doc, addDoc, updateDoc, getDocs, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp, Timestamp, limit
} from 'firebase/firestore'
import { getDB } from '../config/firebase.config'

// ========== NOTIFICATION TYPES ==========
export const NOTIFICATION_TYPES = {
  STOCK_BAJO: 'stock_bajo',
  TRANSFERENCIA_RECIBIDA: 'transferencia_recibida',
  TRANSFERENCIA_PENDIENTE: 'transferencia_pendiente',
  CONTEO_RECORDATORIO: 'conteo_recordatorio',
  CONTEO_INVENTARIO: 'conteo_inventario'
}

export const PRIORITY = {
  ALTA: 'alta',
  MEDIA: 'media',
  BAJA: 'baja'
}

// ========== SOUND MANAGEMENT ==========
const SOUNDS = {
  critical: null,
  info: null
}

function initSounds() {
  try {
    // Use Web Audio API for lightweight sounds
    const ctx = new (window.AudioContext || window.webkitAudioContext)()

    SOUNDS.critical = () => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      gain.gain.value = 0.3
      osc.start()
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
      osc.stop(ctx.currentTime + 0.5)
    }

    SOUNDS.info = () => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 520
      osc.type = 'sine'
      gain.gain.value = 0.15
      osc.start()
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
      osc.stop(ctx.currentTime + 0.3)
    }
  } catch (e) {
    console.warn('Web Audio API not available:', e)
  }
}

export function playNotificationSound(type = 'info') {
  try {
    if (!SOUNDS.critical) initSounds()
    if (type === 'critical' && SOUNDS.critical) SOUNDS.critical()
    else if (SOUNDS.info) SOUNDS.info()
  } catch (e) {
    // Silently fail
  }
}

// ========== BROWSER NOTIFICATIONS ==========
export function sendBrowserNotification(title, body, options = {}) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

  try {
    const notif = new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: options.tag || 'inventory-notification',
      renotify: true,
      ...options
    })

    if (options.onClick) {
      notif.onclick = options.onClick
    }

    // Auto-close after 8 seconds
    setTimeout(() => notif.close(), 8000)
  } catch (e) {
    console.warn('Browser notification failed:', e)
  }
}

// ========== FIRESTORE OPERATIONS ==========

/**
 * Subscribe to real-time notifications for a user
 */
export function subscribeToNotifications(userId, callback) {
  const db = getDB()
  const q = query(
    collection(db, 'notificaciones'),
    where('usuarios_destino', 'array-contains', userId),
    where('activa', '==', true),
    orderBy('fecha_creacion', 'desc'),
    limit(50)
  )

  // Try with compound query, fallback to simple
  try {
    return onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      callback(notifs)
    }, (error) => {
      // Fallback: simpler query without compound index
      console.warn('Compound index not available for notifications, using fallback:', error.message)
      const fallbackQ = query(
        collection(db, 'notificaciones'),
        where('activa', '==', true)
      )
      return onSnapshot(fallbackQ, (snapshot) => {
        const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        const filtered = all
          .filter(n => Array.isArray(n.usuarios_destino) && n.usuarios_destino.includes(userId))
          .sort((a, b) => {
            const fa = a.fecha_creacion?.seconds || 0
            const fb = b.fecha_creacion?.seconds || 0
            return fb - fa
          })
          .slice(0, 50)
        callback(filtered)
      })
    })
  } catch (e) {
    console.error('Error subscribing to notifications:', e)
    return () => {}
  }
}

/**
 * Mark notification as read by a user
 */
export async function markAsRead(notificationId, userId) {
  const db = getDB()
  const ref = doc(db, 'notificaciones', notificationId)
  try {
    const snap = await getDocs(query(collection(db, 'notificaciones'), where('__name__', '==', notificationId)))
    if (snap.empty) return
    const data = snap.docs[0].data()
    const leidoPor = Array.isArray(data.leido_por) ? [...data.leido_por] : []
    if (!leidoPor.includes(userId)) {
      leidoPor.push(userId)
      await updateDoc(ref, { leido_por: leidoPor })
    }
  } catch (e) {
    console.error('Error marking notification as read:', e)
  }
}

/**
 * Mark notification as resolved/inactive
 */
export async function resolveNotification(notificationId) {
  const db = getDB()
  try {
    await updateDoc(doc(db, 'notificaciones', notificationId), { activa: false })
  } catch (e) {
    console.error('Error resolving notification:', e)
  }
}

/**
 * Mark all active notifications as read for a user
 */
export async function markAllAsRead(userId) {
  const db = getDB()
  try {
    const q = query(collection(db, 'notificaciones'), where('activa', '==', true))
    const snap = await getDocs(q)
    const batch = []
    snap.docs.forEach(d => {
      const data = d.data()
      if (Array.isArray(data.usuarios_destino) && data.usuarios_destino.includes(userId)) {
        const leidoPor = Array.isArray(data.leido_por) ? [...data.leido_por] : []
        if (!leidoPor.includes(userId)) {
          leidoPor.push(userId)
          batch.push(updateDoc(doc(db, 'notificaciones', d.id), { leido_por: leidoPor }))
        }
      }
    })
    await Promise.all(batch)
  } catch (e) {
    console.error('Error marking all as read:', e)
  }
}

/**
 * Delete a notification permanently
 */
export async function deleteNotification(notificationId) {
  const db = getDB()
  try {
    await deleteDoc(doc(db, 'notificaciones', notificationId))
    return { success: true }
  } catch (e) {
    console.error('Error deleting notification:', e)
    return { success: false, message: e.message }
  }
}

/**
 * Mark notification as opened (clicked/viewed) by a user
 * Different from "read" - opened means user clicked to see details
 */
export async function markAsOpened(notificationId, userId) {
  const db = getDB()
  const ref = doc(db, 'notificaciones', notificationId)
  try {
    const snap = await getDocs(query(collection(db, 'notificaciones'), where('__name__', '==', notificationId)))
    if (snap.empty) return
    const data = snap.docs[0].data()
    const abiertaPor = Array.isArray(data.abierta_por) ? [...data.abierta_por] : []
    if (!abiertaPor.includes(userId)) {
      abiertaPor.push(userId)
      await updateDoc(ref, { abierta_por: abiertaPor })
    }
  } catch (e) {
    console.error('Error marking notification as opened:', e)
  }
}

/**
 * Check if a notification has expired (older than 24h)
 */
export function isNotificationExpired(notification) {
  if (!notification.expiraEn) return false
  const expiry = notification.expiraEn.toDate
    ? notification.expiraEn.toDate()
    : new Date(notification.expiraEn.seconds * 1000)
  return expiry < new Date()
}

// ========== NOTIFICATION CREATION WITH DEDUPLICATION ==========

/**
 * Create a notification with deduplication
 * If a similar active notification exists for the same day/context, update it instead
 */
async function createOrUpdateNotification({ tipo, prioridad, titulo, mensaje, datos_adicionales, usuarios_destino, agrupada = false, productos_afectados = [], cantidad_items = 0 }) {
  const db = getDB()

  // Deduplication: check for existing active notification of same type today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayTimestamp = Timestamp.fromDate(today)

  try {
    const existing = await getDocs(query(
      collection(db, 'notificaciones'),
      where('tipo', '==', tipo),
      where('activa', '==', true)
    ))

    // Check if there's a matching notification from today
    const match = existing.docs.find(d => {
      const data = d.data()
      const created = data.fecha_creacion?.toDate?.() || new Date(0)
      return created >= today &&
        JSON.stringify(data.datos_adicionales?.ubicacion_id) === JSON.stringify(datos_adicionales?.ubicacion_id)
    })

    if (match) {
      // Update existing notification
      const existingData = match.data()
      const mergedProducts = [...new Set([...(existingData.productos_afectados || []), ...productos_afectados])]
      await updateDoc(doc(db, 'notificaciones', match.id), {
        titulo,
        mensaje,
        datos_adicionales,
        productos_afectados: mergedProducts,
        cantidad_items: mergedProducts.length || cantidad_items,
        agrupada: mergedProducts.length > 3,
        usuarios_destino: [...new Set([...(existingData.usuarios_destino || []), ...usuarios_destino])],
        leido_por: [], // Reset read status on update
        updated_at: serverTimestamp()
      })
      return match.id
    }
  } catch (e) {
    // If query fails (missing index), just create new
    console.warn('Dedup query failed, creating new notification:', e.message)
  }

  // Create new notification with 24h expiration
  const expiraEn = new Date()
  expiraEn.setHours(expiraEn.getHours() + 24)

  const notifData = {
    tipo,
    prioridad: prioridad || PRIORITY.MEDIA,
    titulo,
    mensaje,
    datos_adicionales: datos_adicionales || {},
    fecha_creacion: serverTimestamp(),
    usuarios_destino: usuarios_destino || [],
    leido_por: [],
    abierta_por: [], // NEW: track who has opened (clicked) the notification
    activa: true,
    agrupada: agrupada || productos_afectados.length > 3,
    productos_afectados: productos_afectados || [],
    cantidad_items: cantidad_items || productos_afectados.length,
    accionUrl: datos_adicionales?.accionUrl || null, // NEW: URL to navigate when clicked
    expiraEn: Timestamp.fromDate(expiraEn) // NEW: expires after 24h
  }

  const ref = await addDoc(collection(db, 'notificaciones'), notifData)
  return ref.id
}

// ========== TRIGGER FUNCTIONS ==========

/**
 * Trigger stock_bajo notification when inventory drops below minimum
 */
export async function triggerStockBajo({ producto, ubicacion, stockActual, stockMinimo, usuariosDestino }) {
  const items = Array.isArray(producto) ? producto : [producto]
  const productNames = items.map(p => p.nombre || p.producto_id).join(', ')
  const isGrouped = items.length > 3

  return createOrUpdateNotification({
    tipo: NOTIFICATION_TYPES.STOCK_BAJO,
    prioridad: PRIORITY.ALTA,
    titulo: isGrouped ? `${items.length} productos con stock bajo` : `Stock bajo: ${productNames}`,
    mensaje: isGrouped
      ? `${items.length} productos están por debajo del stock mínimo en ${ubicacion?.nombre || 'ubicación'}`
      : `${productNames} tiene stock ${stockActual} (mínimo: ${stockMinimo}) en ${ubicacion?.nombre || 'ubicación'}`,
    datos_adicionales: {
      ubicacion_id: ubicacion?.id,
      ubicacion_nombre: ubicacion?.nombre,
      stock_actual: stockActual,
      stock_minimo: stockMinimo,
      accionUrl: '/inventario' // Navigate to inventario page
    },
    usuarios_destino: usuariosDestino || [],
    productos_afectados: items.map(p => ({
      producto_id: p.id || p.producto_id,
      nombre: p.nombre,
      stock_actual: p.stock_actual || stockActual,
      stock_minimo: p.stock_minimo || stockMinimo
    })),
    cantidad_items: items.length
  })
}

/**
 * Trigger transferencia_recibida notification
 */
export async function triggerTransferenciaRecibida({ transferencia, productos, origen, destino, usuarioCreador, usuariosDestino }) {
  return createOrUpdateNotification({
    tipo: NOTIFICATION_TYPES.TRANSFERENCIA_RECIBIDA,
    prioridad: PRIORITY.ALTA,
    titulo: `Transferencia recibida: ${transferencia.codigo_legible || transferencia.id?.slice(0, 8)}`,
    mensaje: `Nueva transferencia de ${origen?.nombre || 'origen'} a ${destino?.nombre || 'destino'} por ${usuarioCreador?.nombre || 'usuario'}`,
    datos_adicionales: {
      transferencia_id: transferencia.id,
      codigo: transferencia.codigo_legible,
      origen_id: origen?.id,
      origen_nombre: origen?.nombre,
      destino_id: destino?.id,
      destino_nombre: destino?.nombre,
      usuario_creador: usuarioCreador?.nombre,
      accionUrl: `/movimientos?id=${transferencia.id}` // Navigate to movimiento details
    },
    usuarios_destino: usuariosDestino || [],
    productos_afectados: (productos || []).map(p => ({
      producto_id: p.producto_id,
      nombre: p.nombre,
      cantidad: p.cantidad
    })),
    cantidad_items: (productos || []).length
  })
}

/**
 * Trigger transferencia_pendiente notification (>1 day waiting)
 */
export async function triggerTransferenciaPendiente({ transferencia, ubicacion, usuariosDestino }) {
  return createOrUpdateNotification({
    tipo: NOTIFICATION_TYPES.TRANSFERENCIA_PENDIENTE,
    prioridad: PRIORITY.MEDIA,
    titulo: `Transferencia pendiente: ${transferencia.codigo_legible || transferencia.id?.slice(0, 8)}`,
    mensaje: `Transferencia esperando confirmación en ${ubicacion?.nombre || 'ubicación'} por más de 1 día`,
    datos_adicionales: {
      transferencia_id: transferencia.id,
      codigo: transferencia.codigo_legible,
      ubicacion_id: ubicacion?.id,
      ubicacion_nombre: ubicacion?.nombre,
      accionUrl: `/movimientos?id=${transferencia.id}` // Navigate to movimiento details
    },
    usuarios_destino: usuariosDestino || []
  })
}

/**
 * Trigger conteo_recordatorio - consolidated daily reminder
 */
export async function triggerConteoRecordatorio({ productosParaContar, ubicacion, usuariosDestino }) {
  const count = productosParaContar.length
  if (count === 0) return null

  return createOrUpdateNotification({
    tipo: NOTIFICATION_TYPES.CONTEO_RECORDATORIO,
    prioridad: PRIORITY.BAJA,
    titulo: count > 3 ? `${count} productos requieren conteo` : `Conteo pendiente: ${productosParaContar.map(p => p.nombre).join(', ')}`,
    mensaje: `${count} producto(s) requieren conteo hoy en ${ubicacion?.nombre || 'ubicación'}`,
    datos_adicionales: {
      ubicacion_id: ubicacion?.id,
      ubicacion_nombre: ubicacion?.nombre,
      accionUrl: '/conteos' // Navigate to conteos page
    },
    usuarios_destino: usuariosDestino || [],
    productos_afectados: productosParaContar.map(p => ({
      producto_id: p.id,
      nombre: p.nombre,
      frecuencia_dias: p.frecuencia_inventario_Dias,
      ultimo_conteo: p.ultimo_conteo
    })),
    cantidad_items: count,
    agrupada: count > 3
  })
}

// ========== CLEANUP ==========

/**
 * Delete notifications older than 30 days
 */
export async function cleanupOldNotifications() {
  const db = getDB()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const cutoff = Timestamp.fromDate(thirtyDaysAgo)

  try {
    const q = query(
      collection(db, 'notificaciones'),
      where('activa', '==', false)
    )
    const snap = await getDocs(q)
    let deleted = 0
    for (const d of snap.docs) {
      const created = d.data().fecha_creacion
      if (created && created.toDate() < thirtyDaysAgo) {
        await deleteDoc(doc(db, 'notificaciones', d.id))
        deleted++
      }
    }
    return deleted
  } catch (e) {
    console.error('Error cleaning up notifications:', e)
    return 0
  }
}

// ========== CONTEO REMINDER LOGIC ==========

/**
 * Evaluate which products need counting today based on their frequency
 * Returns array of products that need counting
 */
export function evaluateProductsForCounting(productos, detalleConteos, conteos) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return productos.filter(producto => {
    const frecuenciaDias = parseInt(producto.frecuencia_inventario_Dias) || 30

    // Find the last completed conteo that includes this product
    let lastConteoDate = null
    const completedConteos = (conteos || []).filter(c =>
      c.estado === 'COMPLETADO' || c.estado === 'PARCIALMENTE_COMPLETADO'
    )

    for (const conteo of completedConteos) {
      const detalles = (detalleConteos || []).filter(d => d.conteo_id === conteo.id && d.producto_id === producto.id)
      if (detalles.length > 0) {
        const conteoDate = conteo.fecha_completado?.toDate?.() ||
          (conteo.fecha_completado?.seconds ? new Date(conteo.fecha_completado.seconds * 1000) : null) ||
          (conteo.fecha_completado ? new Date(conteo.fecha_completado) : null)
        if (conteoDate && (!lastConteoDate || conteoDate > lastConteoDate)) {
          lastConteoDate = conteoDate
        }
      }
    }

    if (!lastConteoDate) return true // Never counted = needs counting

    // Check if interval has passed
    const nextCountDate = new Date(lastConteoDate)
    nextCountDate.setDate(nextCountDate.getDate() + frecuenciaDias)
    return nextCountDate <= today
  })
}

// ========== SAVE/LOAD USER NOTIFICATION CONFIG ==========

export async function saveNotificationConfig(userId, config) {
  const db = getDB()
  try {
    const ref = doc(db, 'configuracion_notificaciones', userId)
    await updateDoc(ref, { ...config, updated_at: serverTimestamp() }).catch(async () => {
      // Document doesn't exist, create it
      const { setDoc } = await import('firebase/firestore')
      await setDoc(ref, { ...config, created_at: serverTimestamp(), updated_at: serverTimestamp() })
    })
    return { success: true }
  } catch (e) {
    console.error('Error saving notification config:', e)
    return { success: false, message: e.message }
  }
}

export async function getNotificationConfig(userId) {
  const db = getDB()
  try {
    const { getDoc } = await import('firebase/firestore')
    const snap = await getDoc(doc(db, 'configuracion_notificaciones', userId))
    if (snap.exists()) return snap.data()
    return null
  } catch (e) {
    console.error('Error getting notification config:', e)
    return null
  }
}

export default {
  NOTIFICATION_TYPES,
  PRIORITY,
  subscribeToNotifications,
  markAsRead,
  markAsOpened,
  resolveNotification,
  markAllAsRead,
  deleteNotification,
  isNotificationExpired,
  triggerStockBajo,
  triggerTransferenciaRecibida,
  triggerTransferenciaPendiente,
  triggerConteoRecordatorio,
  cleanupOldNotifications,
  evaluateProductsForCounting,
  playNotificationSound,
  sendBrowserNotification,
  saveNotificationConfig,
  getNotificationConfig
}
