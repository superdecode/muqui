/**
 * Script de Diagnóstico de Firestore
 *
 * Verifica la conexión y permisos de Firestore
 *
 * Uso:
 *   node scripts/testFirestore.js
 */

import admin from 'firebase-admin'
import serviceAccount from '../serviceAccountKey.json' with { type: 'json' }

console.log('🔍 Iniciando diagnóstico de Firestore...\n')

// Inicializar Firebase Admin
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  })
  console.log('✅ Firebase Admin inicializado correctamente')
} catch (error) {
  console.error('❌ Error inicializando Firebase Admin:', error.message)
  process.exit(1)
}

const db = admin.firestore()

// Función para contar documentos en una colección
async function testCollection(collectionName) {
  try {
    const snapshot = await db.collection(collectionName).limit(5).get()
    console.log(`  ✅ ${collectionName.padEnd(25)} ${snapshot.size} documentos (muestra)`)
    return snapshot.size
  } catch (error) {
    console.log(`  ❌ ${collectionName.padEnd(25)} Error: ${error.message}`)
    return 0
  }
}

// Probar todas las colecciones
async function runTests() {
  console.log('\n📦 Verificando colecciones en Firestore:\n')

  const collections = [
    'empresas',
    'usuarios',
    'productos',
    'ubicaciones',
    'inventario',
    'movimientos',
    'detalle_movimientos',
    'conteos',
    'detalle_conteos',
    'alertas'
  ]

  let totalDocs = 0
  for (const collection of collections) {
    const count = await testCollection(collection)
    totalDocs += count
  }

  console.log('\n' + '='.repeat(60))

  if (totalDocs === 0) {
    console.log('⚠️  No se encontraron datos en Firestore')
    console.log('\n📝 Posibles soluciones:')
    console.log('  1. Ejecuta: node scripts/migrateData.js')
    console.log('  2. Verifica que los archivos CSV estén en /data')
    console.log('  3. Verifica las reglas de seguridad en Firebase Console')
  } else {
    console.log(`✅ Total: ${totalDocs} documentos encontrados (muestra)`)
    console.log('\n🎉 Firestore está funcionando correctamente!')
  }

  // Mostrar una muestra de datos
  console.log('\n📄 Muestra de datos (productos):')
  try {
    const productosSnapshot = await db.collection('productos').limit(3).get()

    if (productosSnapshot.empty) {
      console.log('  No hay productos en la base de datos')
    } else {
      productosSnapshot.forEach(doc => {
        const data = doc.data()
        console.log(`  • ${doc.id}: ${data.nombre || 'Sin nombre'}`)
      })
    }
  } catch (error) {
    console.log('  ❌ Error obteniendo productos:', error.message)
  }

  console.log('\n' + '='.repeat(60))
  console.log('\n✅ Diagnóstico completado\n')

  process.exit(0)
}

// Ejecutar tests
runTests().catch(error => {
  console.error('\n❌ Error durante el diagnóstico:', error)
  process.exit(1)
})
