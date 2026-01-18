# 🧪 INSTRUCCIONES PARA VALIDACIÓN LOCAL

**IMPORTANTE:** No haré deploy hasta que confirmes que TODO funciona correctamente en tu máquina.

---

## 📋 PASOS PARA VALIDAR

### 1️⃣ Abrir el Servidor Local

El servidor ya está corriendo en:
```
http://localhost:6504/
```

### 2️⃣ Probar Conexión con Google Sheets

Abre este archivo en tu navegador:
```
file:///Users/quiron/CascadeProjects/muqui/inventario-app/test-google-sheets.html
```

O navega a:
```bash
cd /Users/quiron/CascadeProjects/muqui/inventario-app
open test-google-sheets.html
```

**QUÉ VERIFICAR:**
- ✅ Haz click en "Probar Todas las Hojas"
- ✅ Deberías ver **119 productos**
- ✅ Deberías ver inventario, conteos, movimientos
- ✅ Todos con estado "✅ X registros cargados"

Si ves errores ❌, hay un problema de conexión con Google Sheets.

---

### 3️⃣ Probar la Aplicación

#### A. Login
```
URL: http://localhost:6504/
```

**Credenciales** (según tu Google Sheet "Usuarios"):
- Ver en DevTools console qué usuarios hay

Si no tienes usuarios configurados, necesitamos verificar la hoja de Usuarios.

#### B. Verificar Menú

El menú lateral ahora dice:
- ✅ **"Productos"** (ya no "Inventario")

La ruta es:
- ✅ `/productos` (redirige de `/inventario` automáticamente)

#### C. Probar Botón "Nuevo Movimiento"

1. Ve a **Movimientos**
2. Click en **"Nuevo Movimiento"**
3. **¿Se abre un modal?**
   - ✅ SÍ → Perfecto, funciona
   - ❌ NO → Hay un problema

Si NO se abre:
- Abre DevTools (F12)
- Ve a la pestaña **Console**
- ¿Hay algún error en rojo?
- Toma captura y comparte

#### D. Probar Botón "Programar Conteo"

1. Ve a **Conteos**
2. Click en **"Programar Conteo"**
3. **¿Se abre un modal?**
   - ✅ SÍ → Perfecto, funciona
   - ❌ NO → Hay un problema

Si NO se abre:
- Abre DevTools (F12)
- Ve a la pestaña **Console**
- ¿Hay algún error en rojo?
- Toma captura y comparte

#### E. Verificar Carga de Productos

1. Ve a **Productos** (antes Inventario)
2. **¿Ves productos en la tabla?**
   - ✅ SÍ, veo productos → Perfecto
   - ❌ NO, está vacío → Problema de carga

Si está vacío:
- Abre DevTools (F12)
- Ve a **Network**
- Busca requests a `sheets.googleapis.com`
- ¿Están en verde (200) o rojo (400/403)?

---

## 🔍 DEBUGGING COMÚN

### Problema: "No veo productos en la tabla"

**Posibles causas:**

1. **Google Sheets no está publicado**
   - Abre: https://docs.google.com/spreadsheets/d/1y3BSVe6CcHGeyIvLuSAhDdHyR7nRXSboulfiKPe6s-c
   - Archivo → Compartir → Publicar en la web
   - Publicar

2. **La hoja se llama diferente**
   - Verifica que la hoja se llame exactamente "Productos" (no "producto" ni "PRODUCTOS")

3. **No hay datos en Inventario**
   - La página carga de la hoja "Inventario", no "Productos"
   - Si "Inventario" está vacío, la tabla estará vacía
   - Necesitas agregar datos a la hoja "Inventario"

---

### Problema: "Modal no se abre"

**Posibles causas:**

1. **Error de JavaScript**
   - Abre DevTools Console
   - ¿Hay errores en rojo?
   - Si hay un error como "Cannot read property... of undefined", hay un bug

2. **Modal está detrás de otro elemento**
   - El modal debería tener `z-index: 50`
   - Verifica en DevTools → Elements si el modal existe en el DOM

3. **State no se actualiza**
   - Esto es raro pero puede pasar
   - Intenta hacer hard refresh: Cmd+Shift+R (Mac) o Ctrl+Shift+R (Windows)

---

## 📊 CHECKLIST DE VALIDACIÓN

Marca con ✅ cuando valides cada punto:

### Google Sheets
- [ ] test-google-sheets.html muestra 119 productos
- [ ] test-google-sheets.html muestra inventario
- [ ] test-google-sheets.html muestra conteos
- [ ] test-google-sheets.html muestra movimientos
- [ ] No hay errores ❌ en ninguna hoja

### Aplicación
- [ ] Puedo hacer login
- [ ] El menú dice "Productos" (no "Inventario")
- [ ] La ruta `/productos` funciona
- [ ] La ruta `/inventario` redirige a `/productos`

### Productos
- [ ] Veo productos en la tabla
- [ ] Veo la columna "Stock Mínimo" con valores
- [ ] Los badges (OK/BAJO/SIN STOCK) funcionan
- [ ] Puedo hacer click en "Nuevo Producto"
- [ ] Se abre el modal de producto
- [ ] Puedo llenar el formulario
- [ ] Al guardar, aparece alerta de éxito

### Movimientos
- [ ] Puedo hacer click en "Nuevo Movimiento"
- [ ] Se abre el modal de movimiento
- [ ] Veo el formulario con origen/destino
- [ ] Puedo seleccionar ubicaciones
- [ ] Puedo agregar productos
- [ ] Al guardar, aparece alerta de éxito

### Conteos
- [ ] Puedo hacer click en "Programar Conteo"
- [ ] Se abre el modal de conteo
- [ ] Veo el formulario con fecha/ubicación
- [ ] Puedo seleccionar tipo de conteo
- [ ] Al guardar, aparece alerta de éxito

---

## 🚨 SI ALGO NO FUNCIONA

**NO ESTOY HACIENDO DEPLOY hasta que todo esté ✅**

Por favor:
1. Marca qué items del checklist NO funcionan
2. Copia cualquier error de la consola
3. Toma capturas si es necesario
4. Comparte conmigo

Y arreglaremos CADA problema antes de hacer deploy.

---

## 🎯 PRÓXIMO PASO

Una vez que TODO en este checklist esté ✅:

1. Me confirmas que todo funciona
2. Hago un commit con descripción detallada
3. Hago push a GitHub
4. Vercel hace deploy automático

**Pero NO ANTES de que confirmes que todo funciona en local.**

---

## 📝 NOTAS

### Cambios Aplicados Hasta Ahora:

1. ✅ Ruta `/inventario` → `/productos`
2. ✅ Menú "Inventario" → "Productos"
3. ✅ Título de página actualizado
4. ✅ Google Sheets funciona con 119 productos
5. ✅ Inventario incluye `stock_minimo`
6. ✅ ConteoExecute carga inventario dinámicamente
7. ✅ Modales configurados correctamente

### Lo Que Falta Verificar:

1. ⏳ Login funciona
2. ⏳ Productos se cargan en la tabla
3. ⏳ Botones abren modales
4. ⏳ Formularios se pueden llenar
5. ⏳ Guardado funciona (localStorage)

---

**Servidor corriendo en:** http://localhost:6504/
**Test Google Sheets:** [test-google-sheets.html](test-google-sheets.html)

¡Valida y me cuentas cómo va!
