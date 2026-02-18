# 🔧 Solución: Productos No Se Actualizan en Firestore

## El Problema
Puedes ver los datos (lectura funciona), pero cuando modificas un producto no se guarda en Firestore (escritura no funciona).

## 🎯 Causa Principal
**Las reglas de Firestore permiten lectura pero NO escritura desde el navegador**

---

## ✅ SOLUCIÓN 1: Reglas de Seguridad (Más Común)

### Verificar Reglas Actuales

1. Ve a Firebase Console:
   ```
   https://console.firebase.google.com/project/control-inventario-41bcd/firestore/rules
   ```

2. Verifica si las reglas actuales son así:
   ```javascript
   match /{document=**} {
     allow read: if true;
     allow write: if false;  // ❌ ESTO BLOQUEA ESCRITURA
   }
   ```

### Cambiar a Reglas Permisivas (Desarrollo)

Reemplaza con estas reglas **TEMPORALES** para desarrollo:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // TEMPORAL: Permitir todo por 30 días
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2025, 4, 15);
    }
  }
}
```

**IMPORTANTE**: Haz clic en **"Publicar"** después de pegar las reglas.

---

## ✅ SOLUCIÓN 2: Verificar en la Consola del Navegador

### Paso 1: Abrir DevTools

1. Abre tu aplicación en el navegador
2. Presiona `F12` o `Cmd+Opt+I` (Mac)
3. Ve a la pestaña **Console**

### Paso 2: Intentar Actualizar un Producto

1. Modifica un producto en la interfaz
2. Observa la consola del navegador

### Paso 3: Identificar el Error

Busca errores como:

**Error de Permisos:**
```
FirebaseError: Missing or insufficient permissions
```
➡️ **Solución**: Cambia las reglas de seguridad (arriba)

**Error de Autenticación:**
```
FirebaseError: [code=permission-denied]: ... requires authentication
```
➡️ **Solución**: Las reglas requieren autenticación (ver abajo)

**Error de Red:**
```
FirebaseError: Network request failed
```
➡️ **Solución**: Verifica tu conexión a internet

---

## ✅ SOLUCIÓN 3: Reglas con Autenticación (Más Seguro)

Si prefieres usar autenticación en lugar de reglas abiertas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Permitir lectura a todos
    match /{document=**} {
      allow read: if true;
    }

    // Permitir escritura solo a usuarios autenticados
    match /productos/{producto} {
      allow write: if request.auth != null;
    }

    match /inventario/{item} {
      allow write: if request.auth != null;
    }

    match /movimientos/{movimiento} {
      allow write: if request.auth != null;
    }

    match /conteos/{conteo} {
      allow write: if request.auth != null;
    }
  }
}
```

**NOTA**: Con estas reglas, necesitarás implementar autenticación de Firebase en tu app.

---

## 🧪 Probar Permisos de Escritura

### Prueba 1: Desde el Servidor (Firebase Admin)

```bash
node scripts/testWritePermissions.js
```

Este script prueba si el Service Account puede escribir. Si funciona, el problema está en las reglas del cliente web.

### Prueba 2: Desde la Consola del Navegador

Abre la consola del navegador (F12) y ejecuta:

```javascript
// Importar Firestore (asume que ya está inicializado)
const { getFirestore, collection, addDoc } = await import('firebase/firestore')

// Obtener instancia de Firestore
const db = getFirestore()

// Intentar escribir
try {
  const docRef = await addDoc(collection(db, '_test'), {
    mensaje: 'Prueba desde navegador',
    timestamp: new Date()
  })
  console.log('✅ Escritura exitosa! ID:', docRef.id)
} catch (error) {
  console.error('❌ Error:', error.code, error.message)
}
```

Si ves `permission-denied`, son las reglas de seguridad.

---

## 🔍 Debug: Verificar Qué Servicio Se Está Usando

Abre la consola del navegador y ejecuta:

```javascript
console.log('Firestore habilitado:', import.meta.env.VITE_ENABLE_FIREBASE)
console.log('Google Sheets habilitado:', import.meta.env.VITE_USE_GOOGLE_SHEETS)
```

Debes ver:
```
Firestore habilitado: "true"
Google Sheets habilitado: "false"
```

Si ves lo contrario, edita el archivo `.env`:
```bash
VITE_USE_GOOGLE_SHEETS=false
VITE_ENABLE_FIREBASE=true
```

Y reinicia el servidor:
```bash
# Detén con Ctrl+C
npm run dev
```

---

## 📝 Verificar el Código de Actualización

El código en `firestoreService.js` debería ser así:

```javascript
updateProducto: async (productoId, productoData) => {
  try {
    const db = getDB()
    const productoRef = doc(db, 'productos', productoId)

    const datosActualizados = {
      ...productoData,
      concatenado: `${productoData.nombre} ${productoData.especificacion || ''}`.trim(),
      updated_at: serverTimestamp()
    }

    await updateDoc(productoRef, datosActualizados)

    return {
      success: true,
      message: 'Producto actualizado exitosamente',
      data: { id: productoId, ...datosActualizados }
    }
  } catch (error) {
    console.error('Error actualizando producto:', error)
    return { success: false, message: error.message }
  }
}
```

---

## 🔧 Checklist de Diagnóstico

### Verificar Configuración

- [ ] `VITE_ENABLE_FIREBASE=true` en `.env`
- [ ] `VITE_USE_GOOGLE_SHEETS=false` en `.env`
- [ ] Servidor reiniciado después de cambiar `.env`
- [ ] Firebase inicializado correctamente (ver consola: "✅ Firebase inicializado")

### Verificar Reglas de Firestore

- [ ] Reglas permiten escritura (`allow write: if true` o con autenticación)
- [ ] Reglas publicadas en Firebase Console
- [ ] Esperaste 10-20 segundos después de publicar (propagación)

### Verificar Errores

- [ ] Abriste DevTools (F12)
- [ ] Intentaste actualizar un producto
- [ ] Revisaste errores en la pestaña Console
- [ ] Copiaste el mensaje de error exacto

### Verificar Firestore Console

- [ ] Los datos existen en Firestore
- [ ] Puedes ver la colección `productos`
- [ ] Los documentos tienen el formato correcto

---

## 🚀 Solución Rápida (5 minutos)

**1. Reglas Permisivas:**
```
https://console.firebase.google.com/project/control-inventario-41bcd/firestore/rules
```

Pega esto:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

Clic en **Publicar**, espera 20 segundos.

**2. Recargar App:**
`Cmd+Shift+R` (Mac) o `Ctrl+Shift+R` (Windows)

**3. Intentar de Nuevo:**
Modifica un producto.

**4. Ver Firestore Console:**
```
https://console.firebase.google.com/project/control-inventario-41bcd/firestore/data/productos
```

Verifica si aparece el cambio (puede tomar unos segundos).

---

## 🆘 Si Aún No Funciona

Copia y pega aquí:

1. **Error exacto de la consola del navegador**
2. **Reglas actuales de Firestore** (copia todo de la pestaña Rules)
3. **Resultado de estos comandos:**
   ```bash
   cat .env | grep VITE_FIREBASE
   cat .env | grep VITE_USE_GOOGLE_SHEETS
   ```

Con esa información puedo ayudarte a resolver el problema específico.
