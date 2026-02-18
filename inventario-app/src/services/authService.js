import firestoreService from './firestoreService'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { getDB } from '../config/firebase.config'

/**
 * Load role data from Firestore by rol_id or rol value
 */
async function loadUserRole(usuario) {
  try {
    const db = getDB()
    let roleDoc = null

    // Try to load by rol_id first (new system)
    if (usuario.rol_id) {
      const roleRef = doc(db, 'roles', usuario.rol_id)
      const roleSnap = await getDoc(roleRef)
      if (roleSnap.exists()) {
        roleDoc = { id: roleSnap.id, ...roleSnap.data() }
      }
    }

    // Fallback: try to find by rol name
    if (!roleDoc && usuario.rol) {
      const rolesQuery = query(
        collection(db, 'roles'),
        where('nombre', '==', usuario.rol)
      )
      const rolesSnap = await getDocs(rolesQuery)
      if (!rolesSnap.empty) {
        const firstRole = rolesSnap.docs[0]
        roleDoc = { id: firstRole.id, ...firstRole.data() }
      }
    }

    return roleDoc
  } catch (error) {
    console.error('Error loading user role:', error)
    return null
  }
}

export const authService = {
  login: async (email, password) => {
    try {
      if (!email || !password) {
        return { success: false, message: 'Email y contraseña son requeridos' }
      }

      let usuario
      try {
        usuario = await firestoreService.getUsuarioByEmail(email)
      } catch (fetchError) {
        console.error('Error fetching user from Firestore:', fetchError)
        return { success: false, message: 'Error de conexión con la base de datos. Intenta nuevamente.' }
      }

      if (!usuario) {
        return { success: false, message: 'Usuario no encontrado' }
      }

      // Validar estado del usuario (más robusto)
      const userEstado = usuario.estado || 'ACTIVO' // Por defecto ACTIVO si no está definido
      if (userEstado.toString().toUpperCase() !== 'ACTIVO') {
        console.log('Usuario con estado no activo:', { email: usuario.email, estado: userEstado })
        return { success: false, message: `Usuario inactivo (${userEstado}). Contacta al administrador.` }
      }

      if (usuario.password !== password) {
        return { success: false, message: 'Contraseña incorrecta' }
      }

      // Load role permissions from Firestore (non-blocking - login succeeds even if role lookup fails)
      let roleData = null
      try {
        roleData = await loadUserRole(usuario)
        if (roleData) {
          usuario.roleData = roleData
          usuario.permisos = roleData.permisos || usuario.permisos || {}
          // Always normalize user.rol to the readable nombre from Firestore role document
          if (roleData.nombre) {
            usuario.rol = roleData.nombre
          }
        }
      } catch (roleError) {
        console.warn('Could not load role data, continuing with user-level permisos:', roleError)
      }

      // Ensure permisos is always at least an empty object (never undefined/null)
      if (!usuario.permisos || typeof usuario.permisos !== 'object') {
        usuario.permisos = {}
      }

      // Use codigo as primary user ID, but keep Firestore ID for document queries
      const userId = usuario.codigo || usuario.id
      const usuarioWithId = { 
        ...usuario, 
        id: userId,           // Primary ID for app logic (codigo)
        firestoreId: usuario.id  // Keep Firestore document ID for queries
      }
      
      const token = `token_${userId}_${Date.now()}`
      localStorage.setItem('authToken', token)
      localStorage.setItem('user', JSON.stringify(usuarioWithId))

      return { success: true, user: usuarioWithId, token, role: roleData }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, message: `Error al iniciar sesión: ${error.message || 'Error desconocido'}` }
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
    if (!userStr) return null
    
    const user = JSON.parse(userStr)
    // Ensure consistency: if user has codigo field but id doesn't match, update id
    if (user.codigo && user.id !== user.codigo) {
      user.id = user.codigo
      // Ensure firestoreId is preserved
      if (!user.firestoreId && user.codigo !== user.id) {
        user.firestoreId = user.id
      }
      localStorage.setItem('user', JSON.stringify(user))
    }
    return user
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
