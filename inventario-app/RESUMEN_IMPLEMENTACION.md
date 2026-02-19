# Resumen de Implementación - Notificaciones y Reportes

## ✅ PARTE 1: NOTIFICACIONES STOCK BAJO - COMPLETADO

### Función `verificarStockBajo` Creada
**Ubicación:** `src/services/notificationService.js`

**Características implementadas:**
- ✅ Obtiene cantidad actual del inventario en ubicación específica
- ✅ Obtiene stock_minimo global del producto
- ✅ Compara si cantidad <= stock_minimo
- ✅ Verifica que no exista notificación activa del mismo tipo para ese producto y ubicación
- ✅ Crea notificación tipo "stock_bajo" prioridad "media"
- ✅ Notifica a todos los usuarios con acceso a esa ubicación + admins globales
- ✅ Deduplicación completa (no crea si ya existe notificación activa)

### Integraciones Completadas

#### 1. `confirmarTransferencia` ✅
**Archivo:** `src/services/firestoreService.js` (líneas 1037-1051)
```javascript
// Verifica stock bajo en origen y destino después de confirmar transferencia
for (const detalle of detalles) {
  await verificarStockBajo(detalle.producto_id, movimiento.origen_id)
  await verificarStockBajo(detalle.producto_id, movimiento.destino_id)
}
```

#### 2. `ejecutarConteo` ✅
**Archivo:** `src/services/firestoreService.js` (líneas 1377-1388)
```javascript
// Verifica stock bajo después de actualizar inventario con resultados de conteo
if (data.productos && data.productos.length > 0) {
  for (const prod of data.productos) {
    await verificarStockBajo(prod.producto_id, data.ubicacion_id)
  }
}
```

### Funciones Pendientes de Integración

Las siguientes funciones mencionadas en la solicitud **NO EXISTEN** en el código actual:
- ❌ `completarVenta` - No existe como función separada
- ❌ `registrarSalida` - No existe como función separada
- ❌ `registrarRecepcion` - Existe `iniciarRecepcion` pero no actualiza inventario
- ❌ `registrarMerma` - No existe como función separada

**Nota:** Estas operaciones probablemente se manejan a través de `createTransferencia` con diferentes `tipo_movimiento`. Si existen otras funciones que actualicen inventario, se debe integrar `verificarStockBajo` de la misma manera.

---

## ✅ PARTE 2: NOTIFICACIONES CONTEOS PENDIENTES - COMPLETADO

### Cloud Function Implementada
**Archivo:** `functions/index.js`

**Características:**
- ✅ Se ejecuta diariamente a las 8:00 AM (configurable)
- ✅ Lee configuración desde Firestore (`configuracion_notificaciones/global`)
- ✅ Verifica frecuencia de conteos (default: 7 días)
- ✅ Itera todas las ubicaciones activas
- ✅ Para cada producto en inventario, busca último conteo completado
- ✅ Calcula días transcurridos desde último conteo
- ✅ Crea notificación consolidada si hay productos pendientes
- ✅ Deduplicación: verifica que no exista notificación activa del mismo día para la ubicación
- ✅ Notificaciones agrupadas si >3 productos

### Archivos Creados

1. **`functions/package.json`**
   - Configuración de dependencias
   - Scripts para deploy y testing

2. **`functions/index.js`**
   - Cloud Function `verificarConteosPendientes`
   - Lógica completa de verificación y notificación

3. **`scripts/init-config-notificaciones.js`**
   - Script para crear documento de configuración en Firestore
   - Ejecutar: `node scripts/init-config-notificaciones.js`

### Configuración Requerida en Firestore

**Colección:** `configuracion_notificaciones`
**Documento:** `global`

```javascript
{
  horario_notificaciones_conteo: "08:00",
  frecuencia_conteo_dias: 7,
  notificaciones_conteo_activas: true,
  timezone: "America/Mexico_City",
  created_at: Timestamp,
  updated_at: Timestamp,
  version: "1.0.0"
}
```

### Pasos para Deployment

```bash
# 1. Instalar dependencias
cd functions
npm install

# 2. Inicializar configuración
cd ..
node scripts/init-config-notificaciones.js

# 3. Desplegar Cloud Function
firebase deploy --only functions

# 4. Verificar logs
firebase functions:log --only verificarConteosPendientes

# 5. Probar manualmente
firebase functions:shell
verificarConteosPendientes()
```

### Testing

**Cambiar schedule para testing:**
```javascript
// En functions/index.js, cambiar temporalmente:
.schedule('* * * * *') // Cada minuto para testing

// Luego revertir a:
.schedule('0 8 * * *') // 8:00 AM diario
```

---

## ⏳ PARTE 3: REPORTES CONSOLIDADOS MULTI-UBICACIÓN - PENDIENTE

### Análisis del Código Actual

**Archivo:** `src/pages/Reportes.jsx`

**Estado actual:**
- Selector de ubicación es **single-select** (línea 62: `filterUbicacion`)
- Reportes filtran por una sola ubicación a la vez
- No hay lógica de consolidación multi-ubicación
- No hay tablas expandibles
- Exportación es CSV simple, no Excel multi-hoja

### Implementación Requerida

#### 1. Modificar Selector de Ubicaciones
```jsx
// Cambiar de:
const [filterUbicacion, setFilterUbicacion] = useState('')

// A:
const [filterUbicaciones, setFilterUbicaciones] = useState([])

// Componente multi-select con checkboxes
<MultiSelectUbicaciones 
  ubicaciones={userUbicaciones}
  selected={filterUbicaciones}
  onChange={setFilterUbicaciones}
/>
```

#### 2. Queries Paralelos y Consolidación
```javascript
const getConsolidatedData = async (ubicacionesIds) => {
  // Ejecutar queries en paralelo
  const promises = ubicacionesIds.map(id => 
    dataService.getInventario(id)
  )
  const results = await Promise.all(promises)
  
  // Consolidar por producto_id
  const consolidated = {}
  results.forEach((inventario, idx) => {
    inventario.forEach(item => {
      if (!consolidated[item.producto_id]) {
        consolidated[item.producto_id] = {
          producto_id: item.producto_id,
          total_unidades: 0,
          valor_total: 0,
          por_ubicacion: []
        }
      }
      consolidated[item.producto_id].total_unidades += item.stock_actual
      consolidated[item.producto_id].por_ubicacion.push({
        ubicacion_id: ubicacionesIds[idx],
        cantidad: item.stock_actual
      })
    })
  })
  
  return Object.values(consolidated)
}
```

#### 3. Tabla Expandible
```jsx
<Table>
  <TableHeader>
    <TableRow>
      <TableCell>Producto</TableCell>
      <TableCell>Total Unidades</TableCell>
      <TableCell>Valor Total</TableCell>
      <TableCell>Desglose</TableCell>
    </TableRow>
  </TableHeader>
  <TableBody>
    {consolidatedData.map(item => (
      <ExpandableRow 
        key={item.producto_id}
        producto={item}
        ubicaciones={ubicaciones}
      />
    ))}
  </TableBody>
</Table>

// Componente ExpandableRow
function ExpandableRow({ producto, ubicaciones }) {
  const [expanded, setExpanded] = useState(false)
  
  return (
    <>
      <TableRow onClick={() => setExpanded(!expanded)}>
        <TableCell>{producto.nombre}</TableCell>
        <TableCell>{producto.total_unidades}</TableCell>
        <TableCell>${producto.valor_total}</TableCell>
        <TableCell>
          <ChevronDown className={expanded ? 'rotate-180' : ''} />
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={4}>
            <SubTable>
              {producto.por_ubicacion.map(ub => (
                <SubTableRow key={ub.ubicacion_id}>
                  <td>{ubicaciones.find(u => u.id === ub.ubicacion_id)?.nombre}</td>
                  <td>{ub.cantidad}</td>
                </SubTableRow>
              ))}
            </SubTable>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
```

#### 4. KPIs Consolidados
```jsx
<div className="grid grid-cols-3 gap-4">
  <Card>
    <h3>Total Productos Únicos</h3>
    <p className="text-3xl">{consolidatedData.length}</p>
  </Card>
  <Card>
    <h3>Suma Total Inventario</h3>
    <p className="text-3xl">
      {consolidatedData.reduce((sum, p) => sum + p.total_unidades, 0)}
    </p>
  </Card>
  <Card>
    <h3>Productos en Stock Bajo</h3>
    <p className="text-3xl text-red-600">
      {consolidatedData.filter(p => 
        p.por_ubicacion.some(ub => 
          ub.cantidad <= productos.find(pr => pr.id === p.producto_id)?.stock_minimo
        )
      ).length}
    </p>
  </Card>
</div>
```

#### 5. Gráficos
```jsx
import { PieChart, BarChart } from 'recharts'

// Pie Chart - Distribución por ubicación
<PieChart data={
  ubicaciones.map(ub => ({
    name: ub.nombre,
    value: consolidatedData.reduce((sum, p) => {
      const ubData = p.por_ubicacion.find(u => u.ubicacion_id === ub.id)
      return sum + (ubData?.cantidad || 0)
    }, 0)
  }))
} />

// Bar Chart - Top productos por ubicación
<BarChart data={
  consolidatedData.slice(0, 10).map(p => ({
    producto: p.nombre,
    ...ubicaciones.reduce((obj, ub) => {
      const ubData = p.por_ubicacion.find(u => u.ubicacion_id === ub.id)
      obj[ub.nombre] = ubData?.cantidad || 0
      return obj
    }, {})
  }))
} />
```

#### 6. Exportación Excel Multi-Hoja
```javascript
import * as XLSX from 'xlsx'

const exportToExcelMultiSheet = (consolidatedData, ubicaciones) => {
  const wb = XLSX.utils.book_new()
  
  // Hoja 1: Consolidado
  const consolidadoData = consolidatedData.map(p => ({
    'Producto': p.nombre,
    'Total Unidades': p.total_unidades,
    'Valor Total': p.valor_total,
    'Stock Mínimo': p.stock_minimo,
    'Estado': p.total_unidades <= p.stock_minimo ? 'BAJO' : 'NORMAL'
  }))
  const ws1 = XLSX.utils.json_to_sheet(consolidadoData)
  XLSX.utils.book_append_sheet(wb, ws1, 'Consolidado')
  
  // Hojas individuales por ubicación
  ubicaciones.forEach(ub => {
    const ubData = consolidatedData.map(p => {
      const ubInfo = p.por_ubicacion.find(u => u.ubicacion_id === ub.id)
      return {
        'Producto': p.nombre,
        'Cantidad': ubInfo?.cantidad || 0,
        'Stock Mínimo': p.stock_minimo,
        'Estado': (ubInfo?.cantidad || 0) <= p.stock_minimo ? 'BAJO' : 'NORMAL'
      }
    }).filter(item => item.Cantidad > 0)
    
    const ws = XLSX.utils.json_to_sheet(ubData)
    XLSX.utils.book_append_sheet(wb, ws, ub.nombre.substring(0, 30))
  })
  
  // Descargar
  XLSX.writeFile(wb, `Reporte_Consolidado_${new Date().toISOString().split('T')[0]}.xlsx`)
}
```

### Dependencias Requeridas

```bash
npm install xlsx recharts
```

### Archivos a Modificar

1. **`src/pages/Reportes.jsx`**
   - Cambiar selector a multi-select
   - Implementar lógica de consolidación
   - Crear tabla expandible
   - Agregar KPIs y gráficos
   - Implementar exportación Excel

2. **`src/components/reportes/MultiSelectUbicaciones.jsx`** (nuevo)
   - Componente de selección múltiple con checkboxes

3. **`src/components/reportes/ConsolidatedTable.jsx`** (nuevo)
   - Tabla expandible con desglose por ubicación

4. **`src/utils/excelExport.js`** (nuevo)
   - Utilidades para exportación Excel multi-hoja

---

## 📋 CHECKLIST DE VALIDACIÓN

### Parte 1: Stock Bajo ✅
- [x] Función verificarStockBajo creada con deduplicación
- [x] Integrada en confirmarTransferencia
- [x] Integrada en ejecutarConteo
- [ ] Probar: Transferencia que deja stock <= mínimo dispara notificación
- [ ] Probar: Conteo que resulta en stock <= mínimo dispara notificación
- [ ] Probar: Notificación no se duplica si ya existe activa

### Parte 2: Conteos Pendientes ✅
- [x] Cloud Function creada
- [x] Script de inicialización creado
- [x] Configuración documentada
- [ ] Ejecutar script de inicialización
- [ ] Desplegar Cloud Function
- [ ] Probar ejecución manual
- [ ] Verificar notificaciones se crean correctamente
- [ ] Confirmar deduplicación funciona

### Parte 3: Reportes Consolidados ⏳
- [ ] Modificar selector a multi-select
- [ ] Implementar queries paralelos
- [ ] Crear lógica de consolidación
- [ ] Implementar tabla expandible
- [ ] Agregar KPIs consolidados
- [ ] Crear gráficos (pie + bar)
- [ ] Implementar exportación Excel multi-hoja
- [ ] Probar con 2+ ubicaciones seleccionadas
- [ ] Verificar sumas correctas
- [ ] Verificar desglose por ubicación

---

## 🚀 PRÓXIMOS PASOS

### Inmediatos (Parte 1 y 2)
1. **Probar notificaciones de stock bajo:**
   ```
   - Crear transferencia
   - Confirmarla dejando stock <= mínimo
   - Verificar notificación en panel
   - Confirmar no se duplica
   ```

2. **Desplegar Cloud Function:**
   ```bash
   cd functions
   npm install
   cd ..
   node scripts/init-config-notificaciones.js
   firebase deploy --only functions
   ```

3. **Probar Cloud Function:**
   ```bash
   firebase functions:shell
   verificarConteosPendientes()
   ```

### Pendientes (Parte 3)
1. Instalar dependencias: `npm install xlsx recharts`
2. Crear componentes nuevos (MultiSelectUbicaciones, ConsolidatedTable)
3. Modificar Reportes.jsx con toda la lógica de consolidación
4. Implementar exportación Excel
5. Testing exhaustivo con múltiples ubicaciones

---

## 📝 NOTAS IMPORTANTES

1. **Stock Bajo:** La función `verificarStockBajo` es reutilizable y se puede integrar en cualquier función que actualice inventario.

2. **Conteos Pendientes:** La Cloud Function requiere Firebase Blaze Plan (pago por uso). Alternativa: implementar cron job en servidor propio.

3. **Reportes Consolidados:** Implementación compleja que requiere refactorización significativa de la página de Reportes. Estimación: 4-6 horas de desarrollo.

4. **Performance:** Con múltiples ubicaciones, considerar paginación y lazy loading para tablas grandes.

5. **Permisos:** Verificar que usuarios solo vean datos de ubicaciones a las que tienen acceso.
