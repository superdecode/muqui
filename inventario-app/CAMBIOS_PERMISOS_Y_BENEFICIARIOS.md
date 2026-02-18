# Cambios Implementados: Permisos, Roles y Beneficiarios

## Fecha: 17 de Febrero, 2026

---

## 1. ✅ Corrección de Visualización de Roles

### Problema
Los roles se mostraban como IDs de Firestore (`ZxzUoDDXHb9xbjZ02NjG`) en lugar de nombres legibles.

### Solución
- **`authService.js`**: Modificado para asegurar que `user.rol` siempre contenga el nombre legible del rol (`nombre`), no el ID de Firestore.
- **`Administracion.jsx`**: Ya tenía lógica de fallback para mostrar roles por nombre o ID.

### Archivos Modificados
- `src/services/authService.js` (líneas 79-82)

---

## 2. ✅ Seguridad en Botones (Permisos de Escritura)

### Problema
Los botones de acción no estaban protegidos adecuadamente para usuarios con permisos de "Lectura".

### Solución
- **Nuevo Hook**: `src/hooks/usePermissions.js` - Hook centralizado para verificar permisos.
- **Funciones disponibles**:
  - `canEdit(modulo)` - Verifica si el usuario puede editar (escritura o total)
  - `canDelete(modulo)` - Verifica si el usuario puede eliminar (solo total)
  - `canView(modulo)` - Verifica si el usuario puede ver el módulo
  - `isReadOnly(modulo)` - Verifica si el usuario es solo lectura
  - `isAdmin()` - Verifica si el usuario es administrador

### Implementación en Movimientos
- Botón "Nuevo Movimiento": Oculto para usuarios de lectura
- Botón "Confirmar Recepción": Deshabilitado para usuarios de lectura
- Botón "Eliminar": Deshabilitado para usuarios de lectura
- Todos los botones respetan `canWriteMovimientos`

### Archivos Modificados
- `src/hooks/usePermissions.js` (NUEVO)
- `src/pages/Movimientos.jsx` (líneas 12, 28-34, 292-293, 312-320, 454-459, 627, 635)

---

## 3. ✅ Lógica de Transferencias (Origen vs. Destino)

### Implementación Actual (Ya Correcta)
La lógica de filtrado ya estaba correctamente implementada:

- **Vista de Salidas**: Muestra movimientos donde `origen_id` coincide con las ubicaciones asignadas al usuario
- **Vista de Recepciones**: Muestra movimientos donde `destino_id` coincide con las ubicaciones asignadas al usuario

### Ubicación del Código
- `src/pages/Movimientos.jsx` (líneas 169-187)

---

## 4. ✅ Creación de Transferencias (Destino Multisede)

### Problema
El selector de "Sede Destino" solo mostraba las ubicaciones asignadas directamente al usuario, no todas las sedes de las empresas autorizadas.

### Solución
- **Origen**: Bloqueado a las ubicaciones asignadas al usuario (correcto)
- **Destino**: Ahora muestra TODAS las sedes que pertenecen a las empresas autorizadas del usuario

### Implementación
```javascript
// Ubicaciones para ORIGEN: solo las asignadas al usuario
const ubicaciones = todasUbicaciones.filter(ubicacion => {
  return ubicacionIds.includes(ubicacion.id)
})

// Ubicaciones para DESTINO: todas las sedes de empresas autorizadas
const ubicacionesDestino = todasUbicaciones.filter(ubicacion => {
  return empresaIds.includes(ubicacion.empresa_id)
})
```

### Archivos Modificados
- `src/components/transferencias/TransferenciaForm.jsx` (líneas 32-73, 404)

---

## 5. ✅ Módulo de Beneficiarios

### Nueva Colección: `beneficiarios`

#### Estructura de Documento
```javascript
{
  nombre: String (obligatorio),
  identificacion: String (obligatorio),
  telefono: String (opcional),
  direccion: String (opcional),
  poblado: String (opcional),
  fecha_creacion: Timestamp,
  estado: 'ACTIVO' | 'INACTIVO'
}
```

#### Operaciones CRUD Disponibles
- `getBeneficiarios()` - Obtener todos los beneficiarios
- `createBeneficiario(data)` - Crear nuevo beneficiario
- `updateBeneficiario(id, data)` - Actualizar beneficiario
- `deleteBeneficiario(id)` - Desactivar beneficiario (soft delete)

### Integración en UI
- **TransferenciaForm**: Selector de beneficiarios en modo "VENTA"
- Los beneficiarios se cargan dinámicamente desde Firestore
- Solo se muestran beneficiarios activos (`estado !== 'INACTIVO'`)

### Archivos Modificados
- `src/services/firestoreService.js` (líneas 1763-1804)
- `src/services/dataService.js` (líneas 200-212)
- `src/components/transferencias/TransferenciaForm.jsx` (líneas 81-86, 95, 424-426)

---

## 6. ✅ Módulo de Razones de Merma

### Nueva Colección: `razones_merma`

#### Estructura de Documento
```javascript
{
  nombre: String (obligatorio),
  descripcion: String (opcional),
  fecha_creacion: Timestamp,
  estado: 'ACTIVO' | 'INACTIVO'
}
```

#### Datos Iniciales (Seed)
1. **DAÑO** - Producto dañado físicamente
2. **PRODUCTO VENCIDO** - Producto que ha superado su fecha de vencimiento
3. **MERMA** - Pérdida natural del producto
4. **ROBO** - Producto robado o extraviado

#### Operaciones CRUD Disponibles
- `getRazonesMerma()` - Obtener todas las razones
- `createRazonMerma(data)` - Crear nueva razón
- `updateRazonMerma(id, data)` - Actualizar razón
- `deleteRazonMerma(id)` - Desactivar razón (soft delete)

### Integración en UI
- **TransferenciaForm**: Selector de razones de merma en modo "MERMA"
- Las razones se cargan dinámicamente desde Firestore
- Solo se muestran razones activas (`estado !== 'INACTIVO'`)
- **Ventaja**: Si agregas nuevas razones desde Firebase Console, aparecerán automáticamente en el dropdown

### Archivos Modificados
- `src/services/firestoreService.js` (líneas 1806-1844)
- `src/services/dataService.js` (líneas 214-226)
- `src/components/transferencias/TransferenciaForm.jsx` (líneas 88-96, 261-262, 442-444)
- `src/utils/seedRazonesMerma.js` (NUEVO - Script de inicialización)

---

## 7. 📋 Instrucciones de Inicialización

### Poblar Razones de Merma (Primera Vez)

1. **Abrir la aplicación** en el navegador
2. **Abrir la consola del navegador** (F12 o Cmd+Option+I)
3. **Ejecutar el siguiente comando**:
   ```javascript
   window.seedRazonesMerma()
   ```
4. **Verificar el resultado**: Deberías ver mensajes de confirmación en la consola:
   ```
   📝 Creando razones de merma iniciales...
   ✅ Creada: DAÑO
   ✅ Creada: PRODUCTO VENCIDO
   ✅ Creada: MERMA
   ✅ Creada: ROBO
   ✅ Razones de merma creadas exitosamente!
   ```

**Nota**: El script verifica si ya existen razones antes de crear nuevas, por lo que es seguro ejecutarlo múltiples veces.

---

## 8. 🔒 Resumen de Seguridad

### Niveles de Permisos
- **Sin Acceso**: Módulo oculto en sidebar, bloqueado por `PermissionRoute`
- **Lectura**: Módulo visible, todos los botones de crear/editar/eliminar ocultos o deshabilitados
- **Escritura**: Crear/editar permitido, botones de eliminar ocultos
- **Total**: Acceso completo incluyendo eliminar

### Verificación de Permisos
```javascript
// Ejemplo de uso en componentes
import { usePermissions } from '../hooks/usePermissions'

const { canEdit, isReadOnly } = usePermissions()
const canWriteMovimientos = canEdit('movimientos')

// En botones
{canWriteMovimientos && (
  <Button onClick={handleCreate}>Nuevo</Button>
)}

// Deshabilitar botones
<Button disabled={isReadOnly('movimientos')}>Guardar</Button>
```

---

## 9. ✅ Build y Verificación

### Estado del Build
✅ **Build exitoso** - Sin errores de compilación
- Vite 5.4.21
- 2311 módulos transformados
- Bundle size: 1,066.24 kB (261.16 kB gzip)

### Archivos Creados
1. `src/hooks/usePermissions.js` - Hook de permisos centralizado
2. `src/utils/seedRazonesMerma.js` - Script de inicialización

### Archivos Modificados
1. `src/services/authService.js` - Fix de rol nombre
2. `src/services/firestoreService.js` - CRUD beneficiarios y razones_merma
3. `src/services/dataService.js` - Exposición de nuevos métodos
4. `src/pages/Movimientos.jsx` - Permisos y filtros
5. `src/components/transferencias/TransferenciaForm.jsx` - Destino multisede y nuevas colecciones

---

## 10. 🎯 Próximos Pasos Recomendados

1. **Inicializar razones_merma** usando `window.seedRazonesMerma()` en consola
2. **Crear beneficiarios** desde la UI (cuando se implemente el módulo de administración)
3. **Verificar permisos** con usuarios de diferentes roles (Lectura, Escritura, Total)
4. **Probar transferencias** con destinos de diferentes empresas
5. **Validar filtros** de salidas y recepciones por ubicación del usuario

---

## 📝 Notas Técnicas

- Todas las colecciones usan **soft delete** (`estado: 'INACTIVO'`) en lugar de eliminación física
- Los dropdowns filtran automáticamente elementos inactivos
- Las consultas usan `orderBy` para ordenar alfabéticamente
- Los timestamps usan `serverTimestamp()` para consistencia
- Los IDs se generan automáticamente con `doc(collection())`

---

**Documento generado automáticamente - 17 de Febrero, 2026**
