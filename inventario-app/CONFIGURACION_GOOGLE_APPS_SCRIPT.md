# 📝 CONFIGURACIÓN DE GOOGLE APPS SCRIPT PARA ESCRITURA

**Fecha:** 18 de Enero, 2026
**Estado:** ⏳ Pendiente configuración

---

## 🎯 OBJETIVO

Configurar Google Apps Script para permitir que la aplicación web pueda:
- ✍️ Crear productos
- ✍️ Actualizar productos
- ✍️ Eliminar productos
- ✍️ Crear movimientos
- ✍️ Confirmar movimientos
- ✍️ Crear conteos
- ✍️ Ejecutar conteos

---

## 📋 INSTRUCCIONES PASO A PASO

### PASO 1: Abrir Google Sheets

1. Abre tu Google Sheets: https://docs.google.com/spreadsheets/d/1y3BSVe6CcHGeyIvLuSAhDdHyR7nRXSboulfiKPe6s-c
2. Verifica que tengas permiso de edición

### PASO 2: Abrir Apps Script

1. En Google Sheets, ve a **Extensions** → **Apps Script**
2. Se abrirá una nueva pestaña con el editor de Apps Script
3. Si ya tienes código, lo verás en el editor
4. Si no tienes código, verás una función vacía `myFunction()`

### PASO 3: Actualizar o Pegar el Código

**OPCIÓN A: Si YA tienes código Apps Script**

El código actual parece estar incompleto para las operaciones de escritura que necesitamos. Necesitamos agregar/actualizar las siguientes funciones:

1. `createProducto(data)` - Crear nuevos productos
2. `updateProducto(data)` - Actualizar productos existentes
3. `deleteProducto(data)` - Eliminar productos
4. `createMovimiento(data)` - Crear movimientos
5. `confirmarMovimiento(data)` - Confirmar movimientos
6. `createConteo(data)` - Crear conteos
7. `ejecutarConteo(data)` - Ejecutar conteos

**OPCIÓN B: Si NO tienes código o quieres empezar de cero**

1. Borra todo el código actual (si existe)
2. Abre el archivo `google-apps-script/Code.gs` de este proyecto
3. Copia TODO el contenido
4. Pégalo en el editor de Apps Script
5. Guarda (Ctrl+S o Cmd+S)

### PASO 4: Desplegar como Web App

1. En el editor de Apps Script, haz click en **Deploy** (arriba a la derecha)
2. Selecciona **New deployment**
3. Click en el ícono de engranaje ⚙️ junto a "Select type"
4. Selecciona **Web app**
5. Configura lo siguiente:

   **Description (Descripción):**
   ```
   Inventario API - Escritura a Google Sheets
   ```

   **Execute as (Ejecutar como):**
   ```
   Me (tu email de Google)
   ```

   **Who has access (Quién tiene acceso):**
   ```
   Anyone (Cualquier persona)
   ```

   ⚠️ **IMPORTANTE:** Debe ser "Anyone" para que tu aplicación web pueda acceder sin autenticación individual de usuarios.

6. Haz click en **Deploy**
7. Aparecerá un mensaje de autorización

### PASO 5: Autorizar el Script

1. Click en **Authorize access**
2. Selecciona tu cuenta de Google
3. Google te mostrará una advertencia: "Google hasn't verified this app"
4. Click en **Advanced** (Avanzado)
5. Click en **Go to [Nombre del proyecto] (unsafe)** - Ir a [nombre] (no seguro)
6. Click en **Allow** (Permitir)

   El script necesita permisos para:
   - ✅ Leer y modificar tu Google Sheets
   - ✅ Conectarse a servicios externos (tu aplicación web)

7. Click en **Done**

### PASO 6: Copiar la URL del Web App

1. Después de desplegar, verás un cuadro de diálogo con información
2. **COPIA** la **Web app URL** que aparece
3. Se verá algo así:
   ```
   https://script.google.com/macros/s/AKfycbx.../exec
   ```

4. **NO COMPARTAS ESTA URL PÚBLICAMENTE** - Cualquiera con esta URL puede escribir a tu Google Sheet

### PASO 7: Configurar la URL en tu Aplicación

1. Abre el archivo `.env` en tu proyecto local:
   ```bash
   cd /Users/quiron/CascadeProjects/muqui/inventario-app
   nano .env
   ```

2. Agrega la siguiente línea (si no existe):
   ```
   VITE_GOOGLE_APPS_SCRIPT_URL=<PEGA_AQUI_LA_URL_DEL_PASO_6>
   ```

   Ejemplo:
   ```
   VITE_GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbx.../exec
   ```

3. Guarda el archivo (Ctrl+O, Enter, Ctrl+X)

### PASO 8: Verificar Configuración

1. Abre el archivo `.env` y verifica que tengas:
   ```
   VITE_USE_MOCK_DATA=false
   VITE_USE_GOOGLE_SHEETS=true
   VITE_GOOGLE_API_KEY=AIzaSyAnCEFz9o1DX9ymBW78iDcE6Z3ckOAb_Gg
   VITE_GOOGLE_SPREADSHEET_ID=1y3BSVe6CcHGeyIvLuSAhDdHyR7nRXSboulfiKPe6s-c
   VITE_GOOGLE_APPS_SCRIPT_URL=<TU_URL_AQUI>
   ```

2. ✅ Todas las variables deben tener valores

---

## 🧪 CÓMO PROBAR QUE FUNCIONA

### Test 1: Verificar que el Script Responde

1. Abre tu navegador
2. Pega la URL del Web App en la barra de direcciones
3. Presiona Enter
4. Deberías ver un JSON como este:
   ```json
   {
     "status": "OK",
     "message": "Google Apps Script funcionando correctamente",
     "timestamp": "2026-01-18T..."
   }
   ```

5. Si ves esto: ✅ El script está funcionando

### Test 2: Probar Desde la Aplicación

1. Reinicia el servidor de desarrollo:
   ```bash
   # Detener el servidor actual (Ctrl+C en la terminal donde está corriendo)
   npm run dev
   ```

2. Abre: http://localhost:6505/
3. Login con tus credenciales
4. Ve a **Productos**
5. Click en **"Nuevo Producto"**
6. Llena el formulario:
   - Nombre: `TEST PRODUCTO`
   - Especificación: `PRUEBA ESCRITURA`
   - Unidad: `UNI`
   - Stock Mínimo: `10`
   - Categoría: `TEST`

7. Click en **"Guardar"**
8. Deberías ver una alerta verde: "Producto creado exitosamente"
9. **VERIFICA EN GOOGLE SHEETS:**
   - Abre tu Google Sheets
   - Ve a la hoja **"Productos"**
   - Busca al final de la lista
   - Deberías ver el nuevo producto `TEST PRODUCTO` ✅

10. Si está ahí: ✅ **LA ESCRITURA FUNCIONA**

### Test 3: Probar Movimientos

1. En la aplicación, ve a **Movimientos**
2. Click en **"Nuevo Movimiento"**
3. Llena el formulario:
   - Origen: Bodega Principal
   - Destino: Punto de Venta 1
   - Agrega productos
   - Cantidad: 5

4. Click en **"Crear Movimiento"**
5. Deberías ver alerta verde
6. **VERIFICA EN GOOGLE SHEETS:**
   - Hoja **"Movimientos"** → Nuevo registro ✅
   - Hoja **"Detalle_movimientos"** → Detalles del movimiento ✅

### Test 4: Probar Conteos

1. En la aplicación, ve a **Conteos**
2. Click en **"Programar Conteo"**
3. Llena el formulario:
   - Fecha: Hoy
   - Ubicación: Bodega Principal
   - Tipo: DIARIO

4. Click en **"Programar Conteo"**
5. Deberías ver alerta verde
6. **VERIFICA EN GOOGLE SHEETS:**
   - Hoja **"Conteos"** → Nuevo registro ✅

---

## 🐛 TROUBLESHOOTING

### Error: "Reference Error: SpreadsheetApp is not defined"

**Causa:** El código no se guardó correctamente o no se desplegó

**Solución:**
1. Verifica que el código esté pegado en Apps Script
2. Guarda (Ctrl+S)
3. Vuelve a desplegar (Deploy → Manage deployments → Edit → Version: New version → Deploy)

### Error: "The script completed but did not return anything"

**Causa:** La función `doPost` no está retornando correctamente

**Solución:**
1. Verifica que la función `doPost` exista en el código
2. Verifica que retorne `ContentService.createTextOutput(...)`

### Error: "You do not have permission to call this function"

**Causa:** El script no está autorizado correctamente

**Solución:**
1. Ve a Apps Script → Run → Run function → doPost
2. Autoriza nuevamente
3. Vuelve a desplegar

### Error: "Network Error" o "Failed to fetch"

**Causa:** La URL del Apps Script no está configurada o es incorrecta

**Solución:**
1. Verifica que `VITE_GOOGLE_APPS_SCRIPT_URL` esté en `.env`
2. Verifica que la URL termine en `/exec`
3. Reinicia el servidor de desarrollo

### Los Datos No Se Guardan en Google Sheets

**Causa:** Puede ser problema de permisos o configuración

**Debugging:**
1. Abre Apps Script
2. Ve a **Executions** (Ejecuciones) en el menú lateral
3. Busca errores en las ejecuciones recientes
4. Si hay errores, lee el mensaje y ajusta el código

---

## 📊 ESTRUCTURA DE LAS FUNCIONES DEL SCRIPT

El script debe tener estas funciones principales:

```javascript
// Recibir peticiones HTTP POST
function doPost(e) { ... }

// Recibir peticiones HTTP GET (para testing)
function doGet(e) { ... }

// PRODUCTOS
function createProducto(data) { ... }
function updateProducto(data) { ... }
function deleteProducto(data) { ... }

// MOVIMIENTOS
function createMovimiento(data) { ... }
function confirmarMovimiento(data) { ... }

// CONTEOS
function createConteo(data) { ... }
function ejecutarConteo(data) { ... }

// INVENTARIO
function ajustarInventario(data) { ... }

// HELPERS
function generateId(prefix, lastRow) { ... }
function actualizarInventarioPorMovimiento(...) { ... }
function actualizarInventarioPorConteo(...) { ... }
```

---

## 🔐 SEGURIDAD

### IMPORTANTE: Esta configuración es para desarrollo/testing

Para producción, deberías:

1. **Validar tokens/API keys** en las peticiones
2. **Limitar acceso** solo a tu dominio (CORS)
3. **Hashear contraseñas** (actualmente están en texto plano)
4. **Implementar rate limiting** para evitar abuso
5. **Considerar migrar a Firebase** para mejor seguridad y escalabilidad

---

## ✅ CHECKLIST DE CONFIGURACIÓN

Marca cuando completes cada paso:

- [ ] Abrí Google Sheets
- [ ] Abrí Apps Script (Extensions → Apps Script)
- [ ] Pegué o actualicé el código
- [ ] Guardé el código (Ctrl+S)
- [ ] Desplegué como Web App
- [ ] Configuré "Execute as: Me"
- [ ] Configuré "Who has access: Anyone"
- [ ] Autoricé el script
- [ ] Copié la Web App URL
- [ ] Pegué la URL en `.env` como `VITE_GOOGLE_APPS_SCRIPT_URL`
- [ ] Reinicié el servidor de desarrollo
- [ ] Probé creando un producto
- [ ] Verifiqué que aparece en Google Sheets
- [ ] Probé creando un movimiento
- [ ] Verifiqué que aparece en Google Sheets
- [ ] Probé creando un conteo
- [ ] Verifiqué que aparece en Google Sheets

---

## 🎯 RESULTADO ESPERADO

Cuando TODO esté configurado:

1. ✅ Productos se crean/editan/eliminan en Google Sheets
2. ✅ Movimientos se crean y confirman en Google Sheets
3. ✅ Conteos se programan y ejecutan en Google Sheets
4. ✅ Inventario se actualiza automáticamente
5. ✅ Alertas aparecen cuando hay stock bajo

---

## 📞 SI NECESITAS AYUDA

Si algo no funciona:

1. Toma captura de pantalla del error
2. Comparte el mensaje de error exacto
3. Indica en qué paso estás
4. Verifica los logs en Apps Script (Executions)

---

**PRÓXIMO PASO:** Completa esta configuración y valida que funcione antes de hacer deploy a producción.
