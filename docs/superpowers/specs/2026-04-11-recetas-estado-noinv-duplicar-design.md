# Recetas: Estado, Duplicar y Productos No-Inventariables

**Fecha:** 2026-04-11
**Estado:** Aprobado

---

## 1. Productos No-Inventariables

### Data Model

Campo `inventariable` en coleccion `productos`:
- Default: `true`
- Una vez en `false`, irreversible (no se puede volver a `true`)

### UI — ProductoForm

**Creacion:** Switch sutil debajo de "Categoria" con label "Producto inventariable" (ON por defecto). Al desactivarlo, aviso permanente: "Esta accion es permanente. Los productos no inventariables no generan movimientos, conteos ni reportes de inventario."

**Edicion:** Si `inventariable: false`, switch deshabilitado mostrando estado actual. No se puede revertir.

### UI — Tabla Productos

Badge azul tenue con texto "No inventariable" junto al nombre del producto.
Clases: `bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300`

### Filtros de Exclusion

Productos con `inventariable: false` se excluyen de:
- Stock / Inventario page
- ConteoForm y ConteoExecute (dropdown de productos)
- EntradaForm y TransferenciaForm (dropdown de busqueda)
- Reportes.jsx (todos los reportes)

### Recetas

Los productos no-inventariables SI aparecen en el dropdown de ingredientes de recetas. El descuento de stock en `procesarVenta.js` ya maneja que no exista inventario para un producto (log warning y continua).

---

## 2. Estado de Receta (Activa/Desactivada)

### Data Model

Campo `activo` ya existe (`true`/`false`). Separar semanticamente "desactivar" de "eliminar".

### Validacion de Unicidad

No puede haber 2 recetas activas con el mismo `sku_odoo`. Al guardar o activar:
1. Query: buscar recetas activas con el mismo `sku_odoo` (excluyendo la receta actual si es update)
2. Si existe: error "Ya existe una receta activa para el SKU [X]: [nombre]"

Validacion en frontend (antes de submit) y en `firestoreService` (al crear/actualizar).

### UI — RecetaRow (tabla)

Badge de estado en la fila:
- Activa: `bg-green-100 text-green-700` "Activa"
- Inactiva: `bg-slate-100 text-slate-500` "Inactiva"

Filas inactivas con `opacity-60` para diferenciacion visual.

### UI — Filtro en tabla

Agregar chip de filtro "Estado" junto al filtro existente:
- Opciones: Todas | Activas | Inactivas
- Default: "Activas"

### UI — Toggle en ModalReceta

Switch en el header del modal, solo visible en modo edicion (no al crear). Incluye confirmacion al desactivar.

---

## 3. Duplicar Receta

### Accion

Boton icono Copy en la fila de RecetaRow. Al hacer clic:
1. Crea copia con nombre "[Original] (Copia)"
2. Mismo `sku_odoo`, mismos ingredientes
3. `activo: false` (evita conflicto de unicidad)
4. Abre el modal de edicion de la copia

### Validacion

Al activar la copia, se aplica la validacion de unicidad del punto 2. El usuario debe cambiar el SKU o desactivar la receta original antes de activar la copia.

---

## 4. procesarVenta — Receta Desactivada

### Logica

Cuando `buscarRecetario` encuentra receta pero `activo === false`:
1. Buscar otra receta activa con el mismo `sku_odoo` ordenada por `fecha_creacion` ASC (la mas antigua)
2. Si hay: usar esa receta alternativa, log info
3. Si no hay: crear movimiento con `estado: 'ERROR'`, `error_detalle: 'Receta desactivada sin alternativa activa para SKU [X]'`

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `ProductoForm.jsx` | Switch inventariable |
| `Productos.jsx` | Badge "No inventariable" |
| `Inventario.jsx` | Filtro `inventariable !== false` |
| `Stock.jsx` | Filtro `inventariable !== false` |
| `ConteoForm.jsx` | Filtro productos |
| `ConteoExecute.jsx` | Filtro productos |
| `EntradaForm.jsx` | Filtro dropdown |
| `TransferenciaForm.jsx` | Filtro dropdown |
| `Reportes.jsx` | Filtro reportes |
| `SalidasOdoo.jsx` | Estado toggle, duplicar, filtro, badge, RecetaRow |
| `firestoreService.js` | Validacion unicidad SKU, duplicar receta |
| `useSalidasOdoo.js` | Mutation duplicar |
| `procesarVenta.js` | Fallback receta desactivada |
