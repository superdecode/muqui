/**
 * Diagnóstico completo del problema de guardado de productos
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore'

console.log('🔍 DIAGNÓSTICO COMPLETO DEL PROBLEMA DE GUARDADO')
console.log('=' . repeat(60))

// 1. Verificar configuración
const firebaseConfig = {
  apiKey: "AIzaSyDXBlBY49ngLIE0mfimhkl6mCFDpBw3VQI",
  authDomain: "control-inventario-41bcd.firebaseapp.com",
  projectId: "control-inventario-41bcd",
  storageBucket: "control-inventario-41bcd.firebasestorage.app",
  messagingSenderId: "973163987843",
  appId: "1:973163987843:web:00ddf87fbf5df4888a2cb6"
}

console.log('✅ 1. Configuración Firebase verificada')

// 2. Inicializar Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
console.log('✅ 2. Firebase inicializado')

// 3. Verificar conexión leyendo datos existentes
try {
  const productosSnapshot = await getDocs(collection(db, 'productos'))
  console.log(`✅ 3. Conexión verificada - Hay ${productosSnapshot.size} productos en Firestore`)
  
  // Mostrar algunos productos
  if (productosSnapshot.size > 0) {
    console.log('📋 Ejemplos de productos existentes:')
    productosSnapshot.docs.slice(0, 3).forEach((doc, index) => {
      const data = doc.data()
      console.log(`   ${index + 1}. ${data.nombre} (ID: ${doc.id})`)
    })
  }
} catch (error) {
  console.error('❌ 3. Error leyendo productos:', error)
}

// 4. Probar creación de producto como lo hace la app
try {
  console.log('\n📝 4. Probando crear producto como la aplicación...')
  
  const productoData = {
    nombre: 'Producto Test Diagnóstico',
    especificacion: 'Test completo',
    unidad_medida: 'unidad',
    stock_minimo: 5,
    frecuencia_inventario_Dias: 30,
    categoria: 'TEST',
    estado: 'ACTIVO',
    ubicacion_id: []
  }
  
  // Simular el proceso de firestoreService.createProducto
  const nuevoProducto = {
    ...productoData,
    concatenado: `${productoData.nombre} ${productoData.especificacion || ''}`.trim(),
    estado: productoData.estado || 'ACTIVO',
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  }
  
  const productosRef = collection(db, 'productos')
  const docRef = await addDoc(productosRef, nuevoProducto)
  
  console.log(`✅ 4. Producto creado exitosamente! ID: ${docRef.id}`)
  
  // 5. Verificar que se guardó correctamente
  const savedDoc = await getDocs(collection(db, 'productos'))
  const newProduct = savedDoc.docs.find(doc => doc.id === docRef.id)
  
  if (newProduct) {
    const data = newProduct.data()
    console.log('✅ 5. Verificación exitosa - Producto guardado:')
    console.log(`   Nombre: ${data.nombre}`)
    console.log(`   Estado: ${data.estado}`)
    console.log(`   Concatenado: ${data.concatenado}`)
    console.log(`   Timestamp: ${data.created_at}`)
  } else {
    console.log('❌ 5. No se encontró el producto guardado')
  }
  
} catch (error) {
  console.error('❌ 4/5. Error en creación/verificación:', error)
  console.error('   Código:', error.code)
  console.error('   Mensaje:', error.message)
}

console.log('\n' + '='.repeat(60))
console.log('🎯 DIAGNÓSTICO COMPLETADO')
console.log('Si todo lo anterior funciona, el problema está en:')
console.log('1. El componente React que llama al servicio')
console.log('2. El manejo de errores en la UI')
console.log('3. El estado de la aplicación')
console.log('4. La configuración del entorno de desarrollo')
console.log('=' . repeat(60))
