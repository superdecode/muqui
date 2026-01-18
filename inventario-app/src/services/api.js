import axios from 'axios'
import { API_CONFIG } from '../config/api.config'

// Cliente HTTP base
const apiClient = axios.create({
  baseURL: API_CONFIG.SHEETS_API_URL,
  timeout: API_CONFIG.REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Interceptor para agregar token (preparado para Firebase)
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Interceptor de respuesta
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

// API Service - Abstracción que permite cambiar el backend
export const api = {
  // Autenticación
  login: async (email, password) => {
    const response = await apiClient.post('', { email, password, action: 'login' })
    return response
  },

  // Productos
  getProductos: async () => {
    const response = await apiClient.get(API_CONFIG.ENDPOINTS.GET_PRODUCTOS)
    return response
  },

  // Inventario
  getInventario: async (ubicacionId, tipoUbicacion) => {
    const response = await apiClient.post('', {
      action: 'getInventario',
      ubicacionId,
      tipoUbicacion
    })
    return response
  },

  // Transferencias
  createTransferencia: async (data) => {
    const response = await apiClient.post('', {
      action: 'createTransferencia',
      ...data
    })
    return response
  },

  getTransferencias: async (ubicacionId) => {
    const response = await apiClient.post('', {
      action: 'getTransferencias',
      ubicacionId
    })
    return response
  },

  confirmarTransferencia: async (data) => {
    const response = await apiClient.post('', {
      action: 'confirmarTransferencia',
      ...data
    })
    return response
  },

  // Conteos
  createConteo: async (data) => {
    const response = await apiClient.post('', {
      action: 'createConteo',
      ...data
    })
    return response
  },

  getConteos: async (ubicacionId) => {
    const response = await apiClient.post('', {
      action: 'getConteos',
      ubicacionId
    })
    return response
  },

  ejecutarConteo: async (data) => {
    const response = await apiClient.post('', {
      action: 'ejecutarConteo',
      ...data
    })
    return response
  },

  // Alertas
  getAlertas: async (usuarioId) => {
    const response = await apiClient.post('', {
      action: 'getAlertas',
      usuarioId
    })
    return response
  },

  // Reportes
  getReporteStock: async (ubicacionId) => {
    const response = await apiClient.post('', {
      action: 'getReporteStock',
      ubicacionId
    })
    return response
  }
}

export default api
