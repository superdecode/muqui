/**
 * Servicio de Firestore
 * Maneja todas las operaciones CRUD con Firestore
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  Timestamp
} from 'firebase/firestore'
import { getDB } from '../config/firebase.config'

/**
 * Genera un ID único personalizado
 */
const generateId = (prefix = 'ITEM') => {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000)
  return `${prefix}${timestamp}${random}`
}

/**
 * Obtener referencia a una colección
 */
const getCollection = (collectionName) => {
  const db = getDB()
  return collection(db, collectionName)
}

/**
 * Servicio de Firestore
 */
const firestoreService = {
  // ========== OPERACIONES GENERALES ==========

  /**
   * Obtener todos los documentos de una colección
   */
  getAll: async (collectionName) => {
    try {
      const querySnapshot = await getDocs(getCollection(collectionName))
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error(`Error obteniendo ${collectionName}:`, error)
      throw error
    }
  },

  /**
   * Obtener un documento por ID
   */
  getById: async (collectionName, docId) => {
    try {
      const db = getDB()
      const docRef = doc(db, collectionName, docId)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() }
      }
      return null
    } catch (error) {
      console.error(`Error obteniendo documento ${docId} de ${collectionName}:`, error)
      throw error
    }
  },

  /**
   * Consulta con filtros
   */
  queryWithFilters: async (collectionName, filters = []) => {
    try {
      const collectionRef = getCollection(collectionName)
      const q = query(collectionRef, ...filters)
      const querySnapshot = await getDocs(q)

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error(`Error en query de ${collectionName}:`, error)
      throw error
    }
  },

  // ========== EMPRESAS ==========

  getEmpresas: async () => {
    return await firestoreService.getAll('empresas')
  },

  // ========== USUARIOS ==========

  getUsuarios: async () => {
    return await firestoreService.getAll('usuarios')
  },

  getUsuarioByEmail: async (email) => {
    const usuarios = await firestoreService.queryWithFilters('usuarios', [
      where('email', '==', email)
    ])
    return usuarios.length > 0 ? usuarios[0] : null
  },

  // ========== PRODUCTOS ==========

  getProductos: async () => {
    const productos = await firestoreService.queryWithFilters('productos', [
      where('estado', '!=', 'ELIMINADO')
    ])
    return productos
  },

  createProducto: async (productoData) => {
    try {
      const db = getDB()
      const productosRef = collection(db, 'productos')

      const nuevoProducto = {
        ...productoData,
        concatenado: `${productoData.nombre} ${productoData.especificacion || ''}`.trim(),
        estado: productoData.estado || 'ACTIVO',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      }

      const docRef = await addDoc(productosRef, nuevoProducto)

      return {
        success: true,
        message: 'Producto creado exitosamente',
        data: { id: docRef.id, ...nuevoProducto }
      }
    } catch (error) {
      console.error('Error creando producto:', error)
      return { success: false, message: error.message }
    }
  },

  updateProducto: async (productoId, productoData) => {
    try {
      const db = getDB()
      const productoRef = doc(db, 'productos', productoId)

      const datosActualizados = {
        ...productoData,
        concatenado: `${productoData.nombre} ${productoData.especificacion || ''}`.trim(),
        updated_at: serverTimestamp()
      }

      await updateDoc(productoRef, datosActualizados)

      return {
        success: true,
        message: 'Producto actualizado exitosamente',
        data: { id: productoId, ...datosActualizados }
      }
    } catch (error) {
      console.error('Error actualizando producto:', error)
      return { success: false, message: error.message }
    }
  },

  deleteProducto: async (productoId) => {
    try {
      const db = getDB()
      const productoRef = doc(db, 'productos', productoId)

      // Soft delete: marcar como eliminado
      await updateDoc(productoRef, {
        estado: 'ELIMINADO',
        updated_at: serverTimestamp()
      })

      return { success: true, message: 'Producto eliminado exitosamente' }
    } catch (error) {
      console.error('Error eliminando producto:', error)
      return { success: false, message: error.message }
    }
  },

  // ========== UBICACIONES ==========

  getUbicaciones: async () => {
    return await firestoreService.getAll('ubicaciones')
  },

  // ========== INVENTARIO ==========

  getInventario: async (ubicacionId = null, tipoUbicacion = null) => {
    try {
      const filters = []

      if (ubicacionId) {
        filters.push(where('ubicacion_id', '==', ubicacionId))
      }

      if (tipoUbicacion) {
        filters.push(where('tipo_ubicacion', '==', tipoUbicacion))
      }

      return await firestoreService.queryWithFilters('inventario', filters)
    } catch (error) {
      console.error('Error obteniendo inventario:', error)
      throw error
    }
  },

  ajustarInventario: async (data) => {
    try {
      const db = getDB()

      // Buscar si existe el inventario para ese producto en esa ubicación
      const inventarioExistente = await firestoreService.queryWithFilters('inventario', [
        where('producto_id', '==', data.producto_id),
        where('ubicacion_id', '==', data.ubicacion_id)
      ])

      if (inventarioExistente.length > 0) {
        // Actualizar existente
        const inventarioRef = doc(db, 'inventario', inventarioExistente[0].id)
        await updateDoc(inventarioRef, {
          stock_actual: data.nuevo_stock,
          ultima_actualizacion: serverTimestamp()
        })
      } else {
        // Crear nuevo
        const inventarioRef = collection(db, 'inventario')
        await addDoc(inventarioRef, {
          producto_id: data.producto_id,
          ubicacion_id: data.ubicacion_id,
          stock_actual: data.nuevo_stock,
          ultima_actualizacion: serverTimestamp()
        })
      }

      return { success: true, message: 'Inventario ajustado exitosamente' }
    } catch (error) {
      console.error('Error ajustando inventario:', error)
      return { success: false, message: error.message }
    }
  },

  // ========== MOVIMIENTOS ==========

  getMovimientos: async (ubicacionId = null) => {
    try {
      const filters = [orderBy('fecha_creacion', 'desc')]

      if (ubicacionId) {
        filters.unshift(where('origen_id', '==', ubicacionId))
      }

      return await firestoreService.queryWithFilters('movimientos', filters)
    } catch (error) {
      console.error('Error obteniendo movimientos:', error)
      throw error
    }
  },

  getDetalleMovimientos: async (movimientoId = null) => {
    try {
      const filters = []

      if (movimientoId) {
        filters.push(where('movimiento_id', '==', movimientoId))
      }

      return await firestoreService.queryWithFilters('detalle_movimientos', filters)
    } catch (error) {
      console.error('Error obteniendo detalle movimientos:', error)
      throw error
    }
  },

  createTransferencia: async (data) => {
    try {
      const db = getDB()
      const batch = writeBatch(db)

      // Crear movimiento
      const movimientoRef = doc(collection(db, 'movimientos'))
      const nuevoMovimiento = {
        tipo_movimiento: data.tipo_movimiento || 'TRANSFERENCIA',
        origen_id: data.origen_id,
        destino_id: data.destino_id,
        estado: 'PENDIENTE',
        usuario_creacion_id: data.usuario_creacion_id,
        usuario_confirmacion_id: null,
        fecha_creacion: Timestamp.now(),
        fecha_confirmacion: null,
        fecha_limite_edicion: data.fecha_limite_edicion || null,
        observaciones_creacion: data.observaciones || '',
        observaciones_confirmacion: ''
      }

      batch.set(movimientoRef, nuevoMovimiento)

      // Crear detalles del movimiento
      if (data.productos && data.productos.length > 0) {
        data.productos.forEach(prod => {
          const detalleRef = doc(collection(db, 'detalle_movimientos'))
          batch.set(detalleRef, {
            movimiento_id: movimientoRef.id,
            producto_id: prod.producto_id,
            cantidad: prod.cantidad,
            observaciones: prod.observaciones || ''
          })
        })
      }

      await batch.commit()

      return {
        success: true,
        message: 'Transferencia creada exitosamente',
        data: { id: movimientoRef.id, ...nuevoMovimiento }
      }
    } catch (error) {
      console.error('Error creando transferencia:', error)
      return { success: false, message: error.message }
    }
  },

  confirmarTransferencia: async (data) => {
    try {
      const db = getDB()
      const batch = writeBatch(db)

      // Actualizar movimiento
      const movimientoRef = doc(db, 'movimientos', data.movimiento_id)
      batch.update(movimientoRef, {
        estado: 'CONFIRMADO',
        fecha_confirmacion: Timestamp.now(),
        usuario_confirmacion_id: data.usuario_confirmacion_id,
        observaciones_confirmacion: data.observaciones || ''
      })

      // Obtener detalles del movimiento para actualizar inventario
      const detalles = await firestoreService.getDetalleMovimientos(data.movimiento_id)
      const movimiento = await firestoreService.getById('movimientos', data.movimiento_id)

      // Actualizar inventario de origen y destino
      for (const detalle of detalles) {
        // Reducir stock en origen
        const inventarioOrigen = await firestoreService.queryWithFilters('inventario', [
          where('producto_id', '==', detalle.producto_id),
          where('ubicacion_id', '==', movimiento.origen_id)
        ])

        if (inventarioOrigen.length > 0) {
          const invOrigenRef = doc(db, 'inventario', inventarioOrigen[0].id)
          batch.update(invOrigenRef, {
            stock_actual: inventarioOrigen[0].stock_actual - detalle.cantidad,
            ultima_actualizacion: serverTimestamp()
          })
        }

        // Aumentar stock en destino
        const inventarioDestino = await firestoreService.queryWithFilters('inventario', [
          where('producto_id', '==', detalle.producto_id),
          where('ubicacion_id', '==', movimiento.destino_id)
        ])

        if (inventarioDestino.length > 0) {
          const invDestinoRef = doc(db, 'inventario', inventarioDestino[0].id)
          batch.update(invDestinoRef, {
            stock_actual: inventarioDestino[0].stock_actual + detalle.cantidad,
            ultima_actualizacion: serverTimestamp()
          })
        } else {
          // Crear nuevo registro de inventario en destino
          const nuevoInvRef = doc(collection(db, 'inventario'))
          batch.set(nuevoInvRef, {
            producto_id: detalle.producto_id,
            ubicacion_id: movimiento.destino_id,
            stock_actual: detalle.cantidad,
            ultima_actualizacion: serverTimestamp()
          })
        }
      }

      await batch.commit()

      return { success: true, message: 'Transferencia confirmada exitosamente' }
    } catch (error) {
      console.error('Error confirmando transferencia:', error)
      return { success: false, message: error.message }
    }
  },

  deleteMovimiento: async (movimientoId) => {
    try {
      const db = getDB()
      const batch = writeBatch(db)

      // Eliminar movimiento
      const movimientoRef = doc(db, 'movimientos', movimientoId)
      batch.delete(movimientoRef)

      // Eliminar detalles
      const detalles = await firestoreService.getDetalleMovimientos(movimientoId)
      detalles.forEach(detalle => {
        const detalleRef = doc(db, 'detalle_movimientos', detalle.id)
        batch.delete(detalleRef)
      })

      await batch.commit()

      return { success: true, message: 'Movimiento eliminado exitosamente' }
    } catch (error) {
      console.error('Error eliminando movimiento:', error)
      return { success: false, message: error.message }
    }
  },

  // ========== CONTEOS ==========

  getConteos: async (ubicacionId = null) => {
    try {
      const filters = [orderBy('fecha_programada', 'desc')]

      if (ubicacionId) {
        filters.unshift(where('ubicacion_id', '==', ubicacionId))
      }

      return await firestoreService.queryWithFilters('conteos', filters)
    } catch (error) {
      console.error('Error obteniendo conteos:', error)
      throw error
    }
  },

  getDetalleConteos: async (conteoId = null) => {
    try {
      const filters = []

      if (conteoId) {
        filters.push(where('conteo_id', '==', conteoId))
      }

      return await firestoreService.queryWithFilters('detalle_conteos', filters)
    } catch (error) {
      console.error('Error obteniendo detalle conteos:', error)
      throw error
    }
  },

  createConteo: async (data) => {
    try {
      const db = getDB()
      const conteosRef = collection(db, 'conteos')

      const nuevoConteo = {
        ubicacion_id: data.ubicacion_id,
        tipo_ubicacion: data.tipo_ubicacion,
        tipo_conteo: data.tipo_conteo,
        estado: 'PENDIENTE',
        usuario_responsable_id: data.usuario_responsable_id,
        usuario_ejecutor_id: null,
        fecha_programada: data.fecha_programada,
        fecha_inicio: null,
        fecha_completado: null,
        observaciones: data.observaciones || '',
        created_at: serverTimestamp()
      }

      const docRef = await addDoc(conteosRef, nuevoConteo)

      return {
        success: true,
        message: 'Conteo programado exitosamente',
        data: { id: docRef.id, ...nuevoConteo }
      }
    } catch (error) {
      console.error('Error creando conteo:', error)
      return { success: false, message: error.message }
    }
  },

  ejecutarConteo: async (data) => {
    try {
      const db = getDB()
      const batch = writeBatch(db)

      // Actualizar conteo
      const conteoRef = doc(db, 'conteos', data.conteo_id)
      batch.update(conteoRef, {
        estado: 'COMPLETADO',
        fecha_completado: Timestamp.now(),
        usuario_ejecutor_id: data.usuario_ejecutor_id
      })

      // Guardar detalles del conteo
      if (data.productos && data.productos.length > 0) {
        data.productos.forEach(prod => {
          const detalleRef = doc(collection(db, 'detalle_conteos'))
          batch.set(detalleRef, {
            conteo_id: data.conteo_id,
            producto_id: prod.producto_id,
            cantidad_sistema: prod.cantidad_sistema,
            cantidad_fisica: prod.cantidad_fisica,
            diferencia: prod.cantidad_fisica - prod.cantidad_sistema,
            observaciones: prod.observaciones || '',
            contado: true
          })
        })

        // Actualizar inventario con los resultados del conteo
        for (const prod of data.productos) {
          const inventarioExistente = await firestoreService.queryWithFilters('inventario', [
            where('producto_id', '==', prod.producto_id),
            where('ubicacion_id', '==', data.ubicacion_id)
          ])

          if (inventarioExistente.length > 0) {
            const invRef = doc(db, 'inventario', inventarioExistente[0].id)
            batch.update(invRef, {
              stock_actual: prod.cantidad_fisica,
              ultima_actualizacion: serverTimestamp()
            })
          }
        }
      }

      await batch.commit()

      return { success: true, message: 'Conteo ejecutado exitosamente' }
    } catch (error) {
      console.error('Error ejecutando conteo:', error)
      return { success: false, message: error.message }
    }
  },

  deleteConteo: async (conteoId) => {
    try {
      const db = getDB()
      const batch = writeBatch(db)

      // Eliminar conteo
      const conteoRef = doc(db, 'conteos', conteoId)
      batch.delete(conteoRef)

      // Eliminar detalles
      const detalles = await firestoreService.getDetalleConteos(conteoId)
      detalles.forEach(detalle => {
        const detalleRef = doc(db, 'detalle_conteos', detalle.id)
        batch.delete(detalleRef)
      })

      await batch.commit()

      return { success: true, message: 'Conteo eliminado exitosamente' }
    } catch (error) {
      console.error('Error eliminando conteo:', error)
      return { success: false, message: error.message }
    }
  },

  // ========== ALERTAS ==========

  getAlertas: async (usuarioId = null) => {
    try {
      const filters = [orderBy('fecha_creacion', 'desc')]

      if (usuarioId) {
        filters.unshift(where('usuarios_notificados', 'array-contains', usuarioId))
      }

      return await firestoreService.queryWithFilters('alertas', filters)
    } catch (error) {
      console.error('Error obteniendo alertas:', error)
      throw error
    }
  }
}

export default firestoreService
