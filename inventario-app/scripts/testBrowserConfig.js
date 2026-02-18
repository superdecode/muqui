/**
 * Script que simula el ambiente del navegador para probar configuración
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore'

// Simular variables de entorno como si estuviera en Vite
const mockEnv = {
  VITE_USE_MOCK_DATA: 'false',
  VITE_USE_GOOGLE_SHEETS: 'false',
  VITE_ENABLE_FIREBASE: 'true',
  VITE_FIREBASE_API_KEY: 'AIzaSyDXBlBY49ngLIE0mfimhkl6mCFDpBw3VQI',
  VITE_FIREBASE_AUTH_DOMAIN: 'control-inventario-41bcd.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'control-inventario-41bcd',
  VITE_FIREBASE_STORAGE_BUCKET: 'control-inventario-41bcd.firebasestorage.app',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '973163987843',
  VITE_FIREBASE_APP_ID: '1:973163987843:web:00ddf87fbf5df4888a2cb6'
}

// Simular import.meta.env
global.import = { meta: { env: mockEnv } }

// Evaluar condiciones como en dataService.js
const USE_MOCK_DATA = mockEnv.VITE_USE_MOCK_DATA === 'true'
const USE_GOOGLE_SHEETS = mockEnv.VITE_USE_GOOGLE_SHEETS === 'true'
const USE_FIRESTORE = mockEnv.VITE_ENABLE_FIREBASE === 'true'

console.log('🔍 Configuración del navegador simulada:')
console.log(`USE_MOCK_DATA: ${USE_MOCK_DATA}`)
console.log(`USE_GOOGLE_SHEETS: ${USE_GOOGLE_SHEETS}`)
console.log(`USE_FIRESTORE: ${USE_FIRESTORE}`)

if (USE_FIRESTORE) {
  console.log('✅ Usando Firestore')
  
  try {
    // Configuración de Firebase
    const firebaseConfig = {
      apiKey: mockEnv.VITE_FIREBASE_API_KEY,
      authDomain: mockEnv.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: mockEnv.VITE_FIREBASE_PROJECT_ID,
      storageBucket: mockEnv.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: mockEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: mockEnv.VITE_FIREBASE_APP_ID
    }

    const app = initializeApp(firebaseConfig)
    const db = getFirestore(app)
    
    console.log('✅ Firebase inicializado correctamente')
    
    // Probar escritura
    const testProducto = {
      nombre: 'Test Browser Config',
      especificacion: 'Prueba desde script simulando navegador',
      categoria: 'TEST',
      estado: 'ACTIVO',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    }
    
    const productosRef = collection(db, 'productos')
    const docRef = await addDoc(productosRef, testProducto)
    
    console.log(`✅ Producto creado con ID: ${docRef.id}`)
    console.log('🎯 La configuración del navegador funciona correctamente')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
} else {
  console.log('❌ No se está usando Firestore')
}
