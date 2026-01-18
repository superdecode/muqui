import { PERMISSIONS } from '../config/roles.config'

// Verificar si un usuario tiene un permiso específico
export const hasPermission = (user, permission) => {
  if (!user || !user.rol) return false

  const rolePermissions = PERMISSIONS[permission]
  if (!rolePermissions) return false

  return rolePermissions.includes(user.rol)
}

// Verificar si un usuario tiene cualquiera de los permisos
export const hasAnyPermission = (user, permissions) => {
  return permissions.some(permission => hasPermission(user, permission))
}

// Verificar si un usuario tiene todos los permisos
export const hasAllPermissions = (user, permissions) => {
  return permissions.every(permission => hasPermission(user, permission))
}

// Verificar si es admin global
export const isAdminGlobal = (user) => {
  return user?.rol === 'ADMIN_GLOBAL'
}

// Verificar si es admin de empresa
export const isAdminEmpresa = (user) => {
  return user?.rol === 'ADMIN_EMPRESA'
}

// Verificar si puede ver inventario
export const canViewInventory = (user) => {
  return hasPermission(user, 'inventario.ver')
}

// Verificar si puede ajustar inventario
export const canAdjustInventory = (user) => {
  return hasPermission(user, 'inventario.ajustar')
}

// Verificar si puede crear transferencias
export const canCreateTransfer = (user) => {
  return hasPermission(user, 'transferencias.crear')
}

// Verificar si puede confirmar transferencias
export const canConfirmTransfer = (user) => {
  return hasPermission(user, 'transferencias.confirmar')
}

// Verificar si puede editar transferencias
export const canEditTransfer = (user) => {
  return hasPermission(user, 'transferencias.editar')
}

// Verificar si puede programar conteos
export const canScheduleCount = (user) => {
  return hasPermission(user, 'conteos.programar')
}

// Verificar si puede ejecutar conteos
export const canExecuteCount = (user) => {
  return hasPermission(user, 'conteos.ejecutar')
}

// Verificar si puede ver reportes
export const canViewReports = (user) => {
  return hasPermission(user, 'reportes.ver')
}

// Verificar si puede exportar reportes
export const canExportReports = (user) => {
  return hasPermission(user, 'reportes.exportar')
}

export default {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  isAdminGlobal,
  isAdminEmpresa,
  canViewInventory,
  canAdjustInventory,
  canCreateTransfer,
  canConfirmTransfer,
  canEditTransfer,
  canScheduleCount,
  canExecuteCount,
  canViewReports,
  canExportReports
}
