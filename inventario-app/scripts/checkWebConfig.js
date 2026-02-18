/**
 * Script para verificar qué configuración usa realmente la app web
 */

console.log('🔍 Verificando configuración real de la app web...')

// Leer el archivo .env como lo haría Vite
import fs from 'fs'
import path from 'path'

const envPath = path.join(process.cwd(), '.env')
const envContent = fs.readFileSync(envPath, 'utf8')

console.log('\n📋 Contenido del archivo .env:')
console.log(envContent)

// Parsear variables VITE_*
const viteVars = {}
envContent.split('\n').forEach(line => {
  if (line.startsWith('VITE_') && line.includes('=')) {
    const [key, value] = line.split('=')
    viteVars[key] = value
  }
})

console.log('\n🎯 Variables VITE encontradas:')
Object.entries(viteVars).forEach(([key, value]) => {
  console.log(`${key}: "${value}"`)
})

// Evaluar condiciones como en dataService.js
const USE_MOCK_DATA = viteVars.VITE_USE_MOCK_DATA === 'true'
const USE_GOOGLE_SHEETS = viteVars.VITE_USE_GOOGLE_SHEETS === 'true'
const USE_FIRESTORE = viteVars.VITE_ENABLE_FIREBASE === 'true'

console.log('\n🔥 Condiciones evaluadas:')
console.log(`USE_MOCK_DATA: ${USE_MOCK_DATA}`)
console.log(`USE_GOOGLE_SHEETS: ${USE_GOOGLE_SHEETS}`)
console.log(`USE_FIRESTORE: ${USE_FIRESTORE}`)

console.log('\n📊 Fuente de datos que usará la app web:')
if (USE_MOCK_DATA) {
  console.log('📝 MOCK DATA (datos falsos en memoria)')
} else if (USE_FIRESTORE) {
  console.log('🔥 FIRESTORE (base de datos real)')
} else if (USE_GOOGLE_SHEETS) {
  console.log('📊 GOOGLE SHEETS (hojas de cálculo)')
} else {
  console.log('🌐 API REST (fallback)')
}

console.log('\n🚨 Si no dice FIRESTORE, ahí está el problema')
