// scripts/backfill_movements_uom.js
// Backfills unit_of_measure_id and purchase_unit_qty on legacy movement documents.
//
// Run MANUALLY (once all products have their UoM configured):
//   GOOGLE_APPLICATION_CREDENTIALS=inventario-app/serviceAccountKey.json node scripts/backfill_movements_uom.js
//
// Prerequisites:
//   npm install firebase-admin  (in the muqui root or ensure it's available)

const admin = require('firebase-admin')
const path = require('path')

const serviceAccountPath = path.resolve(__dirname, '../inventario-app/serviceAccountKey.json')
const serviceAccount = require(serviceAccountPath)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()
const BATCH_SIZE = 499

async function backfillMovementsUoM() {
  console.log('Starting UoM backfill for movements...')

  // Fetch all products
  const prodSnap = await db.collection('productos').get()
  const productMap = new Map()
  prodSnap.forEach(doc => productMap.set(doc.id, doc.data()))
  console.log(`Loaded ${productMap.size} products.`)

  // Fetch movements where unit_of_measure_id is not set
  // Firestore: field missing OR null both match == null
  const movSnap = await db.collection('movimientos').get()

  let batch = db.batch()
  let batchCount = 0
  let totalUpdated = 0
  let totalSkipped = 0

  for (const doc of movSnap.docs) {
    const mov = doc.data()

    // Skip if already has unit_of_measure_id
    if (mov.unit_of_measure_id) {
      totalSkipped++
      continue
    }

    const prod = productMap.get(mov.producto_id)
    if (!prod?.purchase_unit_id) {
      totalSkipped++
      continue
    }

    batch.update(doc.ref, {
      unit_of_measure_id: prod.purchase_unit_id,
      purchase_unit_qty: prod.purchase_unit_qty || null
    })
    batchCount++
    totalUpdated++

    if (batchCount >= BATCH_SIZE) {
      await batch.commit()
      console.log(`Committed batch of ${batchCount}. Total updated so far: ${totalUpdated}`)
      batch = db.batch()
      batchCount = 0
    }
  }

  if (batchCount > 0) {
    await batch.commit()
    console.log(`Committed final batch of ${batchCount}.`)
  }

  console.log(`\nBackfill complete.`)
  console.log(`  Updated: ${totalUpdated}`)
  console.log(`  Skipped: ${totalSkipped}`)
  process.exit(0)
}

backfillMovementsUoM().catch(err => {
  console.error('Backfill failed:', err)
  process.exit(1)
})
