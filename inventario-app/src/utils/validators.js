// Validadores de formularios

export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

export const validatePassword = (password) => {
  // Mínimo 6 caracteres
  return password && password.length >= 6
}

export const validateRequired = (value) => {
  return value !== null && value !== undefined && value !== ''
}

export const validateNumber = (value) => {
  return !isNaN(value) && value !== ''
}

export const validatePositiveNumber = (value) => {
  return validateNumber(value) && parseFloat(value) > 0
}

export const validateInteger = (value) => {
  return Number.isInteger(Number(value))
}

export const validateQuantity = (value) => {
  return validatePositiveNumber(value) && validateInteger(value)
}

export const validateStockMinimo = (stockActual, stockMinimo) => {
  return parseFloat(stockActual) >= parseFloat(stockMinimo)
}

// Validar formulario de transferencia
export const validateTransferencia = (data) => {
  const errors = {}

  if (!data.origenId) errors.origenId = 'Debe seleccionar un origen'
  if (!data.destinoId) errors.destinoId = 'Debe seleccionar un destino'
  if (data.origenId === data.destinoId) {
    errors.destinoId = 'El origen y destino no pueden ser iguales'
  }
  if (!data.productos || data.productos.length === 0) {
    errors.productos = 'Debe agregar al menos un producto'
  }

  // Validar cada producto
  if (data.productos) {
    data.productos.forEach((prod, index) => {
      if (!validateQuantity(prod.cantidad)) {
        errors[`producto_${index}`] = 'Cantidad inválida'
      }
    })
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

// Validar formulario de conteo
export const validateConteo = (data) => {
  const errors = {}

  if (!data.ubicacionId) errors.ubicacionId = 'Debe seleccionar una ubicación'
  if (!data.tipoConteo) errors.tipoConteo = 'Debe seleccionar un tipo de conteo'
  if (!data.fechaProgramada) errors.fechaProgramada = 'Debe seleccionar una fecha'
  if (!data.responsableId) errors.responsableId = 'Debe asignar un responsable'

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

// Validar formulario de producto
export const validateProducto = (data) => {
  const errors = {}

  if (!validateRequired(data.nombre)) errors.nombre = 'El nombre es requerido'
  if (!validateRequired(data.especificacion)) errors.especificacion = 'La especificación es requerida'
  if (!validateRequired(data.unidadMedida)) errors.unidadMedida = 'La unidad de medida es requerida'
  if (!validateRequired(data.presentacion)) errors.presentacion = 'La presentación es requerida'
  if (!validatePositiveNumber(data.stockMinimoDefault)) {
    errors.stockMinimoDefault = 'El stock mínimo debe ser mayor a 0'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

export default {
  validateEmail,
  validatePassword,
  validateRequired,
  validateNumber,
  validatePositiveNumber,
  validateInteger,
  validateQuantity,
  validateStockMinimo,
  validateTransferencia,
  validateConteo,
  validateProducto
}
