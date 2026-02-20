/**
 * Script to fix admin access issues
 * Run this in the browser console to check and update your user role
 */
export const fixAdminAccess = async () => {
  try {
    // Get current user from localStorage
    const userStr = localStorage.getItem('user')
    if (!userStr) {
      console.error('No user found in localStorage')
      return false
    }

    const user = JSON.parse(userStr)
    console.log('Current user:', user)

    // Check if user has admin role
    const adminRoles = ['ADMIN_GLOBAL', 'ADMIN_EMPRESA', 'Administrador']
    const isAdmin = adminRoles.includes(user.rol)

    console.log('Is admin:', isAdmin)
    console.log('User role:', user.rol)

    if (!isAdmin) {
      // Update user role to ADMIN_GLOBAL
      user.rol = 'ADMIN_GLOBAL'
      localStorage.setItem('user', JSON.stringify(user))
      
      // Update authStore if it exists
      if (window.useAuthStore) {
        const { updateUser } = useAuthStore.getState()
        updateUser(user)
      }
      
      console.log('Updated user role to ADMIN_GLOBAL')
      console.log('Please refresh the page to see changes')
      return true
    }

    // If user is admin but still can't access, check permissions
    console.log('User already has admin role')
    console.log('Checking permissions...')
    
    // Test admin permission
    if (window.useAuthStore) {
      const { hasPermission } = useAuthStore.getState()
      const canSeeAdmin = hasPermission('administracion.ver')
      console.log('Can see admin module:', canSeeAdmin)
      
      if (!canSeeAdmin) {
        console.log('Permission check failed, trying to refresh role data...')
        // Force role refresh
        user.rol = 'ADMIN_GLOBAL'
        user.permisos_override = {
          administracion: { ver: true, crear: true, editar: true, eliminar: true }
        }
        localStorage.setItem('user', JSON.stringify(user))
        
        const { updateUser } = useAuthStore.getState()
        updateUser(user)
        
        console.log('Added admin permissions override')
        console.log('Please refresh the page')
        return true
      }
    }

    return isAdmin
  } catch (error) {
    console.error('Error fixing admin access:', error)
    return false
  }
}

// Auto-run function
export const checkAndFixAdminAccess = () => {
  console.log('Checking admin access...')
  const fixed = fixAdminAccess()
  if (fixed) {
  } else {
  }
}

// For browser console usage
if (typeof window !== 'undefined') {
  window.fixAdminAccess = fixAdminAccess
  window.checkAndFixAdminAccess = checkAndFixAdminAccess
}
