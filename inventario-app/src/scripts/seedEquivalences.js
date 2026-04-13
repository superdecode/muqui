// src/scripts/seedEquivalences.js
//
// Run once to:
// 1. Add 'tipo' field to existing unidades_medida docs
// 2. Create default unit_equivalences
//
// Usage: Open browser console on the app, run:
//   import('/src/scripts/seedEquivalences.js').then(async m => { await m.migrateUnitTypes(); await m.seedDefaultEquivalences() })

import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore'
import { getDB } from '../config/firebase.config'

const UNIT_TYPES = {
  'KG': 'mass', 'KILOGRAMO': 'mass', 'G': 'mass', 'GRAMO': 'mass', 'GRAMOS': 'mass',
  'MG': 'mass', 'MILIGRAMO': 'mass',
  'L': 'volume', 'LITRO': 'volume', 'LITROS': 'volume', 'ML': 'volume', 'MILILITRO': 'volume',
  'CC': 'volume',
  'M': 'length', 'METRO': 'length', 'CM': 'length', 'CENTIMETRO': 'length',
  'MM': 'length', 'MILIMETRO': 'length',
  'UNIDAD': 'unit', 'UNIDADES': 'unit', 'UND': 'unit', 'PZA': 'unit', 'PIEZA': 'unit',
  'BOLSA': 'unit', 'CAJA': 'unit', 'PAQUETE': 'unit', 'SOBRE': 'unit', 'BOTELLA': 'unit',
  'LATA': 'unit', 'BALDE': 'unit', 'GARRAFA': 'unit'
}

function inferType(nombre, abreviatura) {
  const key1 = (abreviatura || '').toUpperCase().trim()
  const key2 = (nombre || '').toUpperCase().trim()
  return UNIT_TYPES[key1] || UNIT_TYPES[key2] || 'unit'
}

export async function migrateUnitTypes() {
  const db = getDB()
  const snap = await getDocs(collection(db, 'unidades_medida'))
  let updated = 0

  for (const d of snap.docs) {
    const data = d.data()
    if (!data.tipo) {
      const tipo = inferType(data.nombre, data.abreviatura)
      await updateDoc(doc(db, 'unidades_medida', d.id), { tipo })
      updated++
      console.log(`Updated ${data.nombre} -> tipo: ${tipo}`)
    }
  }

  console.log(`Migration complete: ${updated} units updated`)
  return updated
}

const DEFAULT_EQUIVALENCES = [
  ['KG', 'G', 1000],
  ['G', 'MG', 1000],
  ['L', 'ML', 1000],
  ['ML', 'CC', 1],
  ['M', 'CM', 100],
  ['CM', 'MM', 10],
]

export async function seedDefaultEquivalences() {
  const db = getDB()

  const unitsSnap = await getDocs(collection(db, 'unidades_medida'))
  const unitsByAbrev = new Map()
  for (const d of unitsSnap.docs) {
    const data = d.data()
    if (data.estado !== 'INACTIVO') {
      const abrev = (data.abreviatura || data.nombre || '').toUpperCase().trim()
      unitsByAbrev.set(abrev, d.id)
    }
  }

  const eqSnap = await getDocs(collection(db, 'unit_equivalences'))
  const existing = new Set(
    eqSnap.docs.map(d => {
      const data = d.data()
      return `${data.from_unit_id}|${data.to_unit_id}`
    })
  )

  let created = 0
  const missing = []

  for (const [fromAbrev, toAbrev, factor] of DEFAULT_EQUIVALENCES) {
    const fromId = unitsByAbrev.get(fromAbrev)
    const toId = unitsByAbrev.get(toAbrev)

    if (!fromId) { missing.push(fromAbrev); continue }
    if (!toId) { missing.push(toAbrev); continue }

    const key = `${fromId}|${toId}`
    const reverseKey = `${toId}|${fromId}`
    if (existing.has(key) || existing.has(reverseKey)) continue

    await addDoc(collection(db, 'unit_equivalences'), {
      from_unit_id: fromId,
      to_unit_id: toId,
      factor,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    })
    created++
    console.log(`Created: ${fromAbrev} -> ${toAbrev} = ${factor}`)
  }

  if (missing.length > 0) {
    console.warn('Missing units (create them first):', [...new Set(missing)])
  }

  console.log(`Seed complete: ${created} equivalences created`)
  return { created, missing: [...new Set(missing)] }
}
