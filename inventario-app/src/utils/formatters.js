import { format, formatDistance, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

// Formatear fecha
export const formatDate = (date, formatStr = 'dd/MM/yyyy') => {
  if (!date) return ''
  return format(new Date(date), formatStr, { locale: es })
}

// Formatear fecha y hora
export const formatDateTime = (date) => {
  if (!date) return ''
  return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: es })
}

// Formatear distancia de tiempo (ej: "hace 2 horas")
export const formatTimeAgo = (date) => {
  if (!date) return ''
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es })
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
