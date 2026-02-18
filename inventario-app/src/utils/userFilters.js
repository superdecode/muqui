/**
 * Utilidades para filtrar datos basados en asignaciones de usuario
 */

/**
 * Obtiene las IDs de ubicaciones que un usuario puede ver
 * PRIORIDAD: Si ubicaciones_asignadas está definido, usa SOLO esas (filtro estricto).
 * Si ubicaciones_asignadas está vacío pero empresas_asignadas está definido,
 * entonces usa todas las ubicaciones de esas empresas.
 */
export const getUserAllowedUbicacionIds = (user, allUbicaciones, allEmpresas) => {
  if (!user) return []

  // Si es admin global, puede ver todo
  if (user.rol === 'ADMIN_GLOBAL') return []

  // Obtener ubicaciones asignadas directamente
  let ubicacionIds = []
  if (Array.isArray(user.ubicaciones_asignadas)) {
    // Si es array pero contiene strings mal formateados como '["ID1", "ID2"]'
    if (user.ubicaciones_asignadas.length === 1 && typeof user.ubicaciones_asignadas[0] === 'string' && user.ubicaciones_asignadas[0].includes(',')) {
      ubicacionIds = user.ubicaciones_asignadas[0].split(',').map(id => id.trim().replace(/["\']/g, ''))
    } else {
      ubicacionIds = user.ubicaciones_asignadas.map(id => String(id).replace(/["\']/g, '')).filter(Boolean)
    }
  } else if (typeof user.ubicaciones_asignadas === 'string') {
    try {
      ubicacionIds = JSON.parse(user.ubicaciones_asignadas)
    } catch {
      ubicacionIds = user.ubicaciones_asignadas.split(',').map(id => id.trim().replace(/["\']/g, ''))
    }
  }

  // PRIORIDAD ESTRICTA: Si el usuario tiene ubicaciones asignadas explícitamente, usar SOLO esas
  // No expandir con todas las ubicaciones de la empresa
  if (ubicacionIds.length > 0) {
    return ubicacionIds
  }

  // Solo si NO tiene ubicaciones asignadas, obtener ubicaciones de empresas asignadas
  let empresaIds = []
  if (Array.isArray(user.empresas_asignadas)) {
    // Si es array pero contiene strings mal formateados como '["ID1", "ID2"]'
    if (user.empresas_asignadas.length === 1 && typeof user.empresas_asignadas[0] === 'string' && user.empresas_asignadas[0].includes(',')) {
      empresaIds = user.empresas_asignadas[0].split(',').map(id => id.trim().replace(/["\']/g, ''))
    } else {
      empresaIds = user.empresas_asignadas.map(id => String(id).replace(/["\']/g, '')).filter(Boolean)
    }
  } else if (typeof user.empresas_asignadas === 'string') {
    try {
      empresaIds = JSON.parse(user.empresas_asignadas)
    } catch {
      empresaIds = user.empresas_asignadas.split(',').map(id => id.trim().replace(/["\']/g, ''))
    }
  }

  // Si tiene empresas asignadas pero NO ubicaciones específicas, usar todas las de esas empresas
  if (empresaIds.length > 0 && allUbicaciones && allEmpresas) {
    const empresaUbicaciones = allUbicaciones
      .filter(ub => empresaIds.includes(ub.empresa_id))
      .map(ub => ub.id)

    return empresaUbicaciones
  }

  return ubicacionIds
}

/**
 * Obtiene las IDs de empresas que un usuario puede ver
 */
export const getUserAllowedEmpresaIds = (user) => {
  if (!user) return []

  // Si es admin global, puede ver todo
  if (user.rol === 'ADMIN_GLOBAL') return []

  let empresaIds = []
  if (Array.isArray(user.empresas_asignadas)) {
    // Si es array pero contiene strings mal formateados como '["ID1", "ID2"]'
    if (user.empresas_asignadas.length === 1 && typeof user.empresas_asignadas[0] === 'string' && user.empresas_asignadas[0].includes(',')) {
      empresaIds = user.empresas_asignadas[0].split(',').map(id => id.trim().replace(/["\']/g, ''))
    } else {
      empresaIds = user.empresas_asignadas.map(id => String(id).replace(/["\']/g, '')).filter(Boolean)
    }
  } else if (typeof user.empresas_asignadas === 'string') {
    try {
      empresaIds = JSON.parse(user.empresas_asignadas)
    } catch {
      empresaIds = user.empresas_asignadas.split(',').map(id => id.trim().replace(/["\']/g, ''))
    }
  }

  return empresaIds
}

/**
 * Filtra un array de elementos basado en las asignaciones del usuario
 * @param {Array} items - Items a filtrar
 * @param {Object} user - Usuario actual
 * @param {Function} getItemUbicacionId - Función para obtener ubicacion_id de un item
 * @param {Function} getItemEmpresaId - Función para obtener empresa_id de un item
 * @param {Array} allUbicaciones - Todas las ubicaciones disponibles
 * @param {Array} allEmpresas - Todas las empresas disponibles
 */
export const filterByUserAssignments = (
  items, 
  user, 
  getItemUbicacionId, 
  getItemEmpresaId,
  allUbicaciones = [],
  allEmpresas = []
) => {
  if (!user || user.rol === 'ADMIN_GLOBAL') return items

  const allowedUbicacionIds = getUserAllowedUbicacionIds(user, allUbicaciones, allEmpresas)
  const allowedEmpresaIds = getUserAllowedEmpresaIds(user)

  return items.filter(item => {
    const ubicacionId = getItemUbicacionId(item)
    const empresaId = getItemEmpresaId ? getItemEmpresaId(item) : null

    // Si tiene ubicaciones asignadas, verificar que la ubicación esté permitida
    if (allowedUbicacionIds.length > 0 && ubicacionId) {
      if (!allowedUbicacionIds.includes(ubicacionId)) return false
    }

    // Si tiene empresas asignadas, verificar que la empresa esté permitida
    if (allowedEmpresaIds.length > 0 && empresaId) {
      if (!allowedEmpresaIds.includes(empresaId)) return false
    }

    // Si no tiene asignaciones específicas, permitir todo (para compatibilidad)
    if (allowedUbicacionIds.length === 0 && allowedEmpresaIds.length === 0) {
      return true
    }

    return true
  })
}
