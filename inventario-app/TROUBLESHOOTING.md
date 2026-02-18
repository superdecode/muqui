# Solución de Problemas - Firestore

## ❌ Problema: La aplicación no carga datos / Alertas vacías

### Síntomas:
- La aplicación web abre pero no muestra datos
- Alertas aparecen vacías
- No hay errores visibles en la interfaz

### Causa Más Común:
**Las reglas de seguridad de Firestore bloquean el acceso**

Por defecto, Firestore rechaza todas las operaciones de lectura/escritura. Necesitas configurar las reglas.

## ✅ Solución Paso a Paso

### 1. Verificar la Consola del Navegador

1. Abre la aplicación en el navegador
2. Presiona `F12` o `Cmd+Opt+I` (Mac) para abrir DevTools
3. Ve a la pestaña **Console**
4. Busca errores como:
   ```
   FirebaseError: Missing or insufficient permissions
   ```

### 2. Configurar Reglas de Seguridad en Firestore

**OPCIÓN A: Reglas de Desarrollo (Solo para pruebas)**

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto: `control-inventario-41bcd`
3. En el menú lateral, ve a **Firestore Database**
4. Haz clic en la pestaña **Reglas**
5. Reemplaza las reglas actuales con estas (SOLO PARA DESARROLLO):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // TEMPORAL: Permitir todo por 30 días (solo para desarrollo)
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2025, 3, 15);
    }
  }
}
```

6. Haz clic en **Publicar**

⚠️ **IMPORTANTE**: Estas reglas son solo para desarrollo. NO las uses en producción.

---

**OPCIÓN B: Reglas de Producción (Recomendado)**

Para producción, usa reglas más seguras:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Permitir lectura pública, escritura solo autenticados
    match /{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

O mejor aún, copia las reglas completas desde [FIRESTORE_STRUCTURE.md](./FIRESTORE_STRUCTURE.md)

### 3. Verificar Configuración de Firebase

Asegúrate de que el archivo `.env` tenga las credenciales correctas:

```bash
cat .env | grep VITE_FIREBASE
```

Debe mostrar:
```
VITE_ENABLE_FIREBASE=true
VITE_FIREBASE_API_KEY=AIzaSyDXBlBY49ngLIE0mfimhkl6mCFDpBw3VQI
VITE_FIREBASE_AUTH_DOMAIN=control-inventario-41bcd.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=control-inventario-41bcd
...
```

### 4. Verificar que Firebase esté instalado

```bash
npm list firebase
```

Si no está instalado:
```bash
npm install firebase
```

### 5. Limpiar Caché y Reiniciar

```bash
# Detener el servidor
# Ctrl+C en la terminal donde corre npm run dev

# Limpiar caché
rm -rf node_modules/.vite

# Reiniciar
npm run dev
```

### 6. Verificar Datos en Firestore

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Ve a **Firestore Database**
3. Verifica que las colecciones tengan datos:
   - `productos`
   - `inventario`
   - `ubicaciones`
   - `empresas`
   - `usuarios`

Si no hay datos, ejecuta la migración nuevamente:
```bash
node scripts/migrateData.js
```

## 🔍 Diagnóstico Rápido

Abre la consola del navegador (F12) y ejecuta:

```javascript
// Verificar configuración de Firebase
console.log('Firebase Config:', import.meta.env.VITE_ENABLE_FIREBASE)
console.log('API Key:', import.meta.env.VITE_FIREBASE_API_KEY?.substring(0, 10) + '...')

// Verificar si Firebase está inicializado
console.log('Firebase inicializado')
```

## 🆘 Otros Problemas Comunes

### Error: "Firebase: No Firebase App '[DEFAULT]' has been created"

**Solución**: Firebase no se inicializó. Verifica que `VITE_ENABLE_FIREBASE=true` en `.env`

### Error: "Network request failed"

**Solución**: Problema de conectividad. Verifica tu conexión a internet.

### Error: "API key not valid"

**Solución**: La API key en `.env` es incorrecta. Verifica en Firebase Console.

### Los datos no se actualizan

**Solución**:
1. Limpia el caché del navegador
2. Recarga la página con `Cmd+Shift+R` (Mac) o `Ctrl+Shift+R` (Windows/Linux)

### Error: "Missing or insufficient permissions"

**Solución**: Configura las reglas de seguridad (ver arriba)

## 📞 Checklist de Diagnóstico

- [ ] Las reglas de seguridad de Firestore están configuradas
- [ ] El archivo `.env` tiene las credenciales correctas
- [ ] `VITE_ENABLE_FIREBASE=true` en `.env`
- [ ] Firebase está instalado (`npm list firebase`)
- [ ] Hay datos en Firestore (verifica en Firebase Console)
- [ ] La consola del navegador muestra errores específicos
- [ ] El servidor de desarrollo está corriendo (`npm run dev`)
- [ ] Se limpiaron los cachés

## 🎯 Solución Rápida (90% de los casos)

**El problema es casi siempre las reglas de Firestore.**

1. Ve a Firebase Console > Firestore Database > Reglas
2. Usa las reglas de desarrollo temporales (arriba)
3. Haz clic en Publicar
4. Recarga la aplicación en el navegador
5. ✅ Debería funcionar ahora

Si después de esto sigue sin funcionar, revisa la consola del navegador para ver el error específico.
