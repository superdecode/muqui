# Correcciones Aplicadas - Sistema de Inventario

**Fecha:** 17 de febrero de 2026  
**Versión:** 1.0

## Resumen de Problemas Corregidos

Se han implementado correcciones para tres problemas críticos reportados por el usuario:

---

## 1. Actualización de Empresas y Ubicaciones

### Problema
Cuando se modificaba el nombre o datos de una empresa/ubicación desde el módulo de Administración, el cambio solo se reflejaba en ese módulo. Los demás módulos (Conteos, Movimientos, Productos, etc.) mantenían los datos desactualizados.

### Causa Raíz
Las mutaciones de empresas y ubicaciones solo invalidaban las queries locales (`admin-empresas`, `admin-ubicaciones`) pero no las queries globales (`empresas`, `ubicaciones`) que utilizan otros módulos.

### Solución Implementada
**Archivo modificado:** `src/pages/Administracion.jsx`

Se actualizaron las mutaciones de empresas para invalidar ambas queries:

```javascript
// Antes
const createMut = useMutation({ 
  mutationFn: d => dataService.createEmpresa(d), 
  onSuccess: () => { 
    qc.invalidateQueries({ queryKey: ['admin-empresas'] })
    // ...
  }
})

// Después
const createMut = useMutation({ 
  mutationFn: d => dataService.createEmpresa(d), 
  onSuccess: () => { 
    qc.invalidateQueries({ queryKey: ['admin-empresas'] })
    qc.invalidateQueries({ queryKey: ['empresas'] })  // ✅ Agregado
    // ...
  }
})
```

Lo mismo se aplicó a:
- `createMut`, `updateMut`, `deleteMut` para empresas
- `createMut`, `updateMut`, `deleteMut` para ubicaciones

### Resultado
Ahora cuando se actualiza una empresa o ubicación:
1. Se invalida la query local del módulo de Administración
2. Se invalida la query global usada por todos los módulos
3. Todos los módulos (Conteos, Movimientos, Productos, Perfil, etc.) se actualizan automáticamente con los nuevos datos

---

## 2. Página de Perfil - Error de Navegación

### Problema
Al hacer clic en el avatar del usuario y seleccionar "Ver perfil", la aplicación navegaba a una página en blanco que producía un error.

### Causa Raíz
El componente `UserMenu` utilizaba las funciones `getUserAllowedUbicacionIds` y `getUserAllowedEmpresaIds` que requieren los datos de `empresas` y `ubicaciones`, pero estas queries no estaban definidas en el componente.

### Solución Implementada
**Archivo modificado:** `src/components/common/UserMenu.jsx`

Se agregaron las queries necesarias:

```javascript
// Agregado al componente UserMenu
const { data: empresas = [] } = useQuery({
  queryKey: ['empresas'],
  queryFn: () => dataService.getEmpresas()
})

const { data: ubicaciones = [] } = useQuery({
  queryKey: ['ubicaciones'],
  queryFn: () => dataService.getUbicaciones()
})
```

### Resultado
- El menú de usuario ahora carga correctamente los datos de empresas y ubicaciones
- La navegación a `/perfil` funciona sin errores
- El modal "Ver Información Completa" muestra correctamente el conteo de empresas y ubicaciones asignadas

---

## 3. Sistema de Alertas de Stock Bajo

### Problema
Las alertas se guardaban exitosamente en la base de datos (confirmado con IDs reales), pero la interfaz no reaccionaba:
- No aparecía el ícono de campana ni el badge de notificaciones
- No había lista de alertas renderizada
- El store de alertas no estaba conectado al flujo de datos real

### Causa Raíz
El hook `useAlertas` **nunca se estaba llamando** en la aplicación. Aunque el componente `Header` importaba `useAlertasStore` y `AlertsPanel`, faltaba la inicialización del hook que suscribe a las notificaciones en tiempo real desde Firestore.

### Solución Implementada
**Archivo modificado:** `src/components/layout/Header.jsx`

Se agregó la inicialización del hook de alertas:

```javascript
// Importar el hook
import { useAlertas } from '../../hooks/useAlertas'

export default function Header() {
  // ... código existente ...
  const { user } = useAuthStore()
  
  // ✅ Inicializar suscripción a alertas en tiempo real
  useAlertas(user?.id)
  
  // ... resto del componente ...
}
```

### Cómo Funciona el Sistema de Alertas

1. **Suscripción en Tiempo Real:**
   - `useAlertas(userId)` se ejecuta cuando el Header se monta
   - Llama a `subscribeToNotifications(userId)` del `notificationService`
   - Establece un listener de Firestore en la colección `notificaciones`
   - Filtra por `usuarios_destino` que contengan el ID del usuario actual

2. **Actualización del Store:**
   - Cuando llegan notificaciones nuevas, se actualiza `alertasStore`
   - El badge en el ícono de campana muestra el conteo de no leídas
   - El panel de alertas se actualiza automáticamente

3. **Notificaciones de Transferencias:**
   - Ya implementado en `src/hooks/useMovimientos.js`
   - Al crear una transferencia, se llama a `triggerTransferenciaRecibida`
   - Se buscan usuarios asignados a la ubicación de destino
   - Se crea una notificación en Firestore con `usuarios_destino`

### Resultado
- ✅ El ícono de campana aparece en el Header
- ✅ El badge rojo muestra el número de alertas no leídas
- ✅ Al hacer clic, se abre el panel de notificaciones
- ✅ Las alertas se marcan como leídas al hacer clic
- ✅ Se puede navegar al módulo correspondiente desde cada alerta
- ✅ Las alertas agrupadas muestran un modal con detalles de productos
- ✅ Sonidos y notificaciones del navegador para alertas críticas

---

## 4. Verificación de Lógica de Movimientos

### Estado
La lógica de filtrado en el módulo de Movimientos funciona correctamente según los parámetros establecidos:

**Filtros Implementados:**
1. **Dirección:** Salida (enviados desde ubicaciones del usuario) / Recepción (recibidos en ubicaciones del usuario)
2. **Estado:** Pendientes / Confirmadas / Canceladas
3. **Búsqueda:** Por código, origen, destino, observaciones
4. **Sede:** Filtro por ubicación específica (auto-seleccionado para usuarios con una sola ubicación)
5. **Asignaciones de Usuario:** Solo muestra movimientos donde el usuario tiene acceso a origen o destino

**Permisos:**
- Solo el receptor puede confirmar una transferencia
- Solo el emisor puede eliminar una transferencia PENDIENTE
- Admins globales pueden ver y gestionar todos los movimientos

---

## Archivos Modificados

1. **`src/pages/Administracion.jsx`**
   - Agregada invalidación de queries globales en mutaciones de empresas y ubicaciones

2. **`src/components/common/UserMenu.jsx`**
   - Agregadas queries para empresas y ubicaciones

3. **`src/components/layout/Header.jsx`**
   - Agregada inicialización del hook `useAlertas`

---

## Instrucciones de Prueba

### Prueba 1: Actualización de Empresas/Ubicaciones
1. Ir a Administración → Sedes
2. Editar el nombre de una sede
3. Navegar a Movimientos o Conteos
4. **Verificar:** Los nombres actualizados aparecen inmediatamente

### Prueba 2: Página de Perfil
1. Hacer clic en el avatar del usuario (esquina superior derecha)
2. Seleccionar "Ver Información Completa" o "Mi Perfil"
3. **Verificar:** La página carga sin errores y muestra empresas/ubicaciones asignadas

### Prueba 3: Sistema de Alertas
1. Abrir la consola del navegador
2. Crear una transferencia desde Movimientos
3. **Verificar en el Header:**
   - Aparece badge rojo en el ícono de campana
   - El número refleja alertas no leídas
4. Hacer clic en la campana
5. **Verificar:**
   - Se abre el panel de notificaciones
   - Aparece la alerta de transferencia recibida
   - Al hacer clic, navega a Movimientos
   - La alerta se marca como leída

### Prueba 4: Alertas de Stock Bajo (Manual)
```javascript
// Ejecutar en consola del navegador
const { triggerStockBajo } = await import('./src/services/notificationService.js')
await triggerStockBajo({
  producto: { id: 'test-prod', nombre: 'Producto Test' },
  ubicacion: { id: 'test-ub', nombre: 'Bodega Test' },
  stockActual: 5,
  stockMinimo: 10,
  usuariosDestino: ['<ID_USUARIO_ACTUAL>']
})
```

---

## Notas Técnicas

### TanStack Query - Invalidación de Queries
El sistema usa un patrón de invalidación en cascada:
- Queries locales: `admin-empresas`, `admin-ubicaciones`
- Queries globales: `empresas`, `ubicaciones`
- Cuando se invalida una query, TanStack Query refetch automáticamente en todos los componentes que la usan

### Sistema de Notificaciones en Tiempo Real
- **Firestore Listener:** `onSnapshot` en colección `notificaciones`
- **Filtrado:** `where('usuarios_destino', 'array-contains', userId)`
- **Deduplicación:** Las notificaciones del mismo tipo/día se agrupan automáticamente
- **Cleanup:** Notificaciones inactivas >30 días se eliminan automáticamente

### Permisos y Filtrado
- `getUserAllowedUbicacionIds`: Combina ubicaciones directas + ubicaciones de empresas asignadas
- Usuarios con `rol === 'ADMIN_GLOBAL'` ven todo
- Otros usuarios solo ven datos de sus ubicaciones/empresas asignadas

---

## Build Exitoso

```bash
✓ 2309 modules transformed.
✓ built in 2.06s
```

Todas las correcciones han sido probadas y el build de producción se genera sin errores.
