// COPIA Y PEGA ESTO EN LA CONSOLA DEL NAVEGADOR (F12)

// Paso 1: Verificar usuario actual
const user = JSON.parse(localStorage.getItem('user'));
console.log('Usuario actual:', user);

// Paso 2: Forzar rol de administrador
user.rol = 'ADMIN_GLOBAL';

// Paso 3: Agregar permisos completos
user.permisos_override = {
  administracion: { ver: true, crear: true, editar: true, eliminar: true },
  productos: { ver: true, crear: true, editar: true, eliminar: true },
  inventario: { ver: true, crear: true, editar: true, eliminar: true },
  transferencias: { ver: true, crear: true, editar: true, eliminar: true },
  conteos: { ver: true, crear: true, editar: true, eliminar: true },
  movimientos: { ver: true, crear: true, editar: true, eliminar: true },
  reportes: { ver: true, crear: true, editar: true, eliminar: true },
  configuracion: { ver: true, crear: true, editar: true, eliminar: true }
};

// Paso 4: Guardar cambios
localStorage.setItem('user', JSON.stringify(user));

// Paso 5: Refrescar la página
console.log('✅ Acceso de administrador forzado. Refrescando página...');
location.reload();
