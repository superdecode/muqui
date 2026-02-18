/**
 * Script para probar escritura desde cliente web
 * Usa las mismas credenciales que la aplicación web
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { fileURLToPath } from 'url'
import path from 'path'

// Obtener __dirname equivalente en ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuración de Firebase (misma que la app web)
const firebaseConfig = {
  apiKey: "AIzaSyDXBlBY49ngLIE0mfimhkl6mCFDpBw3VQI",
  authDomain: "control-inventario-41bcd.firebaseapp.com",
  projectId: "control-inventario-41bcd",
  storageBucket: "control-inventario-41bcd.firebasestorage.app",
  messagingSenderId: "973163987843",
  appId: "1:973163987843:web:00ddf87fbf5df4888a2cb6"
}

async function testClientWrite() {
  console.log('🔍 Probando escritura desde cliente web...')
  
  try {
    // Inicializar Firebase como cliente
    const app = initializeApp(firebaseConfig)
    const db = getFirestore(app)
    
    console.log('✅ Firebase cliente inicializado')
    
    // Intentar escribir en productos
    const productosRef = collection(db, 'productos')
    
    const testProducto = {
      nombre: 'Producto Test Cliente',
      especificacion: 'Test desde script cliente',
      categoria: 'TEST',
      estado: 'ACTIVO',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    }
    
    console.log('📝 Intentando escribir producto como cliente...')
    const docRef = await addDoc(productosRef, testProducto)
    
    console.log(`✅ Escritura exitosa! ID: ${docRef.id}`)
    console.log('📄 Las reglas de seguridad permiten escritura desde cliente')
    
    return true
    
  } catch (error) {
    console.error('❌ Error en escritura desde cliente:', error)
    
    if (error.code === 'permission-denied') {
      console.log('🚫 PROBLEMA: Las reglas de seguridad de Firestore bloquean la escritura')
      console.log('📝 Solución: Actualizar las reglas en Firebase Console')
    }
    
    return false
  }
}

async function main() {
  console.log('🚀 Iniciando prueba de escritura desde cliente...\n')
  console.log('=' . repeat(60))
  
  const success = await testClientWrite()
  
  console.log('\n' + '='.repeat(60))
  if (success) {
    console.log('✅ La escritura desde cliente funciona correctamente')
    console.log('🔍 El problema debe estar en otro lugar (componente, estado, etc.)')
  } else {
    console.log('❌ Las reglas de seguridad bloquean la escritura desde cliente')
    console.log('📝 Necesitas actualizar las reglas en Firebase Console')
  }
  console.log('='.repeat(60))
  
  process.exit(success ? 0 : 1)
}

main()
