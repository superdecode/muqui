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

      // Verificar permisos
      hasPermission: (permission) => {
        const user = get().user
        if (!user) return false

        // Lógica de permisos según rol
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
      }
    }),
    {
      name: 'auth-storage'
    }
  )
)
