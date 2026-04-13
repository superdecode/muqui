# UoM Badge, Salidas Odoo & BOM Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a reusable `<UoMBadge />` component, replace `especificacion` references with it across all modules, enrich legacy movements with UoM data via JOIN, improve BOM import UX, add a sync button to TabSalidas, and add an `exit_type` field for Odoo-origin sales.

**Architecture:** Pure frontend (React + Firestore) app with no separate backend server — all "backend" logic lives in Firebase Cloud Functions (`functions/src/`) and Firestore queries inside `firestoreService.js`. The new component lives in `src/components/common/`; field additions are Firestore document fields (schema-less). The backfill script is a standalone Firestore Admin script.

**Tech Stack:** React 18, TanStack Query v5, Tailwind CSS, Lucide React icons, Firebase/Firestore, XLSX (SheetJS)

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| **Create** | `src/components/common/UoMBadge.jsx` | Reusable badge component |
| **Modify** | `src/pages/Productos.jsx` | Replace inline badge with `<UoMBadge>` |
| **Modify** | `src/pages/Stock.jsx` | Replace `especificacion` column with `<UoMBadge>` |
| **Modify** | `src/pages/Movimientos.jsx` | Show `<UoMBadge>` in product detail sections |
| **Modify** | `src/components/solicitudes/SolicitudDetail.jsx` | Replace `especificacion` with `<UoMBadge>` |
| **Modify** | `src/components/transferencias/TransferenciaDetail.jsx` | Replace `especificacion` with `<UoMBadge>` |
| **Modify** | `src/pages/SalidasOdoo.jsx` — `TabRecetas` BOM table | Replace `especificacion` column with `<UoMBadge>` |
| **Modify** | `src/pages/SalidasOdoo.jsx` — `TabSalidas` | Add sync button + `exit_type` badge |
| **Modify** | `src/services/firestoreService.js` | Add `syncSalidasOdoo`, `enrichMovimientoUoM`, `updateSalidaExitType` helpers |
| **Modify** | `src/services/dataService.js` | Expose new service methods |
| **Create** | `scripts/backfill_movements_uom.js` | Firestore Admin script — NOT auto-run |

---

## Task 1: Create `<UoMBadge />` component

**Files:**
- Create: `src/components/common/UoMBadge.jsx`

- [ ] **Step 1: Write the component**

```jsx
// src/components/common/UoMBadge.jsx
/**
 * UoMBadge — displays the purchase unit of measure for a product.
 * Props:
 *   qty        {number|string}  — purchase_unit_qty (e.g. 3)
 *   symbol     {string}         — unit abreviatura/symbol (e.g. "Kg")
 *   unitName   {string}         — fallback unit name (e.g. "Kilogramo")
 *   size       {"sm"|"md"}      — "sm" for tables, "md" for modals/cards
 */
export default function UoMBadge({ qty, symbol, unitName, size = 'sm' }) {
  const label = symbol || unitName
  if (!label && !qty) {
    return <span className="text-slate-400 dark:text-slate-500 font-medium">—</span>
  }

  const numQty = parseFloat(qty)
  const displayQty = !isNaN(numQty) && numQty > 0 ? numQty : null
  const text = displayQty && label
    ? `${displayQty} ${label}`
    : label || (displayQty ? String(displayQty) : '—')

  const sizeClasses = size === 'md'
    ? 'px-3 py-1 text-sm'
    : 'px-2.5 py-0.5 text-xs'

  return (
    <span className={`inline-flex items-center ${sizeClasses} rounded-full font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700 shadow-sm whitespace-nowrap`}>
      {text}
    </span>
  )
}
```

- [ ] **Step 2: Verify the file exists**

```bash
ls src/components/common/UoMBadge.jsx
```
Expected: file listed.

- [ ] **Step 3: Commit**

```bash
git add src/components/common/UoMBadge.jsx
git commit -m "feat: add reusable UoMBadge component"
```

---

## Task 2: Replace inline UoM badge in `Productos.jsx`

**Files:**
- Modify: `src/pages/Productos.jsx:688-692`

The table already calls `getUoMCompra(item, unidadesDB)` and wraps it in a hardcoded `<span>`. Replace with `<UoMBadge>`.

- [ ] **Step 1: Add import at top of `Productos.jsx`**

Find the existing import block (around line 12). Add:
```jsx
import UoMBadge from '../components/common/UoMBadge'
```

- [ ] **Step 2: Replace the hardcoded span in the table body (line ~689)**

Old code:
```jsx
<td className="px-6 py-4">
  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700 shadow-sm">
    {getUoMCompra(item, unidadesDB)}
  </span>
</td>
```

New code:
```jsx
<td className="px-6 py-4">
  <UoMBadge
    qty={item.purchase_unit_qty}
    symbol={unidadesDB.find(u => u.id === item.purchase_unit_id)?.abreviatura}
    unitName={unidadesDB.find(u => u.id === item.purchase_unit_id)?.nombre || item.unidad_medida}
    size="sm"
  />
</td>
```

- [ ] **Step 3: Verify the app compiles**

```bash
npm run build 2>&1 | tail -5
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Productos.jsx
git commit -m "refactor(productos): use UoMBadge in products table"
```

---

## Task 3: Replace `especificacion` column in `Stock.jsx`

**Files:**
- Modify: `src/pages/Stock.jsx`

Currently Stock.jsx has a column `accessor: 'especificacion'` (line ~283). We replace its render with `<UoMBadge>`.

- [ ] **Step 1: Load `unidadesDB` if not already loaded**

Search for `getUnidadesMedida` in Stock.jsx. If absent, add the query near the other `useQuery` calls:
```jsx
const { data: unidadesDB = [] } = useQuery({
  queryKey: ['config-unidades'],
  queryFn: () => dataService.getUnidadesMedida()
})
```

- [ ] **Step 2: Add UoMBadge import**

```jsx
import UoMBadge from '../components/common/UoMBadge'
```

- [ ] **Step 3: Replace the column definition**

Find the column definition with `accessor: 'especificacion'` (around line 283). Replace:
```jsx
{
  header: 'UoM de Compra',
  accessor: 'especificacion',
  sortKey: 'especificacion',
  render: (row) => (
    <UoMBadge
      qty={row.purchase_unit_qty}
      symbol={unidadesDB.find(u => u.id === row.purchase_unit_id)?.abreviatura}
      unitName={unidadesDB.find(u => u.id === row.purchase_unit_id)?.nombre || row.unidad_medida}
      size="sm"
    />
  )
}
```

Also update the export at line ~248:
```jsx
'UoM de Compra': row.purchase_unit_qty
  ? `${row.purchase_unit_qty} ${unidadesDB.find(u => u.id === row.purchase_unit_id)?.abreviatura || row.unidad_medida || ''}`
  : (row.unidad_medida || '—'),
```

- [ ] **Step 4: Verify build**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/Stock.jsx
git commit -m "refactor(stock): replace especificacion column with UoMBadge"
```

---

## Task 4: Replace `especificacion` in `SolicitudDetail.jsx`

**Files:**
- Modify: `src/components/solicitudes/SolicitudDetail.jsx:777,900`

- [ ] **Step 1: Add import**

```jsx
import UoMBadge from '../common/UoMBadge'
```

- [ ] **Step 2: Load unidadesDB**

Search for `useQuery` calls. If `config-unidades` is not already fetched, add:
```jsx
const { data: unidadesDB = [] } = useQuery({
  queryKey: ['config-unidades'],
  queryFn: () => dataService.getUnidadesMedida()
})
```

- [ ] **Step 3: Replace line ~777** (product detail section showing `especificacion`)

Old:
```jsx
{productoInfo.especificacion || <span className="text-slate-400 italic">—</span>}
```
New:
```jsx
<UoMBadge
  qty={productoInfo.purchase_unit_qty}
  symbol={unidadesDB.find(u => u.id === productoInfo.purchase_unit_id)?.abreviatura}
  unitName={unidadesDB.find(u => u.id === productoInfo.purchase_unit_id)?.nombre || productoInfo.unidad_medida}
  size="md"
/>
```

- [ ] **Step 4: Replace line ~900** (second occurrence in a different section)

Old:
```jsx
{info.especificacion || '—'}
```
New:
```jsx
<UoMBadge
  qty={info.purchase_unit_qty}
  symbol={unidadesDB.find(u => u.id === info.purchase_unit_id)?.abreviatura}
  unitName={unidadesDB.find(u => u.id === info.purchase_unit_id)?.nombre || info.unidad_medida}
  size="sm"
/>
```

- [ ] **Step 5: Verify build and commit**

```bash
npm run build 2>&1 | tail -5
git add src/components/solicitudes/SolicitudDetail.jsx
git commit -m "refactor(solicitudes): replace especificacion with UoMBadge"
```

---

## Task 5: Replace `especificacion` in `TransferenciaDetail.jsx`

**Files:**
- Modify: `src/components/transferencias/TransferenciaDetail.jsx`

- [ ] **Step 1: Find all occurrences of `especificacion` in the file**

```bash
grep -n "especificacion" src/components/transferencias/TransferenciaDetail.jsx
```

- [ ] **Step 2: Add import and unidadesDB query** (same pattern as Task 4 Step 1-2)

```jsx
import UoMBadge from '../common/UoMBadge'
```
Add `useQuery` for `config-unidades` if absent.

- [ ] **Step 3: Replace each `{...especificacion...}` display expression**

For each occurrence that shows the product's `especificacion` field:
```jsx
// Replace any pattern like:
{item.especificacion || '—'}
// With:
<UoMBadge
  qty={item.purchase_unit_qty}
  symbol={unidadesDB.find(u => u.id === item.purchase_unit_id)?.abreviatura}
  unitName={unidadesDB.find(u => u.id === item.purchase_unit_id)?.nombre || item.unidad_medida}
  size="sm"
/>
```

- [ ] **Step 4: Verify build and commit**

```bash
npm run build 2>&1 | tail -5
git add src/components/transferencias/TransferenciaDetail.jsx
git commit -m "refactor(transferencias): replace especificacion with UoMBadge"
```

---

## Task 6: Replace `especificacion` in BOM table (`SalidasOdoo.jsx` — `TabRecetas`)

**Files:**
- Modify: `src/pages/SalidasOdoo.jsx` — `TabRecetas` section (BOM ingredients table)

- [ ] **Step 1: Add UoMBadge import at the top of SalidasOdoo.jsx**

```jsx
import UoMBadge from '../components/common/UoMBadge'
```

- [ ] **Step 2: Load unidadesDB in `TabRecetas`**

Inside `TabRecetas()` function, add:
```jsx
const { data: unidadesDB = [] } = useQuery({
  queryKey: ['config-unidades'],
  queryFn: () => dataService.getUnidadesMedida()
})
```

- [ ] **Step 3: Find the ingredients table inside the expanded receta section**

Look for the expanded row that maps over `rec.ingredientes`. Find any column/cell showing `especificacion` or `unidad_medida` as a plain string. Replace with:
```jsx
<UoMBadge
  qty={ing.purchase_unit_qty || ing.cantidad}
  symbol={unidadesDB.find(u => u.id === ing.purchase_unit_id)?.abreviatura || ing.unidad_medida}
  unitName={unidadesDB.find(u => u.id === ing.purchase_unit_id)?.nombre}
  size="sm"
/>
```

- [ ] **Step 4: In `parseExcelRecetarios`, keep existing field names** — no change needed for parsing logic. Verify the function already copies `especificacion: matchedProd?.especificacion || ''` for legacy compat and does not break.

- [ ] **Step 5: Verify build and commit**

```bash
npm run build 2>&1 | tail -5
git add src/pages/SalidasOdoo.jsx
git commit -m "refactor(bom): replace especificacion with UoMBadge in BOM table"
```

---

## Task 7: Add sync button to `TabSalidas` in `SalidasOdoo.jsx`

**Files:**
- Modify: `src/pages/SalidasOdoo.jsx` — `TabSalidas` function (line ~977)
- Modify: `src/services/firestoreService.js` — add `syncSalidasOdoo` (no-op for now, triggers refetch)
- Modify: `src/services/dataService.js` — expose `syncSalidasOdoo`

The existing pattern: `TabRecetas` has `handleSincronizarProductos` which calls `dataService.getOdooProducts()`. We follow the same pattern for TabSalidas.

- [ ] **Step 1: Add `syncSalidasOdoo` to `firestoreService.js`**

Add after the `getSalidasOdoo` function (line ~3686), before the closing `}` of the service object:

```js
// Trigger a fresh fetch of salidas — placeholder for future webhook/pull sync
syncSalidasOdoo: async () => {
  // Currently just returns the latest data; extend here to call an external endpoint
  const db = getDB()
  const snap = await getDocs(
    query(collection(db, 'salidas_odoo'), orderBy('fecha_creacion', 'desc'))
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
},
```

- [ ] **Step 2: Expose in `dataService.js`**

Add inside the `dataService` object:
```js
syncSalidasOdoo: async () => {
  return await firestoreService.syncSalidasOdoo()
},
```

- [ ] **Step 3: Add sync button to `TabSalidas`**

Inside `TabSalidas` function, add state and handler:
```jsx
const [sincronizando, setSincronizando] = useState(false)
const queryClient = useQueryClient()
const toast = useToastStore()

const handleSync = async () => {
  setSincronizando(true)
  try {
    const result = await dataService.syncSalidasOdoo()
    queryClient.invalidateQueries({ queryKey: ['salidas-odoo'] })
    toast.success('Sincronizado', `${result.length} salidas cargadas`)
  } catch {
    toast.error('Error', 'No se pudo sincronizar las salidas')
  } finally {
    setSincronizando(false)
  }
}
```

Add the button in the stats header row, as a standalone control:
```jsx
<div className="flex items-center justify-between mb-4">
  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Salidas Odoo</h3>
  <button
    onClick={handleSync}
    disabled={sincronizando}
    className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
  >
    <RefreshCw size={14} className={sincronizando ? 'animate-spin' : ''} />
    {sincronizando ? 'Sincronizando...' : 'Sincronizar'}
  </button>
</div>
```

Also add `RefreshCw` to the lucide-react import at top of file:
```jsx
import { ..., RefreshCw } from 'lucide-react'
```

And add `useQueryClient` import from `@tanstack/react-query` in `TabSalidas` (it can use the hook directly since it's a React component).

- [ ] **Step 4: Verify build and commit**

```bash
npm run build 2>&1 | tail -5
git add src/pages/SalidasOdoo.jsx src/services/firestoreService.js src/services/dataService.js
git commit -m "feat(salidas): add sync button to TabSalidas"
```

---

## Task 8: Add `exit_type` field and badge to `TabSalidas`

**Files:**
- Modify: `src/pages/SalidasOdoo.jsx` — `TabSalidas`
- Modify: `src/services/firestoreService.js` — `getSalidasOdoo` already returns full docs; `exit_type` is a Firestore field

The `exit_type` value `VENTA_ODDO` is set when Odoo writes a sale record to `salidas_odoo` (done in `functions/src/procesarVenta.js`). Frontend only reads and displays it.

- [ ] **Step 1: Add `exitTypeBadge` helper inside `TabSalidas`**

```jsx
const exitTypeBadge = (type) => {
  if (!type) return null
  const map = {
    VENTA_ODDO: { label: 'Venta Odoo', cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' }
  }
  const entry = map[type] || { label: type, cls: 'bg-slate-100 text-slate-700' }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${entry.cls}`}>
      {entry.label}
    </span>
  )
}
```

- [ ] **Step 2: Add `Tipo` column to the salidas table**

Add a `<th>` after `Estado`:
```jsx
<th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">Tipo</th>
```

Add corresponding `<td>` in each row:
```jsx
<td className="px-4 py-3 text-center">{exitTypeBadge(s.exit_type)}</td>
```

- [ ] **Step 3: Add `exit_type` filter**

Add state and filter pill (same pattern as `filtroEstado`):
```jsx
const [filtroTipo, setFiltroTipo] = useState('')
```

Filter in `salidasFiltradas`:
```jsx
const salidasFiltradas = salidas.filter(s => {
  const matchEstado = !filtroEstado || s.estado === filtroEstado
  const matchTipo = !filtroTipo || s.exit_type === filtroTipo
  return matchEstado && matchTipo
})
```

Add filter pill button:
```jsx
<button
  onClick={() => setFiltroTipo(f => f === 'VENTA_ODDO' ? '' : 'VENTA_ODDO')}
  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold cursor-pointer ${filtroTipo === 'VENTA_ODDO' ? 'bg-violet-200 text-violet-800' : 'bg-violet-100 text-violet-700'}`}
>
  Venta Odoo
</button>
```

- [ ] **Step 4: Update `functions/src/procesarVenta.js` to set `exit_type`**

Open `functions/src/procesarVenta.js`. Find where a salida document is created/written to Firestore. Add the field:
```js
exit_type: 'VENTA_ODDO',
```

- [ ] **Step 5: Verify build and commit**

```bash
npm run build 2>&1 | tail -5
git add src/pages/SalidasOdoo.jsx functions/src/procesarVenta.js
git commit -m "feat(salidas): add exit_type badge and filter for VENTA_ODDO"
```

---

## Task 9: Enrich legacy movements — backfill script

**Files:**
- Create: `scripts/backfill_movements_uom.js`

This script is **NOT auto-run**. Run it manually once all products have their UoM configured.

- [ ] **Step 1: Create the script**

```js
// scripts/backfill_movements_uom.js
// Run with: node scripts/backfill_movements_uom.js
// Requires GOOGLE_APPLICATION_CREDENTIALS env var pointing to serviceAccountKey.json

const admin = require('firebase-admin')

const serviceAccount = require('../inventario-app/serviceAccountKey.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

async function backfillMovementsUoM() {
  console.log('Starting UoM backfill for movements...')

  // Fetch all products
  const prodSnap = await db.collection('productos').get()
  const productMap = new Map()
  prodSnap.forEach(doc => productMap.set(doc.id, doc.data()))

  // Fetch movements without unit_of_measure_id
  const movSnap = await db.collection('movimientos')
    .where('unit_of_measure_id', '==', null)
    .get()

  const batch = db.batch()
  let count = 0

  movSnap.forEach(doc => {
    const mov = doc.data()
    const prod = productMap.get(mov.producto_id)
    if (!prod?.purchase_unit_id) return

    batch.update(doc.ref, {
      unit_of_measure_id: prod.purchase_unit_id,
      purchase_unit_qty: prod.purchase_unit_qty || null
    })
    count++

    // Firestore batch limit is 500
    if (count % 499 === 0) {
      batch.commit()
      console.log(`Committed ${count} updates...`)
    }
  })

  await batch.commit()
  console.log(`Backfill complete. Updated ${count} movements.`)
  process.exit(0)
}

backfillMovementsUoM().catch(err => {
  console.error('Backfill failed:', err)
  process.exit(1)
})
```

- [ ] **Step 2: Add script to package.json (optional)**

In the root `package.json` or `inventario-app/package.json` scripts:
```json
"backfill:uom": "node scripts/backfill_movements_uom.js"
```

- [ ] **Step 3: Commit**

```bash
git add scripts/backfill_movements_uom.js
git commit -m "chore: add backfill script for movements UoM (run manually)"
```

---

## Task 10: Show UoMBadge in Movimientos detail panels

**Files:**
- Modify: `src/pages/Movimientos.jsx`

The Movimientos page has expandable/modal detail views for Solicitudes, Salidas, and Entradas. Each shows product info including `especificacion`.

- [ ] **Step 1: Identify all `especificacion` display in Movimientos.jsx**

```bash
grep -n "especificacion" src/pages/Movimientos.jsx
```

- [ ] **Step 2: Add import and unidadesDB query**

```jsx
import UoMBadge from '../components/common/UoMBadge'
```

Add `useQuery` for `config-unidades` at component level.

- [ ] **Step 3: Replace each product-level `especificacion` display**

For each occurrence in detail panels (not operation-level quantities), replace:
```jsx
{item.especificacion || '—'}
```
With:
```jsx
<UoMBadge
  qty={item.purchase_unit_qty}
  symbol={unidadesDB.find(u => u.id === item.purchase_unit_id)?.abreviatura}
  unitName={unidadesDB.find(u => u.id === item.purchase_unit_id)?.nombre || item.unidad_medida}
  size="sm"
/>
```

**Note:** Only replace occurrences where `especificacion` describes the product's UoM configuration. Do NOT replace fields that track operation quantities (how much was moved in a transaction).

- [ ] **Step 4: Verify build and commit**

```bash
npm run build 2>&1 | tail -5
git add src/pages/Movimientos.jsx
git commit -m "refactor(movimientos): show UoMBadge in detail panels"
```

---

## Task 11: BOM import — add UoM fields to `parseExcelRecetarios`

**Files:**
- Modify: `src/pages/SalidasOdoo.jsx` — `parseExcelRecetarios` function (line ~48)

Currently the importer maps `unidad_medida` as a plain string. We improve it to also resolve `purchase_unit_id` from `units_of_measure` and validate equivalences.

- [ ] **Step 1: Update `parseExcelRecetarios` to accept `unidadesDB` parameter**

Change the function signature:
```js
function parseExcelRecetarios(buffer, productos = [], unidadesDB = []) {
```

- [ ] **Step 2: Inside the ingredient loop, resolve unit by symbol/name**

After the existing `const unidad = String(row[5] || '').trim()` line, add:
```js
const purchaseUnitQty = parseFloat(row[6]) || null  // new column: Cant x Compra
// row[5] = unidad, row[6] = purchaseUnitQty, row[7] = costo (shift existing)
const costoRaw = parseFloat(row[7]) || 0

// Resolve unit_id from unidadesDB
let resolvedUnitId = null
let unitError = null
if (unidad) {
  const uStr = unidad.toLowerCase()
  const matched = unidadesDB.find(u =>
    u.nombre?.toLowerCase() === uStr ||
    u.abreviatura?.toLowerCase() === uStr ||
    u.simbolo?.toLowerCase() === uStr
  )
  if (matched) {
    resolvedUnitId = matched.id
  } else {
    unitError = `Unidad "${unidad}" no encontrada`
  }
}
```

- [ ] **Step 3: Attach new fields to each ingredient**

In the `map.get(skuOdoo).ingredientes.push({...})` call, add:
```js
purchase_unit_id: resolvedUnitId,
purchase_unit_qty: purchaseUnitQty,
unit_error: unitError,
```

- [ ] **Step 4: Mark rows with unit errors in the preview table**

In `handleConfirmarImport` and/or the preview render, check `ing.unit_error` and display a warning badge per ingredient row (red background or icon).

In the preview modal ingredient rows:
```jsx
{ing.unit_error && (
  <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-100 text-red-600 rounded">
    {ing.unit_error}
  </span>
)}
```

- [ ] **Step 5: Pass `unidadesDB` into `handleFileChange` for BOM**

In `TabRecetas.handleFileChange`:
```js
setPreview(parseExcelRecetarios(await file.arrayBuffer(), productosParaImport, unidadesDB))
```

- [ ] **Step 6: Update the template download to include new column headers**

In the BOM template generation (search for `'Receta'` or `'Ingrediente'` in XLSX export code), update headers:
```js
['Nombre Receta', 'SKU Odoo', 'Ingrediente', 'SKU Ingrediente', 'Cantidad', 'Unidad', 'Cant x Compra', 'Costo']
```

- [ ] **Step 7: Verify build and commit**

```bash
npm run build 2>&1 | tail -5
git add src/pages/SalidasOdoo.jsx
git commit -m "feat(bom): add UoM fields to BOM import + unit validation"
```

---

## Self-Review

### Spec Coverage

| Requirement | Task |
|---|---|
| `<UoMBadge />` component | Task 1 |
| Replace badge in products table | Task 2 |
| Replace badge in Stock report | Task 3 |
| Replace badge in Solicitudes detail | Task 4 |
| Replace badge in Transferencias detail | Task 5 |
| Replace badge in BOM table | Task 6 |
| Replace badge in Movimientos (Salidas, Entradas, Solicitudes) | Task 10 |
| Legacy movements enrichment via JOIN (backfill) | Task 9 |
| BOM import with UoM fields + validation | Task 11 |
| Sync button in TabSalidas | Task 7 |
| `exit_type` field + badge + filter | Task 8 |
| `exit_type` set in Cloud Function | Task 8 Step 4 |

### Notes

- **`Reportes.jsx`**: The only `especificacion` usage found (`line 771`) is inside a dropdown label — `p.especificacion ? \`${p.nombre} (${p.especificacion})\` : p.nombre`. This is a select option, not a display cell. Leave it as-is; it does not benefit from a badge.
- The `exit_type` field is **schema-less** (Firestore) — no migration needed. Existing salida docs without `exit_type` will show no badge (handled by `exitTypeBadge` returning `null` for falsy input).
- The backfill script in Task 9 handles the `unit_of_measure_id IS NULL` equivalence by checking the field client-side — Firestore does not have a native IS NULL query, so it queries with `.where('unit_of_measure_id', '==', null)` which works for missing fields defaulted to null, but may miss documents where the field was never set. The script should be extended to also run a second pass with `.where('unit_of_measure_id', '==', undefined)` if needed.
