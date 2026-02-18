/**
 * Script para inicializar Firestore con datos de prueba
 * Ejecutar una vez para poblar la base de datos
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, doc, setDoc, getDocs } from 'firebase/firestore'
import { mockUsers, mockEmpresas, mockProductos, mockUbicaciones, mockInventario } from '../data/mockData.js'

// Configuración de Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

// Inicializar Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

/**
 * Poblar una colección en Firestore
 */
async function seedCollection(collectionName, data) {
  console.log(`📦 Poblando colección: ${collectionName}`)

  try {
    for (const item of data) {
      const docRef = doc(db, collectionName, item.id)
      await setDoc(docRef, item)
      console.log(`  ✓ Documento ${item.id} creado`)
    }
    console.log(`✅ Colección ${collectionName} poblada exitosamente (${data.length} documentos)`)
  } catch (error) {
    console.error(`❌ Error al poblar ${collectionName}:`, error)
  }
}

/**
 * Verificar si una colección ya tiene datos
 */
async function collectionHasData(collectionName) {
  const snapshot = await getDocs(collection(db, collectionName))
  return !snapshot.empty
}

/**
 * Función principal de inicialización
 */
async function seedFirestore() {
  console.log('🚀 Iniciando población de Firestore...\n')

  try {
    // Verificar si ya hay datos
    const usuariosExist = await collectionHasData('usuarios')

    if (usuariosExist) {
      console.log('⚠️  ADVERTENCIA: La base de datos ya contiene datos.')
      console.log('Si continúas, se sobrescribirán los documentos existentes con el mismo ID.\n')
    }

    // Poblar empresas
    await seedCollection('empresas', mockEmpresas)

    // Poblar usuarios
    await seedCollection('usuarios', mockUsers)

    // Poblar ubicaciones
    await seedCollection('ubicaciones', mockUbicaciones)

    // Poblar productos
    await seedCollection('productos', mockProductos)

    // Poblar inventario
    await seedCollection('inventario', mockInventario)

    console.log('\n✅ ¡Proceso de inicialización completado!')
    console.log('\nCredenciales de prueba:')
    console.log('  Admin: muqui.coo@gmail.com / temporal123')
    console.log('  Gerente: gerente@muqui.com / temporal123')

  } catch (error) {
    console.error('❌ Error durante la inicialización:', error)
  }
}

// Ejecutar si se carga este script directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  seedFirestore()
}

export default seedFirestore
