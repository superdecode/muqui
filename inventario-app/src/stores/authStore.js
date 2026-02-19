import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import authService from '../services/authService'

/**
 * Permission levels:
 *   sin_acceso - module hidden, no access at all
 *   lectura    - module visible, all interactive controls disabled (view only)
 *   escritura  - create/edit/confirm allowed, delete permanently disabled
 *   total      - full access including permanent deletion
 *
 * Resolve a permission check for a module+action.
 * Supports both string format ('total','escritura','lectura','sin_acceso')
 * and granular object format {ver,crear,editar,eliminar,aprobar}.
 */
function resolvePermission(moduloPermisos, accion) {
  if (!moduloPermisos) return false
  // Granular object: { ver: true, crear: true, ... }
  if (typeof moduloPermisos === 'object' && moduloPermisos !== null) {
    return !!moduloPermisos[accion]
  }
  // String level format
  const level = String(moduloPermisos).toLowerCase()
  if (level === 'total') return true
  if (level === 'sin_acceso' || level === '') return false
  if (level === 'lectura') return accion === 'ver'
  if (level === 'escritura') return accion !== 'eliminar'
  return false
}

/**
 * Get the raw permission level string for a module.
 * Returns: 'total' | 'escritura' | 'lectura' | 'sin_acceso'
 */
function getModulePermissionLevel(state, modulo) {
  const user = state.user
  if (!user) return 'sin_acceso'

  // 1. User-level override
  if (user.permisos_override && typeof user.permisos_override === 'object') {
    const override = user.permisos_override[modulo]
    if (override !== undefined) {
      if (typeof override === 'object' && override !== null) {
        // Convert granular object to level
        const has = (k) => !!override[k]
        if (has('eliminar')) return 'total'
        if (has('crear') || has('editar')) return 'escritura'
        if (has('ver')) return 'lectura'
        return 'sin_acceso'
      }
      return String(override).toLowerCase() || 'sin_acceso'
    }
  }

  // 2. Role-based permissions
  const { cachedRole } = state
  const rolePermisos = cachedRole?.permisos || user.permisos
  if (rolePermisos && typeof rolePermisos === 'object') {
    const moduloPermisos = rolePermisos[modulo]
    if (moduloPermisos !== undefined) {
      if (typeof moduloPermisos === 'object' && moduloPermisos !== null) {
        const has = (k) => !!moduloPermisos[k]
        if (has('eliminar')) return 'total'
        if (has('crear') || has('editar')) return 'escritura'
        if (has('ver')) return 'lectura'
        return 'sin_acceso'
      }
      return String(moduloPermisos).toLowerCase() || 'sin_acceso'
    }
  }

  // 3. Fallback: admin roles get total
  const rolName = cachedRole?.nombre || user.rol
  if (rolName === 'Admin Global' || rolName === 'Administrador' || rolName === 'Admin Empresa') {
    return 'total'
  }

  return 'sin_acceso'
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      // Cached role data fetched from Firestore
      cachedRole: null,

      // Initialize auth state from localStorage
      initializeAuth: () => {
        try {
          const user = authService.getCurrentUser()
          const token = authService.getToken()
          const isAuth = authService.isAuthenticated()
          
          if (user && token && isAuth) {
            set({
              user,
              token,
              isAuthenticated: true,
              cachedRole: user.roleData || null
            })
          }
        } catch (error) {
          console.error('Error initializing auth:', error)
          // Clear corrupted data
          authService.logout()
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            cachedRole: null
          })
        }
      },

      login: (userData, token, roleData = null) => {
        set({
          user: userData,
          token: token,
          isAuthenticated: true,
          cachedRole: roleData || userData.roleData || null
        })
        localStorage.setItem('authToken', token)
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          cachedRole: null
        })
        localStorage.removeItem('authToken')
      },

      updateUser: (userData) => {
        set({ user: userData })
      },

      setCachedRole: (role) => {
        set({ cachedRole: role })
      },

      /**
       * Check permission: "modulo.accion" e.g. "productos.ver", "productos.eliminar"
       * Priority: 1) permisos_override on user, 2) role permisos, 3) admin fallback
       */
      hasPermission: (permission) => {
        const user = get().user
        if (!user) return false

        const [modulo, accion] = permission.split('.')
        if (!modulo || !accion) return false

        // 1. User-level override (permisos_override field)
        if (user.permisos_override && typeof user.permisos_override === 'object') {
          const override = user.permisos_override[modulo]
          if (override !== undefined) {
            return resolvePermission(override, accion)
          }
        }

        // 2. Role-based permissions (from cachedRole or user.permisos)
        const { cachedRole } = get()
        const rolePermisos = cachedRole?.permisos || user.permisos
        if (rolePermisos && typeof rolePermisos === 'object') {
          const moduloPermisos = rolePermisos[modulo]
          if (moduloPermisos !== undefined) {
            return resolvePermission(moduloPermisos, accion)
          }
        }

        // 3. Fallback: admin roles get full access
        const rolName = cachedRole?.nombre || user.rol
        if (rolName === 'Admin Global' || rolName === 'Administrador' || rolName === 'Admin Empresa') {
          return true
        }

        return false
      },

      /**
       * Get the permission level for a module: 'total' | 'escritura' | 'lectura' | 'sin_acceso'
       * Used by UI components to conditionally disable buttons or hide elements.
       */
      getPermissionLevel: (modulo) => {
        return getModulePermissionLevel(get(), modulo)
      },

      /**
       * Convenience: check if user has at least 'lectura' on a module (module is visible)
       */
      canView: (modulo) => {
        const level = getModulePermissionLevel(get(), modulo)
        return level !== 'sin_acceso'
      },

      /**
       * Convenience: check if user can create/edit in a module (escritura or total)
       */
      canWrite: (modulo) => {
        const level = getModulePermissionLevel(get(), modulo)
        return level === 'escritura' || level === 'total'
      },

      /**
       * Convenience: check if user can delete in a module (total only)
       */
      canDelete: (modulo) => {
        if (modulo) {
          const level = getModulePermissionLevel(get(), modulo)
          return level === 'total'
        }
        // General: check if any module allows delete
        const user = get().user
        if (!user) return false
        const { cachedRole } = get()
        const permisos = cachedRole?.permisos || user.permisos
        if (!permisos || typeof permisos !== 'object') {
          return user.rol === 'ADMIN_GLOBAL' || user.rol === 'Administrador' || user.rol === 'ADMIN_EMPRESA'
        }
        return Object.values(permisos).some(m =>
          (typeof m === 'object' && m !== null) ? m.eliminar === true : m === 'total'
        )
      },

      /**
       * Get list of all modules the user can view (for route guard)
       */
      getViewableModules: () => {
        const allModules = ['dashboard', 'inventario', 'productos', 'stock', 'movimientos', 'conteos', 'reportes', 'configuracion', 'administracion']
        const user = get().user
        if (!user) return []

        const rolName = get().cachedRole?.nombre || user.rol
        // Admin roles get all modules
        if (rolName === 'Admin Global' || rolName === 'Administrador' || rolName === 'Admin Empresa' ||
            rolName === 'ADMIN_GLOBAL' || rolName === 'ADMIN_EMPRESA') {
          return allModules
        }

        // Filter by permission level
        return allModules.filter(modulo => {
          const level = getModulePermissionLevel(get(), modulo)
          return level !== 'sin_acceso'
        })
      },

      /**
       * Check if user has ANY permissions at all
       */
      hasAnyPermission: () => {
        const user = get().user
        if (!user) return false

        const rolName = get().cachedRole?.nombre || user.rol
        // Admin roles always have permissions
        if (rolName === 'Admin Global' || rolName === 'Administrador' || rolName === 'Admin Empresa' ||
            rolName === 'ADMIN_GLOBAL' || rolName === 'ADMIN_EMPRESA') {
          return true
        }

        const { cachedRole } = get()
        const permisos = cachedRole?.permisos || user.permisos
        if (!permisos || typeof permisos !== 'object') return false

        // Check if any module has at least 'lectura'
        return Object.values(permisos).some(m => {
          if (typeof m === 'object' && m !== null) {
            return m.ver === true || m.crear === true || m.editar === true || m.eliminar === true
          }
          const level = String(m).toLowerCase()
          return level !== 'sin_acceso' && level !== ''
        })
      },

      /**
       * Get the first viewable module route (for redirect)
       */
      getFirstAllowedRoute: () => {
        const moduleRoutes = {
          'dashboard': '/',
          'inventario': '/inventario',
          'productos': '/productos',
          'stock': '/stock',
          'movimientos': '/movimientos',
          'conteos': '/conteos',
          'reportes': '/reportes',
          'configuracion': '/configuraciones',
          'administracion': '/admin'
        }
        const viewable = get().getViewableModules()
        if (viewable.length === 0) return null
        return moduleRoutes[viewable[0]] || '/'
      }
    }),
    {
      name: 'auth-storage'
    }
  )
)
