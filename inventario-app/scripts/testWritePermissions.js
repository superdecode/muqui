/**
 * Script de Prueba de Permisos de Escritura en Firestore
 *
 * Verifica si se pueden escribir datos en Firestore
 */

import admin from 'firebase-admin'
import serviceAccount from '../serviceAccountKey.json' with { type: 'json' }

console.log('🔍 Probando permisos de escritura en Firestore...\n')

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

async function testWrite() {
  try {
    // Intentar crear un documento de prueba
    console.log('📝 Intentando escribir un documento de prueba...')

    const testRef = await db.collection('_test_write').add({
      mensaje: 'Prueba de escritura',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      test: true
    })

    console.log('✅ Escritura exitosa! ID:', testRef.id)

    // Intentar actualizar el documento
    console.log('📝 Intentando actualizar el documento...')
    await testRef.update({
      actualizado: true,
      timestamp_update: admin.firestore.FieldValue.serverTimestamp()
    })

    console.log('✅ Actualización exitosa!')

    // Leer el documento para verificar
    const doc = await testRef.get()
    console.log('📄 Documento leído:', doc.data())

    // Eliminar el documento de prueba
    await testRef.delete()
    console.log('🗑️  Documento de prueba eliminado')

    console.log('\n✅ TODOS LOS PERMISOS FUNCIONAN CORRECTAMENTE')
    console.log('\nEl problema puede ser:')
    console.log('  1. Las reglas de seguridad bloquean escritura desde el cliente web')
    console.log('  2. El usuario no está autenticado en el navegador')
    console.log('  3. Hay un error en el código del cliente\n')

  } catch (error) {
    console.error('❌ Error durante la prueba:', error.message)
    console.log('\n🔧 Posibles soluciones:')
    console.log('  1. Verifica las reglas de seguridad en Firebase Console')
    console.log('  2. Asegúrate de que el Service Account tenga permisos')
  }

  process.exit(0)
}

testWrite()
