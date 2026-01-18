# 📊 Estructura de Base de Datos Actualizada

## ✅ Cambios Implementados

He actualizado completamente la aplicación para que funcione con la nueva estructura multi-empresa y multi-ubicación de Google Sheets.

---

## 🗂️ Estructura de Pestañas de Google Sheets

### 1. **Usuarios**
```
Columnas:
- id (USR001, USR002, etc.)
- email
- password
- nombre
- rol (ADMIN_GLOBAL, GERENTE_OPERATIVO, etc.)
- empresa_id (MK001, MK010, etc.)
- ubicaciones_asignadas (array: "LM001","LM004","LM005")
- estado (ACTIVO/INACTIVO)
- fecha_creacion
```

**Ejemplo:**
```
USR001 | muqui.coo@gmail.com | temporal123 | Admin Global | ADMIN_GLOBAL | MK001 | "LM001","LM004","LM005" | ACTIVO | 2025-01-01
```

### 2. **Empresas**
```
Columnas:
- id (MK001, MK010, etc.)
- nombre
- tipo (CORPORATIVO, FRANQUICIADO)
- estado
- fecha_creacion
```

**Ejemplo:**
```
MK001 | Muqui | CORPORATIVO | ACTIVO | 2025-01-01
MK010 | Quiron Elements | FRANQUICIADO | ACTIVO | 2025-01-01
```

### 3. **Productos**
```
Columnas:
- id (PROD001, PROD002, etc.)
- nombre
- especificacion
- unidad_medida
- concatenado
- stock_minimo
- frecuencia_inventario_Dias
- categoria
- estado
- ubicacion_id (array de ubicaciones donde está disponible)
```

**Ejemplo:**
```
PROD001 | TAPIOCA | 3 KG | UNIDAD | TAPIOCA (3 KG) - UNIDAD | 5 | 1 | IMPORTANTE | ACTIVO | "LM001","LM004","LM005"
```

**Nota:** `ubicacion_id` define en qué tiendas/bodegas está disponible este producto para inventariar.

### 4. **Ubicaciones**
```
Columnas:
- id (LM001, LM004, etc.)
- nombre
- empresa_id
- direccion
- responsable_id
- tipo_ubicacion (BODEGA, PUNTO_VENTA)
- estado
- fecha_creacion
```

**Ejemplo:**
```
LM001 | Bodega Principal Corporativa | MK001 | Dirección Bodega 1 | USR001 | BODEGA | ACTIVO | 2025-01-01
LM004 | San Pedro Plaza | MK010 | Neiva, Huila | USR002 | PUNTO_VENTA | ACTIVO | 2025-01-01
```

**Nota:** Una empresa puede tener múltiples bodegas y puntos de venta. Solo administradores pueden ver bodegas.

### 5. **Inventario**
```
Columnas:
- id (INV001, INV002, etc.)
- producto_id
- producto
- ubicacion_id
- ubicacion
- stock_actual
- especificacion
- unidad_medida
- categoria
- ultima_actualizacion
```

**Ejemplo:**
```
INV001 | PROD001 | TAPIOCA | LM001 | Bodega Principal Corporativa | 50 | 3KG | UNIDAD | IMPORTANTE | 2025-01-15 10:00:00
```

### 6. **Movimientos**
```
Columnas:
- id (MV001, MV002, etc.)
- tipo_movimiento (TRANSFERENCIA, ENTRADA, SALIDA)
- origen_id
- destino_id
- estado (PENDIENTE, CONFIRMADA, CANCELADA)
- usuario_creacion_id
- usuario_confirmacion_id
- fecha_creacion
- fecha_confirmacion
- fecha_limite_edicion
- observaciones_creacion
- observaciones_confirmacion
```

**Ejemplo:**
```
MV001 | TRANSFERENCIA | LM001 | LM005 | PENDIENTE | USR002 | | 2025-01-15 09:00:00 | | 2025-01-15 23:59:59 | Pedido semanal |
```

### 7. **Detalle_movimientos**
```
Columnas:
- id (DM001, DM002, etc.)
- movimiento_id
- producto_id
- cantidad
- observaciones
```

**Ejemplo:**
```
DM001 | MV001 | PROD001 | 10 | Urgente
```

### 8. **Conteo**
```
Columnas:
- id (CONT001, CONT002, etc.)
- ubicacion_id
- tipo_ubicacion
- tipo_conteo (DIARIO, SEMANAL, MENSUAL)
- estado (PENDIENTE, EN_PROCESO, COMPLETADO)
- usuario_responsable_id
- usuario_ejecutor_id
- fecha_programada
- fecha_inicio
- fecha_completado
- observaciones
```

**Ejemplo:**
```
CONT001 | LM004 | PUNTO_VENTA | SEMANAL | PENDIENTE | USR003 | | 2025-01-20 | | | Conteo semanal rutinario
```

### 9. **Detalle_conteo**
```
Columnas:
- id (DC001, DC002, etc.)
- conteo_id
- producto_id
- cantidad_sistema
- cantidad_fisica
- diferencia
- observaciones
- contado (SI/NO)
```

**Ejemplo:**
```
DC001 | CONT001 | PROD001 | 8 | | | | NO
```

### 10. **Alertas**
```
Columnas:
- id (ALERT001, ALERT002, etc.)
- tipo (TRANSFERENCIA_SIN_CONFIRMAR, STOCK_BAJO, etc.)
- prioridad (ALTA, MEDIA, BAJA)
- entidad_relacionada_id
- tipo_entidad (TRANSFERENCIA, INVENTARIO, etc.)
- ubicacion_id
- mensaje
- estado (ACTIVA, RESUELTA)
- usuarios_notificados (array JSON: ["USR003"])
- fecha_creacion
- fecha_resolucion
```

**Ejemplo:**
```
ALERT001 | TRANSFERENCIA_SIN_CONFIRMAR | MEDIA | MV001 | TRANSFERENCIA | LM004 | Transferencia MV001 pendiente | ACTIVA | ["USR003"] | 2025-01-15 09:00:00 |
```

---

## 🔧 Servicios Actualizados

### Google Sheets API (`src/services/googleSheetsAPI.js`)
- ✅ `getEmpresas()` - Obtiene todas las empresas
- ✅ `getProductos()` - Parsea `ubicacion_id` como array
- ✅ `getUbicaciones()` - Incluye `empresa_id` y `tipo_ubicacion`
- ✅ `getInventario()` - Nueva estructura con especificación
- ✅ `getMovimientos()` - Reemplaza getTransferencias
- ✅ `getDetalleMovimientos()` - Detalles de movimientos
- ✅ `getConteos()` - Nueva estructura de conteos
- ✅ `getDetalleConteos()` - Detalles de conteos con diferencias
- ✅ `getAlertas()` - Parsea `usuarios_notificados` como JSON
- ✅ `getUsuarios()` - Parsea `ubicaciones_asignadas` como array

### Mock Data (`src/data/mockData.js`)
- ✅ `mockEmpresas` - Datos de empresas de prueba
- ✅ `mockUsers` - Usuarios con nueva estructura
- ✅ `mockUbicaciones` - Ubicaciones con empresa_id
- ✅ `mockProductos` - Productos con ubicacion_id array
- ✅ `mockInventario` - Inventario actualizado

---

## 🚀 Servidor Local Iniciado

**URL:** http://localhost:5174

**Credenciales de Prueba:**
```
Email: muqui.coo@gmail.com
Password: temporal123
```

O también:
```
Email: gerente@muqui.com
Password: temporal123
```

---

## 📝 Configuración de Variables de Entorno

**Archivo `.env` actual:**
```
VITE_USE_MOCK_DATA=false
VITE_USE_GOOGLE_SHEETS=true
VITE_GOOGLE_API_KEY=AIzaSyAnCEFz9o1DX9ymBW78iDcE6Z3ckOAb_Gg
VITE_GOOGLE_SHEETS_ID=1vQ_aMuS5pJgbQ4ua-a1sGhvW5TbqwkjnFukuDxXelcn-k9KeT1wHl79hSMpLnhO2-3KPB0pnKFxG-8g
VITE_APP_NAME=Sistema de Inventario Muqui
VITE_ENABLE_FIREBASE=false
```

---

## ✅ Build Exitoso

```
✓ 2330 modules transformed
✓ 366.73 kB JS (109.13 kB gzip)
✓ 33.75 kB CSS (6.19 kB gzip)
```

---

## 🎯 Características Multi-Empresa

### Permisos por Rol

**ADMIN_GLOBAL:**
- Acceso a todas las empresas y ubicaciones
- Puede ver bodegas y puntos de venta
- Gestión completa de usuarios y configuración

**GERENTE_OPERATIVO:**
- Acceso a ubicaciones asignadas en `ubicaciones_asignadas`
- Puede ver bodegas si está asignado
- Gestión de inventario y movimientos

**JEFE_PUNTO:**
- Solo acceso a su punto de venta asignado
- No puede ver bodegas
- Conteos y consultas de inventario

### Productos por Ubicación

Los productos tienen un campo `ubicacion_id` que es un array de ubicaciones donde está disponible:
```javascript
ubicacion_id: ['LM001', 'LM004', 'LM005']
```

Esto permite que cada producto solo aparezca en las ubicaciones donde realmente se maneja.

### Tipos de Movimientos

1. **TRANSFERENCIA:** Entre ubicaciones (bodega → tienda, tienda → tienda)
2. **ENTRADA:** Ingreso de mercancía (proveedor → bodega)
3. **SALIDA:** Salida de mercancía (ajustes, mermas, etc.)

---

## 🔄 Próximos Pasos para Deploy

1. **Actualizar Google Sheets** con la nueva estructura de columnas
2. **Publicar la hoja** en la web (Archivo → Compartir → Publicar en la web)
3. **Configurar variables en Vercel:**
   ```
   VITE_USE_MOCK_DATA=false
   VITE_USE_GOOGLE_SHEETS=true
   VITE_GOOGLE_API_KEY=AIzaSyAnCEFz9o1DX9ymBW78iDcE6Z3ckOAb_Gg
   VITE_GOOGLE_SHEETS_ID=1vQ_aMuS5pJgbQ4ua-a1sGhvW5TbqwkjnFukuDxXelcn-k9KeT1wHl79hSMpLnhO2-3KPB0pnKFxG-8g
   ```
4. **Deploy:** `vercel --prod --force`

---

**Fecha:** 17 de Enero, 2026  
**Versión:** 3.0.0 - Multi-Empresa  
**Estado:** ✅ Servidor Local Funcionando
