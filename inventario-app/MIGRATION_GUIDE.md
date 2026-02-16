# Guía de Migración: Google Sheets → Firestore

Esta guía te ayudará a migrar tu sistema de inventario de Google Sheets a Firestore.

## 📋 Resumen de Cambios

El sistema ha sido reconfigurado para usar Firestore como base de datos principal:

### Archivos Modificados
- ✅ `.env` - Credenciales de Firebase agregadas
- ✅ `.env.example` - Plantilla actualizada
- ✅ `.gitignore` - serviceAccountKey.json agregado
- ✅ `src/config/firebase.config.js` - Inicialización de Firebase
- ✅ `src/services/firestoreService.js` - Servicio nuevo con todas las operaciones CRUD
- ✅ `src/services/dataService.js` - Integrado con Firestore
- ✅ `src/main.jsx` - Inicialización de Firebase

### Archivos Nuevos
- ✅ `serviceAccountKey.json` - Credenciales de Service Account (no subir a Git)
- ✅ `scripts/migrateData.js` - Script de migración de datos
- ✅ `scripts/README.md` - Documentación del script
- ✅ `FIRESTORE_STRUCTURE.md` - Estructura de colecciones
- ✅ `MIGRATION_GUIDE.md` - Esta guía

## 🚀 Pasos de Migración

### 1. Instalar Dependencias

```bash
# Dependencias para la aplicación web
npm install firebase

# Dependencias para el script de migración (solo si vas a migrar datos)
npm install firebase-admin csv-parser
```

### 2. Verificar Configuración

Asegúrate de que el archivo `.env` tenga las credenciales correctas:

```env
VITE_USE_GOOGLE_SHEETS=false
VITE_ENABLE_FIREBASE=true
VITE_FIREBASE_API_KEY=AIzaSyDXBlBY49ngLIE0mfimhkl6mCFDpBw3VQI
VITE_FIREBASE_AUTH_DOMAIN=control-inventario-41bcd.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=control-inventario-41bcd
VITE_FIREBASE_STORAGE_BUCKET=control-inventario-41bcd.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=973163987843
VITE_FIREBASE_APP_ID=1:973163987843:web:00ddf87fbf5df4888a2cb6
```

### 3. Configurar Reglas de Seguridad en Firestore

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto: `control-inventario-41bcd`
3. Ve a **Firestore Database** > **Reglas**
4. Copia las reglas desde `FIRESTORE_STRUCTURE.md`
5. Publica las reglas

### 4. Crear Índices en Firestore

Para un mejor rendimiento, crea estos índices compuestos:

1. Ve a **Firestore Database** > **Índices**
2. Crea los índices listados en `FIRESTORE_STRUCTURE.md`

O espera a que Firebase te sugiera crearlos cuando ejecutes consultas.

### 5. Migrar Datos Existentes

Tienes dos opciones:

#### Opción A: Migrar desde Google Sheets directamente

1. El script ya tiene configurada la URL de tu Google Sheet
2. Ejecuta:
   ```bash
   node scripts/migrateData.js
   ```

#### Opción B: Migrar desde archivos CSV

1. Exporta tus datos de Google Sheets como CSV
2. Crea una carpeta `/data` en la raíz del proyecto:
   ```bash
   mkdir data
   ```
3. Coloca los archivos CSV en `/data` (ver `scripts/README.md` para nombres esperados)
4. En `scripts/migrateData.js`, descomenta la línea:
   ```javascript
   await migrateFromLocalCSV()
   ```
5. Ejecuta:
   ```bash
   node scripts/migrateData.js
   ```

### 6. Probar la Aplicación

```bash
# Modo desarrollo
npm run dev

# Build de producción
npm run build
```

Abre la aplicación en `http://localhost:5173` y verifica que:
- ✅ Los datos se cargan correctamente desde Firestore
- ✅ Puedes crear nuevos productos
- ✅ Puedes crear transferencias
- ✅ Los conteos funcionan
- ✅ El inventario se actualiza correctamente

## 🔄 Rollback (Volver a Google Sheets)

Si necesitas volver a usar Google Sheets temporalmente:

1. Edita el archivo `.env`:
   ```env
   VITE_USE_GOOGLE_SHEETS=true
   VITE_ENABLE_FIREBASE=false
   ```

2. Reinicia la aplicación:
   ```bash
   npm run dev
   ```

## 🎯 Estructura de Colecciones

El sistema usa estas colecciones en Firestore:

- `empresas` - Información de empresas
- `usuarios` - Usuarios del sistema
- `productos` - Catálogo de productos
- `ubicaciones` - Almacenes, tiendas, etc.
- `inventario` - Stock actual por ubicación
- `movimientos` - Transferencias y movimientos
- `detalle_movimientos` - Detalles de cada movimiento
- `conteos` - Conteos físicos programados
- `detalle_conteos` - Resultados del conteo
- `alertas` - Notificaciones y alertas

Ver `FIRESTORE_STRUCTURE.md` para la estructura detallada de cada colección.

## 🔒 Seguridad

### Credenciales del Cliente (Web)
- ✅ Están en el archivo `.env`
- ✅ Son seguras para usar en el navegador
- ✅ Las reglas de Firestore controlan el acceso

### Credenciales del Service Account (Server)
- ✅ Están en `serviceAccountKey.json`
- ⚠️ **NUNCA** subir este archivo a Git
- ⚠️ Solo usar en scripts del lado del servidor
- ✅ Ya está en `.gitignore`

## 📊 Ventajas de Firestore vs Google Sheets

✅ **Rendimiento**: Consultas más rápidas y escalables
✅ **Tiempo Real**: Actualizaciones en tiempo real sin recargar
✅ **Seguridad**: Reglas de seguridad granulares
✅ **Offline**: Funciona sin conexión
✅ **Relaciones**: Mejor manejo de relaciones entre datos
✅ **Consultas**: Filtros y búsquedas más potentes

## 🆘 Solución de Problemas

### Error: "Firebase: No Firebase App"
- Verifica que `VITE_ENABLE_FIREBASE=true` en `.env`
- Reinicia el servidor de desarrollo

### Error: "Permission denied" en Firestore
- Verifica que las reglas de seguridad estén configuradas
- Asegúrate de estar autenticado

### Error al ejecutar migrateData.js
```bash
# Instala las dependencias del script
npm install firebase-admin csv-parser

# Verifica que serviceAccountKey.json exista
ls serviceAccountKey.json
```

### Los datos no aparecen
1. Abre la consola del navegador (F12)
2. Ve a la pestaña "Console"
3. Busca errores de Firebase
4. Verifica que `VITE_ENABLE_FIREBASE=true`

## 📞 Soporte

Si tienes problemas:

1. Revisa los logs de la consola del navegador
2. Verifica la configuración en Firebase Console
3. Consulta `FIRESTORE_STRUCTURE.md` para la estructura de datos
4. Revisa `scripts/README.md` para la migración de datos

## ✅ Checklist de Migración

- [ ] Dependencias instaladas (`npm install firebase`)
- [ ] `.env` configurado con credenciales de Firebase
- [ ] Reglas de seguridad configuradas en Firebase Console
- [ ] Datos migrados a Firestore
- [ ] Aplicación probada en modo desarrollo
- [ ] Todo funciona correctamente
- [ ] `serviceAccountKey.json` está en `.gitignore`
- [ ] Build de producción funciona

## 🎉 ¡Listo!

Tu sistema de inventario ahora está usando Firestore como base de datos. Disfruta de un sistema más rápido, escalable y moderno.
