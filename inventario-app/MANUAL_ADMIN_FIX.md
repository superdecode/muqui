# Fix Manual de Acceso de Administrador

Si eres administrador pero no tienes acceso al módulo de administración, sigue estos pasos:

## Opción 1: Automática (Recomendada)
1. Refresca la página - la corrección debería aplicarse automáticamente
2. Si no funciona, abre la consola del navegador (F12) y ejecuta:
```javascript
checkAndFixAdminAccess()
```

## Opción 2: Manual (Consola del Navegador)
Abre la consola del navegador (F12) y ejecuta:

```javascript
// Verificar usuario actual
const user = JSON.parse(localStorage.getItem('user'))
console.log('Usuario actual:', user)

// Actualizar rol a administrador global
user.rol = 'ADMIN_GLOBAL'
localStorage.setItem('user', JSON.stringify(user))

// Refrescar la página
location.reload()
```

## Opción 3: Forzar Permisos
Si lo anterior no funciona, ejecuta:

```javascript
// Obtener usuario y forzar permisos de admin
const user = JSON.parse(localStorage.getItem('user'))
user.rol = 'ADMIN_GLOBAL'
user.permisos_override = {
  administracion: { ver: true, crear: true, editar: true, eliminar: true },
  productos: { ver: true, crear: true, editar: true, eliminar: true },
  inventario: { ver: true, crear: true, editar: true, eliminar: true },
  transferencias: { ver: true, crear: true, editar: true, eliminar: true },
  conteos: { ver: true, crear: true, editar: true, eliminar: true },
  movimientos: { ver: true, crear: true, editar: true, eliminar: true },
  reportes: { ver: true, crear: true, editar: true, eliminar: true },
  configuracion: { ver: true, crear: true, editar: true, eliminar: true }
}
localStorage.setItem('user', JSON.stringify(user))
location.reload()
```

## Verificación
Después de aplicar la corrección, deberías ver:
- El ícono de Administración (🛡️) en el menú lateral
- Poder acceder a `/admin` sin problemas

## Si el Problema Persiste
1. Verifica que tu usuario exista en la base de datos con rol `ADMIN_GLOBAL`
2. Limpia el caché del navegador
3. Cierra sesión y vuelve a iniciar

## Cambios Realizados
1. ✅ Agregados permisos faltantes para el módulo `administracion`
2. ✅ Mejorado el mapeo de roles para reconocer `ADMIN_GLOBAL`
3. ✅ Agregada corrección automática al iniciar la aplicación
4. ✅ Creada herramienta de diagnóstico y reparación
