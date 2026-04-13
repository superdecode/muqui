# Unit Equivalences Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a complete units-of-measure with equivalences system affecting product configuration, BOM, and inventory exits.

**Architecture:** Firestore-based. Two collections: enhanced `unidades_medida` (add `tipo`, keep existing fields) and new `unit_equivalences` (from_unit_id, to_unit_id, factor). Products gain `purchase_unit_id` and `purchase_unit_qty` structured fields. BOM lines gain `consumption_unit_id`. Salidas gain exit-unit selection with auto-conversion. A shared `convertUnits()` utility handles all conversions bidirectionally.

**Tech Stack:** React 18, Firebase/Firestore, TanStack React Query, TailwindCSS, Zustand, xlsx

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/utils/unitConversion.js` | `convertUnits()`, `getCompatibleUnits()`, `buildEquivalenceMap()` |
| Create | `src/scripts/seedEquivalences.js` | One-time seed: default equivalences + migrate existing unit docs to add `tipo` |
| Modify | `src/services/firestoreService.js` | Add CRUD for `unit_equivalences` collection |
| Modify | `src/services/dataService.js` | Expose equivalence methods |
| Modify | `src/pages/Configuraciones.jsx` | New "Unidades y Equivalencias" tab replacing current Units card in Productos tab |
| Modify | `src/components/productos/ProductoForm.jsx` | Add `purchase_unit_id`, `purchase_unit_qty` fields; dynamic label |
| Modify | `src/pages/Productos.jsx` | Dynamic spec label column (`Tapioca 3Kg`) |
| Modify | `src/pages/SalidasOdoo.jsx` | BOM line: consumption unit dropdown filtered by equivalences |
| Modify | `src/components/transferencias/TransferenciaForm.jsx` | Exit unit selector + real-time conversion display |

---

## Task 1: Unit Conversion Utility

**Files:**
- Create: `src/utils/unitConversion.js`

- [ ] **Step 1: Create the conversion utility**

```javascript
// src/utils/unitConversion.js

/**
 * Build a lookup map from an array of equivalence docs.
 * Returns Map<string, Map<string, number>> where key = fromUnitId, inner key = toUnitId, value = factor.
 * Automatically includes bidirectional entries.
 */
export function buildEquivalenceMap(equivalences = []) {
  const map = new Map()

  const ensure = (id) => {
    if (!map.has(id)) map.set(id, new Map())
  }

  for (const eq of equivalences) {
    const { from_unit_id, to_unit_id, factor } = eq
    if (!from_unit_id || !to_unit_id || !factor) continue

    ensure(from_unit_id)
    ensure(to_unit_id)

    map.get(from_unit_id).set(to_unit_id, factor)
    map.get(to_unit_id).set(from_unit_id, 1 / factor)
  }

  // Add identity for every unit seen
  for (const [unitId, inner] of map) {
    inner.set(unitId, 1)
  }

  return map
}

/**
 * Convert a value from one unit to another using the equivalence map.
 * Supports direct conversion and single-hop transitive conversion (A->B->C).
 * Returns null if no path exists.
 */
export function convertUnits(value, fromUnitId, toUnitId, equivalenceMap) {
  if (fromUnitId === toUnitId) return value

  // Direct conversion
  const fromMap = equivalenceMap.get(fromUnitId)
  if (fromMap?.has(toUnitId)) {
    return value * fromMap.get(toUnitId)
  }

  // Single-hop transitive: find an intermediate unit
  if (fromMap) {
    for (const [midId, factorToMid] of fromMap) {
      const midMap = equivalenceMap.get(midId)
      if (midMap?.has(toUnitId)) {
        return value * factorToMid * midMap.get(toUnitId)
      }
    }
  }

  return null
}

/**
 * Get all unit IDs that are reachable (have equivalence) from the given unit.
 * Always includes the unit itself.
 */
export function getCompatibleUnits(unitId, equivalenceMap) {
  const direct = equivalenceMap.get(unitId)
  if (!direct) return [unitId]
  return [unitId, ...Array.from(direct.keys()).filter(id => id !== unitId)]
}

/**
 * Calculate cost per consumption unit.
 * costPerPurchaseUnit / purchaseUnitQty / conversionFactor
 */
export function calcCostInConsumptionUnit(costPerPurchaseUnit, purchaseUnitQty, fromUnitId, toUnitId, equivalenceMap) {
  if (!purchaseUnitQty || purchaseUnitQty === 0) return 0
  const factor = convertUnits(1, fromUnitId, toUnitId, equivalenceMap)
  if (factor === null) return 0
  return (costPerPurchaseUnit / purchaseUnitQty) / factor
}
```

- [ ] **Step 2: Verify file was created correctly**

Run: `node -e "const u = require('./inventario-app/src/utils/unitConversion.js'); console.log(Object.keys(u))"`

If ESM, test with:
```bash
cd /Users/quiron/CascadeProjects/muqui/inventario-app && node -e "
import('./src/utils/unitConversion.js').then(m => console.log(Object.keys(m)))
" 2>/dev/null || echo "ESM check: will verify in browser"
```

- [ ] **Step 3: Commit**

```bash
git add inventario-app/src/utils/unitConversion.js
git commit -m "feat: add unit conversion utility with bidirectional equivalence support"
```

---

## Task 2: Firestore Service — Equivalences CRUD

**Files:**
- Modify: `src/services/firestoreService.js` (after the `deleteUnidadMedida` block, ~line 494)
- Modify: `src/services/dataService.js` (after the `deleteUnidadMedida` block, ~line 260)

- [ ] **Step 1: Add equivalences CRUD to firestoreService.js**

Add after the `deleteUnidadMedida` method (around line 494), before the `// ========== ROLES ==========` section:

```javascript
  // ========== EQUIVALENCIAS DE UNIDADES ==========

  getUnitEquivalences: async () => {
    try {
      const db = getDB()
      const snap = await getDocs(
        query(collection(db, 'unit_equivalences'), orderBy('created_at', 'desc'))
      )
      return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    } catch (error) {
      console.error('Error obteniendo equivalencias:', error)
      return []
    }
  },

  createUnitEquivalence: async (data) => {
    try {
      const db = getDB()
      const ref = collection(db, 'unit_equivalences')
      const nuevo = {
        from_unit_id: data.from_unit_id,
        to_unit_id: data.to_unit_id,
        factor: parseFloat(data.factor),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      }
      const docRef = await addDoc(ref, nuevo)
      return { success: true, data: { id: docRef.id, ...nuevo } }
    } catch (error) {
      console.error('Error creando equivalencia:', error)
      return { success: false, message: error.message }
    }
  },

  updateUnitEquivalence: async (id, data) => {
    try {
      const db = getDB()
      const ref = doc(db, 'unit_equivalences', id)
      await updateDoc(ref, {
        from_unit_id: data.from_unit_id,
        to_unit_id: data.to_unit_id,
        factor: parseFloat(data.factor),
        updated_at: serverTimestamp()
      })
      return { success: true }
    } catch (error) {
      console.error('Error actualizando equivalencia:', error)
      return { success: false, message: error.message }
    }
  },

  deleteUnitEquivalence: async (id) => {
    try {
      const db = getDB()
      await deleteDoc(doc(db, 'unit_equivalences', id))
      return { success: true }
    } catch (error) {
      console.error('Error eliminando equivalencia:', error)
      return { success: false, message: error.message }
    }
  },
```

- [ ] **Step 2: Add equivalences methods to dataService.js**

Add after the `deleteUnidadMedida` line (~line 260):

```javascript
  // Unit Equivalences
  getUnitEquivalences: async () => firestoreService.getUnitEquivalences(),
  createUnitEquivalence: async (data) => firestoreService.createUnitEquivalence(data),
  updateUnitEquivalence: async (id, data) => firestoreService.updateUnitEquivalence(id, data),
  deleteUnitEquivalence: async (id) => firestoreService.deleteUnitEquivalence(id),
```

- [ ] **Step 3: Verify no syntax errors**

Run: `cd /Users/quiron/CascadeProjects/muqui/inventario-app && npx vite build --mode development 2>&1 | head -20`

- [ ] **Step 4: Commit**

```bash
git add inventario-app/src/services/firestoreService.js inventario-app/src/services/dataService.js
git commit -m "feat: add unit equivalences CRUD to Firestore and data service"
```

---

## Task 3: Seed Script — Default Equivalences + Unit Type Migration

**Files:**
- Create: `src/scripts/seedEquivalences.js`

- [ ] **Step 1: Create the seed script**

```javascript
// src/scripts/seedEquivalences.js
//
// Run once to:
// 1. Add 'tipo' field to existing unidades_medida docs
// 2. Create default unit_equivalences
//
// Usage: Open browser console on the app, paste this, or run from a Node script with Firebase Admin.
// For simplicity, this exports functions to be called from the browser console.

import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp, query, where } from 'firebase/firestore'
import { getDB } from '../config/firebase.config'

const UNIT_TYPES = {
  'KG': 'mass', 'KILOGRAMO': 'mass', 'G': 'mass', 'GRAMO': 'mass', 'GRAMOS': 'mass',
  'MG': 'mass', 'MILIGRAMO': 'mass', 'LB': 'mass', 'LIBRA': 'mass', 'OZ': 'mass', 'ONZA': 'mass',
  'L': 'volume', 'LITRO': 'volume', 'LITROS': 'volume', 'ML': 'volume', 'MILILITRO': 'volume',
  'CC': 'volume', 'GAL': 'volume', 'GALON': 'volume',
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
  // We need unit IDs, so we look them up by abreviatura
  // Format: [fromAbrev, toAbrev, factor]
  ['KG', 'G', 1000],
  ['KG', 'MG', 1000000],
  ['L', 'ML', 1000],
  ['L', 'CC', 1000],
  ['KG', 'LB', 2.20462],
  ['KG', 'OZ', 35.274],
  ['M', 'CM', 100],
  ['M', 'MM', 1000],
]

export async function seedDefaultEquivalences() {
  const db = getDB()

  // Build abreviatura -> doc ID map
  const unitsSnap = await getDocs(collection(db, 'unidades_medida'))
  const unitsByAbrev = new Map()
  for (const d of unitsSnap.docs) {
    const data = d.data()
    if (data.estado !== 'INACTIVO') {
      const abrev = (data.abreviatura || data.nombre || '').toUpperCase().trim()
      unitsByAbrev.set(abrev, d.id)
    }
  }

  // Check existing equivalences
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
```

- [ ] **Step 2: Commit**

```bash
git add inventario-app/src/scripts/seedEquivalences.js
git commit -m "feat: add seed script for unit type migration and default equivalences"
```

---

## Task 4: Configuraciones — Unified "Unidades y Equivalencias" Tab

**Files:**
- Modify: `src/pages/Configuraciones.jsx`

This is the largest UI task. We replace the current "Productos" tab (which has Categorias + Unidades cards) with:
- "Productos" tab keeps Categorias only
- New "Unidades" tab with: Units CRUD (enhanced with `tipo`) + Equivalences CRUD table

- [ ] **Step 1: Add imports and queries for equivalences**

At the top of `Configuraciones.jsx`, add `ArrowLeftRight` and `Scale` to the lucide imports (line 7):

Replace the existing import line:
```javascript
import { Settings, Bell, Phone, Mail, MessageCircle, HelpCircle, Headphones, LogOut, Moon, Sun, Monitor, User, BookOpen, FileText, Video, Download, Package, Tag, Ruler, Plus, Edit2, Trash2, Save, X, Volume2, BellRing, Clock, Globe } from 'lucide-react'
```

With:
```javascript
import { Settings, Bell, Phone, Mail, MessageCircle, HelpCircle, Headphones, LogOut, Moon, Sun, Monitor, User, BookOpen, FileText, Video, Download, Package, Tag, Ruler, Plus, Edit2, Trash2, Save, X, Volume2, BellRing, Clock, Globe, ArrowLeftRight, Scale } from 'lucide-react'
```

- [ ] **Step 2: Add equivalence queries and mutations inside the component**

After the existing `uniDelete` mutation (line 220), add:

```javascript
  // Unit Equivalences
  const { data: equivalencias = [], isLoading: loadEq } = useQuery({ queryKey: ['config-equivalencias'], queryFn: () => dataService.getUnitEquivalences() })
  const eqCreate = useMutation({ mutationFn: d => dataService.createUnitEquivalence(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['config-equivalencias'] }); toast.success('Creada', 'Equivalencia creada') } })
  const eqUpdate = useMutation({ mutationFn: ({ id, data }) => dataService.updateUnitEquivalence(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['config-equivalencias'] }); toast.success('Actualizada', 'Equivalencia actualizada') } })
  const eqDelete = useMutation({ mutationFn: id => dataService.deleteUnitEquivalence(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['config-equivalencias'] }); toast.success('Eliminada', 'Equivalencia eliminada') } })
```

- [ ] **Step 3: Update TABS array to add "Unidades" tab**

Replace the TABS constant (line 226-230):

```javascript
  const TABS = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'productos', label: 'Productos', icon: Package },
    { id: 'unidades', label: 'Unidades y UM', icon: Scale },
    { id: 'soporte', label: 'Soporte', icon: Headphones }
  ]
```

- [ ] **Step 4: Remove Unidades card from "productos" tab**

In the `{activeTab === 'productos' && (...)}` section (lines 401-437), remove the second `<Card>` block that contains the Unidades de Medida CrudSection. Keep only the Categorias card. Change the grid to single column:

Replace lines 401-437 with:

```jsx
      {activeTab === 'productos' && (
        <div className="max-w-lg">
          <Card>
            <CrudSection
              title="Categorias" icon={Tag} iconColor="text-amber-600"
              items={categorias} isLoading={loadCat}
              canWrite={canWriteConfig}
              canDelete={canDeleteConfig}
              fields={[
                { key: 'nombre', label: 'Nombre', required: true, placeholder: 'Ej: Alimentos' },
                { key: 'descripcion', label: 'Descripcion', type: 'textarea', placeholder: 'Descripcion opcional' }
              ]}
              onCreate={d => catCreate.mutate(d)}
              onUpdate={d => catUpdate.mutate(d)}
              onDelete={id => catDelete.mutate(id)}
            />
          </Card>
        </div>
      )}
```

- [ ] **Step 5: Add the new "Unidades y Equivalencias" tab content**

After the `{activeTab === 'productos' && (...)}` block and before the `{activeTab === 'soporte' && (...)}` block, add:

```jsx
      {/* ========== TAB: UNIDADES Y EQUIVALENCIAS ========== */}
      {activeTab === 'unidades' && (
        <div className="space-y-6">
          {/* Unidades de Medida CRUD */}
          <Card>
            <CrudSection
              title="Unidades de Medida" icon={Ruler} iconColor="text-green-600"
              items={unidades} isLoading={loadUni}
              canWrite={canWriteConfig}
              canDelete={canDeleteConfig}
              fields={[
                { key: 'nombre', label: 'Nombre', required: true, placeholder: 'Ej: Kilogramo' },
                { key: 'abreviatura', label: 'Abreviatura', required: true, placeholder: 'Ej: kg' },
                { key: 'tipo', label: 'Tipo', type: 'select', default: 'unit', options: [
                  { value: 'mass', label: 'Masa (kg, g, lb...)' },
                  { value: 'volume', label: 'Volumen (L, ml, cc...)' },
                  { value: 'length', label: 'Longitud (m, cm, mm...)' },
                  { value: 'unit', label: 'Unidad (pza, bolsa, caja...)' }
                ]},
                { key: 'descripcion', label: 'Descripcion', type: 'textarea', placeholder: 'Descripcion opcional' }
              ]}
              onCreate={d => uniCreate.mutate(d)}
              onUpdate={d => uniUpdate.mutate(d)}
              onDelete={id => uniDelete.mutate(id)}
            />
          </Card>

          {/* Equivalencias */}
          <Card>
            <EquivalenciasSection
              equivalencias={equivalencias}
              unidades={unidades}
              isLoading={loadEq}
              canWrite={canWriteConfig}
              onCreate={d => eqCreate.mutate(d)}
              onUpdate={(id, data) => eqUpdate.mutate({ id, data })}
              onDelete={id => eqDelete.mutate(id)}
            />
          </Card>
        </div>
      )}
```

- [ ] **Step 6: Create the EquivalenciasSection component**

Add this new component before the `export default function Configuraciones()` line (before line 175):

```jsx
// ========== EQUIVALENCIAS SECTION ==========
function EquivalenciasSection({ equivalencias, unidades, isLoading, canWrite, onCreate, onUpdate, onDelete }) {
  const toast = useToastStore()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ from_unit_id: '', to_unit_id: '', factor: '' })

  const activeUnits = (unidades || []).filter(u => u.estado !== 'INACTIVO')
  const getUnitLabel = (id) => {
    const u = activeUnits.find(u => u.id === id)
    return u ? `${u.nombre} (${u.abreviatura || ''})` : id
  }

  const openCreate = () => {
    setEditing(null)
    setForm({ from_unit_id: '', to_unit_id: '', factor: '' })
    setShowModal(true)
  }

  const openEdit = (eq) => {
    setEditing(eq)
    setForm({ from_unit_id: eq.from_unit_id, to_unit_id: eq.to_unit_id, factor: String(eq.factor) })
    setShowModal(true)
  }

  const handleSave = () => {
    if (!form.from_unit_id || !form.to_unit_id) { toast.error('Error', 'Selecciona ambas unidades'); return }
    if (form.from_unit_id === form.to_unit_id) { toast.error('Error', 'Las unidades deben ser diferentes'); return }
    const factor = parseFloat(form.factor)
    if (!factor || factor <= 0) { toast.error('Error', 'El factor debe ser mayor a 0'); return }

    const data = { from_unit_id: form.from_unit_id, to_unit_id: form.to_unit_id, factor }
    if (editing) {
      onUpdate(editing.id, data)
    } else {
      onCreate(data)
    }
    setShowModal(false)
  }

  const handleDelete = (eq) => {
    const label = `${getUnitLabel(eq.from_unit_id)} -> ${getUnitLabel(eq.to_unit_id)}`
    if (window.confirm(`Eliminar equivalencia "${label}"?`)) onDelete(eq.id)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowLeftRight size={18} className="text-blue-600" />
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Equivalencias de Unidades</h3>
          <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">{(equivalencias || []).length}</span>
        </div>
        {canWrite && (
          <button onClick={openCreate} className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors">
            <Plus size={16} />Agregar
          </button>
        )}
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Las equivalencias son bidireccionales. Si defines kg -&gt; g = 1000, el sistema infiere g -&gt; kg = 0.001
      </p>

      {isLoading ? (
        <div className="py-6 text-center"><LoadingSpinner /></div>
      ) : (equivalencias || []).length === 0 ? (
        <div className="py-8 text-center bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-600">
          <ArrowLeftRight size={32} className="mx-auto text-slate-300 dark:text-slate-500 mb-2" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No hay equivalencias configuradas</p>
          <button onClick={openCreate} className="text-sm text-primary-600 font-medium mt-2 hover:underline">Crear primera</button>
        </div>
      ) : (
        <div className="border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Unidad Compra</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Factor</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Unidad Consumo</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Inverso</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {(equivalencias || []).map(eq => (
                <tr key={eq.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100">{getUnitLabel(eq.from_unit_id)}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold">{eq.factor}</span>
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100">{getUnitLabel(eq.to_unit_id)}</td>
                  <td className="px-4 py-2.5 text-center text-xs text-slate-500">
                    {eq.factor ? (1 / eq.factor).toFixed(6).replace(/0+$/, '').replace(/\.$/, '') : '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      {canWrite && (
                        <>
                          <button onClick={() => openEdit(eq)} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg text-blue-600"><Edit2 size={14} /></button>
                          <button onClick={() => handleDelete(eq)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-600"><Trash2 size={14} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <MiniModal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Editar Equivalencia' : 'Nueva Equivalencia'}>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Unidad de Compra (origen) *</label>
            <select value={form.from_unit_id} onChange={e => setForm({ ...form, from_unit_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 text-sm">
              <option value="">Seleccionar...</option>
              {activeUnits.map(u => <option key={u.id} value={u.id}>{u.nombre} ({u.abreviatura})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Unidad de Consumo (destino) *</label>
            <select value={form.to_unit_id} onChange={e => setForm({ ...form, to_unit_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 text-sm">
              <option value="">Seleccionar...</option>
              {activeUnits.filter(u => u.id !== form.from_unit_id).map(u => <option key={u.id} value={u.id}>{u.nombre} ({u.abreviatura})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Factor de conversion *</label>
            <input type="number" step="any" min="0.000001" value={form.factor} onChange={e => setForm({ ...form, factor: e.target.value })}
              placeholder="ej: 1000 (1 kg = 1000 g)"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 text-sm" />
            {form.from_unit_id && form.to_unit_id && form.factor && (
              <p className="text-xs text-blue-600 mt-1">
                1 {activeUnits.find(u => u.id === form.from_unit_id)?.abreviatura} = {form.factor} {activeUnits.find(u => u.id === form.to_unit_id)?.abreviatura}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
            <Button variant="outline" size="sm" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSave}><Save size={14} className="mr-1" />Guardar</Button>
          </div>
        </div>
      </MiniModal>
    </div>
  )
}
```

- [ ] **Step 7: Test in browser**

Run: `cd /Users/quiron/CascadeProjects/muqui/inventario-app && npm run dev`

Verify:
1. Navigate to Configuraciones
2. See new "Unidades y UM" tab
3. Open it - see Units CRUD with new `tipo` field + Equivalencias table
4. Create/edit/delete an equivalence
5. "Productos" tab now only shows Categorias

- [ ] **Step 8: Commit**

```bash
git add inventario-app/src/pages/Configuraciones.jsx
git commit -m "feat: add unified Units & Equivalences tab in Configuraciones"
```

---

## Task 5: ProductoForm — Purchase Unit & Qty Fields + Dynamic Label

**Files:**
- Modify: `src/components/productos/ProductoForm.jsx`
- Modify: `src/pages/Productos.jsx`

- [ ] **Step 1: Update ProductoForm initial state and fields**

In `ProductoForm.jsx`, update `initialFormData` (line 14-25) to add the new fields:

```javascript
  const initialFormData = {
    nombre: '',
    especificacion: '',
    unidad_medida: '',
    purchase_unit_id: '',
    purchase_unit_qty: '',
    costo_unidad: 0,
    stock_minimo: 10,
    frecuencia_inventario: '',
    categoria: '',
    estado: 'ACTIVO',
    empresas_permitidas: [],
    ubicaciones_permitidas: []
  }
```

- [ ] **Step 2: Update the useEffect that loads product data for editing**

In the `useEffect` (around line 85-100), add the new fields to `nuevoFormData`:

```javascript
      const nuevoFormData = {
        id: producto.id || '',
        nombre: producto.nombre || '',
        especificacion: producto.especificacion || '',
        unidad_medida: producto.unidad_medida || 'KG',
        purchase_unit_id: producto.purchase_unit_id || '',
        purchase_unit_qty: producto.purchase_unit_qty || '',
        costo_unidad: producto.costo_unidad || 0,
        stock_minimo: producto.stock_minimo || producto.stock_minimo_default || 10,
        frecuencia_inventario: (producto.frecuencia_inventario || '').toLowerCase(),
        categoria: producto.categoria || 'OTROS',
        estado: producto.estado || 'ACTIVO',
        empresas_permitidas: producto.empresas_permitidas || [],
        ubicaciones_permitidas: producto.ubicaciones_permitidas || []
      }
```

- [ ] **Step 3: Replace the "Especificacion" and "Unidad de Medida" fields in the form JSX**

Replace the existing Especificacion input (lines 312-322) and Unidad de Medida select (lines 324-341) with:

```jsx
            {/* Unidad de Compra (replaces old Unidad de Medida) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Unidad de Compra <span className="text-danger-500">*</span>
              </label>
              <select
                name="purchase_unit_id"
                value={formData.purchase_unit_id}
                onChange={e => {
                  const unitId = e.target.value
                  const unit = (unidadesDB || []).find(u => u.id === unitId)
                  setFormData(prev => ({
                    ...prev,
                    purchase_unit_id: unitId,
                    unidad_medida: unit ? unit.nombre : prev.unidad_medida
                  }))
                }}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                required
              >
                <option value="">Seleccionar unidad...</option>
                {(unidadesDB || []).filter(u => u.estado !== 'INACTIVO' && u.estado !== 'ELIMINADO').map(u => (
                  <option key={u.id} value={u.id}>{u.nombre} ({u.abreviatura || ''})</option>
                ))}
              </select>
            </div>

            {/* Cantidad por Unidad de Compra */}
            <div>
              <Input
                label="Cantidad por unidad de compra"
                name="purchase_unit_qty"
                type="number"
                value={formData.purchase_unit_qty}
                onChange={e => {
                  const qty = e.target.value
                  const unit = (unidadesDB || []).find(u => u.id === formData.purchase_unit_id)
                  const symbol = unit?.abreviatura || formData.unidad_medida || ''
                  setFormData(prev => ({
                    ...prev,
                    purchase_unit_qty: qty,
                    especificacion: qty ? `${qty} ${symbol}`.trim() : ''
                  }))
                }}
                min="0"
                step="any"
                placeholder="ej: 3 (si la bolsa trae 3 kg)"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {formData.purchase_unit_qty && formData.purchase_unit_id
                  ? `Etiqueta: ${formData.nombre || 'Producto'} ${formData.purchase_unit_qty}${((unidadesDB || []).find(u => u.id === formData.purchase_unit_id)?.abreviatura || '').toLowerCase()}`
                  : 'Tamanio, peso o presentacion del producto'}
              </p>
            </div>

            {/* Hidden: keep unidad_medida for backward compat, and especificacion auto-computed */}
            <input type="hidden" name="unidad_medida" value={formData.unidad_medida} />
            <input type="hidden" name="especificacion" value={formData.especificacion} />
```

- [ ] **Step 4: Update Productos.jsx table to show dynamic spec label**

In `Productos.jsx`, find the table cell that displays `item.especificacion` (around line 646):

```jsx
<span className="text-sm text-slate-600 dark:text-slate-400">{item.especificacion || '-'}</span>
```

Replace with a dynamic label that concatenates:

```jsx
<span className="text-sm text-slate-600 dark:text-slate-400">
  {item.purchase_unit_qty
    ? `${item.purchase_unit_qty}${(item.unidad_medida || '').toLowerCase()}`
    : (item.especificacion || '-')}
</span>
```

- [ ] **Step 5: Test in browser**

Verify:
1. Open Productos -> click a product to edit
2. See "Unidad de Compra" dropdown (by unit ID) and "Cantidad por unidad de compra" numeric field
3. Changing these auto-updates the `especificacion` field
4. The preview label shows e.g. "Tapioca 3kg"
5. In the products table, the Especificacion column shows the dynamic label
6. Save a product — verify both `purchase_unit_id` and `purchase_unit_qty` are saved to Firestore

- [ ] **Step 6: Commit**

```bash
git add inventario-app/src/components/productos/ProductoForm.jsx inventario-app/src/pages/Productos.jsx
git commit -m "feat: add purchase unit ID and qty fields to product form with dynamic spec label"
```

---

## Task 6: BOM (SalidasOdoo) — Consumption Unit Dropdown with Equivalence Filtering

**Files:**
- Modify: `src/pages/SalidasOdoo.jsx`

- [ ] **Step 1: Add imports and queries at the top of ModalReceta**

In `SalidasOdoo.jsx`, inside the `ModalReceta` function (starts at line 458), add imports and data hooks. After the existing `useQuery` for productos (line 468), add:

```javascript
  const { data: unidadesDB = [] } = useQuery({ queryKey: ['config-unidades'], queryFn: () => dataService.getUnidadesMedida() })
  const { data: equivalencias = [] } = useQuery({ queryKey: ['config-equivalencias'], queryFn: () => dataService.getUnitEquivalences() })
```

At the top of `SalidasOdoo.jsx` (after the existing imports, around line 14), add:

```javascript
import { buildEquivalenceMap, getCompatibleUnits, calcCostInConsumptionUnit } from '../utils/unitConversion'
```

Inside `ModalReceta`, after the equivalencias query, compute the map:

```javascript
  const eqMap = useMemo(() => buildEquivalenceMap(equivalencias), [equivalencias])
```

(Add `useMemo` to the React import at line 1 if not already present — it's already there: `useState, useRef, useMemo`)

- [ ] **Step 2: Update the addIngrediente function to include consumption_unit_id**

Replace the `addIngrediente` function:

```javascript
  const addIngrediente = () => {
    setForm(f => ({ ...f, ingredientes: [...f.ingredientes, { nombre: '', sku: '', producto_id: null, especificacion: '', cantidad: 0, unidad_medida: '', costo_unitario: 0, consumption_unit_id: '', purchase_unit_id: '' }] }))
    setTimeout(() => { setActiveSearchRow(form.ingredientes.length); setProdSearchTerm('') }, 50)
  }
```

- [ ] **Step 3: Update selectProductForIngrediente to set unit IDs**

Replace the `selectProductForIngrediente` function:

```javascript
  const selectProductForIngrediente = (i, prod) => {
    setForm(f => ({ ...f, ingredientes: f.ingredientes.map((ing, idx) => idx === i ? {
      ...ing, nombre: prod.nombre, sku: prod.codigo_legible || prod.id, producto_id: prod.id,
      especificacion: prod.especificacion || '', unidad_medida: prod.unidad_medida || '',
      costo_unitario: prod.costo_unidad || 0,
      purchase_unit_id: prod.purchase_unit_id || '',
      consumption_unit_id: prod.purchase_unit_id || ''
    } : ing) }))
    setActiveSearchRow(null); setProdSearchTerm('')
  }
```

- [ ] **Step 4: Add a function to update consumption unit on a BOM line**

After the `updateCantidad` function, add:

```javascript
  const updateConsumptionUnit = (i, unitId) => {
    setForm(f => ({ ...f, ingredientes: f.ingredientes.map((ing, idx) => {
      if (idx !== i) return ing
      const unit = unidadesDB.find(u => u.id === unitId)
      return { ...ing, consumption_unit_id: unitId, unidad_medida: unit?.nombre || ing.unidad_medida }
    }) }))
  }
```

- [ ] **Step 5: Replace the "Unidad" column in the ingredientes table with a dropdown**

Find the current unit cell (line 646):
```jsx
<td className="px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400">{ing.unidad_medida || '—'}</td>
```

Replace with:

```jsx
<td className="px-3 py-2.5">
  {ing.purchase_unit_id ? (
    <select
      value={ing.consumption_unit_id || ing.purchase_unit_id || ''}
      onChange={e => updateConsumptionUnit(i, e.target.value)}
      disabled={readOnly}
      className="w-full px-1.5 py-1 text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-primary-500 disabled:opacity-60"
    >
      {getCompatibleUnits(ing.purchase_unit_id, eqMap).map(uid => {
        const u = unidadesDB.find(u => u.id === uid)
        return u ? <option key={uid} value={uid}>{u.abreviatura || u.nombre}</option> : null
      })}
    </select>
  ) : (
    <span className="text-xs text-slate-500">{ing.unidad_medida || '—'}</span>
  )}
</td>
```

- [ ] **Step 6: Add cost-per-consumption-unit display in the Costo/u column**

Find the current cost cell (line 647):
```jsx
<td className="px-3 py-2.5 text-sm text-right font-medium text-slate-700 dark:text-slate-300">{fmtCosto(ing.costo_unitario)}</td>
```

Replace with:

```jsx
<td className="px-3 py-2.5 text-right">
  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{fmtCosto(ing.costo_unitario)}</span>
  {ing.purchase_unit_id && ing.consumption_unit_id && ing.consumption_unit_id !== ing.purchase_unit_id && (
    <p className="text-[10px] text-blue-500 mt-0.5">
      {(() => {
        const prod = productosActivos.find(p => p.id === ing.producto_id)
        const qty = prod?.purchase_unit_qty || 1
        const cost = calcCostInConsumptionUnit(ing.costo_unitario, qty, ing.purchase_unit_id, ing.consumption_unit_id, eqMap)
        const u = unidadesDB.find(u => u.id === ing.consumption_unit_id)
        return cost > 0 ? `${fmtCosto(cost)}/${u?.abreviatura || ''}` : ''
      })()}
    </p>
  )}
</td>
```

- [ ] **Step 7: Test in browser**

Verify:
1. Open SalidasOdoo -> Recetas tab -> Edit a recipe
2. Add an ingredient by searching
3. The "Unidad" column now shows a dropdown
4. The dropdown only shows units with equivalences to the product's purchase unit
5. Changing the unit shows cost-per-consumption-unit hint
6. Save and verify data persists

- [ ] **Step 8: Commit**

```bash
git add inventario-app/src/pages/SalidasOdoo.jsx
git commit -m "feat: add consumption unit dropdown with equivalence filtering in BOM"
```

---

## Task 7: Salidas (TransferenciaForm) — Exit Unit Selector + Conversion

**Files:**
- Modify: `src/components/transferencias/TransferenciaForm.jsx`

- [ ] **Step 1: Add imports and queries**

At the top of `TransferenciaForm.jsx`, add the import (after existing imports around line 11):

```javascript
import { buildEquivalenceMap, getCompatibleUnits, convertUnits } from '../../utils/unitConversion'
```

Inside the component function, add queries (after the existing useQuery calls):

```javascript
  const { data: unidadesDB = [] } = useQuery({ queryKey: ['config-unidades'], queryFn: () => dataService.getUnidadesMedida() })
  const { data: equivalencias = [] } = useQuery({ queryKey: ['config-equivalencias'], queryFn: () => dataService.getUnitEquivalences() })
  const eqMap = useMemo(() => buildEquivalenceMap(equivalencias), [equivalencias])
```

Add `useMemo` to the React import at line 1 if not already there.

- [ ] **Step 2: Update handleAddProducto to include exit_unit_id**

Find the `handleAddProducto` function. When a product is added to `selectedProductos`, include the unit:

In the existing product-add logic, wherever the product object is spread into `selectedProductos`, add:

```javascript
exit_unit_id: product.purchase_unit_id || '',
```

This depends on the exact shape. Look for the spread where `cantidad` is set (likely `{ ...product, cantidad: 1 }`) and add `exit_unit_id`.

- [ ] **Step 3: Add exit unit dropdown in the products table**

After the "Cantidad" column header (line 680), add a new column header:

```jsx
<th className="px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider">Unidad</th>
```

In each product row, after the cantidad `<td>` and before the remove button `<td>`, add:

```jsx
<td className="px-4 py-3">
  {producto.purchase_unit_id ? (
    <div>
      <select
        value={producto.exit_unit_id || producto.purchase_unit_id || ''}
        onChange={e => {
          const newUnitId = e.target.value
          setSelectedProductos(prev => prev.map(p =>
            p.id === producto.id ? { ...p, exit_unit_id: newUnitId } : p
          ))
        }}
        className="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-primary-500"
      >
        {getCompatibleUnits(producto.purchase_unit_id, eqMap).map(uid => {
          const u = unidadesDB.find(u => u.id === uid)
          return u ? <option key={uid} value={uid}>{u.abreviatura || u.nombre}</option> : null
        })}
      </select>
      {producto.exit_unit_id && producto.exit_unit_id !== producto.purchase_unit_id && producto.cantidad > 0 && (
        <p className="text-[10px] text-blue-500 mt-1 text-center">
          {(() => {
            const converted = convertUnits(producto.cantidad, producto.exit_unit_id, producto.purchase_unit_id, eqMap)
            const baseUnit = unidadesDB.find(u => u.id === producto.purchase_unit_id)
            return converted !== null ? `= ${converted.toFixed(4)} ${baseUnit?.abreviatura || ''}` : 'Sin equivalencia'
          })()}
        </p>
      )}
    </div>
  ) : (
    <span className="text-sm text-slate-500">{producto.unidad_medida || '-'}</span>
  )}
</td>
```

- [ ] **Step 4: Update submit logic to convert quantities to base unit**

In the form submit handler, before sending to the backend, convert each product's quantity to the purchase unit:

Find where `selectedProductos` is mapped for submission. Before the API call, convert:

```javascript
const productosConvertidos = selectedProductos.map(p => {
  if (p.exit_unit_id && p.exit_unit_id !== p.purchase_unit_id) {
    const convertedQty = convertUnits(p.cantidad, p.exit_unit_id, p.purchase_unit_id, eqMap)
    return {
      ...p,
      cantidad_original: p.cantidad,
      unidad_original_id: p.exit_unit_id,
      cantidad: convertedQty !== null ? parseFloat(convertedQty.toFixed(6)) : p.cantidad
    }
  }
  return p
})
```

Use `productosConvertidos` instead of `selectedProductos` in the submission payload.

- [ ] **Step 5: Test in browser**

Verify:
1. Go to Salidas -> New exit
2. Add a product
3. See new "Unidad" column with dropdown
4. Dropdown only shows compatible units
5. Changing unit shows real-time conversion text (e.g. "500 g = 0.5 kg")
6. Submit — verify inventory is deducted in the correct base unit amount

- [ ] **Step 6: Commit**

```bash
git add inventario-app/src/components/transferencias/TransferenciaForm.jsx
git commit -m "feat: add exit unit selector with auto-conversion in Salidas"
```

---

## Task 8: Run Seed Script & Integration Test

**Files:**
- Use: `src/scripts/seedEquivalences.js` (from browser console)

- [ ] **Step 1: Start dev server and run seed**

```bash
cd /Users/quiron/CascadeProjects/muqui/inventario-app && npm run dev
```

Open browser, navigate to the app. Open DevTools console and run:

```javascript
import('/src/scripts/seedEquivalences.js').then(async m => {
  await m.migrateUnitTypes()
  await m.seedDefaultEquivalences()
})
```

- [ ] **Step 2: Verify in Configuraciones**

1. Go to Configuraciones -> Unidades y UM tab
2. Verify units now have `tipo` field set
3. Verify default equivalences appear (kg->g, L->ml, etc.)

- [ ] **Step 3: End-to-end integration test**

Walk through the full flow:
1. **Product**: Edit a product, set purchase unit to "KG" (from dropdown), set qty to 3, see label "Producto 3kg"
2. **BOM**: Edit a recipe, add that product as ingredient, see unit dropdown showing kg, g, mg, lb, oz (all units equivalent to KG)
3. **BOM**: Change consumption unit to "G", see cost hint
4. **Salida**: Create a salida, add that product, change exit unit to "G", enter "500", see "= 0.5000 kg" conversion text

- [ ] **Step 4: Commit any final fixes**

```bash
git add -A
git commit -m "feat: seed default equivalences and finalize units module integration"
```

---

## Notes

- **Backward compatibility**: The `unidad_medida` (string) and `especificacion` (string) fields are preserved on products for backward compat. New code writes both the old string fields and the new ID-based fields. Old products without `purchase_unit_id` still display correctly using the string fallback.

- **No Firestore indexes needed**: The `unit_equivalences` collection uses a simple `orderBy('created_at')` which Firestore handles with automatic single-field indexing.

- **Bidirectional equivalences**: Only stored once in Firestore (e.g., kg->g=1000). The `buildEquivalenceMap()` utility automatically computes the reverse (g->kg=0.001) in memory. No duplicate documents needed.

- **Transitive conversion**: The `convertUnits()` function supports single-hop transitive conversion (e.g., g->lb via g->kg->lb). This covers most real-world scenarios without needing full graph traversal.
