/**
 * Script para depurar variables de entorno en el navegador
 */

console.log('🔍 Depurando variables de entorno en el navegador...')

// Simular el ambiente del navegador
const env = {
  VITE_USE_MOCK_DATA: 'false',
  VITE_USE_GOOGLE_SHEETS: 'true',  // <-- ESTÁ EN TRUE!
  VITE_ENABLE_FIREBASE: 'false'   // <-- ESTÁ EN FALSE!
}

console.log('Variables detectadas:', env)

// Verificar si hay otro archivo .env o configuración
import fs from 'fs'
import path from 'path'

const envPath = path.join(process.cwd(), '.env')
const envContent = fs.readFileSync(envPath, 'utf8')

console.log('\n📋 Contenido real del .env:')
const lines = envContent.split('\n')
const firebaseLines = lines.filter(line => line.includes('FIREBASE') || line.includes('GOOGLE_SHEETS'))
firebaseLines.forEach(line => console.log(line))

console.log('\n🚨 PROBLEMA ENCONTRADO:')
console.log('La app está leyendo VITE_ENABLE_FIREBASE=false')
console.log('Pero el archivo .env dice VITE_ENABLE_FIREBASE=true')
console.log('\n🔧 SOLUCIÓN:')
console.log('1. Hay otro archivo .env o .env.local')
console.log('2. O hay configuración en otro lugar')
console.log('3. O el cache de Vite está mal')

// Buscar otros archivos .env
const files = fs.readdirSync(process.cwd())
const envFiles = files.filter(file => file.startsWith('.env'))
console.log('\n📁 Archivos .env encontrados:', envFiles)
