# Dropdown UoM, BOM Modal & Detail Modal Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three UI issues: (1) product dropdown metadata line in Entradas/Salidas, (2) BOM modal UoM selector empty + Costo column narrow, (3) detail modal blank for COMPLETADO records.

**Architecture:** Pure frontend React app at `inventario-app/src/`. No backend changes. All three fixes are isolated JSX edits. The detail modal (`TransferenciaDetail.jsx`) is the shared component used by both Entradas and Salidas pages via the `isEntradasView` prop.

**Tech Stack:** React 18, TanStack Query v5, Tailwind CSS, Lucide React, Firebase/Firestore

---

## File Map

| Action | File | What changes |
|---|---|---|
| Modify | `src/components/entradas/EntradaForm.jsx` | Dropdown product card: remove "Unidad de medida" line, combine ID + UoM + Stock on one line |
| Modify | `src/pages/Salidas.jsx` | Same dropdown product card fix (different file, same pattern) |
| Modify | `src/pages/SalidasOdoo.jsx` | BOM modal: fix empty UoM dropdown + widen Costo/u column |
| Modify | `src/components/transferencias/TransferenciaDetail.jsx` | Fix blank modal for COMPLETADO: guard at line 507 fires when `detalles.length === 0` while still loading OR when VENTA has no `detalle_ventas` docs |

---

## Task 1: Fix product dropdown card in EntradaForm.jsx

**Files:**
- Modify: `src/components/entradas/EntradaForm.jsx:782-788`

The search results dropdown (around line 775–795) shows each product with 3 lines:
```
{product.nombre}
ID: {product.id} | {product.especificacion || 'Sin especificación'}
Stock actual: {product.stock} {product.unidad_medida}   ← 2 separate <p> tags
```

We need to collapse to 2 lines:
```
{product.nombre}
ID: {product.id} | {UoM qty+symbol} | Stock: {product.stock}
```

- [ ] **Step 1: Read the file to confirm exact current code**

```bash
grep -n "Stock actual\|unidad_medida\|especificacion\|product\.id\|product\.stock" src/components/entradas/EntradaForm.jsx | head -20
```

- [ ] **Step 2: Add UoMBadge import** (already exists? check first)

```bash
grep -n "UoMBadge" src/components/entradas/EntradaForm.jsx
```

If not present, add after the existing imports:
```jsx
import UoMBadge from '../common/UoMBadge'
```

- [ ] **Step 3: Confirm unidadesDB is available in scope**

The file already loads `unidadesDB` via `useQuery` (confirmed at lines ~194–219). No new query needed.

- [ ] **Step 4: Replace the two-line product card with the single metadata line**

Find this block (around lines 782–788):
```jsx
<p className="font-semibold text-slate-900 truncate">{product.nombre}</p>
<p className="text-xs text-slate-500 truncate">
  ID: {product.id} | {product.especificacion || 'Sin especificación'}
</p>
<p className="text-sm font-medium text-green-700">
  Stock actual: {product.stock} {product.unidad_medida}
</p>
```

Replace with:
```jsx
<p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{product.nombre}</p>
<p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 flex-wrap">
  <span>{product.codigo_legible || product.id}</span>
  <span className="text-slate-300">|</span>
  <UoMBadge
    qty={product.purchase_unit_qty}
    symbol={unidadesDB.find(u => u.id === product.purchase_unit_id)?.abreviatura}
    unitName={unidadesDB.find(u => u.id === product.purchase_unit_id)?.nombre || product.unidad_medida}
    size="sm"
  />
  <span className="text-slate-300">|</span>
  <span>Stock: {product.stock ?? 0}</span>
</p>
```

- [ ] **Step 5: Build check**

```bash
npm run build 2>&1 | grep -E "built|error during build"
```
Expected: `✓ built in X.XXs`

- [ ] **Step 6: Commit**

```bash
git add src/components/entradas/EntradaForm.jsx
git commit -m "fix(entradas): condense product dropdown metadata to single line with UoMBadge"
```

---

## Task 2: Fix product dropdown card in Salidas.jsx

**Files:**
- Modify: `src/pages/Salidas.jsx:429,561`

Salidas.jsx has two dropdown search result areas — both show similar `especificacion | Stock` patterns (confirmed at lines 429 and 561).

- [ ] **Step 1: Read the relevant lines**

```bash
grep -n "especificacion\|Stock:\|stock\b\|unidad_medida\|p\.stock" src/pages/Salidas.jsx | grep -v "^[0-9]*:.*//\|filter\|getProductoStock\|matchesSearch\|calc" | head -20
```

- [ ] **Step 2: Add UoMBadge import**

```bash
grep -n "UoMBadge\|import.*common" src/pages/Salidas.jsx | head -5
```
If missing, add:
```jsx
import UoMBadge from '../components/common/UoMBadge'
```

- [ ] **Step 3: Confirm unidadesDB is in scope**

```bash
grep -n "unidadesDB\|getUnidadesMedida" src/pages/Salidas.jsx | head -5
```
If not present, add inside the component:
```jsx
const { data: unidadesDB = [] } = useQuery({
  queryKey: ['config-unidades'],
  queryFn: () => dataService.getUnidadesMedida()
})
```

- [ ] **Step 4: Fix occurrence at line ~429**

Find the pattern (around line 429):
```jsx
<p className="text-xs text-slate-500">{p.especificacion || 'Sin especificación'} | Stock: {p.stock}</p>
```

Replace with:
```jsx
<p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 flex-wrap">
  <span>{p.codigo_legible || p.id}</span>
  <span className="text-slate-300">|</span>
  <UoMBadge
    qty={p.purchase_unit_qty}
    symbol={unidadesDB.find(u => u.id === p.purchase_unit_id)?.abreviatura}
    unitName={unidadesDB.find(u => u.id === p.purchase_unit_id)?.nombre || p.unidad_medida}
    size="sm"
  />
  <span className="text-slate-300">|</span>
  <span>Stock: {p.stock ?? 0}</span>
</p>
```

- [ ] **Step 5: Fix occurrence at line ~561**

Find the pattern (around line 561):
```jsx
<p className="text-xs text-slate-500">{p.especificacion || 'Sin especificación'} | Stock: {p.stock} {p.unidad_medida || ''}</p>
```

Replace with the same pattern as step 4 (same `p` variable):
```jsx
<p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 flex-wrap">
  <span>{p.codigo_legible || p.id}</span>
  <span className="text-slate-300">|</span>
  <UoMBadge
    qty={p.purchase_unit_qty}
    symbol={unidadesDB.find(u => u.id === p.purchase_unit_id)?.abreviatura}
    unitName={unidadesDB.find(u => u.id === p.purchase_unit_id)?.nombre || p.unidad_medida}
    size="sm"
  />
  <span className="text-slate-300">|</span>
  <span>Stock: {p.stock ?? 0}</span>
</p>
```

- [ ] **Step 6: Build check**

```bash
npm run build 2>&1 | grep -E "built|error during build"
```

- [ ] **Step 7: Commit**

```bash
git add src/pages/Salidas.jsx
git commit -m "fix(salidas): condense product dropdown metadata to single line with UoMBadge"
```

---

## Task 3: Fix BOM modal — empty UoM dropdown + widen Costo column

**Files:**
- Modify: `src/pages/SalidasOdoo.jsx:641-653` (colgroup + Costo/u column) and `src/pages/SalidasOdoo.jsx:723-751` (UoM select)

**Problem A — UoM dropdown empty:** The `<select>` for `consumption_unit_id` (line ~724) only shows options when `ing.purchase_unit_id` is truthy. When a product has no `purchase_unit_id` set (or when the ingredient is first added before a product is selected), it falls through to just a `<span>`. The issue is that `selectProductForIngrediente` already sets `consumption_unit_id: prod.purchase_unit_id || ''` — but if `prod.purchase_unit_id` is empty (product not yet configured with UoM), the select block is skipped entirely showing nothing useful.

Fix: show a disabled placeholder `<select>` when `purchase_unit_id` is missing, instead of a bare span.

**Problem B — Costo column too narrow:** The `<col className="w-[8%]" />` at line 643 is 8% of table width — too narrow for cost values like `$12,345.00`. Increase to `w-[12%]` and remove `truncate` from the Costo/u `<td>`.

- [ ] **Step 1: Read the colgroup and select sections**

```bash
sed -n '638,755p' src/pages/SalidasOdoo.jsx
```

- [ ] **Step 2: Fix column widths in colgroup (line ~641-647)**

Find:
```jsx
<col className="w-[35%]" />
<col className="w-[12%]" />
<col className="w-[8%]" />
<col className="w-[13%]" />
<col className="w-[12%]" />
<col className="w-[14%]" />
<col className="w-[6%]" />
```

Replace with (Espec. shrinks to 9%, Costo grows to 12%, Unidad shrinks to 11%, balance maintained at 100%):
```jsx
<col className="w-[33%]" />
<col className="w-[9%]" />
<col className="w-[12%]" />
<col className="w-[13%]" />
<col className="w-[11%]" />
<col className="w-[16%]" />
<col className="w-[6%]" />
```

- [ ] **Step 3: Remove truncate from the Costo/u td (line ~703-704)**

Find:
```jsx
<td className="px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400 truncate">{ing.especificacion || '—'}</td>
<td className="px-3 py-2.5 text-right">
```

The `truncate` is on the Espec. column td (fine there). The Costo/u `<td>` at line ~704 already has `text-right` without truncate — no change needed there. Confirm by reading the exact td.

- [ ] **Step 4: Fix empty UoM select (line ~723-751)**

Find the conditional block:
```jsx
{ing.purchase_unit_id ? (
  <select ...>
    {(() => { ... })()}
  </select>
) : (
  <span className="text-xs text-slate-500">{ing.unidad_medida || '—'}</span>
)}
```

Replace the `else` branch with a disabled select that shows a clear message:
```jsx
{ing.purchase_unit_id ? (
  <select
    value={ing.consumption_unit_id || ing.purchase_unit_id || ''}
    onChange={e => updateConsumptionUnit(i, e.target.value)}
    disabled={readOnly}
    className="w-full px-1.5 py-1 text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-1 focus:ring-primary-500 disabled:opacity-60"
  >
    {(() => {
      const prod = productosActivos.find(p => p.id === ing.producto_id) || {}
      const unitTarget = unidadesDB.find(u => u.id === ing.purchase_unit_id)
      const bSym = unitTarget?.abreviatura || unitTarget?.nombre || prod.unidad_medida || ing.unidad_medida || ''
      const qQty = prod.purchase_unit_qty || 1
      return (
        <>
          {qQty > 1 && (
            <option value="__presentation__">Unidad ({qQty} {bSym})</option>
          )}
          {getCompatibleUnits(ing.purchase_unit_id, eqMap).map(uid => {
            const u = unidadesDB.find(x => x.id === uid)
            return u ? <option key={uid} value={uid}>{u.abreviatura || u.nombre}</option> : null
          })}
        </>
      )
    })()}
  </select>
) : (
  <select
    disabled
    className="w-full px-1.5 py-1 text-xs border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-lg opacity-80 cursor-not-allowed"
  >
    <option value="">
      {ing.producto_id ? 'Configura UoM en el producto' : 'Selecciona un producto'}
    </option>
  </select>
)}
```

- [ ] **Step 5: Build check**

```bash
npm run build 2>&1 | grep -E "built|error during build"
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/SalidasOdoo.jsx
git commit -m "fix(bom): widen Costo column + show placeholder when UoM not configured"
```

---

## Task 4: Fix blank modal for COMPLETADO records in TransferenciaDetail.jsx

**Files:**
- Modify: `src/components/transferencias/TransferenciaDetail.jsx:507-515`

**Root cause:** Line 507:
```jsx
if (isLoading && detalles.length === 0) {
  return <LoadingSpinner ... />
}
```
This guard is correct while loading. But the real blank modal issue is different:

For **VENTA** type records marked COMPLETADO, `getDetalleVentas` queries `detalle_ventas` with `where('venta_id', '==', ventaId)`. Legacy completed ventas may have been stored with `movimiento_id` instead of `venta_id`, OR the detalle collection is empty (the items were embedded in the movimiento document itself under a `productos` field). When `detalles` comes back empty for a COMPLETADO record, the modal renders the "No hay productos en este movimiento" empty state — which looks like a blank modal if the header also has minimal content.

Additionally, for **COMPLETADO** state the modal suppresses Cancel and Confirm buttons (correct), but it also hides the editing toolbar — so if `detalles.length === 0`, the user sees nothing but an empty product table.

**Fix:** When `detalles.length === 0` AND the record is COMPLETADO AND `isLoading === false` (i.e., the query genuinely returned nothing), look for embedded products in `transferencia.productos` array (some Odoo-originated ventas store items there). If found, use those as fallback items to display.

- [ ] **Step 1: Read getProductoInfo function and the detalles rendering block**

```bash
sed -n '274,295p' src/components/transferencias/TransferenciaDetail.jsx
sed -n '721,735p' src/components/transferencias/TransferenciaDetail.jsx
```

- [ ] **Step 2: Add derived `detallesDisplay` variable after the queries (around line 162, after `unidadesDB` query)**

Read lines 155-165 to find the exact insertion point, then add:
```jsx
// Fallback: some VENTA COMPLETADO records embed items in transferencia.productos
// instead of a separate detalle_ventas subcollection.
const detallesDisplay = (() => {
  if (detalles.length > 0) return detalles
  if (!isLoading && (transferencia.productos || []).length > 0) {
    return transferencia.productos.map((p, idx) => ({
      id: p.id || `emb_${idx}`,
      producto_id: p.producto_id || p.id,
      cantidad: p.cantidad || p.qty || 0,
      cantidad_enviada: p.cantidad_enviada || p.cantidad || p.qty || 0,
    }))
  }
  return detalles
})()
```

- [ ] **Step 3: Replace all uses of `detalles` in the render section with `detallesDisplay`**

The render section uses `detalles` in these locations (search the file):
- `detalles.length === 0` (empty state check, line ~725)
- `detalles.map((detalle, index)` (row mapping, line ~758)
- `detalles.length > 0` in section header (line ~718)
- `detalle_has_recibida` derived from detalles (find it)

Run:
```bash
grep -n "detalles\." src/components/transferencias/TransferenciaDetail.jsx | grep -v "insumosProduccion\|detallesDisplay\|queryKey\|getDetalle\|isLoading" | head -20
```

For each render usage (NOT the `useQuery` declaration, NOT function calls that fetch), replace `detalles` → `detallesDisplay`.

Specifically:
- Line ~718: `detalles.length > 0` → `detallesDisplay.length > 0`
- Line ~725: `detalles.length === 0` → `detallesDisplay.length === 0`
- Line ~758: `detalles.map(` → `detallesDisplay.map(`
- The `detalle_has_recibida` line (find it): replace `detalles.some(` → `detallesDisplay.some(`

- [ ] **Step 4: Build check**

```bash
npm run build 2>&1 | grep -E "built|error during build"
```
Expected: `✓ built`

- [ ] **Step 5: Commit**

```bash
git add src/components/transferencias/TransferenciaDetail.jsx
git commit -m "fix(detail-modal): show embedded productos for COMPLETADO records with no detalle docs"
```

---

## Self-Review

### Spec Coverage

| Requirement | Task |
|---|---|
| Dropdown: remove "Unidad de medida" line in Entradas | Task 1 |
| Dropdown: single metadata line `ID \| UoM \| Stock` in Entradas | Task 1 |
| Dropdown: same fix in Salidas | Task 2 |
| BOM UoM selector: placeholder when no UoM configured | Task 3 Step 4 |
| BOM UoM selector: "Configura UoM en el producto" message | Task 3 Step 4 |
| BOM Costo column: wider (8% → 12%) | Task 3 Step 2 |
| Detail modal: blank for COMPLETADO fixed | Task 4 |
| Detail modal: fallback to `transferencia.productos` | Task 4 Step 2 |
| No regressions in other states | Tasks 1-4 all use additive fallbacks |

### Notes

- **Task 2** — `Salidas.jsx` has `especificacion` computed at line 142–155 via a derived field (`especificacion = producto.purchase_unit_qty && unitSymbol ? ... : produto.especificacion`). This means `p.especificacion` in the dropdown is already the UoM string for configured products. We still replace it with `<UoMBadge>` for visual consistency, but the fallback `p.especificacion` will work correctly for legacy products.
- **Task 3 BOM UoM** — the spec says "Pre-cargar automáticamente el `unit_of_measure_id` del producto como valor por defecto". This is already implemented via `selectProductForIngrediente` setting `consumption_unit_id: prod.purchase_unit_id`. The real bug is the selector disappearing when `purchase_unit_id` is empty — Task 3 Step 4 fixes that.
- **Task 4** — The `isLoading && detalles.length === 0` guard (line 507) is NOT the blank modal bug. The blank modal happens when query resolves with 0 results and the product table shows "No hay productos" — which is visually empty for completed ventas. The embedded-productos fallback resolves this without touching the loading guard.
