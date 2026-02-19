/**
 * Utilidades para manejar productos por ubicación
 */

/**
 * Filtrar productos disponibles para una ubicación específica
 * @param {Array} productos - Lista de productos
 * @param {string} ubicacionId - ID de la ubicación
 * @param {Array} ubicaciones - Lista completa de ubicaciones
 * @returns {Array} Productos permitidos para la ubicación
 */
export const filtrarProductosPorUbicacion = (productos, ubicacionId, ubicaciones = []) => {
  if (!ubicacionId) return productos
  
  const ubicacion = ubicaciones.find(u => u.id === ubicacionId)
  if (!ubicacion) return productos
  
  return productos.filter(producto => {
    // Si el producto tiene ubicaciones_permitidas explícitas
    if (producto.ubicaciones_permitidas && Array.isArray(producto.ubicaciones_permitidas)) {
      // Si el array está vacío, el producto está disponible en todas las ubicaciones
      if (producto.ubicaciones_permitidas.length === 0) return true
      return producto.ubicaciones_permitidas.includes(ubicacionId)
    }
    
    // Si el producto tiene empresas_permitidas, verificar por empresa
    if (producto.empresas_permitidas && Array.isArray(producto.empresas_permitidas)) {
      if (producto.empresas_permitidas.length === 0) return true
      return producto.empresas_permitidas.includes(ubicacion.empresa_id)
    }
    
    // Si no tiene ubicaciones_permitidas ni empresas_permitidas definidas, permitir (retrocompatibilidad)
    return true
  })
}

/**
 * Verificar si un producto puede existir en una ubicación
 * @param {Object} producto - Producto a verificar
 * @param {string} ubicacionId - ID de la ubicación
 * @param {Array} ubicaciones - Lista completa de ubicaciones
 * @returns {boolean} True si el producto es permitido
 */
export const esProductoPermitidoEnUbicacion = (producto, ubicacionId, ubicaciones = []) => {
  if (!producto || !ubicacionId) return false
  
  const ubicacion = ubicaciones.find(u => u.id === ubicacionId)
  if (!ubicacion) return false
  
  // Verificar ubicaciones explícitas
  if (producto.ubicaciones_permitidas && Array.isArray(producto.ubicaciones_permitidas)) {
    return producto.ubicaciones_permitidas.includes(ubicacionId)
  }
  
  // Verificar por empresa
  if (producto.empresas_permitidas && Array.isArray(producto.empresas_permitidas)) {
    return producto.empresas_permitidas.includes(ubicacion.empresa_id)
  }
  
  // Comportamiento por defecto: permitir
  return true
}

/**
 * Obtener ubicaciones permitidas para un producto
 * @param {Object} producto - Producto a evaluar
 * @param {Array} ubicaciones - Lista completa de ubicaciones
 * @param {Array} empresas - Lista completa de empresas
 * @returns {Array} Lista de ubicaciones permitidas
 */
export const getUbicacionesPermitidasParaProducto = (producto, ubicaciones = [], empresas = []) => {
  if (!producto) return []
  
  // Si tiene ubicaciones explícitas
  if (producto.ubicaciones_permitidas && Array.isArray(producto.ubicaciones_permitidas)) {
    return ubicaciones.filter(u => producto.ubicaciones_permitidas.includes(u.id))
  }
  
  // Si tiene empresas permitidas
  if (producto.empresas_permitidas && Array.isArray(producto.empresas_permitidas)) {
    return ubicaciones.filter(u => producto.empresas_permitidas.includes(u.empresa_id))
  }
  
  // Por defecto, todas las ubicaciones activas
  return ubicaciones.filter(u => u.estado === 'ACTIVO')
}

/**
 * Actualizar producto con nuevas ubicaciones permitidas
 * @param {Object} producto - Producto a actualizar
 * @param {Array} ubicacionesIds - IDs de ubicaciones permitidas
 * @returns {Object} Producto actualizado
 */
export const actualizarUbicacionesPermitidas = (producto, ubicacionesIds) => {
  return {
    ...producto,
    ubicaciones_permitidas: Array.isArray(ubicacionesIds) ? ubicacionesIds : [],
    updated_at: new Date().toISOString()
  }
}

/**
 * Validar inventario antes de crear/editar
 * @param {Object} inventarioData - Datos del inventario a validar
 * @param {Array} productos - Lista de productos
 * @param {Array} ubicaciones - Lista de ubicaciones
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export const validarInventarioPorUbicacion = (inventarioData, productos, ubicaciones) => {
  const { producto_id, ubicacion_id } = inventarioData
  
  if (!producto_id || !ubicacion_id) {
    return { isValid: false, error: 'Producto y ubicación son requeridos' }
  }
  
  const producto = productos.find(p => p.id === producto_id)
  if (!producto) {
    return { isValid: false, error: 'Producto no encontrado' }
  }
  
  const ubicacion = ubicaciones.find(u => u.id === ubicacion_id)
  if (!ubicacion) {
    return { isValid: false, error: 'Ubicación no encontrada' }
  }
  
  const esPermitido = esProductoPermitidoEnUbicacion(producto, ubicacion_id, ubicaciones)
  if (!esPermitido) {
    return { 
      isValid: false, 
      error: `El producto "${producto.nombre}" no está permitido en la ubicación "${ubicacion.nombre}"` 
    }
  }
  
  return { isValid: true, error: null }
}
