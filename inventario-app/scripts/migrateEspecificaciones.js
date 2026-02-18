/**
 * Script: Migración de Especificaciones, Unidades de Medida y Categorías
 *
 * Objetivo:
 *   1. Leer el CSV de Productos y extraer valores únicos de:
 *      - especificacion  → colección "especificaciones"
 *      - unidad_medida   → colección "unidades_medida"
 *      - categoria       → colección "categorias"
 *   2. Crear los documentos en cada colección (si no existen).
 *   3. Actualizar cada producto en Firestore con los IDs de referencia:
 *      - especificacion_id
 *      - unidad_medida_id
 *      - categoria_id
 *
 * Uso:
 *   node scripts/migrateEspecificaciones.js
 *
 * Nota: El script es IDEMPOTENTE. Puede ejecutarse varias veces sin duplicar
 *       datos, ya que primero verifica documentos existentes antes de crear.
 */

import admin from 'firebase-admin'
import fs from 'fs'
import path from 'path'
import csv from 'csv-parser'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ─── Credenciales Firebase ────────────────────────────────────────────────────
import serviceAccount from '../serviceAccountKey.json' with { type: 'json' }

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()
const BATCH_LIMIT = 499 // Firestore permite máx. 500 por batch

// ─── Estadísticas ────────────────────────────────────────────────────────────
const stats = {
  especificaciones: { found: 0, created: 0, existing: 0 },
  unidades_medida:  { found: 0, created: 0, existing: 0 },
  categorias:       { found: 0, created: 0, existing: 0 },
  productos:        { updated: 0, skipped: 0, errors: 0 }
}

// ─── Lectura CSV ──────────────────────────────────────────────────────────────
async function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const rows = []
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end',  () => resolve(rows))
      .on('error',(err) => reject(err))
  })
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

/** Extrae valores únicos y no vacíos de una columna del CSV */
function extractUnique(rows, field) {
  return [...new Set(
    rows
      .map(r => r[field]?.trim())
      .filter(v => v && v.length > 0)
  )].sort()
}

/**
 * Ejecuta una lista de operaciones { ref, data, type } en batches de 499.
 * type puede ser 'set' o 'update'.
 */
async function runBatches(operations, label) {
  let committed = 0

  for (let i = 0; i < operations.length; i += BATCH_LIMIT) {
    const chunk = operations.slice(i, i + BATCH_LIMIT)
    const batch = db.batch()

    for (const { ref, data, type } of chunk) {
      if (type === 'set')    batch.set(ref, data)
      if (type === 'update') batch.update(ref, data)
    }

    await batch.commit()
    committed += chunk.length
    console.log(`    Batch [${label}]: ${committed}/${operations.length} comprometidos`)
  }

  return committed
}

// ─── Paso 1: Crear colección y devolver mapa valor → docId ───────────────────

/**
 * Verifica si ya existen documentos en la colección, los reutiliza,
 * y crea sólo los que faltan. Devuelve Map<nombre, docId>.
 */
async function populateCollection(collectionName, uniqueValues) {
  const colRef = db.collection(collectionName)
  stats[collectionName].found = uniqueValues.length

  // 1a. Leer documentos ya existentes
  const snapshot = await colRef.get()
  const existingMap = new Map() // nombre → docId

  snapshot.forEach(doc => {
    const nombre = doc.data().nombre
    if (nombre) existingMap.set(nombre, doc.id)
  })

  stats[collectionName].existing = existingMap.size
  console.log(`\n  [${collectionName}] ${existingMap.size} existentes, ${uniqueValues.length} en CSV`)

  // 1b. Determinar cuáles faltan
  const toCreate = uniqueValues.filter(v => !existingMap.has(v))
  console.log(`  [${collectionName}] Crear: ${toCreate.length}, reusar: ${uniqueValues.length - toCreate.length}`)

  // 1c. Construir operaciones de escritura para los nuevos
  const ops = []
  const newIds = new Map()

  for (const nombre of toCreate) {
    const docRef = colRef.doc() // ID autogenerado
    newIds.set(nombre, docRef.id)
    ops.push({
      ref: docRef,
      data: {
        nombre,
        activo: true,
        creadoEn: admin.firestore.FieldValue.serverTimestamp()
      },
      type: 'set'
    })
  }

  if (ops.length > 0) {
    const count = await runBatches(ops, collectionName)
    stats[collectionName].created = count
    console.log(`  [OK] ${count} documentos creados en '${collectionName}'`)
  } else {
    console.log(`  [OK] Sin cambios necesarios en '${collectionName}'`)
  }

  // 1d. Combinar mapa existente + nuevos
  return new Map([...existingMap, ...newIds])
}

// ─── Paso 2: Actualizar productos con los IDs de referencia ──────────────────

async function updateProductos(rows, especMap, unidadMap, catMap) {
  console.log(`\n  [productos] Actualizando ${rows.length} productos con referencias...`)

  const ops = []

  for (const row of rows) {
    const prodId = row.id?.trim()

    if (!prodId) {
      stats.productos.skipped++
      console.warn(`  AVISO: Fila sin ID omitida → nombre="${row.nombre}"`)
      continue
    }

    const especNombre = row.especificacion?.trim()
    const unidadNombre = row.unidad_medida?.trim()
    const catNombre    = row.categoria?.trim()

    const updateData = {}

    if (especNombre && especMap.has(especNombre)) {
      updateData.especificacion_id = especMap.get(especNombre)
    } else if (especNombre) {
      console.warn(`  AVISO [${prodId}]: especificacion "${especNombre}" no encontrada en mapa`)
    }

    if (unidadNombre && unidadMap.has(unidadNombre)) {
      updateData.unidad_medida_id = unidadMap.get(unidadNombre)
    } else if (unidadNombre) {
      console.warn(`  AVISO [${prodId}]: unidad_medida "${unidadNombre}" no encontrada en mapa`)
    }

    if (catNombre && catMap.has(catNombre)) {
      updateData.categoria_id = catMap.get(catNombre)
    } else if (catNombre) {
      console.warn(`  AVISO [${prodId}]: categoria "${catNombre}" no encontrada en mapa`)
    }

    if (Object.keys(updateData).length === 0) {
      stats.productos.skipped++
      console.warn(`  AVISO [${prodId}]: sin referencias válidas para actualizar, omitido`)
      continue
    }

    const docRef = db.collection('productos').doc(prodId)
    ops.push({ ref: docRef, data: updateData, type: 'update' })
  }

  if (ops.length > 0) {
    try {
      const count = await runBatches(ops, 'productos')
      stats.productos.updated = count
      console.log(`  [OK] ${count} productos actualizados`)
    } catch (err) {
      console.error('  ERROR al actualizar productos:', err.message)
      stats.productos.errors++
    }
  } else {
    console.log('  [OK] Sin productos para actualizar')
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(62))
  console.log('  MIGRACION: Especificaciones / Unidades / Categorias')
  console.log('='.repeat(62))

  const csvPath = path.join(__dirname, '../data/InventarioDB_Muqui - Productos.csv')

  if (!fs.existsSync(csvPath)) {
    console.error(`ERROR: No se encontró el CSV en:\n  ${csvPath}`)
    process.exit(1)
  }

  console.log(`\nLeyendo CSV: ${path.basename(csvPath)}`)
  const rows = await readCSV(csvPath)
  console.log(`  ${rows.length} filas leídas`)

  // Extraer valores únicos por columna
  const especValues = extractUnique(rows, 'especificacion')
  const unidadValues = extractUnique(rows, 'unidad_medida')
  const catValues    = extractUnique(rows, 'categoria')

  console.log(`\nValores únicos detectados:`)
  console.log(`  especificaciones : ${especValues.length}  →  ${especValues.join(', ')}`)
  console.log(`  unidades_medida  : ${unidadValues.length}  →  ${unidadValues.join(', ')}`)
  console.log(`  categorias       : ${catValues.length}  →  ${catValues.join(', ')}`)

  // Paso 1: poblar colecciones y obtener mapas valor → ID
  const especMap = await populateCollection('especificaciones', especValues)
  const unidadMap = await populateCollection('unidades_medida', unidadValues)
  const catMap    = await populateCollection('categorias', catValues)

  // Paso 2: actualizar productos
  await updateProductos(rows, especMap, unidadMap, catMap)

  // Resumen final
  console.log('\n' + '='.repeat(62))
  console.log('  RESUMEN FINAL')
  console.log('='.repeat(62))
  console.log(`  especificaciones → encontradas en CSV : ${stats.especificaciones.found}`)
  console.log(`                   → ya existían        : ${stats.especificaciones.existing}`)
  console.log(`                   → creadas            : ${stats.especificaciones.created}`)
  console.log('')
  console.log(`  unidades_medida  → encontradas en CSV : ${stats.unidades_medida.found}`)
  console.log(`                   → ya existían        : ${stats.unidades_medida.existing}`)
  console.log(`                   → creadas            : ${stats.unidades_medida.created}`)
  console.log('')
  console.log(`  categorias       → encontradas en CSV : ${stats.categorias.found}`)
  console.log(`                   → ya existían        : ${stats.categorias.existing}`)
  console.log(`                   → creadas            : ${stats.categorias.created}`)
  console.log('')
  console.log(`  productos        → actualizados       : ${stats.productos.updated}`)
  console.log(`                   → omitidos           : ${stats.productos.skipped}`)
  console.log(`                   → con errores        : ${stats.productos.errors}`)
  console.log('='.repeat(62))
  console.log('  Migracion completada.\n')

  process.exit(0)
}

main().catch(err => {
  console.error('\nERROR FATAL:', err)
  process.exit(1)
})
