# 🔧 Solución Completa - Error 403 Google Sheets

## 🚨 Problema Identificado

Tu aplicación en Vercel está obteniendo un error **403 Forbidden** al intentar conectarse a Google Sheets porque:

1. **Nombre de variable incorrecto** en el código
2. **La hoja de cálculo NO está publicada en la web**
3. **API Key sin permisos adecuados**

---

## ✅ SOLUCIÓN PASO A PASO

### PASO 1: Corregir el nombre de la variable de entorno

**Problema:** El código usa `VITE_GOOGLE_SPREADSHEET_ID` pero el .env tiene `VITE_GOOGLE_SHEETS_ID`

**Opción A - Cambiar el .env (MÁS RÁPIDO):**

Actualiza tu archivo `.env` y las variables en Vercel:

```env
VITE_USE_MOCK_DATA=false
VITE_USE_GOOGLE_SHEETS=true
VITE_GOOGLE_API_KEY=AIzaSyAnCEFz9o1DX9ymBW78iDcE6Z3ckOAb_Gg
VITE_GOOGLE_SPREADSHEET_ID=1vQ_aMuS5pJgbQ4ua-a1sGhvW5TbqwkjnFukuDxXelcn-k9KeT1wHl79hSMpLnhO2-3KPB0pnKFxG-8g
VITE_APP_NAME=Sistema de Inventario Muqui
VITE_ENABLE_FIREBASE=false
```

**IMPORTANTE:** Cambiar `VITE_GOOGLE_SHEETS_ID` por `VITE_GOOGLE_SPREADSHEET_ID`

---

### PASO 2: Publicar tu Google Sheet en la Web

**Este es el paso MÁS IMPORTANTE para solucionar el error 403**

1. **Abre tu Google Sheet:**
   ```
   https://docs.google.com/spreadsheets/d/1vQ_aMuS5pJgbQ4ua-a1sGhvW5TbqwkjnFukuDxXelcn-k9KeT1wHl79hSMpLnhO2-3KPB0pnKFxG-8g/edit
   ```

2. **Ve al menú superior:**
   - Click en **"Archivo"** (File)

3. **Selecciona "Compartir":**
   - Click en **"Compartir" → "Publicar en la web"**
   - O busca **"File → Share → Publish to web"**

4. **Configurar la publicación:**
   - En la pestaña **"Vincular"** (Link):
     - Selecciona **"Documento completo"** (Entire document)
     - O selecciona hojas específicas si prefieres
   - Formato: **"Página web"** (Web page)
   - Click en **"Publicar"** (Publish)

5. **Confirmar:**
   - Te preguntará si estás seguro → Click **"Aceptar"** (OK)
   - **Copia el enlace generado** (aunque no lo necesitarás, es bueno guardarlo)

6. **CRÍTICO - Hacer la hoja pública para lectura:**
   - Click en el botón **"Compartir"** (esquina superior derecha)
   - En "Acceso general" → Cambiar a **"Cualquier persona con el enlace"**
   - Seleccionar **"Lector"** (Viewer)
   - Click en **"Listo"**

---

### PASO 3: Verificar/Crear API Key en Google Cloud Console

1. **Ve a Google Cloud Console:**
   ```
   https://console.cloud.google.com/
   ```

2. **Selecciona o crea un proyecto:**
   - Si no tienes proyecto, crea uno nuevo
   - Nombre sugerido: "Inventario Muqui"

3. **Habilitar Google Sheets API:**
   - Ve a **"API y servicios" → "Biblioteca"**
   - Busca **"Google Sheets API"**
   - Click en **"Habilitar"** (Enable)

4. **Crear/Verificar API Key:**
   - Ve a **"API y servicios" → "Credenciales"**
   - Click en **"Crear credenciales" → "Clave de API"**
   - **Copia la API Key generada**

5. **Restringir la API Key (OPCIONAL pero recomendado):**
   - Click en la API Key que acabas de crear
   - En "Restricciones de aplicación":
     - Selecciona **"Referentes HTTP (sitios web)"**
     - Agrega:
       ```
       https://muqui.vercel.app/*
       http://localhost:5174/*
       ```
   - En "Restricciones de API":
     - Selecciona **"Restringir clave"**
     - Marca **"Google Sheets API"**
   - Click en **"Guardar"**

---

### PASO 4: Actualizar Variables de Entorno en Vercel

1. **Ve a tu proyecto en Vercel:**
   ```
   https://vercel.com/quirons-projects/inventario-app
   ```

2. **Ve a Settings → Environment Variables**

3. **Actualiza/Agrega estas variables:**

   ```
   VITE_USE_MOCK_DATA = false
   VITE_USE_GOOGLE_SHEETS = true
   VITE_GOOGLE_API_KEY = [TU_NUEVA_API_KEY_O_LA_ACTUAL]
   VITE_GOOGLE_SPREADSHEET_ID = 1vQ_aMuS5pJgbQ4ua-a1sGhvW5TbqwkjnFukuDxXelcn-k9KeT1wHl79hSMpLnhO2-3KPB0pnKFxG-8g
   VITE_APP_NAME = Sistema de Inventario Muqui
   VITE_ENABLE_FIREBASE = false
   ```

   **NOTA:** Cambia `VITE_GOOGLE_SHEETS_ID` por `VITE_GOOGLE_SPREADSHEET_ID`

4. **Asegúrate de aplicar a todos los entornos:**
   - Production ✓
   - Preview ✓
   - Development ✓

---

### PASO 5: Re-deployar en Vercel

**Opción A - Desde el Dashboard:**
1. Ve a tu proyecto en Vercel
2. Ve a la pestaña **"Deployments"**
3. Click en los **"..."** del último deployment
4. Click en **"Redeploy"**
5. Confirma el redespliegue

**Opción B - Desde Git (RECOMENDADO):**
```bash
# Hacer un commit vacío para forzar redespliegue
git commit --allow-empty -m "Redeploy: Fix Google Sheets env vars"
git push origin main
```

---

### PASO 6: Probar la Aplicación

1. **Espera a que termine el deployment en Vercel** (1-2 minutos)

2. **Abre tu aplicación:**
   ```
   https://muqui.vercel.app
   ```

3. **Prueba el login:**
   ```
   Email: muqui.coo@gmail.com
   Password: temporal123
   ```

4. **Verifica que cargue datos** (no debería mostrar error 403)

---

## 🔍 Verificación de Problemas

### Si aún tienes error 403:

**1. Verifica en la consola del navegador:**
```
F12 → Console → Network
```
Busca la petición a `sheets.googleapis.com` y verifica:
- La URL completa
- El API Key que está usando
- El Spreadsheet ID

**2. Verifica que el Spreadsheet ID sea correcto:**

El ID correcto debe ser:
```
1vQ_aMuS5pJgbQ4ua-a1sGhvW5TbqwkjnFukuDxXelcn-k9KeT1wHl79hSMpLnhO2-3KPB0pnKFxG-8g
```

**IMPORTANTE:** Este ID parece inusualmente largo. Verifica que sea el ID correcto de tu Google Sheet.

Para encontrar el ID correcto:
- Abre tu Google Sheet
- El ID está en la URL entre `/d/` y `/edit`:
  ```
  https://docs.google.com/spreadsheets/d/[ESTE_ES_EL_ID]/edit
  ```

**3. Prueba directamente la API en el navegador:**

Abre esta URL en tu navegador (reemplaza con tu API Key):
```
https://sheets.googleapis.com/v4/spreadsheets/1vQ_aMuS5pJgbQ4ua-a1sGhvW5TbqwkjnFukuDxXelcn-k9KeT1wHl79hSMpLnhO2-3KPB0pnKFxG-8g/values/Usuarios?key=AIzaSyAnCEFz9o1DX9ymBW78iDcE6Z3ckOAb_Gg
```

**Si funciona:** Deberías ver datos JSON
**Si da 403:** El problema está en los permisos del Sheet

---

## 📋 Checklist Final

Antes de considerar que está resuelto, verifica:

- [ ] Google Sheet publicado en la web
- [ ] Google Sheet con acceso público de lectura
- [ ] Google Sheets API habilitada en Cloud Console
- [ ] API Key creada y activa
- [ ] Variables de entorno actualizadas en Vercel
- [ ] Nombre correcto: `VITE_GOOGLE_SPREADSHEET_ID` (no `SHEETS_ID`)
- [ ] Aplicación re-desplegada en Vercel
- [ ] Probado en producción sin error 403

---

## 🆘 Solución Temporal - Usar Mock Data

Si necesitas que funcione YA mientras solucionas Google Sheets:

**En Vercel, cambia:**
```
VITE_USE_MOCK_DATA = true
VITE_USE_GOOGLE_SHEETS = false
```

Esto hará que la app funcione con datos de prueba mientras configuras Google Sheets correctamente.

---

## 📞 Siguiente Paso

**Después de aplicar los pasos 1-6, prueba la aplicación y déjame saber:**

1. ¿Ya no aparece el error 403?
2. ¿Ves datos en la aplicación?
3. ¿Qué mensaje aparece ahora en consola?

Si el problema persiste, necesitaré:
- El ID exacto de tu Google Sheet (de la URL)
- Screenshot del error en consola
- Confirmación de que el sheet está publicado

---

**Fecha:** 18 de Enero, 2026
**Problema:** Error 403 en Google Sheets API
**Estado:** Solución documentada ✅
