/**
 * Script para depurar configuración de variables de entorno
 */

console.log('🔍 Verificando configuración de variables de entorno...')

// Simular import.meta.env
const mockEnv = {
  VITE_USE_MOCK_DATA: process.env.VITE_USE_MOCK_DATA || 'false',
  VITE_USE_GOOGLE_SHEETS: process.env.VITE_USE_GOOGLE_SHEETS || 'false',
  VITE_ENABLE_FIREBASE: process.env.VITE_ENABLE_FIREBASE || 'false'
}

console.log('\n📋 Variables de entorno:')
console.log(`VITE_USE_MOCK_DATA: "${mockEnv.VITE_USE_MOCK_DATA}"`)
console.log(`VITE_USE_GOOGLE_SHEETS: "${mockEnv.VITE_USE_GOOGLE_SHEETS}"`)
console.log(`VITE_ENABLE_FIREBASE: "${mockEnv.VITE_ENABLE_FIREBASE}"`)

// Verificar condiciones
const USE_MOCK_DATA = mockEnv.VITE_USE_MOCK_DATA === 'true'
const USE_GOOGLE_SHEETS = mockEnv.VITE_USE_GOOGLE_SHEETS === 'true'
const USE_FIRESTORE = mockEnv.VITE_ENABLE_FIREBASE === 'true'

console.log('\n🎯 Condiciones evaluadas:')
console.log(`USE_MOCK_DATA: ${USE_MOCK_DATA}`)
console.log(`USE_GOOGLE_SHEETS: ${USE_GOOGLE_SHEETS}`)
console.log(`USE_FIRESTORE: ${USE_FIRESTORE}`)

console.log('\n📊 Fuente de datos que se usará:')
if (USE_MOCK_DATA) {
  console.log('📝 MOCK DATA')
} else if (USE_FIRESTORE) {
  console.log('🔥 FIRESTORE')
} else if (USE_GOOGLE_SHEETS) {
  console.log('📊 GOOGLE SHEETS')
} else {
  console.log('🌐 API (fallback)')
}

console.log('\n✅ Verificación completada')
