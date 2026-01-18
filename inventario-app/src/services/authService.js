import api from './api'
import { mockLogin } from '../data/mockData'
import { loginWithSheets } from './googleSheetsAPI'

const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true'
const USE_GOOGLE_SHEETS = import.meta.env.VITE_USE_GOOGLE_SHEETS === 'true'

export const authService = {
  // Login básico con Google Sheets o Mock Data
  login: async (email, password) => {
    try {
      // Si estamos en modo desarrollo, usar datos mock
      if (USE_MOCK_DATA) {
        // Simular delay de red
        await new Promise(resolve => setTimeout(resolve, 800))
        const response = mockLogin(email, password)

        if (response.success) {
          localStorage.setItem('authToken', response.token)
          localStorage.setItem('user', JSON.stringify(response.user))
          return response
        }

        return response
      }

      // Si usamos Google Sheets directamente
      if (USE_GOOGLE_SHEETS) {
        const response = await loginWithSheets(email, password)

        if (response.success) {
          localStorage.setItem('authToken', response.token)
          localStorage.setItem('user', JSON.stringify(response.user))
          return response
        }

        return response
      }

      // Modo producción: usar API real (Google Apps Script)
      const response = await api.login(email, password)

      if (response.success) {
        // Guardar token y datos de usuario
        localStorage.setItem('authToken', response.token)
        localStorage.setItem('user', JSON.stringify(response.user))
        return {
          success: true,
          user: response.user,
          token: response.token
        }
      }

      return {
        success: false,
        message: response.message || 'Credenciales inválidas'
      }
    } catch (error) {
      console.error('Login error:', error)
      return {
        success: false,
        message: 'Error al iniciar sesión'
      }
    }
  },

  // Logout
  logout: () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
  },

  // Obtener usuario actual
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  },

  // Verificar si está autenticado
  isAuthenticated: () => {
    const token = localStorage.getItem('authToken')
    return !!token
  },

  // Obtener token
  getToken: () => {
    return localStorage.getItem('authToken')
  }
}

export default authService
