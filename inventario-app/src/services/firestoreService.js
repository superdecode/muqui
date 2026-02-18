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
  setDoc,
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
 * Genera un código secuencial legible (MV0001, CT0001, etc.)
 * Usa una colección 'contadores' en Firestore para mantener la secuencia
 */
const getNextSequentialCode = async (prefix) => {
  const db = getDB()
  const counterRef = doc(db, 'contadores', prefix)
  try {
    const counterDoc = await getDoc(counterRef)
    let nextVal = 1
    if (counterDoc.exists()) {
      nextVal = (counterDoc.data().valor || 0) + 1
    }
    await setDoc(counterRef, { valor: nextVal, updated_at: serverTimestamp() })
    return `${prefix}${String(nextVal).padStart(4, '0')}`
  } catch (error) {
    console.warn('Error getting sequential code, using timestamp fallback:', error)
    return `${prefix}${Date.now()}`
  }
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
   * Crear un documento con ID personalizado
   */
  create: async (collectionName, data, customId = null) => {
    try {
      const db = getDB()
      if (customId) {
        const docRef = doc(db, collectionName, customId)
        await setDoc(docRef, {
          ...data,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        })
        return { id: customId, ...data }
      } else {
        const collectionRef = collection(db, collectionName)
        const docRef = await addDoc(collectionRef, {
          ...data,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        })
        return { id: docRef.id, ...data }
      }
    } catch (error) {
      console.error(`Error creando documento en ${collectionName}:`, error)
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

  createUsuario: async (data) => {
    try {
      const db = getDB()
      const ref = collection(db, 'usuarios')

      // Look up role permisos if user has a rol assigned
      let permisos = data.permisos || null
      let rol_id = data.rol_id || null
      if (data.rol && !permisos) {
        try {
          // First try by nombre (expected path)
          let roles = await firestoreService.queryWithFilters('roles', [
            where('nombre', '==', data.rol)
          ])
          // Fallback: if rol looks like a Firestore ID, look up by doc ID
          if (roles.length === 0 && data.rol.length > 15) {
            try {
              const roleSnap = await getDoc(doc(getDB(), 'roles', data.rol))
              if (roleSnap.exists()) roles = [{ id: roleSnap.id, ...roleSnap.data() }]
            } catch (_) { /* ignore */ }
          }
          if (roles.length > 0) {
            permisos = roles[0].permisos || null
            rol_id = roles[0].id
          }
        } catch (e) {
          console.warn('Could not look up role permisos for new user:', e)
        }
      }

      // Generate a readable user code
      const codigo = await getNextSequentialCode('USR')

      const nuevo = {
        ...data,
        codigo,
        permisos: permisos || {},
        rol_id: rol_id || '',
        estado: data.estado || 'ACTIVO',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      }
      const docRef = await addDoc(ref, nuevo)
      return { success: true, message: 'Usuario creado exitosamente', data: { id: docRef.id, ...nuevo } }
    } catch (error) {
      console.error('Error creando usuario:', error)
      return { success: false, message: error.message }
    }
  },

  updateUsuario: async (id, data) => {
    try {
      const db = getDB()
      const ref = doc(db, 'usuarios', id)

      // If role changed, look up and sync permisos from the new role
      const updateData = { ...data, updated_at: serverTimestamp() }
      if (data.rol && !data.permisos) {
        try {
          // First try by nombre (expected path)
          let roles = await firestoreService.queryWithFilters('roles', [
            where('nombre', '==', data.rol)
          ])
          // Fallback: if rol looks like a Firestore ID, look up by doc ID
          if (roles.length === 0 && data.rol.length > 15) {
            try {
              const roleSnap = await getDoc(doc(getDB(), 'roles', data.rol))
              if (roleSnap.exists()) roles = [{ id: roleSnap.id, ...roleSnap.data() }]
            } catch (_) { /* ignore */ }
          }
          if (roles.length > 0) {
            updateData.permisos = roles[0].permisos || {}
            updateData.rol_id = roles[0].id
          }
        } catch (e) {
          console.warn('Could not look up role permisos for user update:', e)
        }
      }

      await updateDoc(ref, updateData)
      return { success: true, message: 'Usuario actualizado exitosamente', data: { id, ...updateData } }
    } catch (error) {
      console.error('Error actualizando usuario:', error)
      return { success: false, message: error.message }
    }
  },

  deleteUsuario: async (id) => {
    try {
      const db = getDB()
      const ref = doc(db, 'usuarios', id)
      await updateDoc(ref, { estado: 'INACTIVO', updated_at: serverTimestamp() })
      return { success: true, message: 'Usuario desactivado exitosamente' }
    } catch (error) {
      console.error('Error eliminando usuario:', error)
      return { success: false, message: error.message }
    }
  },

  // Hard delete: permanently removes user document from Firestore (Admin Global only)
  hardDeleteUsuario: async (id) => {
    try {
      const db = getDB()
      const ref = doc(db, 'usuarios', id)
      await deleteDoc(ref)
      return { success: true, message: 'Usuario eliminado permanentemente' }
    } catch (error) {
      console.error('Error eliminando usuario permanentemente:', error)
      return { success: false, message: error.message }
    }
  },

  // ========== EMPRESAS CRUD ==========

  createEmpresa: async (data) => {
    try {
      const db = getDB()
      const ref = collection(db, 'empresas')
      const nuevo = { ...data, estado: data.estado || 'ACTIVO', created_at: serverTimestamp(), updated_at: serverTimestamp() }
      const docRef = await addDoc(ref, nuevo)
      return { success: true, message: 'Sede creada exitosamente', data: { id: docRef.id, ...nuevo } }
    } catch (error) {
      console.error('Error creando empresa:', error)
      return { success: false, message: error.message }
    }
  },

  updateEmpresa: async (id, data) => {
    try {
      const db = getDB()
      const ref = doc(db, 'empresas', id)
      await updateDoc(ref, { ...data, updated_at: serverTimestamp() })
      return { success: true, message: 'Sede actualizada exitosamente', data: { id, ...data } }
    } catch (error) {
      console.error('Error actualizando empresa:', error)
      return { success: false, message: error.message }
    }
  },

  deleteEmpresa: async (id) => {
    try {
      const db = getDB()
      const ref = doc(db, 'empresas', id)
      await updateDoc(ref, { estado: 'INACTIVO', updated_at: serverTimestamp() })
      return { success: true, message: 'Sede desactivada exitosamente' }
    } catch (error) {
      console.error('Error eliminando empresa:', error)
      return { success: false, message: error.message }
    }
  },

  // ========== UBICACIONES CRUD ==========

  createUbicacion: async (data) => {
    try {
      const db = getDB()
      const ref = collection(db, 'ubicaciones')
      const nuevo = { ...data, estado: data.estado || 'ACTIVO', created_at: serverTimestamp(), updated_at: serverTimestamp() }
      const docRef = await addDoc(ref, nuevo)
      return { success: true, message: 'Ubicación creada exitosamente', data: { id: docRef.id, ...nuevo } }
    } catch (error) {
      console.error('Error creando ubicación:', error)
      return { success: false, message: error.message }
    }
  },

  updateUbicacion: async (id, data) => {
    try {
      const db = getDB()
      const ref = doc(db, 'ubicaciones', id)
      await updateDoc(ref, { ...data, updated_at: serverTimestamp() })
      return { success: true, message: 'Ubicación actualizada exitosamente', data: { id, ...data } }
    } catch (error) {
      console.error('Error actualizando ubicación:', error)
      return { success: false, message: error.message }
    }
  },

  deleteUbicacion: async (id) => {
    try {
      const db = getDB()
      const ref = doc(db, 'ubicaciones', id)
      await updateDoc(ref, { estado: 'INACTIVO', updated_at: serverTimestamp() })
      return { success: true, message: 'Ubicación desactivada exitosamente' }
    } catch (error) {
      console.error('Error eliminando ubicación:', error)
      return { success: false, message: error.message }
    }
  },

  // ========== CATEGORÍAS ==========

  getCategorias: async () => {
    return await firestoreService.getAll('categorias')
  },

  createCategoria: async (data) => {
    try {
      const db = getDB()
      const ref = collection(db, 'categorias')
      const nuevo = { ...data, estado: data.estado || 'ACTIVO', created_at: serverTimestamp(), updated_at: serverTimestamp() }
      const docRef = await addDoc(ref, nuevo)
      return { success: true, message: 'Categoría creada exitosamente', data: { id: docRef.id, ...nuevo } }
    } catch (error) {
      console.error('Error creando categoría:', error)
      return { success: false, message: error.message }
    }
  },

  updateCategoria: async (id, data) => {
    try {
      const db = getDB()
      const ref = doc(db, 'categorias', id)
      await updateDoc(ref, { ...data, updated_at: serverTimestamp() })
      return { success: true, message: 'Categoría actualizada exitosamente', data: { id, ...data } }
    } catch (error) {
      console.error('Error actualizando categoría:', error)
      return { success: false, message: error.message }
    }
  },

  deleteCategoria: async (id) => {
    try {
      const db = getDB()
      const ref = doc(db, 'categorias', id)
      await updateDoc(ref, { estado: 'INACTIVO', updated_at: serverTimestamp() })
      return { success: true, message: 'Categoría desactivada exitosamente' }
    } catch (error) {
      console.error('Error eliminando categoría:', error)
      return { success: false, message: error.message }
    }
  },

  // ========== ESPECIFICACIONES ==========

  getEspecificaciones: async () => {
    return await firestoreService.getAll('especificaciones')
  },

  createEspecificacion: async (data) => {
    try {
      const db = getDB()
      const ref = collection(db, 'especificaciones')
      const nuevo = { ...data, estado: data.estado || 'ACTIVO', created_at: serverTimestamp(), updated_at: serverTimestamp() }
      const docRef = await addDoc(ref, nuevo)
      return { success: true, message: 'Especificación creada exitosamente', data: { id: docRef.id, ...nuevo } }
    } catch (error) {
      console.error('Error creando especificación:', error)
      return { success: false, message: error.message }
    }
  },

  updateEspecificacion: async (id, data) => {
    try {
      const db = getDB()
      const ref = doc(db, 'especificaciones', id)
      await updateDoc(ref, { ...data, updated_at: serverTimestamp() })
      return { success: true, message: 'Especificación actualizada', data: { id, ...data } }
    } catch (error) {
      console.error('Error actualizando especificación:', error)
      return { success: false, message: error.message }
    }
  },

  deleteEspecificacion: async (id) => {
    try {
      const db = getDB()
      const ref = doc(db, 'especificaciones', id)
      await updateDoc(ref, { estado: 'INACTIVO', updated_at: serverTimestamp() })
      return { success: true, message: 'Especificación desactivada' }
    } catch (error) {
      console.error('Error eliminando especificación:', error)
      return { success: false, message: error.message }
    }
  },

  // ========== UNIDADES DE MEDIDA ==========

  getUnidadesMedida: async () => {
    return await firestoreService.getAll('unidades_medida')
  },

  createUnidadMedida: async (data) => {
    try {
      const db = getDB()
      const ref = collection(db, 'unidades_medida')
      const nuevo = { ...data, estado: data.estado || 'ACTIVO', created_at: serverTimestamp(), updated_at: serverTimestamp() }
      const docRef = await addDoc(ref, nuevo)
      return { success: true, message: 'Unidad de medida creada', data: { id: docRef.id, ...nuevo } }
    } catch (error) {
      console.error('Error creando unidad de medida:', error)
      return { success: false, message: error.message }
    }
  },

  updateUnidadMedida: async (id, data) => {
    try {
      const db = getDB()
      const ref = doc(db, 'unidades_medida', id)
      await updateDoc(ref, { ...data, updated_at: serverTimestamp() })
      return { success: true, message: 'Unidad de medida actualizada', data: { id, ...data } }
    } catch (error) {
      console.error('Error actualizando unidad de medida:', error)
      return { success: false, message: error.message }
    }
  },

  deleteUnidadMedida: async (id) => {
    try {
      const db = getDB()
      const ref = doc(db, 'unidades_medida', id)
      await updateDoc(ref, { estado: 'INACTIVO', updated_at: serverTimestamp() })
      return { success: true, message: 'Unidad de medida desactivada' }
    } catch (error) {
      console.error('Error eliminando unidad de medida:', error)
      return { success: false, message: error.message }
    }
  },

  // ========== ROLES ==========

  getRoles: async () => {
    return await firestoreService.getAll('roles')
  },

  createRol: async (data) => {
    try {
      const db = getDB()
      const ref = collection(db, 'roles')
      const nuevo = { ...data, estado: data.estado || 'ACTIVO', created_at: serverTimestamp(), updated_at: serverTimestamp() }
      const docRef = await addDoc(ref, nuevo)
      return { success: true, message: 'Rol creado exitosamente', data: { id: docRef.id, ...nuevo } }
    } catch (error) {
      console.error('Error creando rol:', error)
      return { success: false, message: error.message }
    }
  },

  updateRol: async (id, data) => {
    try {
      const db = getDB()
      const ref = doc(db, 'roles', id)
      await updateDoc(ref, { ...data, updated_at: serverTimestamp() })

      // Propagate permisos to all users with this role
      if (data.permisos && data.nombre) {
        try {
          const usersWithRole = await firestoreService.queryWithFilters('usuarios', [
            where('rol', '==', data.nombre)
          ])
          const batch = writeBatch(db)
          for (const usuario of usersWithRole) {
            const userRef = doc(db, 'usuarios', usuario.id)
            batch.update(userRef, {
              permisos: data.permisos,
              rol_id: id,
              updated_at: serverTimestamp()
            })
          }
          if (usersWithRole.length > 0) {
            await batch.commit()
            console.log(`✅ Permisos propagados a ${usersWithRole.length} usuarios con rol ${data.nombre}`)
          }
        } catch (propError) {
          console.error('Error propagando permisos a usuarios:', propError)
        }
      }

      return { success: true, message: 'Rol actualizado exitosamente', data: { id, ...data } }
    } catch (error) {
      console.error('Error actualizando rol:', error)
      return { success: false, message: error.message }
    }
  },

  deleteRol: async (id) => {
    try {
      const db = getDB()
      const ref = doc(db, 'roles', id)
      await deleteDoc(ref)
      return { success: true, message: 'Rol eliminado exitosamente' }
    } catch (error) {
      console.error('Error eliminando rol:', error)
      return { success: false, message: error.message }
    }
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
      // Primero intentar obtener sin orderBy para evitar problemas de índice
      let movimientos = await firestoreService.getAll('movimientos')

      // Filtrar por ubicación si es necesario
      if (ubicacionId) {
        movimientos = movimientos.filter(m => m.origen_id === ubicacionId || m.destino_id === ubicacionId)
      }

      // Ordenar en memoria por fecha_creacion descendente
      movimientos.sort((a, b) => {
        const fechaA = a.fecha_creacion ? new Date(a.fecha_creacion) : new Date(0)
        const fechaB = b.fecha_creacion ? new Date(b.fecha_creacion) : new Date(0)
        return fechaB - fechaA
      })

      return movimientos
    } catch (error) {
      console.error('Error obteniendo movimientos:', error)
      // Devolver array vacío en caso de error para no romper la UI
      return []
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

  getDetalleVentas: async (ventaId = null) => {
    try {
      const filters = []

      if (ventaId) {
        filters.push(where('venta_id', '==', ventaId))
      }

      return await firestoreService.queryWithFilters('detalle_ventas', filters)
    } catch (error) {
      console.error('Error obteniendo detalle ventas:', error)
      throw error
    }
  },

  createTransferencia: async (data) => {
    try {
      const db = getDB()
      const batch = writeBatch(db)

      // Generar código legible secuencial
      const codigoLegible = await getNextSequentialCode('MV')

      // Crear movimiento
      const movimientoRef = doc(collection(db, 'movimientos'))
      const nuevoMovimiento = {
        codigo_legible: codigoLegible,
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

      // Crear detalles del movimiento con cantidad_enviada
      if (data.productos && data.productos.length > 0) {
        data.productos.forEach(prod => {
          const detalleRef = doc(collection(db, 'detalle_movimientos'))
          batch.set(detalleRef, {
            movimiento_id: movimientoRef.id,
            producto_id: prod.producto_id,
            cantidad: prod.cantidad,
            cantidad_enviada: prod.cantidad,
            cantidad_recibida: null,
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

  /**
   * Confirmar transferencia con soporte para recepción parcial.
   * data.productos_recibidos: [{ detalle_id, producto_id, cantidad_recibida }]
   * If productos_recibidos is not provided, assumes full reception (cantidad_recibida = cantidad_enviada).
   * Estado: COMPLETADO if all items fully received, PARCIAL if any item has partial qty.
   */
  confirmarTransferencia: async (data) => {
    try {
      const db = getDB()
      const batch = writeBatch(db)

      const detalles = await firestoreService.getDetalleMovimientos(data.movimiento_id)
      const movimiento = await firestoreService.getById('movimientos', data.movimiento_id)

      // Build a map of received quantities
      const recibidosMap = {}
      if (data.productos_recibidos && data.productos_recibidos.length > 0) {
        data.productos_recibidos.forEach(pr => {
          recibidosMap[pr.detalle_id || pr.producto_id] = pr.cantidad_recibida
        })
      }

      let allComplete = true

      for (const detalle of detalles) {
        const cantidadEnviada = detalle.cantidad_enviada ?? detalle.cantidad
        // Determine cantidad_recibida: from map, or full if confirming all
        let cantidadRecibida
        if (recibidosMap[detalle.id] !== undefined) {
          cantidadRecibida = recibidosMap[detalle.id]
        } else if (recibidosMap[detalle.producto_id] !== undefined) {
          cantidadRecibida = recibidosMap[detalle.producto_id]
        } else {
          cantidadRecibida = cantidadEnviada // Full reception
        }

        if (cantidadRecibida < cantidadEnviada) allComplete = false

        // Update detalle with cantidad_recibida
        const detalleRef = doc(db, 'detalle_movimientos', detalle.id)
        batch.update(detalleRef, {
          cantidad_recibida: cantidadRecibida
        })

        // Reduce stock at origin by cantidad_enviada
        const inventarioOrigen = await firestoreService.queryWithFilters('inventario', [
          where('producto_id', '==', detalle.producto_id),
          where('ubicacion_id', '==', movimiento.origen_id)
        ])

        if (inventarioOrigen.length > 0) {
          const invOrigenRef = doc(db, 'inventario', inventarioOrigen[0].id)
          batch.update(invOrigenRef, {
            stock_actual: inventarioOrigen[0].stock_actual - cantidadEnviada,
            ultima_actualizacion: serverTimestamp()
          })
        }

        // Increase stock at destination by cantidad_recibida
        const inventarioDestino = await firestoreService.queryWithFilters('inventario', [
          where('producto_id', '==', detalle.producto_id),
          where('ubicacion_id', '==', movimiento.destino_id)
        ])

        if (inventarioDestino.length > 0) {
          const invDestinoRef = doc(db, 'inventario', inventarioDestino[0].id)
          batch.update(invDestinoRef, {
            stock_actual: inventarioDestino[0].stock_actual + cantidadRecibida,
            ultima_actualizacion: serverTimestamp()
          })
        } else {
          const nuevoInvRef = doc(collection(db, 'inventario'))
          batch.set(nuevoInvRef, {
            producto_id: detalle.producto_id,
            ubicacion_id: movimiento.destino_id,
            stock_actual: cantidadRecibida,
            ultima_actualizacion: serverTimestamp()
          })
        }
      }

      // Update movimiento status
      const nuevoEstado = allComplete ? 'COMPLETADO' : 'PARCIAL'
      const movimientoRef = doc(db, 'movimientos', data.movimiento_id)
      batch.update(movimientoRef, {
        estado: nuevoEstado,
        fecha_confirmacion: Timestamp.now(),
        usuario_confirmacion_id: data.usuario_confirmacion_id,
        observaciones_confirmacion: data.observaciones || ''
      })

      await batch.commit()

      return {
        success: true,
        message: allComplete
          ? 'Transferencia confirmada exitosamente'
          : 'Recepción parcial registrada exitosamente'
      }
    } catch (error) {
      console.error('Error confirmando transferencia:', error)
      return { success: false, message: error.message }
    }
  },

  // Iniciar recepción (PENDIENTE -> EN_PROCESO)
  iniciarRecepcion: async (data) => {
    try {
      const db = getDB()
      const movimientoRef = doc(db, 'movimientos', data.movimiento_id)
      await updateDoc(movimientoRef, {
        estado: 'EN_PROCESO',
        fecha_inicio_recepcion: Timestamp.now(),
        usuario_recepcion_id: data.usuario_recepcion_id
      })
      return { success: true, message: 'Recepción iniciada - verificando productos' }
    } catch (error) {
      console.error('Error iniciando recepción:', error)
      return { success: false, message: error.message }
    }
  },

  // Cancelar movimiento (cualquier estado -> CANCELADA)
  cancelarMovimiento: async (data) => {
    try {
      const db = getDB()
      const movimientoRef = doc(db, 'movimientos', data.movimiento_id)
      await updateDoc(movimientoRef, {
        estado: 'CANCELADA',
        fecha_cancelacion: Timestamp.now(),
        usuario_cancelacion_id: data.usuario_cancelacion_id,
        motivo_cancelacion: data.motivo || ''
      })
      return { success: true, message: 'Movimiento cancelado' }
    } catch (error) {
      console.error('Error cancelando movimiento:', error)
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

      // Generar código legible secuencial
      const codigoLegible = await getNextSequentialCode('CT')

      const nuevoConteo = {
        codigo_legible: codigoLegible,
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

  // Iniciar conteo (pasar de PENDIENTE a EN_PROGRESO)
  iniciarConteo: async (conteoId, usuarioId) => {
    try {
      const db = getDB()
      const conteoRef = doc(db, 'conteos', conteoId)
      await updateDoc(conteoRef, {
        estado: 'EN_PROGRESO',
        fecha_inicio: Timestamp.now(),
        usuario_ejecutor_id: usuarioId
      })
      return { success: true, message: 'Conteo iniciado' }
    } catch (error) {
      console.error('Error iniciando conteo:', error)
      return { success: false, message: error.message }
    }
  },

  ejecutarConteo: async (data) => {
    try {
      const db = getDB()
      const batch = writeBatch(db)

      // Actualizar conteo - soporta COMPLETADO y PARCIALMENTE_COMPLETADO
      const conteoRef = doc(db, 'conteos', data.conteo_id)
      const estadoFinal = data.estado || 'COMPLETADO'

      const updateData = {
        estado: estadoFinal,
        fecha_completado: Timestamp.now(),
        usuario_ejecutor_id: data.usuario_ejecutor_id
      }
      // Si no tenía fecha_inicio, ponerla ahora
      const conteoDoc = await getDoc(conteoRef)
      if (conteoDoc.exists() && !conteoDoc.data().fecha_inicio) {
        updateData.fecha_inicio = Timestamp.now()
      }

      batch.update(conteoRef, updateData)

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
      // Intentar query con filtros compuestos
      const filters = [orderBy('fecha_creacion', 'desc')]

      if (usuarioId) {
        filters.unshift(where('usuarios_notificados', 'array-contains', usuarioId))
      }

      return await firestoreService.queryWithFilters('alertas', filters)
    } catch (error) {
      // Si falta un índice compuesto, hacer fallback a getAll + filtro en memoria
      if (error?.message?.includes('index') || error?.code === 'failed-precondition') {
        console.warn('Alertas: Índice compuesto no disponible, usando fallback en memoria. Crea el índice en Firebase Console para mejor rendimiento.')
        try {
          let alertas = await firestoreService.getAll('alertas')

          if (usuarioId) {
            alertas = alertas.filter(a =>
              Array.isArray(a.usuarios_notificados) && a.usuarios_notificados.includes(usuarioId)
            )
          }

          // Ordenar en memoria por fecha_creacion descendente
          alertas.sort((a, b) => {
            const fechaA = a.fecha_creacion?.seconds ? a.fecha_creacion.seconds : (a.fecha_creacion ? new Date(a.fecha_creacion).getTime() / 1000 : 0)
            const fechaB = b.fecha_creacion?.seconds ? b.fecha_creacion.seconds : (b.fecha_creacion ? new Date(b.fecha_creacion).getTime() / 1000 : 0)
            return fechaB - fechaA
          })

          return alertas
        } catch (fallbackError) {
          console.error('Error en fallback de alertas:', fallbackError)
          return []
        }
      }
      console.error('Error obteniendo alertas:', error)
      return []
    }
  },

  // ========== AUDIT LOGS (Logs de Auditoría) ==========

  createAuditLog: async (data) => {
    try {
      const db = getDB()
      const auditLogRef = collection(db, 'audit_logs')

      const nuevoLog = {
        usuario_id: data.usuario_id,
        accion: data.accion, // CREATE, UPDATE, DELETE, LOGIN, LOGOUT
        entidad: data.entidad, // PRODUCTO, MOVIMIENTO, CONTEO, etc.
        entidad_id: data.entidad_id,
        valores_anteriores: data.valores_anteriores || null,
        valores_nuevos: data.valores_nuevos || null,
        ip_address: data.ip_address || null,
        dispositivo: data.dispositivo || navigator.userAgent,
        resultado: data.resultado || 'SUCCESS', // SUCCESS, ERROR, BLOCKED
        timestamp: serverTimestamp()
      }

      const docRef = await addDoc(auditLogRef, nuevoLog)

      return {
        success: true,
        message: 'Log de auditoría creado',
        data: { id: docRef.id, ...nuevoLog }
      }
    } catch (error) {
      console.error('Error creando audit log:', error)
      return { success: false, message: error.message }
    }
  },

  getAuditLogs: async (filters = {}) => {
    try {
      const queryFilters = [orderBy('timestamp', 'desc')]

      if (filters.usuario_id) {
        queryFilters.unshift(where('usuario_id', '==', filters.usuario_id))
      }
      if (filters.entidad) {
        queryFilters.unshift(where('entidad', '==', filters.entidad))
      }
      if (filters.entidad_id) {
        queryFilters.unshift(where('entidad_id', '==', filters.entidad_id))
      }

      return await firestoreService.queryWithFilters('audit_logs', queryFilters)
    } catch (error) {
      console.error('Error obteniendo audit logs:', error)
      throw error
    }
  },

  // ========== AJUSTES DE INVENTARIO ==========

  createAjusteInventario: async (data) => {
    try {
      const db = getDB()
      const ajustesRef = collection(db, 'ajustes_inventario')

      const nuevoAjuste = {
        producto_id: data.producto_id,
        ubicacion_id: data.ubicacion_id,
        cantidad_anterior: data.cantidad_anterior,
        cantidad_nueva: data.cantidad_nueva,
        diferencia: data.cantidad_nueva - data.cantidad_anterior,
        tipo_ajuste: data.tipo_ajuste, // MERMA, ROBO, CORRECCION, DEVOLUCION, DAÑADO
        motivo: data.motivo,
        usuario_id: data.usuario_id,
        aprobado_por: null,
        requiere_aprobacion: data.requiere_aprobacion || false,
        estado: data.requiere_aprobacion ? 'PENDIENTE' : 'APROBADO',
        fecha_ajuste: serverTimestamp(),
        fecha_aprobacion: null,
        observaciones: data.observaciones || '',
        archivos_adjuntos: data.archivos_adjuntos || []
      }

      const docRef = await addDoc(ajustesRef, nuevoAjuste)

      // Si no requiere aprobación, actualizar inventario inmediatamente
      if (!data.requiere_aprobacion) {
        await firestoreService.ajustarInventario(
          data.ubicacion_id,
          data.producto_id,
          data.cantidad_nueva
        )
      }

      return {
        success: true,
        message: 'Ajuste de inventario registrado',
        data: { id: docRef.id, ...nuevoAjuste }
      }
    } catch (error) {
      console.error('Error creando ajuste de inventario:', error)
      return { success: false, message: error.message }
    }
  },

  aprobarAjusteInventario: async (ajusteId, aprobadorId) => {
    try {
      const db = getDB()
      const ajusteRef = doc(db, 'ajustes_inventario', ajusteId)

      // Obtener datos del ajuste
      const ajusteDoc = await getDoc(ajusteRef)
      if (!ajusteDoc.exists()) {
        return { success: false, message: 'Ajuste no encontrado' }
      }

      const ajuste = ajusteDoc.data()

      // Actualizar estado del ajuste
      await updateDoc(ajusteRef, {
        estado: 'APROBADO',
        aprobado_por: aprobadorId,
        fecha_aprobacion: serverTimestamp()
      })

      // Actualizar inventario
      await firestoreService.ajustarInventario(
        ajuste.ubicacion_id,
        ajuste.producto_id,
        ajuste.cantidad_nueva
      )

      return { success: true, message: 'Ajuste aprobado y aplicado al inventario' }
    } catch (error) {
      console.error('Error aprobando ajuste:', error)
      return { success: false, message: error.message }
    }
  },

  rechazarAjusteInventario: async (ajusteId, aprobadorId, motivo) => {
    try {
      const db = getDB()
      const ajusteRef = doc(db, 'ajustes_inventario', ajusteId)

      await updateDoc(ajusteRef, {
        estado: 'RECHAZADO',
        aprobado_por: aprobadorId,
        fecha_aprobacion: serverTimestamp(),
        observaciones_rechazo: motivo
      })

      return { success: true, message: 'Ajuste rechazado' }
    } catch (error) {
      console.error('Error rechazando ajuste:', error)
      return { success: false, message: error.message }
    }
  },

  getAjustesInventario: async (filters = {}) => {
    try {
      const queryFilters = [orderBy('fecha_ajuste', 'desc')]

      if (filters.producto_id) {
        queryFilters.unshift(where('producto_id', '==', filters.producto_id))
      }
      if (filters.ubicacion_id) {
        queryFilters.unshift(where('ubicacion_id', '==', filters.ubicacion_id))
      }
      if (filters.estado) {
        queryFilters.unshift(where('estado', '==', filters.estado))
      }

      return await firestoreService.queryWithFilters('ajustes_inventario', queryFilters)
    } catch (error) {
      console.error('Error obteniendo ajustes de inventario:', error)
      throw error
    }
  },

  // ========== CONFIGURACIONES DE USUARIO ==========

  getConfiguracionUsuario: async (usuarioId) => {
    try {
      const config = await firestoreService.getById('configuraciones_usuario', usuarioId)

      // Si no existe configuración, devolver valores por defecto
      if (!config) {
        return {
          usuario_id: usuarioId,
          tema: 'light',
          idioma: 'es',
          notificaciones_email: true,
          notificaciones_push: true,
          notificaciones_sonido: false,
          vista_predeterminada: 'dashboard',
          items_por_pagina: 25,
          formato_fecha: 'DD/MM/YYYY',
          formato_hora: '24h',
          zona_horaria: 'America/Bogota',
          ubicacion_favorita: null
        }
      }

      return config
    } catch (error) {
      console.error('Error obteniendo configuración de usuario:', error)
      throw error
    }
  },

  updateConfiguracionUsuario: async (usuarioId, configuraciones) => {
    try {
      const db = getDB()
      const configRef = doc(db, 'configuraciones_usuario', usuarioId)

      // Verificar si existe
      const configDoc = await getDoc(configRef)

      const datosConfiguracion = {
        ...configuraciones,
        usuario_id: usuarioId,
        updated_at: serverTimestamp()
      }

      if (configDoc.exists()) {
        // Actualizar
        await updateDoc(configRef, datosConfiguracion)
      } else {
        // Crear nuevo documento con ID personalizado
        const batch = writeBatch(db)
        batch.set(configRef, datosConfiguracion)
        await batch.commit()
      }

      return {
        success: true,
        message: 'Configuración actualizada exitosamente',
        data: datosConfiguracion
      }
    } catch (error) {
      console.error('Error actualizando configuración de usuario:', error)
      return { success: false, message: error.message }
    }
  },

  // ========== CONFIGURACIONES DEL SISTEMA ==========

  getConfiguracionSistema: async (configId) => {
    try {
      return await firestoreService.getById('configuraciones_sistema', configId)
    } catch (error) {
      console.error('Error obteniendo configuración del sistema:', error)
      throw error
    }
  },

  getAllConfiguracionesSistema: async () => {
    try {
      return await firestoreService.getAll('configuraciones_sistema')
    } catch (error) {
      console.error('Error obteniendo todas las configuraciones del sistema:', error)
      throw error
    }
  },

  updateConfiguracionSistema: async (configId, valor, usuarioId) => {
    try {
      const db = getDB()
      const configRef = doc(db, 'configuraciones_sistema', configId)

      await updateDoc(configRef, {
        valor: valor,
        updated_at: serverTimestamp(),
        updated_by: usuarioId
      })

      return {
        success: true,
        message: 'Configuración del sistema actualizada'
      }
    } catch (error) {
      console.error('Error actualizando configuración del sistema:', error)
      return { success: false, message: error.message }
    }
  },

  createConfiguracionSistema: async (data) => {
    try {
      const db = getDB()
      const configRef = doc(db, 'configuraciones_sistema', data.id)

      const nuevaConfig = {
        categoria: data.categoria,
        nombre: data.nombre,
        valor: data.valor,
        tipo_dato: data.tipo_dato,
        descripcion: data.descripcion || '',
        editable_por_admin: data.editable_por_admin !== false,
        requiere_reinicio: data.requiere_reinicio || false,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        updated_by: data.usuario_id
      }

      const batch = writeBatch(db)
      batch.set(configRef, nuevaConfig)
      await batch.commit()

      return {
        success: true,
        message: 'Configuración creada exitosamente',
        data: { id: data.id, ...nuevaConfig }
      }
    } catch (error) {
      console.error('Error creando configuración del sistema:', error)
      return { success: false, message: error.message }
    }
  },

  // ========== TICKETS DE SOPORTE ==========

  getTicketsSoporte: async (usuarioId = null) => {
    try {
      const queryFilters = [orderBy('fecha_creacion', 'desc')]

      if (usuarioId) {
        queryFilters.unshift(where('usuario_id', '==', usuarioId))
      }

      return await firestoreService.queryWithFilters('tickets_soporte', queryFilters)
    } catch (error) {
      console.error('Error obteniendo tickets de soporte:', error)
      throw error
    }
  },

  createTicketSoporte: async (data) => {
    try {
      const db = getDB()
      const ticketsRef = collection(db, 'tickets_soporte')

      // Generar número de ticket
      const allTickets = await getDocs(ticketsRef)
      const ticketNumero = `TKT-${String(allTickets.size + 1).padStart(4, '0')}`

      const nuevoTicket = {
        ticket_numero: ticketNumero,
        usuario_id: data.usuario_id,
        asunto: data.asunto,
        descripcion: data.descripcion,
        categoria: data.categoria || 'CONSULTA', // TECNICO, FUNCIONAL, CONSULTA, ERROR
        prioridad: data.prioridad || 'MEDIA', // BAJA, MEDIA, ALTA, CRITICA
        estado: 'ABIERTO', // ABIERTO, EN_PROGRESO, RESUELTO, CERRADO
        asignado_a: null,
        archivos_adjuntos: data.archivos_adjuntos || [],
        fecha_creacion: serverTimestamp(),
        fecha_actualizacion: serverTimestamp(),
        fecha_resolucion: null,
        resolucion: '',
        satisfaccion: null
      }

      const docRef = await addDoc(ticketsRef, nuevoTicket)

      return {
        success: true,
        message: `Ticket ${ticketNumero} creado exitosamente`,
        data: { id: docRef.id, ...nuevoTicket }
      }
    } catch (error) {
      console.error('Error creando ticket de soporte:', error)
      return { success: false, message: error.message }
    }
  },

  updateTicketSoporte: async (ticketId, data) => {
    try {
      const db = getDB()
      const ticketRef = doc(db, 'tickets_soporte', ticketId)

      const actualizacion = {
        ...data,
        fecha_actualizacion: serverTimestamp()
      }

      // Si se está resolviendo, agregar fecha de resolución
      if (data.estado === 'RESUELTO' || data.estado === 'CERRADO') {
        actualizacion.fecha_resolucion = serverTimestamp()
      }

      await updateDoc(ticketRef, actualizacion)

      return {
        success: true,
        message: 'Ticket actualizado exitosamente'
      }
    } catch (error) {
      console.error('Error actualizando ticket de soporte:', error)
      return { success: false, message: error.message }
    }
  },

  // ========== BENEFICIARIOS ==========

  getBeneficiarios: async () => {
    return await firestoreService.getAll('beneficiarios')
  },

  createBeneficiario: async (data) => {
    try {
      const db = getDB()
      const ref = collection(db, 'beneficiarios')
      const docRef = await addDoc(ref, {
        ...data,
        estado: data.estado || 'ACTIVO',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      })
      return { id: docRef.id, ...data }
    } catch (error) {
      console.error('Error creando beneficiario:', error)
      throw error
    }
  },

  updateBeneficiario: async (id, data) => {
    try {
      const db = getDB()
      await updateDoc(doc(db, 'beneficiarios', id), { ...data, updated_at: serverTimestamp() })
      return { id, ...data }
    } catch (error) {
      console.error('Error actualizando beneficiario:', error)
      throw error
    }
  },

  deleteBeneficiario: async (id) => {
    try {
      const db = getDB()
      await updateDoc(doc(db, 'beneficiarios', id), { estado: 'INACTIVO', updated_at: serverTimestamp() })
      return { success: true }
    } catch (error) {
      console.error('Error desactivando beneficiario:', error)
      throw error
    }
  },

  // ========== CAUSAS DE MERMA ==========

  getCausasMerma: async () => {
    return await firestoreService.getAll('causas_merma')
  },

  createCausaMerma: async (data) => {
    try {
      const db = getDB()
      const ref = collection(db, 'causas_merma')
      const docRef = await addDoc(ref, {
        ...data,
        estado: data.estado || 'ACTIVO',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      })
      return { id: docRef.id, ...data }
    } catch (error) {
      console.error('Error creando causa de merma:', error)
      throw error
    }
  },

  updateCausaMerma: async (id, data) => {
    try {
      const db = getDB()
      await updateDoc(doc(db, 'causas_merma', id), { ...data, updated_at: serverTimestamp() })
      return { id, ...data }
    } catch (error) {
      console.error('Error actualizando causa de merma:', error)
      throw error
    }
  },

  deleteCausaMerma: async (id) => {
    try {
      const db = getDB()
      await updateDoc(doc(db, 'causas_merma', id), { estado: 'INACTIVO', updated_at: serverTimestamp() })
      return { success: true }
    } catch (error) {
      console.error('Error desactivando causa de merma:', error)
      throw error
    }
  },

  // ========== VENTAS ==========

  getVentas: async () => {
    try {
      return await firestoreService.queryWithFilters('ventas', [orderBy('fecha_creacion', 'desc')])
    } catch (error) {
      console.error('Error obteniendo ventas:', error)
      return await firestoreService.getAll('ventas')
    }
  },

  createVenta: async (data) => {
    try {
      const db = getDB()
      const batch = writeBatch(db)
      const codigoLegible = await getNextSequentialCode('VT')

      const ventaRef = doc(collection(db, 'ventas'))
      const nuevaVenta = {
        codigo_legible: codigoLegible,
        tipo_movimiento: 'VENTA',
        origen_id: data.origen_id,
        beneficiario_id: data.beneficiario_id,
        beneficiario_nombre: data.beneficiario_nombre || '',
        estado: 'COMPLETADO',
        usuario_creacion_id: data.usuario_creacion_id,
        fecha_creacion: Timestamp.now(),
        observaciones: data.observaciones || ''
      }
      batch.set(ventaRef, nuevaVenta)

      // Crear detalles y actualizar inventario
      if (data.productos && data.productos.length > 0) {
        for (const prod of data.productos) {
          const detalleRef = doc(collection(db, 'detalle_ventas'))
          batch.set(detalleRef, {
            venta_id: ventaRef.id,
            producto_id: prod.producto_id,
            cantidad: prod.cantidad,
            observaciones: prod.observaciones || ''
          })

          // Reducir stock en origen
          const inventarioOrigen = await firestoreService.queryWithFilters('inventario', [
            where('producto_id', '==', prod.producto_id),
            where('ubicacion_id', '==', data.origen_id)
          ])
          if (inventarioOrigen.length > 0) {
            const invRef = doc(db, 'inventario', inventarioOrigen[0].id)
            batch.update(invRef, {
              stock_actual: inventarioOrigen[0].stock_actual - prod.cantidad,
              ultima_actualizacion: serverTimestamp()
            })
          }
        }
      }

      await batch.commit()
      return { success: true, message: 'Venta registrada exitosamente', data: { id: ventaRef.id, ...nuevaVenta } }
    } catch (error) {
      console.error('Error creando venta:', error)
      return { success: false, message: error.message }
    }
  },

  // ========== MERMAS ==========

  getMermas: async () => {
    try {
      return await firestoreService.queryWithFilters('mermas', [orderBy('fecha_creacion', 'desc')])
    } catch (error) {
      console.error('Error obteniendo mermas:', error)
      return await firestoreService.getAll('mermas')
    }
  },

  createMerma: async (data) => {
    try {
      const db = getDB()
      const batch = writeBatch(db)
      const codigoLegible = await getNextSequentialCode('MR')

      const mermaRef = doc(collection(db, 'mermas'))
      const nuevaMerma = {
        codigo_legible: codigoLegible,
        tipo_movimiento: 'MERMA',
        origen_id: data.origen_id,
        causa_merma_id: data.causa_merma_id,
        causa_merma_nombre: data.causa_merma_nombre || '',
        estado: 'COMPLETADO',
        usuario_creacion_id: data.usuario_creacion_id,
        fecha_creacion: Timestamp.now(),
        observaciones: data.observaciones || ''
      }
      batch.set(mermaRef, nuevaMerma)

      // Crear detalles y actualizar inventario
      if (data.productos && data.productos.length > 0) {
        for (const prod of data.productos) {
          const detalleRef = doc(collection(db, 'detalle_mermas'))
          batch.set(detalleRef, {
            merma_id: mermaRef.id,
            producto_id: prod.producto_id,
            cantidad: prod.cantidad,
            observaciones: prod.observaciones || ''
          })

          // Reducir stock en origen
          const inventarioOrigen = await firestoreService.queryWithFilters('inventario', [
            where('producto_id', '==', prod.producto_id),
            where('ubicacion_id', '==', data.origen_id)
          ])
          if (inventarioOrigen.length > 0) {
            const invRef = doc(db, 'inventario', inventarioOrigen[0].id)
            batch.update(invRef, {
              stock_actual: inventarioOrigen[0].stock_actual - prod.cantidad,
              ultima_actualizacion: serverTimestamp()
            })
          }
        }
      }

      await batch.commit()
      return { success: true, message: 'Merma registrada exitosamente', data: { id: mermaRef.id, ...nuevaMerma } }
    } catch (error) {
      console.error('Error creando merma:', error)
      return { success: false, message: error.message }
    }
  },

  // ========== BENEFICIARIOS ==========
  getBeneficiarios: async () => {
    try {
      return await firestoreService.queryWithFilters('beneficiarios', [orderBy('nombre', 'asc')])
    } catch (error) {
      console.error('Error obteniendo beneficiarios:', error)
      return await firestoreService.getAll('beneficiarios')
    }
  },

  createBeneficiario: async (data) => {
    const db = getDB()
    const beneficiarioRef = doc(collection(db, 'beneficiarios'))
    const nuevoBeneficiario = {
      nombre: data.nombre,
      identificacion: data.identificacion,
      telefono: data.telefono || '',
      direccion: data.direccion || '',
      poblado: data.poblado || '',
      fecha_creacion: serverTimestamp(),
      estado: 'ACTIVO'
    }
    await setDoc(beneficiarioRef, nuevoBeneficiario)
    return { id: beneficiarioRef.id, ...nuevoBeneficiario }
  },

  updateBeneficiario: async (id, data) => {
    const db = getDB()
    const beneficiarioRef = doc(db, 'beneficiarios', id)
    await updateDoc(beneficiarioRef, {
      ...data,
      ultima_actualizacion: serverTimestamp()
    })
    return { id, ...data }
  },

  deleteBeneficiario: async (id) => {
    const db = getDB()
    const beneficiarioRef = doc(db, 'beneficiarios', id)
    await updateDoc(beneficiarioRef, { estado: 'INACTIVO' })
    return { id }
  },

  // ========== RAZONES DE MERMA ==========
  getRazonesMerma: async () => {
    try {
      return await firestoreService.queryWithFilters('razones_merma', [orderBy('nombre', 'asc')])
    } catch (error) {
      console.error('Error obteniendo razones de merma:', error)
      return await firestoreService.getAll('razones_merma')
    }
  },

  createRazonMerma: async (data) => {
    const db = getDB()
    const razonRef = doc(collection(db, 'razones_merma'))
    const nuevaRazon = {
      nombre: data.nombre,
      descripcion: data.descripcion || '',
      fecha_creacion: serverTimestamp(),
      estado: 'ACTIVO'
    }
    await setDoc(razonRef, nuevaRazon)
    return { id: razonRef.id, ...nuevaRazon }
  },

  updateRazonMerma: async (id, data) => {
    const db = getDB()
    const razonRef = doc(db, 'razones_merma', id)
    await updateDoc(razonRef, {
      ...data,
      ultima_actualizacion: serverTimestamp()
    })
    return { id, ...data }
  },

  deleteRazonMerma: async (id) => {
    const db = getDB()
    const razonRef = doc(db, 'razones_merma', id)
    await updateDoc(razonRef, { estado: 'INACTIVO' })
    return { id }
  }
}

export default firestoreService
