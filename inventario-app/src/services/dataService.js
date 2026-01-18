/**
 * Servicio unificado de datos
 * Maneja automáticamente la fuente de datos según la configuración
 */

import api from './api'
import * as googleSheetsAPI from './googleSheetsAPI'
import localStorageService from './localStorageService'
import {
  mockProductos,
  mockInventario,
  mockUbicaciones,
  mockTransferencias,
  mockConteos,
  mockAlertas,
  mockUsers,
  mockEmpresas
} from '../data/mockData'

const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true'
const USE_GOOGLE_SHEETS = import.meta.env.VITE_USE_GOOGLE_SHEETS === 'true'

/**
 * Genera un ID único
 */
const generateId = (prefix = 'ITEM') => {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000)
  return `${prefix}${timestamp}${random}`
}

/**
 * Servicio de datos unificado
 */
const dataService = {
  // ========== LECTURA DE DATOS ==========

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
      return mockUsers
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
      // Obtener productos de Google Sheets
      const sheetProductos = await googleSheetsAPI.getProductos()
      // Merge con cambios locales
      const localProductos = localStorageService.getProductosLocal()

      if (localProductos.length > 0) {
        // Combinar: locales sobrescriben o agregan a los de Sheets
        const merged = [...sheetProductos]
        localProductos.forEach(localProd => {
          const index = merged.findIndex(p => p.id === localProd.id)
          if (index >= 0) {
            // Actualizar existente
            merged[index] = localProd
          } else {
            // Agregar nuevo
            merged.push(localProd)
          }
        })
        return merged.filter(p => p.estado !== 'ELIMINADO')
      }

      return sheetProductos
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
      // Merge con cambios locales
      const localInventario = localStorageService.getInventarioLocal()

      let merged = inventario
      if (localInventario.length > 0) {
        merged = [...inventario]
        localInventario.forEach(localItem => {
          const index = merged.findIndex(i => i.id === localItem.id)
          if (index >= 0) {
            merged[index] = localItem
          } else {
            merged.push(localItem)
          }
        })
      }

      return ubicacionId
        ? merged.filter(item => item.ubicacion_id === ubicacionId)
        : merged
    }

    return await api.getInventario(ubicacionId, tipoUbicacion)
  },

  // Movimientos
  getMovimientos: async (ubicacionId) => {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 400))
      return mockTransferencias
    }

    if (USE_GOOGLE_SHEETS) {
      const movimientos = await googleSheetsAPI.getMovimientos()
      const localMovimientos = localStorageService.getMovimientosLocal()

      if (localMovimientos.length > 0) {
        return [...movimientos, ...localMovimientos]
      }

      return movimientos
    }

    return await api.getMovimientos(ubicacionId)
  },

  // Detalle de movimientos
  getDetalleMovimientos: async () => {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 300))
      return []
    }

    if (USE_GOOGLE_SHEETS) {
      const detalle = await googleSheetsAPI.getDetalleMovimientos()
      const localDetalle = localStorageService.getDetalleMovimientosLocal()
      return localDetalle.length > 0 ? [...detalle, ...localDetalle] : detalle
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
      const localConteos = localStorageService.getConteosLocal()

      let merged = conteos
      if (localConteos.length > 0) {
        merged = [...conteos, ...localConteos]
      }

      return ubicacionId
        ? merged.filter(c => c.ubicacion_id === ubicacionId)
        : merged
    }

    return await api.getConteos(ubicacionId)
  },

  // Detalle de conteos
  getDetalleConteos: async () => {
    if (USE_MOCK_DATA) {
      await new Promise(resolve => setTimeout(resolve, 300))
      return []
    }

    if (USE_GOOGLE_SHEETS) {
      const detalle = await googleSheetsAPI.getDetalleConteos()
      const localDetalle = localStorageService.getDetalleConteosLocal()
      return localDetalle.length > 0 ? [...detalle, ...localDetalle] : detalle
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

  // ========== OPERACIONES DE ESCRITURA ==========

  // PRODUCTOS
  createProducto: async (productoData) => {
    if (USE_MOCK_DATA || USE_GOOGLE_SHEETS) {
      await new Promise(resolve => setTimeout(resolve, 500))

      const nuevoProducto = {
        id: generateId('PROD'),
        nombre: productoData.nombre,
        especificacion: productoData.especificacion || '',
        unidad_medida: productoData.unidad_medida,
        concatenado: `${productoData.nombre} ${productoData.especificacion || ''}`.trim(),
        stock_minimo: parseInt(productoData.stock_minimo) || 0,
        frecuencia_inventario_Dias: parseInt(productoData.frecuencia_inventario_Dias) || 1,
        categoria: productoData.categoria,
        estado: productoData.estado || 'ACTIVO',
        ubicacion_id: productoData.ubicacion_id || []
      }

      if (USE_GOOGLE_SHEETS) {
        // Guardar en localStorage
        const localProductos = localStorageService.getProductosLocal()
        localProductos.push(nuevoProducto)
        localStorageService.saveProductosLocal(localProductos)
      }

      return { success: true, message: 'Producto creado exitosamente', data: nuevoProducto }
    }

    return await api.createProducto(productoData)
  },

  updateProducto: async (productoId, productoData) => {
    if (USE_MOCK_DATA || USE_GOOGLE_SHEETS) {
      await new Promise(resolve => setTimeout(resolve, 500))

      if (USE_GOOGLE_SHEETS) {
        const localProductos = localStorageService.getProductosLocal()
        const index = localProductos.findIndex(p => p.id === productoId)

        const updatedProducto = {
          ...productoData,
          id: productoId,
          concatenado: `${productoData.nombre} ${productoData.especificacion || ''}`.trim()
        }

        if (index >= 0) {
          localProductos[index] = updatedProducto
        } else {
          localProductos.push(updatedProducto)
        }

        localStorageService.saveProductosLocal(localProductos)
        return { success: true, message: 'Producto actualizado exitosamente', data: updatedProducto }
      }

      return { success: true, message: 'Producto actualizado exitosamente' }
    }

    return await api.updateProducto(productoId, productoData)
  },

  deleteProducto: async (productoId) => {
    if (USE_MOCK_DATA || USE_GOOGLE_SHEETS) {
      await new Promise(resolve => setTimeout(resolve, 500))

      if (USE_GOOGLE_SHEETS) {
        const localProductos = localStorageService.getProductosLocal()
        const sheetProductos = await googleSheetsAPI.getProductos()
        const producto = sheetProductos.find(p => p.id === productoId)

        if (producto) {
          // Marcar como eliminado
          localProductos.push({ ...producto, estado: 'ELIMINADO' })
        } else {
          // Remover de locales
          const filtered = localProductos.filter(p => p.id !== productoId)
          localStorageService.saveProductosLocal(filtered)
          return { success: true, message: 'Producto eliminado exitosamente' }
        }

        localStorageService.saveProductosLocal(localProductos)
      }

      return { success: true, message: 'Producto eliminado exitosamente' }
    }

    return await api.deleteProducto(productoId)
  },

  // TRANSFERENCIAS/MOVIMIENTOS
  createTransferencia: async (data) => {
    if (USE_MOCK_DATA || USE_GOOGLE_SHEETS) {
      await new Promise(resolve => setTimeout(resolve, 500))

      const nuevoMovimiento = {
        id: generateId('MV'),
        tipo_movimiento: data.tipo_movimiento || 'TRANSFERENCIA',
        origen_id: data.origen_id,
        destino_id: data.destino_id,
        estado: 'PENDIENTE',
        usuario_creacion_id: data.usuario_creacion_id,
        usuario_confirmacion_id: null,
        fecha_creacion: new Date().toISOString().split('T')[0],
        fecha_confirmacion: null,
        fecha_limite_edicion: data.fecha_limite_edicion || null,
        observaciones_creacion: data.observaciones || '',
        observaciones_confirmacion: '',
        productos: data.productos || []
      }

      if (USE_GOOGLE_SHEETS) {
        const localMovimientos = localStorageService.getMovimientosLocal()
        localMovimientos.push(nuevoMovimiento)
        localStorageService.saveMovimientosLocal(localMovimientos)

        // Guardar detalles
        if (data.productos && data.productos.length > 0) {
          const localDetalle = localStorageService.getDetalleMovimientosLocal()
          data.productos.forEach(prod => {
            localDetalle.push({
              id: generateId('DM'),
              movimiento_id: nuevoMovimiento.id,
              producto_id: prod.producto_id,
              cantidad: prod.cantidad,
              observaciones: prod.observaciones || ''
            })
          })
          localStorageService.saveDetalleMovimientosLocal(localDetalle)
        }
      }

      return { success: true, message: 'Transferencia creada exitosamente', data: nuevoMovimiento }
    }

    return await api.createTransferencia(data)
  },

  confirmarTransferencia: async (data) => {
    if (USE_MOCK_DATA || USE_GOOGLE_SHEETS) {
      await new Promise(resolve => setTimeout(resolve, 500))

      if (USE_GOOGLE_SHEETS) {
        const localMovimientos = localStorageService.getMovimientosLocal()
        const movimiento = localMovimientos.find(m => m.id === data.movimiento_id)

        if (movimiento) {
          movimiento.estado = 'CONFIRMADA'
          movimiento.fecha_confirmacion = new Date().toISOString().split('T')[0]
          movimiento.usuario_confirmacion_id = data.usuario_confirmacion_id
          movimiento.observaciones_confirmacion = data.observaciones || ''
          localStorageService.saveMovimientosLocal(localMovimientos)
        }
      }

      return { success: true, message: 'Transferencia confirmada exitosamente' }
    }

    return await api.confirmarTransferencia(data)
  },

  // CONTEOS
  createConteo: async (data) => {
    if (USE_MOCK_DATA || USE_GOOGLE_SHEETS) {
      await new Promise(resolve => setTimeout(resolve, 500))

      const nuevoConteo = {
        id: generateId('CONT'),
        ubicacion_id: data.ubicacion_id,
        tipo_ubicacion: data.tipo_ubicacion,
        tipo_conteo: data.tipo_conteo,
        estado: 'PENDIENTE',
        usuario_responsable_id: data.usuario_responsable_id,
        usuario_ejecutor_id: null,
        fecha_programada: data.fecha_programada,
        fecha_inicio: null,
        fecha_completado: null,
        observaciones: data.observaciones || ''
      }

      if (USE_GOOGLE_SHEETS) {
        const localConteos = localStorageService.getConteosLocal()
        localConteos.push(nuevoConteo)
        localStorageService.saveConteosLocal(localConteos)
      }

      return { success: true, message: 'Conteo programado exitosamente', data: nuevoConteo }
    }

    return await api.createConteo(data)
  },

  ejecutarConteo: async (data) => {
    if (USE_MOCK_DATA || USE_GOOGLE_SHEETS) {
      await new Promise(resolve => setTimeout(resolve, 500))

      if (USE_GOOGLE_SHEETS) {
        const localConteos = localStorageService.getConteosLocal()
        const conteo = localConteos.find(c => c.id === data.conteo_id)

        if (conteo) {
          conteo.estado = 'COMPLETADO'
          conteo.fecha_completado = new Date().toISOString().split('T')[0]
          conteo.usuario_ejecutor_id = data.usuario_ejecutor_id
          localStorageService.saveConteosLocal(localConteos)
        }

        // Guardar detalles del conteo
        if (data.productos && data.productos.length > 0) {
          const localDetalle = localStorageService.getDetalleConteosLocal()
          data.productos.forEach(prod => {
            localDetalle.push({
              id: generateId('DC'),
              conteo_id: data.conteo_id,
              producto_id: prod.producto_id,
              cantidad_sistema: prod.cantidad_sistema,
              cantidad_fisica: prod.cantidad_fisica,
              diferencia: prod.cantidad_fisica - prod.cantidad_sistema,
              observaciones: prod.observaciones || '',
              contado: true
            })
          })
          localStorageService.saveDetalleConteosLocal(localDetalle)
        }
      }

      return { success: true, message: 'Conteo ejecutado exitosamente' }
    }

    return await api.ejecutarConteo(data)
  },

  // INVENTARIO
  ajustarInventario: async (data) => {
    if (USE_MOCK_DATA || USE_GOOGLE_SHEETS) {
      await new Promise(resolve => setTimeout(resolve, 500))

      if (USE_GOOGLE_SHEETS) {
        const localInventario = localStorageService.getInventarioLocal()
        const item = localInventario.find(i =>
          i.producto_id === data.producto_id && i.ubicacion_id === data.ubicacion_id
        )

        if (item) {
          item.stock_actual = data.nuevo_stock
          item.ultima_actualizacion = new Date().toISOString()
        } else {
          localInventario.push({
            id: generateId('INV'),
            producto_id: data.producto_id,
            ubicacion_id: data.ubicacion_id,
            stock_actual: data.nuevo_stock,
            ultima_actualizacion: new Date().toISOString()
          })
        }

        localStorageService.saveInventarioLocal(localInventario)
      }

      return { success: true, message: 'Inventario ajustado exitosamente' }
    }

    return await api.ajustarInventario(data)
  }
}

export default dataService
