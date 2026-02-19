// Firebase configuration para Firestore
import { initializeApp } from 'firebase/app'
import { initializeFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

// Configuración de Firebase (obtener desde Firebase Console)
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "control-inventario-41bcd.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "control-inventario-41bcd",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "control-inventario-41bcd.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
}

// Inicializar Firebase
let app = null
let db = null
let auth = null

export const initializeFirebase = () => {
  if (!app) {
    try {
      app = initializeApp(firebaseConfig)
      db = initializeFirestore(app, {
        experimentalForceLongPolling: true // Fix for Safari ITP blocking WebChannel
      })
      auth = getAuth(app)

      // Usar emulador en desarrollo si está configurado
      if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
        connectFirestoreEmulator(db, 'localhost', 8080)
        console.log('🔧 Firestore Emulator conectado')
      }

      console.log('✅ Firebase inicializado correctamente')
    } catch (error) {
      console.error('❌ Error inicializando Firebase:', error)
      throw error
    }
  }
  return { app, db, auth }
}

// Exportar instancias
export const getFirebaseApp = () => {
  if (!app) {
    initializeFirebase()
  }
  return app
}

export const getDB = () => {
  if (!db) {
    initializeFirebase()
  }
  return db
}

export const getFirebaseAuth = () => {
  if (!auth) {
    initializeFirebase()
  }
  return auth
}
