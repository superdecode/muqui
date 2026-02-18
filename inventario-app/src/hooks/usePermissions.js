import { useAuthStore } from '../stores/authStore'

// Admin role names accepted in any casing (handles both "Admin Global" and "ADMIN GLOBAL")
const ADMIN_ROLE_NAMES = new Set([
  'admin global', 'administrador', 'admin empresa',
  'admin_global', 'admin_empresa', 'gerente operativo'
])
const isAdminRoleName = (name) => name && ADMIN_ROLE_NAMES.has(name.toLowerCase())

/**
 * Hook for checking permissions across the application
 * Provides convenient methods to check if user can perform actions
 */
export function usePermissions() {
  const { user, cachedRole, hasPermission, getPermissionLevel } = useAuthStore()

  /**
   * Check if user can edit/write in a module
   * @param {string} modulo - Module name (e.g., 'movimientos', 'productos')
   * @returns {boolean}
   */
  const canEdit = (modulo) => {
    if (!user) return false
    const rolName = cachedRole?.nombre || user.rol
    if (isAdminRoleName(rolName)) return true
    const level = getPermissionLevel(modulo)
    return level === 'escritura' || level === 'total'
  }

  /**
   * Check if user can delete in a module
   * @param {string} modulo - Module name
   * @returns {boolean}
   */
  const canDelete = (modulo) => {
    if (!user) return false
    const rolName = cachedRole?.nombre || user.rol
    if (isAdminRoleName(rolName)) return true
    const level = getPermissionLevel(modulo)
    return level === 'total'
  }

  /**
   * Check if user can view a module
   * @param {string} modulo - Module name
   * @returns {boolean}
   */
  const canView = (modulo) => {
    if (!user) return false
    
    const level = getPermissionLevel(modulo)
    
    // Any level except sin_acceso can view
    return level !== 'sin_acceso' && level !== ''
  }

  /**
   * Check if user is read-only (lectura) for a module
   * @param {string} modulo - Module name
   * @returns {boolean}
   */
  const isReadOnly = (modulo) => {
    if (!user) return true
    
    const level = getPermissionLevel(modulo)
    return level === 'lectura'
  }

  /**
   * Check if user is admin (any admin role)
   * @returns {boolean}
   */
  const isAdmin = () => {
    if (!user) return false
    const rolName = cachedRole?.nombre || user.rol
    return isAdminRoleName(rolName)
  }

  return {
    canEdit,
    canDelete,
    canView,
    isReadOnly,
    isAdmin,
    hasPermission,
    getPermissionLevel,
    user
  }
}
