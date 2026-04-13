# Recetas: Estado, Duplicar y Productos No-Inventariables — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add recipe status management (activate/deactivate), recipe duplication, SKU uniqueness validation, non-inventoriable products, and sale processing error handling for deactivated recipes.

**Architecture:** Four independent features sharing the same codebase. Feature 1 (non-inventoriable products) adds a `inventariable` field to products and filters them from inventory workflows. Feature 2 (recipe status) separates activate/deactivate from delete, adds a toggle in the recipe modal, and a status badge/filter in the table. Feature 3 (duplicate) adds a copy action. Feature 4 (procesarVenta) adds fallback logic for deactivated recipes.

**Tech Stack:** React, Firebase/Firestore, TanStack Query, Tailwind CSS

---

## Task 1: Producto `inventariable` Field + ProductoForm Switch

**Files:**
- Modify: `inventario-app/src/components/productos/ProductoForm.jsx`

**Context:** `ProductoForm` receives `producto` prop for edit mode. `initialFormData` is at line 14. The form loads product data in `useEffect` at line 88. The "Frecuencia Inventario" dropdown at line 436 currently has a "No Inventariable" option — this will be replaced by the new dedicated switch.

- [ ] **Step 1: Add `inventariable` to initialFormData and edit loading**

In `ProductoForm.jsx`, add `inventariable: true` to `initialFormData` (after line 27):

```jsx
// line 27, add before the closing brace:
    inventariable: true
```

In the `useEffect` that loads product data (line 88-119), add to `nuevoFormData` (around line 103):

```jsx
        inventariable: producto.inventariable !== false, // default true for existing products
```

- [ ] **Step 2: Remove "No Inventariable" option from frecuencia dropdown**

Remove line 448:
```jsx
                <option value="no-inventariable">No Inventariable</option>
```

- [ ] **Step 3: Add inventariable switch UI after the Categoria field**

After the Categoria `</div>` (around line 475), add a new section. The switch should be subtle, modern, with a warning when toggled off. In edit mode with `inventariable === false`, the switch is disabled:

```jsx
            {/* Inventariable toggle */}
            <div className="md:col-span-2">
              <div className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                formData.inventariable
                  ? 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/30'
                  : 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
              }`}>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Producto inventariable
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {formData.inventariable
                      ? 'Este producto participa en conteos, movimientos y reportes de inventario'
                      : 'No participa en conteos, movimientos ni reportes. Solo disponible para recetas/costos.'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={producto && producto.inventariable === false}
                  onClick={() => {
                    if (formData.inventariable) {
                      if (window.confirm('Esta accion es permanente. Los productos no inventariables no generan movimientos, conteos ni reportes de inventario. Continuar?')) {
                        setFormData(prev => ({ ...prev, inventariable: false }))
                      }
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                    producto && producto.inventariable === false
                      ? 'bg-blue-400 cursor-not-allowed opacity-60'
                      : formData.inventariable
                        ? 'bg-slate-300 dark:bg-slate-500'
                        : 'bg-blue-500'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                    formData.inventariable ? 'translate-x-1' : 'translate-x-6'
                  }`} />
                </button>
              </div>
              {!formData.inventariable && (
                <p className="mt-2 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  {producto && producto.inventariable === false
                    ? 'Este producto fue marcado como no inventariable. Esta configuracion no se puede revertir.'
                    : 'Una vez guardado, no podras volver a marcarlo como inventariable.'}
                </p>
              )}
            </div>
```

- [ ] **Step 4: Commit**

```bash
git add inventario-app/src/components/productos/ProductoForm.jsx
git commit -m "feat(productos): add inventariable toggle switch to ProductoForm"
```

---

## Task 2: Badge "No inventariable" en Productos.jsx + Filtros de Exclusion

**Files:**
- Modify: `inventario-app/src/pages/Productos.jsx`

**Context:** Product table renders rows starting at line 681. The product name is at line 692. The filter logic for the product list is at line 101.

- [ ] **Step 1: Add "No inventariable" badge next to product name**

At line 693, after `<p className="text-xs text-slate-500...">{item.codigo_legible || item.id}</p>`, add:

```jsx
                          {item.inventariable === false && (
                            <span className="inline-flex items-center mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                              No inventariable
                            </span>
                          )}
```

- [ ] **Step 2: Commit**

```bash
git add inventario-app/src/pages/Productos.jsx
git commit -m "feat(productos): add non-inventoriable badge to product list"
```

---

## Task 3: Filtrar productos no-inventariables de conteos, movimientos, reportes, stock

**Files:**
- Modify: `inventario-app/src/components/conteos/ConteoForm.jsx:38`
- Modify: `inventario-app/src/components/conteos/ConteoExecute.jsx:167`
- Modify: `inventario-app/src/components/entradas/EntradaForm.jsx:209`
- Modify: `inventario-app/src/components/transferencias/TransferenciaForm.jsx:223`
- Modify: `inventario-app/src/pages/Stock.jsx:79,157`
- Modify: `inventario-app/src/pages/Inventario.jsx` (product filter)
- Modify: `inventario-app/src/pages/Reportes.jsx:770`

**Context:** Each file filters products at different points. Add `&& product.inventariable !== false` to each existing filter. Products in `SalidasOdoo.jsx` (recipes) should NOT be filtered — they need to appear in recipe ingredient dropdowns.

- [ ] **Step 1: ConteoForm.jsx — add filter at line 38**

Change the filter at line 38 from:
```jsx
      if (producto.estado === 'INACTIVO' || producto.estado === 'ELIMINADO') return false
```
to:
```jsx
      if (producto.estado === 'INACTIVO' || producto.estado === 'ELIMINADO') return false
      if (producto.inventariable === false) return false
```

- [ ] **Step 2: ConteoExecute.jsx — add filter at line 167**

Same pattern — add after the existing estado filter:
```jsx
        if (producto.inventariable === false) return false
```

- [ ] **Step 3: EntradaForm.jsx — add filter at line 209**

Inside `filteredProducts` filter function, add at the beginning:
```jsx
      if (product.inventariable === false) return false
```

- [ ] **Step 4: TransferenciaForm.jsx — add filter at line 223**

Inside `filteredProducts` filter function, add at the beginning:
```jsx
      if (product.inventariable === false) return false
```

- [ ] **Step 5: Stock.jsx — add filter at lines 79 and 157**

At line 79 (product filter for dropdown), change from:
```jsx
      .filter(p => p.estado !== 'INACTIVO' && p.estado !== 'ELIMINADO')
```
to:
```jsx
      .filter(p => p.estado !== 'INACTIVO' && p.estado !== 'ELIMINADO' && p.inventariable !== false)
```

At line 157 (inventory items loop), add after the estado check:
```jsx
        if (producto.inventariable === false) return
```

- [ ] **Step 6: Reportes.jsx — add filter at line 770**

Change from:
```jsx
      .filter(p => p.estado !== 'INACTIVO' && p.estado !== 'ELIMINADO')
```
to:
```jsx
      .filter(p => p.estado !== 'INACTIVO' && p.estado !== 'ELIMINADO' && p.inventariable !== false)
```

- [ ] **Step 7: Inventario.jsx — filter non-inventoriable products**

In Inventario.jsx, find where inventory items are displayed and filter out products where `inventariable === false`. The product lookup is done per-row, so add a condition to skip rendering rows whose product has `inventariable === false`.

- [ ] **Step 8: Commit**

```bash
git add inventario-app/src/components/conteos/ConteoForm.jsx \
       inventario-app/src/components/conteos/ConteoExecute.jsx \
       inventario-app/src/components/entradas/EntradaForm.jsx \
       inventario-app/src/components/transferencias/TransferenciaForm.jsx \
       inventario-app/src/pages/Stock.jsx \
       inventario-app/src/pages/Reportes.jsx \
       inventario-app/src/pages/Inventario.jsx
git commit -m "feat(productos): filter non-inventoriable products from inventory workflows"
```

---

## Task 4: Estado de Receta — Toggle en ModalReceta + Validacion Unicidad SKU

**Files:**
- Modify: `inventario-app/src/pages/SalidasOdoo.jsx` (ModalReceta component, ~line 494)
- Modify: `inventario-app/src/services/firestoreService.js` (createReceta, updateReceta)

**Context:** `ModalReceta` is defined at line 494 of `SalidasOdoo.jsx`. It receives `receta` prop (null for create, object for edit). The `handleSubmit` function is at line 567. The `activo` field already exists but is only set to `false` via `deleteReceta` (soft delete).

- [ ] **Step 1: Add activo toggle state to ModalReceta**

In `ModalReceta`, after the existing `useState` declarations (around line 501), add:

```jsx
  const [activo, setActivo] = useState(receta ? (receta.activo !== false) : true)
```

- [ ] **Step 2: Add toggle switch in modal header**

In the modal header div (line 602-604), between the title and close button, add the toggle — only visible in edit mode:

```jsx
            {receta && receta.id && (
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold ${activo ? 'text-green-200' : 'text-red-200'}`}>
                  {activo ? 'Activa' : 'Inactiva'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (activo) {
                      if (window.confirm('Desactivar receta? Las ventas de este producto generaran error hasta que se active otra receta.')) {
                        setActivo(false)
                      }
                    } else {
                      setActivo(true)
                    }
                  }}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    activo ? 'bg-green-400' : 'bg-red-400/60'
                  }`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
                    activo ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            )}
```

- [ ] **Step 3: Include activo in handleSubmit**

In `handleSubmit` (line 567), in `formPreparado`, add `activo`:

```jsx
    const formPreparado = {
      ...form,
      activo,
      ingredientes: form.ingredientes.map(ing => ({
        ...ing,
        cantidad: parseFloat(parseFloat(ing.cantidad).toFixed(3)) || 0
      }))
    }
```

- [ ] **Step 4: Add SKU uniqueness validation to firestoreService**

In `firestoreService.js`, modify `createReceta` (line 3586) and `updateReceta` (line 3600) to validate uniqueness.

Add a helper before the receta methods:

```javascript
async function validateRecetaSkuUniqueness(db, skuOdoo, excludeId = null) {
  if (!skuOdoo) return null
  const snap = await getDocs(
    query(collection(db, 'salidas_odoo_recetas'), where('sku_odoo', '==', skuOdoo), where('activo', '==', true))
  )
  const conflict = snap.docs.find(d => d.id !== excludeId)
  if (conflict) {
    return `Ya existe una receta activa para el SKU ${skuOdoo}: "${conflict.data().nombre}"`
  }
  return null
}
```

In `createReceta`, before the `setDoc` call, add:

```javascript
    const conflict = await validateRecetaSkuUniqueness(db, data.sku_odoo)
    if (conflict) throw new Error(conflict)
```

In `updateReceta`, before the `updateDoc` call, add:

```javascript
    if (data.activo !== false) {
      const conflict = await validateRecetaSkuUniqueness(db, data.sku_odoo, id)
      if (conflict) throw new Error(conflict)
    }
```

- [ ] **Step 5: Handle validation error in ModalReceta handleSubmit**

In `handleSubmit`, the `catch` block (line 589) should show the error message from the validation:

```jsx
    } catch (error) {
      console.error('Error guardando receta:', error)
      toast.error('Error', error.message || 'Hubo un problema al guardar la receta')
    } finally {
```

Note: `toast` is not imported in `ModalReceta`. Add it at the top of the function:

```jsx
  const toast = useToastStore()
```

And add the import at the top of the file if not already present (it already is — `useToastStore` is imported at line 11).

- [ ] **Step 6: Commit**

```bash
git add inventario-app/src/pages/SalidasOdoo.jsx inventario-app/src/services/firestoreService.js
git commit -m "feat(recetas): add active/inactive toggle with SKU uniqueness validation"
```

---

## Task 5: RecetaRow — Badge de Estado + Filtro + Estilo Atenuado

**Files:**
- Modify: `inventario-app/src/pages/SalidasOdoo.jsx` (RecetaRow, TabRecetas)

**Context:** `RecetaRow` starts at line 409. `TabRecetas` starts at line 168. The `filtroEstado` state already exists (line 182) with values `'todas'`, `'con_receta'`, `'sin_receta'`.

- [ ] **Step 1: Add status badge to RecetaRow**

In `RecetaRow`, in the row that shows the recipe name (line 418-420), add a badge after the name:

```jsx
            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">{rec.nombre}</span>
            {rec.activo === false && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 dark:bg-slate-600 dark:text-slate-400">
                Inactiva
              </span>
            )}
```

- [ ] **Step 2: Add opacity to inactive recipe rows**

On the `<tr>` at line 413, add conditional opacity:

```jsx
        <tr className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors ${rec.activo === false ? 'opacity-50' : ''}`}
```

- [ ] **Step 3: Add active status filter to TabRecetas**

In `TabRecetas`, add a new state for active filter (after existing states):

```jsx
  const [filtroActivo, setFiltroActivo] = useState('activas') // 'todas', 'activas', 'inactivas'
```

In the `displayData` computation, apply the active filter. In `listConReceta` filter (line 240-243), add:

```jsx
      const matchesActivo = filtroActivo === 'todas' || 
        (filtroActivo === 'activas' && r.activo !== false) ||
        (filtroActivo === 'inactivas' && r.activo === false)
      return activo && matchesSearch && matchesActivo
```

Add filter chips UI after the existing search bar (around line 304), alongside the existing filter buttons:

```jsx
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5">
              {[
                { value: 'activas', label: 'Activas' },
                { value: 'todas', label: 'Todas' },
                { value: 'inactivas', label: 'Inactivas' }
              ].map(opt => (
                <button key={opt.value} onClick={() => setFiltroActivo(opt.value)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    filtroActivo === opt.value
                      ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
```

- [ ] **Step 4: Commit**

```bash
git add inventario-app/src/pages/SalidasOdoo.jsx
git commit -m "feat(recetas): add status badge, attenuation, and active filter to recipe table"
```

---

## Task 6: Duplicar Receta

**Files:**
- Modify: `inventario-app/src/pages/SalidasOdoo.jsx` (RecetaRow, TabRecetas)
- Modify: `inventario-app/src/services/firestoreService.js` (new duplicateReceta method)
- Modify: `inventario-app/src/services/dataService.js` (expose duplicateReceta)
- Modify: `inventario-app/src/hooks/useSalidasOdoo.js` (new mutation)

**Context:** `RecetaRow` has action buttons at lines 430-446. The `Copy` icon needs to be imported from lucide-react.

- [ ] **Step 1: Add duplicateReceta to firestoreService**

After `deleteReceta` (line 3616), add:

```javascript
  duplicateReceta: async (id) => {
    const db = getDB()
    const original = await getDoc(doc(db, 'salidas_odoo_recetas', id))
    if (!original.exists()) throw new Error('Receta no encontrada')
    const data = original.data()
    const newId = await getNextSequentialCode('REC')
    await setDoc(doc(db, 'salidas_odoo_recetas', newId), {
      ...data,
      nombre: `${data.nombre} (Copia)`,
      activo: false,
      fecha_creacion: serverTimestamp(),
      ultima_actualizacion: serverTimestamp()
    })
    return { id: newId, ...data, nombre: `${data.nombre} (Copia)`, activo: false }
  },
```

- [ ] **Step 2: Expose in dataService**

In `dataService.js`, find the receta methods and add:

```javascript
  duplicateReceta: async (id) => {
    return await firestoreService.duplicateReceta(id)
  },
```

- [ ] **Step 3: Add mutation to useSalidasOdoo**

In `useSalidasOdoo.js`, add after `eliminarReceta` mutation:

```javascript
  const duplicarReceta = useMutation({
    mutationFn: (id) => dataService.duplicateReceta(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salidas_odoo_recetas'] })
  })
```

Add `duplicarReceta` to the return object.

- [ ] **Step 4: Add duplicate button to RecetaRow**

Import `Copy` from lucide-react at line 5.

In `RecetaRow` props, add `onDuplicate`:

```jsx
function RecetaRow({ rec, expandido, setExpandido, canWrite, canDel, onEdit, onDelete, onCrear, onDuplicate, unidadesDB = [] }) {
```

Add a duplicate button in the action buttons area (inside the `<>` block at line 441, before the edit button):

```jsx
                <button onClick={onDuplicate} disabled={!canWrite} title="Duplicar receta"
                  className={`p-1.5 rounded-lg transition-colors ${canWrite ? 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700' : 'text-slate-300 cursor-not-allowed'}`}>
                  <Copy size={14} />
                </button>
```

- [ ] **Step 5: Wire up in TabRecetas**

In `TabRecetas`, destructure `duplicarReceta` from `useSalidasOdoo()`.

In the `RecetaRow` usage (line 379), add the `onDuplicate` prop:

```jsx
                  onDuplicate={async () => {
                    try {
                      const result = await duplicarReceta.mutateAsync(rec.id)
                      toast.success('Duplicada', `Receta "${rec.nombre}" duplicada como inactiva`)
                      setEditando(result)
                      setModalForm(true)
                    } catch (e) {
                      toast.error('Error', e.message || 'Error al duplicar')
                    }
                  }}
```

- [ ] **Step 6: Commit**

```bash
git add inventario-app/src/pages/SalidasOdoo.jsx \
       inventario-app/src/services/firestoreService.js \
       inventario-app/src/services/dataService.js \
       inventario-app/src/hooks/useSalidasOdoo.js
git commit -m "feat(recetas): add duplicate recipe action"
```

---

## Task 7: procesarVenta — Fallback Receta Desactivada

**Files:**
- Modify: `inventario-app/functions/src/procesarVenta.js`

**Context:** `buscarRecetario` at line 17 queries by `sku_odoo` and `activo: true`. When a recipe is deactivated, this returns null. We need to add fallback logic.

- [ ] **Step 1: Modify buscarRecetario to support fallback**

Replace the existing `buscarRecetario` function with one that handles the deactivated case:

```javascript
async function buscarRecetario(db, sku) {
  if (!sku) return null;
  
  // First try: active recipe
  const activeSnap = await db.collection('recetarios')
    .where('sku_odoo', '==', sku)
    .where('activo', '==', true)
    .orderBy('fecha_creacion', 'asc')
    .limit(1)
    .get();
  
  if (!activeSnap.empty) {
    return { id: activeSnap.docs[0].id, ...activeSnap.docs[0].data() };
  }
  
  // Check if there's a deactivated recipe (to differentiate "no recipe" from "deactivated")
  const anySnap = await db.collection('recetarios')
    .where('sku_odoo', '==', sku)
    .limit(1)
    .get();
  
  if (!anySnap.empty) {
    // Recipe exists but is deactivated
    return { id: anySnap.docs[0].id, ...anySnap.docs[0].data(), _deactivated: true };
  }
  
  return null;
}
```

Note: The collection name in Firestore is `salidas_odoo_recetas` (see firestoreService.js line 3581), but `procesarVenta.js` uses `recetarios`. Verify which collection name the Cloud Function actually uses by checking the existing code. If it uses `recetarios`, check if that's correct or needs to be changed to `salidas_odoo_recetas`.

- [ ] **Step 2: Handle deactivated recipe in procesarVentaOdoo**

In the main processing loop, after the recetario lookup, replace the null check block:

```javascript
      if (!recetario) {
        console.log(`    ⚠️  Sin recetario para este producto, saltando`);
        continue;
      }

      // Handle deactivated recipe
      if (recetario._deactivated) {
        console.log(`    ❌ Receta desactivada para SKU ${line.productSKU || line.productTemplateSKU}`);
        
        // Create error movement
        await db.collection('movimientos').add({
          tipo: 'SALIDA',
          origen: 'ODOO_VENTA',
          tipo_orden: tipo,
          order_id: orderId,
          producto_odoo_nombre: line.productName,
          producto_odoo_sku: line.productSKU || line.productTemplateSKU,
          cantidad: line.quantity,
          ubicacion_id: ubicacionId,
          fecha_creacion: admin.firestore.FieldValue.serverTimestamp(),
          estado: 'ERROR',
          error_detalle: `Receta desactivada sin alternativa activa para SKU ${line.productSKU || line.productTemplateSKU}. Activar receta y reprocesar.`,
          exit_type: 'VENTA_ODOO',
        });
        
        movimientosCreados++;
        continue;
      }
```

- [ ] **Step 3: Commit**

```bash
git add inventario-app/functions/src/procesarVenta.js
git commit -m "feat(ventas): handle deactivated recipes with error movement fallback"
```

---

## Task 8: Final Integration Commit

- [ ] **Step 1: Verify the app runs without errors**

```bash
cd inventario-app && npm run dev
```

Open in browser, verify:
1. Product form shows inventariable switch
2. Products page shows "No inventariable" badge
3. Non-inventoriable products don't appear in conteos/entradas/salidas/reportes/stock
4. Non-inventoriable products DO appear in recipe ingredient search
5. Recipe modal has active/inactive toggle
6. SKU uniqueness validation works (try activating two recipes with same SKU)
7. Duplicate action creates an inactive copy and opens edit modal
8. Recipe table shows status badge and filter works

- [ ] **Step 2: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: integration fixes for recipes and non-inventoriable products"
```
