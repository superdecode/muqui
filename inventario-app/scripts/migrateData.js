/**
 * Script de Migración de Datos a Firestore
 *
 * Este script migra datos desde Google Sheets/CSV a Firestore
 * Usa firebase-admin con las credenciales de service account
 *
 * Uso:
 *   node scripts/migrateData.js
 *
 * Requisitos:
 *   npm install firebase-admin csv-parser
 */

import admin from 'firebase-admin'
import fs from 'fs'
import path from 'path'
import csv from 'csv-parser'
import https from 'https'
import { fileURLToPath } from 'url'

// Obtener __dirname equivalente en ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Cargar credenciales de service account
import serviceAccount from '../serviceAccountKey.json' with { type: 'json' }

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

// Contadores de registros
const stats = {
  empresas: 0,
  usuarios: 0,
  productos: 0,
  ubicaciones: 0,
  inventario: 0,
  movimientos: 0,
  conteos: 0,
  alertas: 0
}

/**
 * Leer archivo CSV y convertir a array de objetos
 */
async function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = []
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error))
  })
}

/**
 * Migrar colección de datos a Firestore
 */
async function migrateCollection(collectionName, data, idField = 'id') {
  console.log(`\n📦 Migrando ${data.length} registros a la colección '${collectionName}'...`)

  const batch = db.batch()
  let batchCount = 0
  let totalMigrated = 0

  for (const item of data) {
    const docId = item[idField] || db.collection(collectionName).doc().id
    const docRef = db.collection(collectionName).doc(docId)

    // Eliminar el campo id del objeto si existe, ya que el ID está en el documento
    const { [idField]: _, ...docData } = item

    batch.set(docRef, docData, { merge: true })
    batchCount++

    // Firestore batch tiene un límite de 500 operaciones
    if (batchCount === 500) {
      await batch.commit()
      totalMigrated += batchCount
      console.log(`  ✓ ${totalMigrated} registros migrados...`)
      batchCount = 0
    }
  }

  // Commit el último batch
  if (batchCount > 0) {
    await batch.commit()
    totalMigrated += batchCount
  }

  stats[collectionName] = totalMigrated
  console.log(`  ✅ Total: ${totalMigrated} registros migrados a '${collectionName}'`)
  return totalMigrated
}

/**
 * Obtener datos desde la URL de Google Sheets publicada como CSV
 */
async function fetchGoogleSheetsData(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        resolve(data)
      })
    }).on('error', (error) => {
      reject(error)
    })
  })
}

/**
 * Parsear CSV text a array de objetos
 */
function parseCSV(csvText) {
  const lines = csvText.split('\n')
  if (lines.length === 0) return []

  const headers = lines[0].split(',').map(h => h.trim())
  const data = []

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = lines[i].split(',')
      const row = {}
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || ''
      })
      data.push(row)
    }
  }

  return data
}

/**
 * Migrar desde Google Sheets publicado
 */
async function migrateFromGoogleSheets() {
  console.log('📥 Obteniendo datos desde Google Sheets...')

  const SHEETS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ_aMuS5pJgbQ4ua-a1sGhvW5TbqwkjnFukuDxXelcn-k9KeT1wHl79hSMpLnhO2-3KPB0pnKFxG-8g/pub?output=csv'

  try {
    const csvData = await fetchGoogleSheetsData(SHEETS_URL)
    const data = parseCSV(csvData)

    console.log(`✓ ${data.length} registros obtenidos desde Google Sheets`)

    // Aquí debes adaptar según la estructura de tu Google Sheet
    // Por ejemplo, si tienes diferentes hojas, necesitarás URLs diferentes
    // o procesar el CSV para identificar qué tipo de datos son

    // Ejemplo: asumiendo que todos los datos son productos
    await migrateCollection('productos', data, 'id')

  } catch (error) {
    console.error('❌ Error obteniendo datos desde Google Sheets:', error)
  }
}

/**
 * Migrar desde archivos CSV locales
 */
async function migrateFromLocalCSV() {
  console.log('📂 Buscando archivos CSV locales...\n')

  const dataDir = path.join(__dirname, '../data')

  // Verificar si existe el directorio data
  if (!fs.existsSync(dataDir)) {
    console.log('⚠️  No se encontró el directorio /data')
    console.log('   Crea una carpeta /data en la raíz del proyecto y coloca tus archivos CSV ahí')
    return
  }

  // Mapeo de archivos CSV a colecciones de Firestore
  const csvFiles = {
    'InventarioDB_Muqui - Empresas.csv': { collection: 'empresas', idField: 'id' },
    'InventarioDB_Muqui - Usuarios.csv': { collection: 'usuarios', idField: 'id' },
    'InventarioDB_Muqui - Productos.csv': { collection: 'productos', idField: 'id' },
    'InventarioDB_Muqui - Ubicaciones.csv': { collection: 'ubicaciones', idField: 'id' },
    'InventarioDB_Muqui - Inventario.csv': { collection: 'inventario', idField: 'id' },
    'InventarioDB_Muqui - Movimientos.csv': { collection: 'movimientos', idField: 'id' },
    'InventarioDB_Muqui - Detalle_movimientos.csv': { collection: 'detalle_movimientos', idField: 'id' },
    'InventarioDB_Muqui - Conteos.csv': { collection: 'conteos', idField: 'id' },
    'InventarioDB_Muqui - Detalle_conteos.csv': { collection: 'detalle_conteos', idField: 'id' },
    'InventarioDB_Muqui - Alertas.csv': { collection: 'alertas', idField: 'id' }
  }

  for (const [fileName, config] of Object.entries(csvFiles)) {
    const filePath = path.join(dataDir, fileName)

    if (fs.existsSync(filePath)) {
      try {
        const data = await readCSV(filePath)
        if (data.length > 0) {
          await migrateCollection(config.collection, data, config.idField)
        } else {
          console.log(`⚠️  ${fileName} está vacío`)
        }
      } catch (error) {
        console.error(`❌ Error procesando ${fileName}:`, error.message)
      }
    } else {
      console.log(`⏭️  Saltando ${fileName} (no existe)`)
    }
  }
}

/**
 * Función principal
 */
async function main() {
  console.log('🚀 Iniciando migración de datos a Firestore...\n')
  console.log('=' . repeat(60))

  try {
    // Opción 1: Migrar desde Google Sheets
    // await migrateFromGoogleSheets()

    // Opción 2: Migrar desde archivos CSV locales
    await migrateFromLocalCSV()

    // Mostrar resumen
    console.log('\n' + '='.repeat(60))
    console.log('📊 RESUMEN DE MIGRACIÓN')
    console.log('='.repeat(60))

    let total = 0
    Object.entries(stats).forEach(([collection, count]) => {
      if (count > 0) {
        console.log(`  ${collection.padEnd(25)} ${count.toString().padStart(5)} registros`)
        total += count
      }
    })

    console.log('='.repeat(60))
    console.log(`  ${'TOTAL'.padEnd(25)} ${total.toString().padStart(5)} registros`)
    console.log('='.repeat(60))
    console.log('\n✅ Migración completada exitosamente!\n')

  } catch (error) {
    console.error('\n❌ Error durante la migración:', error)
    process.exit(1)
  }

  process.exit(0)
}

// Ejecutar script
main()
