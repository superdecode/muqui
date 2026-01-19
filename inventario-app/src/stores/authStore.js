import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (userData, token) => {
        set({
          user: userData,
          token: token,
          isAuthenticated: true
        })
        localStorage.setItem('authToken', token)
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false
        })
        localStorage.removeItem('authToken')
      },

      updateUser: (userData) => {
        set({ user: userData })
      },

      // Verificar permisos basado en nivel_permisos
      hasPermission: (permission) => {
        const user = get().user
        if (!user) return false

        // Sistema de permisos por nivel - convertir a número para comparación
        const nivelPermisos = parseInt(user.nivel_permisos) || 3
        
        console.log('hasPermission check:', { permission, nivelPermisos, user_nivel: user.nivel_permisos })
        
        // Nivel 1: Todos los permisos (Admin total)
        if (nivelPermisos === 1) {
          return true
        }
        
        // Nivel 2: Todos excepto eliminar
        if (nivelPermisos === 2) {
          if (permission === 'eliminar' || permission.includes('delete')) {
            return false
          }
          return true
        }
        
        // Nivel 3: Solo ejecutar y confirmar (sin crear, editar, eliminar)
        if (nivelPermisos === 3) {
          const allowedPermissions = [
            'inventario.ver',
            'transferencias.confirmar',
            'conteos.ejecutar',
            'reportes.ver'
          ]
          return allowedPermissions.includes(permission)
        }

        // Fallback a sistema de permisos por rol (legacy)
        const permissions = {
          ADMIN_GLOBAL: ['all'],
          ADMIN_EMPRESA: ['inventario.ver', 'inventario.ajustar', 'transferencias.crear', 'transferencias.confirmar', 'transferencias.editar', 'conteos.programar', 'conteos.ejecutar', 'reportes.ver', 'reportes.exportar'],
          GERENTE_OPERATIVO: ['inventario.ver', 'inventario.ajustar', 'transferencias.crear', 'transferencias.confirmar', 'transferencias.editar', 'conteos.programar', 'conteos.ejecutar', 'reportes.ver', 'reportes.exportar'],
          JEFE_PUNTO: ['inventario.ver', 'inventario.ajustar', 'transferencias.confirmar', 'conteos.ejecutar', 'reportes.ver', 'reportes.exportar'],
          OPERADOR: ['inventario.ver', 'transferencias.confirmar', 'conteos.ejecutar'],
          CONSULTA: ['inventario.ver', 'reportes.ver', 'reportes.exportar']
        }

        const userPermissions = permissions[user.rol] || []
        return userPermissions.includes('all') || userPermissions.includes(permission)
      },

      // Verificar si puede eliminar (solo nivel 1 y 2)
      canDelete: () => {
        const user = get().user
        if (!user) return false
        const nivelPermisos = parseInt(user.nivel_permisos) || 3
        console.log('canDelete check:', { nivelPermisos, user_nivel: user.nivel_permisos, result: nivelPermisos === 1 || nivelPermisos === 2 })
        return nivelPermisos === 1 || nivelPermisos === 2
      }
    }),
    {
      name: 'auth-storage'
    }
  )
)
