/**
 * Servicio unificado de datos
 * Maneja automáticamente la fuente de datos según la configuración
 */

import api from './api'
import * as googleSheetsAPI from './googleSheetsAPI'
import {
  mockProductos,
  mockInventario,
  mockUbicaciones,
  mockTransferencias,
  mockConteos,
  mockAlertas,
  mockUsuarios,
  mockEmpresas
} from '../data/mockData'

const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true'
const USE_GOOGLE_SHEETS = import.meta.env.VITE_USE_GOOGLE_SHEETS === 'true'

/**
 * Determina qué backend usar y devuelve los datos
 */
const dataService = {
  // Empresas
  getEmpresas: async () => {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 300))
      return mockEmpresas
    }

    if (USE_GOOGLE_SHEETS) {
      return await googleSheetsAPI.getEmpresas()
    }

    return await api.getEmpresas()
  },

  // Usuarios
  getUsuarios: async () => {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 300))
      return mockUsuarios
    }

    if (USE_GOOGLE_SHEETS) {
      return await googleSheetsAPI.getUsuarios()
    }

    return await api.getUsuarios()
  },

  // Productos
  getProductos: async () => {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 300))
      return mockProductos
    }

    if (USE_GOOGLE_SHEETS) {
      return await googleSheetsAPI.getProductos()
    }

    return await api.getProductos()
  },

  // Ubicaciones
  getUbicaciones: async () => {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 300))
      return mockUbicaciones
    }

    if (USE_GOOGLE_SHEETS) {
      return await googleSheetsAPI.getUbicaciones()
    }

    return await api.getUbicaciones()
  },

  // Inventario
  getInventario: async (ubicacionId, tipoUbicacion) => {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 500))
      return ubicacionId
        ? mockInventario.filter(item => item.ubicacion_id === ubicacionId)
        : mockInventario
    }

    if (USE_GOOGLE_SHEETS) {
      const inventario = await googleSheetsAPI.getInventario()
      return ubicacionId
        ? inventario.filter(item => item.ubicacion_id === ubicacionId)
        : inventario
    }

    return await api.getInventario(ubicacionId, tipoUbicacion)
  },

  // Movimientos (anteriormente Transferencias)
  getMovimientos: async (ubicacionId) => {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 400))
      return mockTransferencias
    }

    if (USE_GOOGLE_SHEETS) {
      return await googleSheetsAPI.getMovimientos()
    }

    return await api.getMovimientos(ubicacionId)
  },

  // Detalle de movimientos
  getDetalleMovimientos: async () => {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 300))
      return [] // Mock data no tiene detalle separado
    }

    if (USE_GOOGLE_SHEETS) {
      return await googleSheetsAPI.getDetalleMovimientos()
    }

    return await api.getDetalleMovimientos()
  },

  // Conteos
  getConteos: async (ubicacionId) => {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 400))
      return mockConteos
    }

    if (USE_GOOGLE_SHEETS) {
      const conteos = await googleSheetsAPI.getConteos()
      return ubicacionId
        ? conteos.filter(c => c.ubicacion_id === ubicacionId)
        : conteos
    }

    return await api.getConteos(ubicacionId)
  },

  // Detalle de conteos
  getDetalleConteos: async () => {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 300))
      return [] // Mock data no tiene detalle separado
    }

    if (USE_GOOGLE_SHEETS) {
      return await googleSheetsAPI.getDetalleConteos()
    }

    return await api.getDetalleConteos()
  },

  // Alertas
  getAlertas: async (usuarioId) => {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 400))
      return mockAlertas
    }

    if (USE_GOOGLE_SHEETS) {
      const alertas = await googleSheetsAPI.getAlertas()
      return usuarioId
        ? alertas.filter(a => a.usuarios_notificados?.includes(usuarioId))
        : alertas
    }

    return await api.getAlertas(usuarioId)
  },

  // Métodos de escritura (solo disponibles con API o Mock)
  createTransferencia: async (data) => {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 500))
      return { success: true, message: 'Transferencia creada (mock)' }
    }

    if (USE_GOOGLE_SHEETS) {
      // Google Sheets API en modo solo lectura
      throw new Error('Las operaciones de escritura no están disponibles con Google Sheets API. Use Mock Data o configure un backend.')
    }

    return await api.createTransferencia(data)
  },

  confirmarTransferencia: async (data) => {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 500))
      return { success: true, message: 'Transferencia confirmada (mock)' }
    }

    if (USE_GOOGLE_SHEETS) {
      throw new Error('Las operaciones de escritura no están disponibles con Google Sheets API. Use Mock Data o configure un backend.')
    }

    return await api.confirmarTransferencia(data)
  },

  createConteo: async (data) => {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 500))
      return { success: true, message: 'Conteo creado (mock)' }
    }

    if (USE_GOOGLE_SHEETS) {
      throw new Error('Las operaciones de escritura no están disponibles con Google Sheets API. Use Mock Data o configure un backend.')
    }

    return await api.createConteo(data)
  },

  ejecutarConteo: async (data) => {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 500))
      return { success: true, message: 'Conteo ejecutado (mock)' }
    }

    if (USE_GOOGLE_SHEETS) {
      throw new Error('Las operaciones de escritura no están disponibles con Google Sheets API. Use Mock Data o configure un backend.')
    }

    return await api.ejecutarConteo(data)
  },

  ajustarInventario: async (data) => {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 500))
      return { success: true, message: 'Inventario ajustado (mock)' }
    }

    if (USE_GOOGLE_SHEETS) {
      throw new Error('Las operaciones de escritura no están disponibles con Google Sheets API. Use Mock Data o configure un backend.')
    }

    return await api.ajustarInventario(data)
  }
}

export default dataService
