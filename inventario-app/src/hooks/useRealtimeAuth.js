/**
 * Real-time auth listener hook
 * - Watches user document in Firestore for status changes (auto-logout if deactivated)
 * - Watches role/permissions changes and updates global state without logout
 */
import { useEffect, useRef } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { getDB } from '../config/firebase.config'
import { useAuthStore } from '../stores/authStore'
import { useToastStore } from '../stores/toastStore'

export function useRealtimeAuth() {
  const { user, isAuthenticated, logout, updateUser, setCachedRole } = useAuthStore()
  const toast = useToastStore()
  const unsubUserRef = useRef(null)
  const unsubRoleRef = useRef(null)

  useEffect(() => {
    if (!isAuthenticated || !user?.firestoreId) {
      // Cleanup if not authenticated or no firestoreId
      unsubUserRef.current?.()
      unsubRoleRef.current?.()
      return
    }

    const db = getDB()

    // 1. Listen to user document for status/permission changes using firestoreId
    const userRef = doc(db, 'usuarios', user.firestoreId)
    unsubUserRef.current = onSnapshot(userRef, (snap) => {
      if (!snap.exists()) {
        console.warn('⚠️ User document deleted from Firestore, logging out')
        toast.error('Sesión Terminada', 'Tu cuenta ha sido eliminada. Contacta al administrador.')
        logout()
        return
      }

      const userData = { id: snap.id, ...snap.data() }
      // Ensure we maintain the correct ID structure
      userData.id = user.id  // Keep the codigo as primary ID
      userData.firestoreId = snap.id  // Store Firestore document ID

      // Auto-logout if user deactivated
      const estado = (userData.estado || 'ACTIVO').toString().toUpperCase()
      if (estado !== 'ACTIVO') {
        console.warn('⚠️ User deactivated in Firestore, logging out')
        toast.error('Cuenta Desactivada', 'Tu cuenta ha sido desactivada. Contacta al administrador.')
        logout()
        return
      }

      // Update user permissions in real-time (without logout)
      const currentPermisos = JSON.stringify(user.permisos || {})
      const newPermisos = JSON.stringify(userData.permisos || {})
      if (currentPermisos !== newPermisos) {
        console.log('🔄 User permissions updated in real-time')
        updateUser({ ...user, permisos: userData.permisos || {} })
      }

      // Update rol if changed
      if (userData.rol !== user.rol) {
        console.log('🔄 User role changed in real-time:', userData.rol)
        updateUser({ ...user, rol: userData.rol, permisos: userData.permisos || {} })
      }
    }, (error) => {
      console.error('Error in user snapshot listener:', error)
    })

    // 2. Listen to role document for permission changes
    const rolId = user.rol_id
    if (rolId) {
      const roleRef = doc(db, 'roles', rolId)
      unsubRoleRef.current = onSnapshot(roleRef, (snap) => {
        if (!snap.exists()) return
        const roleData = { id: snap.id, ...snap.data() }
        setCachedRole(roleData)
      }, (error) => {
        console.error('Error in role snapshot listener:', error)
      })
    }

    return () => {
      unsubUserRef.current?.()
      unsubRoleRef.current?.()
    }
  }, [isAuthenticated, user?.firestoreId, user?.rol_id, user?.id, logout, updateUser, setCachedRole, toast])
}

export default useRealtimeAuth
