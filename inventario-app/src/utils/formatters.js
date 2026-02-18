import { format, formatDistance, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { useThemeStore } from '../stores/themeStore'

/**
 * Get user preferences from themeStore (safe for non-React contexts)
 */
function getUserPrefs() {
  try {
    const state = useThemeStore.getState()
    return {
      timezone: state.timezone || 'America/Lima',
      dateFormat: state.dateFormat || 'DD/MM/YYYY',
      timeFormat: state.timeFormat || '24'
    }
  } catch {
    return { timezone: 'America/Lima', dateFormat: 'DD/MM/YYYY', timeFormat: '24' }
  }
}

/**
 * Convert user dateFormat preference to date-fns format string
 */
function getDateFnsFormat(userFormat, includeTime = false) {
  const prefs = getUserPrefs()
  const df = userFormat || prefs.dateFormat
  const tf = prefs.timeFormat

  let datePart
  switch (df) {
    case 'MM/DD/YYYY': datePart = 'MM/dd/yyyy'; break
    case 'YYYY-MM-DD': datePart = 'yyyy-MM-dd'; break
    default: datePart = 'dd/MM/yyyy'; break
  }

  if (!includeTime) return datePart
  return tf === '12' ? `${datePart} hh:mm a` : `${datePart} HH:mm`
}

/**
 * Apply timezone offset to a Date object for display purposes
 */
function applyTimezone(date) {
  try {
    const { timezone } = getUserPrefs()
    const str = date.toLocaleString('en-US', { timeZone: timezone })
    return new Date(str)
  } catch {
    return date
  }
}

/**
 * Convierte cualquier valor de fecha (Firebase Timestamp, ISO string, Date, seconds) a un Date válido.
 * Retorna null si no se puede convertir.
 */
export const safeParseDate = (value) => {
  if (!value) return null
  try {
    // Firebase Timestamp object (has .toDate())
    if (typeof value?.toDate === 'function') {
      return value.toDate()
    }
    // Firebase Timestamp-like object { seconds, nanoseconds }
    if (value?.seconds !== undefined) {
      return new Date(value.seconds * 1000)
    }
    // Already a Date
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value
    }
    // Number (unix ms)
    if (typeof value === 'number') {
      return new Date(value)
    }
    // String
    const parsed = new Date(value)
    return isNaN(parsed.getTime()) ? null : parsed
  } catch {
    return null
  }
}

/**
 * Formatea una fecha de forma segura. Retorna fallback si la fecha es inválida.
 * Respects user timezone and date/time format preferences.
 */
export const safeFormatDate = (value, formatStr = "d MMM yyyy", fallback = '-') => {
  const date = safeParseDate(value)
  if (!date) return fallback
  try {
    const tzDate = applyTimezone(date)
    return format(tzDate, formatStr, { locale: es })
  } catch {
    return fallback
  }
}

// Formatear fecha using user preferences
export const formatDate = (date, formatStr) => {
  if (!date) return ''
  const parsed = safeParseDate(date)
  if (!parsed) return ''
  const tzDate = applyTimezone(parsed)
  const fmtStr = formatStr || getDateFnsFormat()
  return format(tzDate, fmtStr, { locale: es })
}

// Formatear fecha y hora using user preferences
export const formatDateTime = (date) => {
  if (!date) return ''
  const parsed = safeParseDate(date)
  if (!parsed) return ''
  const tzDate = applyTimezone(parsed)
  return format(tzDate, getDateFnsFormat(null, true), { locale: es })
}

// Formatear distancia de tiempo (ej: "hace 2 horas")
export const formatTimeAgo = (date) => {
  if (!date) return ''
  const parsed = safeParseDate(date)
  if (!parsed) return ''
  return formatDistanceToNow(parsed, { addSuffix: true, locale: es })
}

// Formatear número con separadores de miles
export const formatNumber = (number, decimals = 0) => {
  if (number === null || number === undefined) return '0'
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(number)
}

// Formatear moneda
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '$0'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(amount)
}

// Formatear porcentaje
export const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined) return '0%'
  return `${formatNumber(value, decimals)}%`
}

// Formatear nombre de producto
export const formatProductName = (nombre, especificacion, presentacion) => {
  if (!nombre) return ''
  let formatted = nombre.toUpperCase()
  if (especificacion) formatted += ` (${especificacion})`
  if (presentacion) formatted += ` - ${presentacion}`
  return formatted
}

// Formatear estado con color
export const getEstadoColor = (estado) => {
  const colors = {
    ACTIVO: 'text-green-600 bg-green-100',
    INACTIVO: 'text-gray-600 bg-gray-100',
    PENDIENTE: 'text-yellow-600 bg-yellow-100',
    CONFIRMADA: 'text-green-600 bg-green-100',
    CANCELADA: 'text-red-600 bg-red-100',
    EN_PROCESO: 'text-blue-600 bg-blue-100',
    COMPLETADO: 'text-green-600 bg-green-100',
    VENCIDO: 'text-red-600 bg-red-100'
  }
  return colors[estado] || 'text-gray-600 bg-gray-100'
}

// Formatear prioridad con color
export const getPrioridadColor = (prioridad) => {
  const colors = {
    BAJA: 'text-gray-600 bg-gray-100',
    MEDIA: 'text-yellow-600 bg-yellow-100',
    ALTA: 'text-orange-600 bg-orange-100',
    CRITICA: 'text-red-600 bg-red-100'
  }
  return colors[prioridad] || 'text-gray-600 bg-gray-100'
}

// Truncar texto
export const truncate = (text, maxLength = 50) => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

/**
 * Transforma todos los campos de texto libre de un objeto a MAYÚSCULAS.
 * Ignora campos que son IDs, emails, passwords, timestamps, arrays, objects, numbers, booleans.
 */
const SKIP_UPPERCASE_KEYS = new Set([
  'id', 'email', 'password', 'uid', 'created_at', 'updated_at',
  'fecha_creacion', 'fecha_confirmacion', 'fecha_programada', 'fecha_inicio',
  'fecha_completado', 'fecha_limite_edicion', 'timestamp', 'fecha_ajuste',
  'fecha_aprobacion', 'fecha_actualizacion', 'fecha_resolucion',
  'usuario_creacion_id', 'usuario_confirmacion_id', 'usuario_responsable_id',
  'usuario_ejecutor_id', 'producto_id', 'ubicacion_id', 'empresa_id',
  'origen_id', 'destino_id', 'movimiento_id', 'conteo_id', 'rol',
  'estado', 'tipo', 'tipo_movimiento', 'tipo_conteo', 'tipo_ubicacion',
  'tipo_ajuste', 'tipo_dato', 'categoria_ticket', 'prioridad', 'color'
])

export const uppercaseStrings = (data) => {
  if (!data || typeof data !== 'object') return data
  const result = { ...data }
  for (const [key, value] of Object.entries(result)) {
    if (SKIP_UPPERCASE_KEYS.has(key)) continue
    if (typeof value === 'string' && value.trim()) {
      result[key] = value.toUpperCase()
    }
  }
  return result
}

/**
 * Convierte una etiqueta técnica a lenguaje natural.
 * Ej: "tipo_sede" -> "Tipo Sede", "ADMIN_GLOBAL" -> "Admin Global",
 *     "PUNTO_VENTA" -> "Punto Venta", "EN_PROGRESO" -> "En Progreso"
 */
export const formatLabel = (label) => {
  if (!label || typeof label !== 'string') return label || ''
  return label
    .replace(/[_/\-]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * Format a record identifier for display.
 * Prefers codigo_legible or codigo; never exposes raw Firestore IDs.
 * @param {object} record - The record object (must have id, may have codigo_legible or codigo)
 * @param {string} prefix - Fallback prefix if no readable code exists (e.g. 'REG')
 * @returns {string} A human-readable identifier
 */
export const formatDisplayId = (record, prefix = 'REG') => {
  if (!record) return '-'
  if (record.codigo_legible) return record.codigo_legible
  if (record.codigo) return record.codigo
  // Fallback: generate a short hash-like code from the Firestore ID (never show the raw ID)
  if (record.id) {
    const hash = record.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()
    return `${prefix}-${hash}`
  }
  return '-'
}
