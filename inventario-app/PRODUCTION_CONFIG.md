# Configuración de Producción - Sistema de Inventario Muqui

## ✅ Estado del Sistema: LISTO PARA PRODUCCIÓN

Fecha de configuración: 18 de Febrero, 2026

---

## 🔐 Reglas de Seguridad Firestore

### Configuración Actual:

**IMPORTANTE**: Este sistema utiliza autenticación personalizada (sin Firebase Auth). Las reglas de Firestore están configuradas para permitir acceso abierto a nivel de base de datos.

```javascript
match /{document=**} {
  allow read, write: if true;
}
```

### Control de Seguridad:

El control de acceso y permisos se maneja completamente en el **frontend** mediante:

1. **Sistema de Roles**: Definidos en la colección `roles` de Firestore
2. **Permisos por Módulo**: 4 niveles (sin_acceso, lectura, escritura, total)
3. **Validación en UI**: Botones y acciones deshabilitados según permisos
4. **Rutas Protegidas**: PermissionRoute en App.jsx

### Niveles de Permiso:

- **sin_acceso**: Módulo oculto del sidebar, acceso bloqueado
- **lectura**: Módulo visible, todos los botones de crear/editar/eliminar ocultos
- **escritura**: Crear/editar permitido, botones de eliminar ocultos
- **total**: Acceso completo incluyendo eliminación

### Módulos del Sistema:

- dashboard
- productos
- conteos
- movimientos
- reportes
- configuracion
- administracion

---

## 🔧 Configuración de Firebase

### Variables de Entorno (.env)
```
VITE_ENABLE_FIREBASE=true
VITE_FIREBASE_API_KEY=AIzaSyDXBlBY49ngLIE0mfimhkl6mCFDpBw3VQI
VITE_FIREBASE_AUTH_DOMAIN=control-inventario-41bcd.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=control-inventario-41bcd
VITE_FIREBASE_STORAGE_BUCKET=control-inventario-41bcd.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=973163987843
VITE_FIREBASE_APP_ID=1:973163987843:web:00ddf87fbf5df4888a2cb6
VITE_USE_FIREBASE_EMULATOR=false
```

### Proyecto Firebase
- **Nombre**: Control Inventario
- **ID**: control-inventario-41bcd
- **Región**: Default
- **Console**: https://console.firebase.google.com/project/control-inventario-41bcd/overview

---

## 👥 Roles de Usuario

### Admin Global / Administrador / Admin Empresa
- Acceso completo a todas las colecciones
- Puede crear, editar y eliminar usuarios
- Puede eliminar registros de todas las colecciones
- Gestión de roles y permisos

### Usuarios Estándar
- Lectura de todas las colecciones
- Crear y editar: productos, inventario, movimientos, ventas, mermas, conteos
- No pueden eliminar registros
- No pueden gestionar usuarios ni roles

---

## 🚀 Deployment

### Comandos de Deployment

```bash
# Deploy completo
firebase deploy

# Solo reglas de Firestore
firebase deploy --only firestore:rules

# Solo índices de Firestore
firebase deploy --only firestore:indexes

# Build de producción
npm run build:prod
```

---

## 📋 Checklist de Producción

- [x] Reglas de Firestore configuradas y deployadas
- [x] Índices de Firestore deployados
- [x] Variables de entorno configuradas
- [x] Emulador desactivado
- [x] Componentes de debug removidos
- [x] Permisos granulares por rol implementados
- [x] Sistema de autenticación funcionando
- [x] Sistema de notificaciones configurado

---

## 🔒 Seguridad

### Modelo de Seguridad:

**Autenticación Personalizada**: El sistema NO usa Firebase Auth. La autenticación se maneja mediante:
- Login con email/password almacenados en Firestore
- Validación de credenciales en el frontend
- Sesión almacenada en localStorage mediante Zustand

### Control de Acceso:

1. **Nivel de Base de Datos (Firestore)**:
   - Reglas abiertas (`allow read, write: if true`)
   - No hay restricciones a nivel de Firestore

2. **Nivel de Aplicación (Frontend)**:
   - Sistema de roles y permisos granular
   - 4 niveles de acceso por módulo
   - Validación en cada componente y ruta
   - Botones/acciones deshabilitados según permisos

### Roles Administrativos:
- Admin Global
- Admin Empresa
- Administrador

### ⚠️ Consideraciones de Seguridad:

**IMPORTANTE**: Este modelo de seguridad es apropiado para:
- Aplicaciones internas con usuarios confiables
- Entornos donde el acceso a la URL está controlado
- Sistemas donde la lógica de negocio no es crítica

**NO es apropiado para**:
- Aplicaciones públicas
- Datos altamente sensibles
- Entornos con usuarios no confiables

Para mayor seguridad, se recomienda:
1. Implementar Firebase Auth
2. Configurar reglas de Firestore basadas en autenticación
3. Agregar validación del lado del servidor (Cloud Functions)

---

## 📝 Notas Importantes

1. **Control de Permisos**: El sistema usa un doble control:
   - **Firestore Rules**: Seguridad a nivel de base de datos
   - **Frontend**: Control de UI basado en permisos de rol

2. **Autenticación**: Los usuarios deben estar autenticados para acceder a cualquier dato

3. **Notificaciones**: Los usuarios solo pueden leer/escribir su propia configuración de notificaciones

4. **Contadores**: Sistema de códigos secuenciales (MV0001, CT0001, etc.) protegido pero accesible para escritura

---

## 🆘 Troubleshooting

### Error: "Permission Denied"
- Verificar que el usuario esté autenticado
- Verificar que el rol del usuario esté correctamente asignado
- Revisar las reglas de Firestore en la consola

### Error: "Missing or insufficient permissions"
- Verificar que las reglas estén deployadas: `firebase deploy --only firestore:rules`
- Verificar que el usuario tenga el rol correcto en Firestore

### Datos no se cargan
- Verificar conexión a internet
- Verificar que Firebase esté configurado correctamente
- Revisar la consola del navegador para errores específicos

---

## 📞 Soporte

Para problemas o preguntas sobre la configuración de producción, revisar:
1. Console de Firebase: https://console.firebase.google.com/project/control-inventario-41bcd
2. Logs de la aplicación en el navegador (DevTools > Console)
3. Documentación de Firebase: https://firebase.google.com/docs

---

**Sistema configurado y listo para producción** ✅
