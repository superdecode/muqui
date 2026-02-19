/**
 * Notification Service
 * Handles real-time Firebase notifications, triggers, deduplication, and grouping
 */
import {
  collection, doc, addDoc, updateDoc, getDocs, deleteDoc,
  query, where, onSnapshot, serverTimestamp, Timestamp
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
    const ctx = new (window.AudioContext || window.webkitAudioContext)()

    function playNote(freq, startTime, duration, volume = 0.22) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, startTime)
      gain.gain.linearRampToValueAtTime(volume, startTime + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
      osc.start(startTime)
      osc.stop(startTime + duration + 0.05)
    }

    // Critical: arpegio C mayor ascendente con resolución (~2.2s)
    SOUNDS.critical = () => {
      const t = ctx.currentTime
      playNote(523.25, t,        0.5,  0.25) // C5
      playNote(659.25, t + 0.30, 0.5,  0.25) // E5
      playNote(783.99, t + 0.60, 0.5,  0.25) // G5
      playNote(1046.5, t + 0.90, 0.5,  0.28) // C6
      playNote(1318.5, t + 1.20, 0.5,  0.22) // E6
      playNote(1046.5, t + 1.55, 0.75, 0.18) // C6 (resolución)
    }

    // Info: melodía ascendente con cierre suave (~2s)
    SOUNDS.info = () => {
      const t = ctx.currentTime
      playNote(523.25, t,        0.5,  0.18) // C5
      playNote(659.25, t + 0.40, 0.5,  0.18) // E5
      playNote(783.99, t + 0.80, 0.5,  0.18) // G5
      playNote(659.25, t + 1.25, 0.75, 0.15) // E5 (resolución)
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
 * Subscribe to real-time notifications for a user.
 *
 * Uses a single array-contains query (no compound constraints) to:
 * 1. Avoid requiring a Firestore composite index
 * 2. Satisfy security rules that restrict reads to documents where the user
 *    is in usuarios_destino (a compound fallback without array-contains
 *    would be rejected by those rules)
 *
 * All other filtering (activa, sort, limit) is done client-side.
 */
export function subscribeToNotifications(userIdOrIds, callback, onError) {
  const ids = Array.isArray(userIdOrIds) ? userIdOrIds : [userIdOrIds]
  const userIds = [...new Set(ids.filter(Boolean).map(v => String(v).trim()))]
  if (userIds.length === 0) return () => {}

  const db = getDB()

  // Soportar múltiples IDs (p.ej. codigo y firestoreId) para compatibilidad
  // con notificaciones antiguas que pudieron haberse creado con otro identificador.
  const perUserDocs = new Map() // userId -> array docs

  const recomputeAndEmit = () => {
    const union = []
    perUserDocs.forEach(arr => {
      if (Array.isArray(arr)) union.push(...arr)
    })

    const dedupById = new Map()
    union.forEach(n => {
      if (!n?.id) return
      if (!dedupById.has(n.id)) dedupById.set(n.id, n)
    })

    const notifs = Array.from(dedupById.values())
      .sort((a, b) => {
        const fa = a.fecha_creacion?.seconds || 0
        const fb = b.fecha_creacion?.seconds || 0
        return fb - fa
      })
      .slice(0, 50)

    callback(notifs)
  }

  const unsubs = []

  userIds.forEach((userId) => {
    const attach = (key, q) => {
      const unsub = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        perUserDocs.set(key, docs)
        recomputeAndEmit()
      }, (error) => {
        console.error('Error in notifications listener:', error.code, error.message)
        if (typeof onError === 'function') onError(error)
      })
      unsubs.push(unsub)
    }

    // Nuevo esquema (array)
    attach(
      `${userId}:array`,
      query(collection(db, 'notificaciones'), where('usuarios_destino', 'array-contains', userId))
    )

    // Esquemas legacy (campo simple)
    attach(
      `${userId}:usuarioId`,
      query(collection(db, 'notificaciones'), where('usuarioId', '==', userId))
    )

    attach(
      `${userId}:usuario_id`,
      query(collection(db, 'notificaciones'), where('usuario_id', '==', userId))
    )
  })

  return () => {
    unsubs.forEach(fn => {
      try { fn?.() } catch { /* ignore */ }
    })
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
  
  console.log(`🔔 createOrUpdateNotification [${tipo}]:`, { titulo, usuarios_destino, productos: productos_afectados.length })

  const usuariosDestinoNorm = Array.isArray(usuarios_destino)
    ? [...new Set(usuarios_destino.map(v => String(v).trim()).filter(Boolean))]
    : []

  if (usuariosDestinoNorm.length === 0) {
    console.warn('⚠️ No hay usuarios destino para la notificación, abortando creación.')
    return null
  }

  // Deduplicación SOLO para tipos consolidables.
  // Importante: transferencias NO deben deduplicarse, porque si se actualiza el mismo doc
  // el cliente lo verá como "modified" y no disparará popup como nueva notificación.
  const shouldDedup = tipo === NOTIFICATION_TYPES.STOCK_BAJO || tipo === NOTIFICATION_TYPES.CONTEO_RECORDATORIO

  if (shouldDedup) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

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

        const isToday = created >= today
        const sameUbicacion = String(data.datos_adicionales?.ubicacion_id || '') === String(datos_adicionales?.ubicacion_id || '')

        return isToday && sameUbicacion
      })

      if (match) {
        console.log('♻️ Deduplicando notificación existente:', match.id)
        const existingData = match.data()
        const mergedProducts = [...new Set([...(existingData.productos_afectados || []), ...productos_afectados])]
        const newCount = mergedProducts.length || cantidad_items

        let newTitulo = titulo
        let newMensaje = mensaje

        if (tipo === NOTIFICATION_TYPES.STOCK_BAJO && newCount > 1) {
          newTitulo = `${newCount} productos con stock bajo`
          newMensaje = `${newCount} productos están por debajo del stock mínimo en ${datos_adicionales?.ubicacion_nombre || 'ubicación'}`
        }

        await updateDoc(doc(db, 'notificaciones', match.id), {
          titulo: newTitulo,
          mensaje: newMensaje,
          datos_adicionales,
          productos_afectados: mergedProducts,
          cantidad_items: newCount,
          agrupada: newCount > 3,
          usuarios_destino: [...new Set([...(existingData.usuarios_destino || []), ...usuariosDestinoNorm])],
          leido_por: [],
          updated_at: serverTimestamp()
        })

        return match.id
      }
    } catch (e) {
      console.warn('Dedup query failed or skipped, creating new notification:', e.message)
    }
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
    usuarios_destino: usuariosDestinoNorm,
    leido_por: [],
    abierta_por: [], // NEW: track who has opened (clicked) the notification
    activa: true,
    agrupada: agrupada || productos_afectados.length > 3,
    productos_afectados: productos_afectados || [],
    cantidad_items: cantidad_items || productos_afectados.length,
    accionUrl: datos_adicionales?.accionUrl || null, // NEW: URL to navigate when clicked
    expiraEn: Timestamp.fromDate(expiraEn) // NEW: expires after 24h
  }

  try {
    const ref = await addDoc(collection(db, 'notificaciones'), notifData)
    console.log('✅ Notificación creada exitosamente en Firestore:', ref.id)
    return ref.id
  } catch (error) {
    console.error('❌ Error fatal creando documento en Firestore:', error)
    throw error
  }
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
  // Asegurar que todos los campos tengan valores definidos
  const datosAdicionales = {
    transferencia_id: transferencia?.id || '',
    codigo: transferencia?.codigo_legible || '',
    accionUrl: `/movimientos?id=${transferencia?.id || ''}` // Navigate to movimiento details
  }
  
  // Solo agregar campos si tienen valores definidos
  if (origen?.id) datosAdicionales.origen_id = origen.id
  if (origen?.nombre) datosAdicionales.origen_nombre = origen.nombre
  if (destino?.id) datosAdicionales.destino_id = destino.id
  if (destino?.nombre) datosAdicionales.destino_nombre = destino.nombre
  if (usuarioCreador?.nombre) datosAdicionales.usuario_creador = usuarioCreador.nombre
  
  return createOrUpdateNotification({
    tipo: NOTIFICATION_TYPES.TRANSFERENCIA_RECIBIDA,
    prioridad: PRIORITY.ALTA,
    titulo: `Transferencia recibida: ${transferencia?.codigo_legible || transferencia?.id?.slice(0, 8) || 'N/A'}`,
    mensaje: `Nueva transferencia de ${origen?.nombre || 'origen'} a ${destino?.nombre || 'destino'} por ${usuarioCreador?.nombre || 'Sistema'}`,
    datos_adicionales: datosAdicionales,
    usuarios_destino: usuariosDestino || [],
    productos_afectados: (productos || []).map(p => ({
      producto_id: p.producto_id || '',
      nombre: p.nombre || 'Producto',
      cantidad: p.cantidad || 0
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

/**
 * Verificar stock bajo y crear notificación si es necesario
 * Se ejecuta después de actualizar inventario (venta, salida, recepción, merma, conteo)
 */
export async function verificarStockBajo(productoId, ubicacionId) {
  const db = getDB()
  
  try {
    console.log(`🔍 Verificando stock bajo: producto=${productoId}, ubicacion=${ubicacionId}`)
    
    // 1. Obtener inventario actual
    const { getDocs: getDocsImport } = await import('firebase/firestore')
    const inventarioQuery = query(
      collection(db, 'inventario'),
      where('producto_id', '==', productoId),
      where('ubicacion_id', '==', ubicacionId)
    )
    const inventarioSnap = await getDocsImport(inventarioQuery)
    
    if (inventarioSnap.empty) {
      console.log('⚠️ No hay inventario para este producto en esta ubicación')
      return { success: false, message: 'No inventory found' }
    }
    
    const inventario = { id: inventarioSnap.docs[0].id, ...inventarioSnap.docs[0].data() }
    const cantidadActual = inventario.stock_actual || 0
    
    // 2. Obtener producto y stock mínimo global
    const { getDoc: getDocImport } = await import('firebase/firestore')
    const productoSnap = await getDocImport(doc(db, 'productos', productoId))
    
    if (!productoSnap.exists()) {
      console.log('⚠️ Producto no encontrado')
      return { success: false, message: 'Product not found' }
    }
    
    const producto = { id: productoSnap.id, ...productoSnap.data() }
    const stockMinimo = producto.stock_minimo || 0
    
    // 3. Comparar stock actual vs mínimo
    if (cantidadActual > stockMinimo) {
      console.log(`✅ Stock OK: ${cantidadActual} > ${stockMinimo}`)
      return { success: true, message: 'Stock above minimum' }
    }
    
    console.log(`⚠️ Stock bajo detectado: ${cantidadActual} <= ${stockMinimo}`)
    
    // 4. Verificar si ya existe notificación activa
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const hoySiguiente = new Date(hoy)
    hoySiguiente.setDate(hoySiguiente.getDate() + 1)
    
    const notifExistenteQuery = query(
      collection(db, 'notificaciones'),
      where('tipo', '==', NOTIFICATION_TYPES.STOCK_BAJO),
      where('activa', '==', true),
      where('expiraEn', '>', Timestamp.now())
    )
    const notifExistenteSnap = await getDocsImport(notifExistenteQuery)
    
    // Verificar si alguna notificación existente es para este producto y ubicación
    const yaExiste = notifExistenteSnap.docs.some(docSnap => {
      const data = docSnap.data()
      const productos = data.productos_afectados || []
      const ubicacionMatch = data.datos_adicionales?.ubicacion_id === ubicacionId
      const productoMatch = productos.some(p => p.producto_id === productoId)
      return ubicacionMatch && productoMatch
    })
    
    if (yaExiste) {
      console.log('ℹ️ Ya existe notificación activa para este producto y ubicación')
      return { success: true, message: 'Notification already exists' }
    }
    
    // 5. Obtener ubicación
    const ubicacionSnap = await getDocImport(doc(db, 'ubicaciones', ubicacionId))
    const ubicacion = ubicacionSnap.exists() 
      ? { id: ubicacionSnap.id, ...ubicacionSnap.data() }
      : { id: ubicacionId, nombre: 'Ubicación' }
    
    // 6. Obtener usuarios con acceso a esta ubicación
    const usuariosQuery = query(
      collection(db, 'usuarios'),
      where('estado', '==', 'ACTIVO')
    )
    const usuariosSnap = await getDocsImport(usuariosQuery)
    
    const usuariosDestino = []
    usuariosSnap.forEach(docSnap => {
      const usuario = docSnap.data()
      let ubicacionesAsignadas = []
      
      if (Array.isArray(usuario.ubicaciones_asignadas)) {
        ubicacionesAsignadas = usuario.ubicaciones_asignadas
      } else if (typeof usuario.ubicaciones_asignadas === 'string') {
        try {
          ubicacionesAsignadas = JSON.parse(usuario.ubicaciones_asignadas)
        } catch {
          ubicacionesAsignadas = []
        }
      }
      
      // Incluir si tiene acceso a esta ubicación o es admin global
      const tieneAcceso = ubicacionesAsignadas.includes(ubicacionId)
      const rolNorm = String(usuario.rol || '').toUpperCase()
      const esAdmin = rolNorm === 'ADMIN_GLOBAL' || 
                      rolNorm === 'ADMIN GLOBAL' || 
                      rolNorm === 'ADMINISTRADOR'
      
      if (tieneAcceso || esAdmin) {
        usuariosDestino.push(docSnap.id)
      }
    })
    
    const destinatariosUnicos = [...new Set(usuariosDestino)]
    
    if (destinatariosUnicos.length === 0) {
      console.log('⚠️ No hay usuarios para notificar')
      return { success: false, message: 'No users to notify' }
    }
    
    // 7. Crear notificación
    console.log(`🔔 Creando notificación de stock bajo para ${destinatariosUnicos.length} usuarios`)
    
    await triggerStockBajo({
      producto: [{
        id: producto.id,
        producto_id: producto.id,
        nombre: producto.nombre,
        stock_actual: cantidadActual,
        stock_minimo: stockMinimo
      }],
      ubicacion,
      stockActual: cantidadActual,
      stockMinimo: stockMinimo,
      usuariosDestino: destinatariosUnicos
    })
    
    console.log('✅ Notificación de stock bajo creada exitosamente')
    return { success: true, message: 'Notification created' }
    
  } catch (error) {
    console.error('❌ Error verificando stock bajo:', error)
    return { success: false, message: error.message }
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
  getNotificationConfig,
  verificarStockBajo
}
