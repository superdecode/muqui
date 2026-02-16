# Estructura de Colecciones en Firestore

Este documento describe la estructura de datos en Firestore para el Sistema de Inventario Muqui.

## Colecciones Principales

### 1. empresas
Almacena información de las empresas del sistema.

```javascript
{
  id: "EMP001",
  nombre: "Empresa Principal",
  ruc: "12345678901",
  direccion: "Av. Principal 123",
  telefono: "987654321",
  email: "empresa@example.com",
  estado: "ACTIVO"
}
```

### 2. usuarios
Información de los usuarios del sistema.

```javascript
{
  id: "USR001",
  nombre: "Juan Pérez",
  email: "juan@example.com",
  rol: "ADMINISTRADOR", // ADMINISTRADOR, SUPERVISOR, OPERADOR, AUDITOR
  empresa_id: "EMP001",
  ubicacion_id: "UB01",
  estado: "ACTIVO",
  created_at: Timestamp,
  updated_at: Timestamp
}
```

### 3. productos
Catálogo de productos.

```javascript
{
  id: "PROD001",
  nombre: "Martillo",
  especificacion: "Grande de 2kg",
  concatenado: "Martillo Grande de 2kg", // nombre + especificacion
  unidad_medida: "UND", // UND, KG, LT, MT, etc.
  categoria: "HERRAMIENTAS",
  stock_minimo: 10,
  frecuencia_inventario_Dias: 30,
  estado: "ACTIVO", // ACTIVO, INACTIVO, ELIMINADO
  ubicacion_id: ["UB01", "UB02"], // Ubicaciones donde está disponible
  created_at: Timestamp,
  updated_at: Timestamp
}
```

### 4. ubicaciones
Almacenes, tiendas, sucursales, etc.

```javascript
{
  id: "UB01",
  nombre: "Almacén Principal",
  tipo: "ALMACEN", // ALMACEN, TIENDA, SUCURSAL, TRANSPORTE
  direccion: "Calle Principal 123",
  responsable_id: "USR001",
  empresa_id: "EMP001",
  estado: "ACTIVO"
}
```

### 5. inventario
Stock actual de productos por ubicación.

```javascript
{
  id: "INV001",
  producto_id: "PROD001",
  ubicacion_id: "UB01",
  stock_actual: 50,
  stock_minimo: 10,
  ultima_actualizacion: Timestamp
}
```

### 6. movimientos
Transferencias, entradas, salidas de inventario.

```javascript
{
  id: "MV001",
  tipo_movimiento: "TRANSFERENCIA", // TRANSFERENCIA, ENTRADA, SALIDA, AJUSTE
  origen_id: "UB01",
  destino_id: "UB02",
  estado: "PENDIENTE", // PENDIENTE, CONFIRMADO, CANCELADO
  usuario_creacion_id: "USR001",
  usuario_confirmacion_id: "USR002",
  fecha_creacion: Timestamp,
  fecha_confirmacion: Timestamp,
  fecha_limite_edicion: "2024-12-31",
  observaciones_creacion: "Transferencia mensual",
  observaciones_confirmacion: "Recibido conforme"
}
```

### 7. detalle_movimientos
Detalles de productos en cada movimiento.

```javascript
{
  id: "DM001",
  movimiento_id: "MV001",
  producto_id: "PROD001",
  cantidad: 20,
  observaciones: "En buen estado"
}
```

### 8. conteos
Conteos físicos de inventario programados.

```javascript
{
  id: "CONT001",
  ubicacion_id: "UB01",
  tipo_ubicacion: "ALMACEN",
  tipo_conteo: "COMPLETO", // COMPLETO, PARCIAL, CICLICO
  estado: "PENDIENTE", // PENDIENTE, EN_PROCESO, COMPLETADO, CANCELADO
  usuario_responsable_id: "USR001",
  usuario_ejecutor_id: "USR003",
  fecha_programada: "2024-01-15",
  fecha_inicio: Timestamp,
  fecha_completado: Timestamp,
  observaciones: "Conteo mensual programado",
  created_at: Timestamp
}
```

### 9. detalle_conteos
Detalles del conteo físico por producto.

```javascript
{
  id: "DC001",
  conteo_id: "CONT001",
  producto_id: "PROD001",
  cantidad_sistema: 50,
  cantidad_fisica: 48,
  diferencia: -2,
  observaciones: "2 unidades dañadas",
  contado: true
}
```

### 10. alertas
Alertas y notificaciones del sistema.

```javascript
{
  id: "ALT001",
  tipo: "STOCK_BAJO", // STOCK_BAJO, VENCIMIENTO, CONTEO_PENDIENTE
  prioridad: "ALTA", // ALTA, MEDIA, BAJA
  producto_id: "PROD001",
  ubicacion_id: "UB01",
  mensaje: "Stock bajo: 5 unidades disponibles",
  usuarios_notificados: ["USR001", "USR002"],
  leido: false,
  fecha_creacion: Timestamp,
  fecha_resolucion: Timestamp
}
```

## Índices Recomendados

Para optimizar las consultas, crea estos índices en Firestore:

### productos
- `estado` (Ascending)
- `categoria` (Ascending)
- `created_at` (Descending)

### inventario
- `ubicacion_id` (Ascending) + `stock_actual` (Ascending)
- `producto_id` (Ascending) + `ubicacion_id` (Ascending)

### movimientos
- `origen_id` (Ascending) + `fecha_creacion` (Descending)
- `destino_id` (Ascending) + `fecha_creacion` (Descending)
- `estado` (Ascending) + `fecha_creacion` (Descending)

### conteos
- `ubicacion_id` (Ascending) + `fecha_programada` (Descending)
- `estado` (Ascending) + `fecha_programada` (Descending)

### alertas
- `usuarios_notificados` (Array-contains) + `fecha_creacion` (Descending)
- `tipo` (Ascending) + `leido` (Ascending)

## Reglas de Seguridad Recomendadas

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Función helper para verificar autenticación
    function isSignedIn() {
      return request.auth != null;
    }

    // Función para verificar rol de usuario
    function hasRole(role) {
      return isSignedIn() &&
             get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.rol == role;
    }

    // Empresas - Solo lectura para usuarios autenticados
    match /empresas/{empresa} {
      allow read: if isSignedIn();
      allow write: if hasRole('ADMINISTRADOR');
    }

    // Usuarios - Pueden leer su propia info, admin puede todo
    match /usuarios/{usuario} {
      allow read: if isSignedIn();
      allow write: if hasRole('ADMINISTRADOR');
    }

    // Productos - Lectura para todos, escritura para admin y supervisor
    match /productos/{producto} {
      allow read: if isSignedIn();
      allow write: if hasRole('ADMINISTRADOR') || hasRole('SUPERVISOR');
    }

    // Ubicaciones - Lectura para todos
    match /ubicaciones/{ubicacion} {
      allow read: if isSignedIn();
      allow write: if hasRole('ADMINISTRADOR');
    }

    // Inventario - Lectura para todos, escritura para operadores+
    match /inventario/{item} {
      allow read: if isSignedIn();
      allow write: if isSignedIn() &&
                      (hasRole('ADMINISTRADOR') ||
                       hasRole('SUPERVISOR') ||
                       hasRole('OPERADOR'));
    }

    // Movimientos - Según rol
    match /movimientos/{movimiento} {
      allow read: if isSignedIn();
      allow create: if isSignedIn();
      allow update: if isSignedIn() &&
                       (hasRole('ADMINISTRADOR') ||
                        hasRole('SUPERVISOR'));
    }

    // Detalle de movimientos
    match /detalle_movimientos/{detalle} {
      allow read: if isSignedIn();
      allow write: if isSignedIn();
    }

    // Conteos
    match /conteos/{conteo} {
      allow read: if isSignedIn();
      allow write: if isSignedIn();
    }

    // Detalle de conteos
    match /detalle_conteos/{detalle} {
      allow read: if isSignedIn();
      allow write: if isSignedIn();
    }

    // Alertas - Los usuarios pueden leer sus propias alertas
    match /alertas/{alerta} {
      allow read: if isSignedIn() &&
                     request.auth.uid in resource.data.usuarios_notificados;
      allow write: if hasRole('ADMINISTRADOR') || hasRole('SUPERVISOR');
    }
  }
}
```

## Migración de Datos

Para migrar datos existentes desde Google Sheets o CSV a Firestore, usa el script:

```bash
node scripts/migrateData.js
```

Ver [scripts/README.md](./scripts/README.md) para más detalles.

## Consultas Comunes

### Obtener inventario de una ubicación
```javascript
const inventario = await getDocs(
  query(
    collection(db, 'inventario'),
    where('ubicacion_id', '==', 'UB01')
  )
)
```

### Obtener productos con stock bajo
```javascript
const productos = await getDocs(
  query(
    collection(db, 'inventario'),
    where('stock_actual', '<=', db.FieldPath.documentId().stock_minimo)
  )
)
```

### Obtener movimientos pendientes
```javascript
const movimientos = await getDocs(
  query(
    collection(db, 'movimientos'),
    where('estado', '==', 'PENDIENTE'),
    orderBy('fecha_creacion', 'desc')
  )
)
```

### Obtener alertas no leídas de un usuario
```javascript
const alertas = await getDocs(
  query(
    collection(db, 'alertas'),
    where('usuarios_notificados', 'array-contains', 'USR001'),
    where('leido', '==', false),
    orderBy('fecha_creacion', 'desc')
  )
)
```
