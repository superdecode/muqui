# 🎯 SOLUCIÓN EXACTA - Error 403 Google Sheets

## ✅ PROBLEMA IDENTIFICADO

Tu API Key **NO tiene habilitado Google Sheets API**. El error es claro:

```
Google Sheets API has not been used in project 766269925587 before or it is disabled.
```

## 🚀 SOLUCIÓN EN 3 PASOS SIMPLES

---

### PASO 1: Habilitar Google Sheets API (5 minutos)

**1.1. Abre este enlace directo (usa tu cuenta de Google):**

```
https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=766269925587
```

**1.2. Click en el botón "HABILITAR" (ENABLE)**

- Espera 1-2 minutos a que se active
- Verás un mensaje de confirmación

**1.3. Verifica que está habilitado:**

- Deberías ver "API habilitada" en la página
- Estado: ✅ Activado

---

### PASO 2: Actualizar Variables en Vercel (3 minutos)

**2.1. Ve a Vercel Environment Variables:**

```
https://vercel.com/quirons-projects/inventario-app/settings/environment-variables
```

**2.2. ELIMINA la variable antigua:**

- Busca: `VITE_GOOGLE_SHEETS_ID`
- Click en los 3 puntos → **Delete**

**2.3. CREA/ACTUALIZA estas variables:**

Click en "Add New" y agrega:

```
Name: VITE_GOOGLE_SPREADSHEET_ID
Value: 1y3BSVe6CcHGeyIvLuSAhDdHyR7nRXSboulfiKPe6s-c
Environments: ✓ Production ✓ Preview ✓ Development
```

**2.4. Verifica que tengas todas estas variables:**

```
VITE_USE_MOCK_DATA = false
VITE_USE_GOOGLE_SHEETS = true
VITE_GOOGLE_API_KEY = AIzaSyAnCEFz9o1DX9ymBW78iDcE6Z3ckOAb_Gg
VITE_GOOGLE_SPREADSHEET_ID = 1y3BSVe6CcHGeyIvLuSAhDdHyR7nRXSboulfiKPe6s-c
VITE_APP_NAME = Sistema de Inventario Muqui
VITE_ENABLE_FIREBASE = false
```

---

### PASO 3: Re-deployar en Vercel (2 minutos)

**Opción A - Desde tu Terminal (RECOMENDADO):**

```bash
cd /Users/quiron/CascadeProjects/muqui/inventario-app
git add .env .env.example
git commit -m "Fix: Correct Google Sheets configuration"
git push origin main
```

**Opción B - Desde Vercel Dashboard:**

1. Ve a: https://vercel.com/quirons-projects/inventario-app
2. Tab "Deployments"
3. Click en los "..." del último deployment
4. Click "Redeploy"
5. Confirma

**Espera 1-2 minutos** a que termine el deployment.

---

## 🧪 VERIFICACIÓN

### Test 1: Verifica que la API funciona

Abre esta URL en tu navegador:

```
https://sheets.googleapis.com/v4/spreadsheets/1y3BSVe6CcHGeyIvLuSAhDdHyR7nRXSboulfiKPe6s-c/values/Usuarios?key=AIzaSyAnCEFz9o1DX9ymBW78iDcE6Z3ckOAb_Gg
```

**Esperado:** Deberías ver datos JSON (no un error 403)

### Test 2: Prueba tu aplicación

1. **Abre:** https://muqui.vercel.app
2. **Login con:**
   ```
   Email: muqui.coo@gmail.com
   Password: temporal123
   ```
3. **Verifica:** Deberías ver el dashboard sin errores

---

## 📊 RESUMEN DE CAMBIOS APLICADOS

### Archivos Locales Actualizados ✅

**[.env](inventario-app/.env)**
```diff
- VITE_USE_MOCK_DATA=true
- VITE_USE_GOOGLE_SHEETS=false
- VITE_GOOGLE_SHEETS_ID=1vQ_aMuS5pJgbQ4ua-a1sGhvW5TbqwkjnFukuDxXelcn-k9KeT1wHl79hSMpLnhO2-3KPB0pnKFxG-8g

+ VITE_USE_MOCK_DATA=false
+ VITE_USE_GOOGLE_SHEETS=true
+ VITE_GOOGLE_SPREADSHEET_ID=1y3BSVe6CcHGeyIvLuSAhDdHyR7nRXSboulfiKPe6s-c
```

**[.env.example](inventario-app/.env.example)**
```diff
+ VITE_USE_MOCK_DATA=false
+ VITE_USE_GOOGLE_SHEETS=true
```

### Vercel (POR HACER) ⏳

- [ ] Variable `VITE_GOOGLE_SHEETS_ID` eliminada
- [ ] Variable `VITE_GOOGLE_SPREADSHEET_ID` creada con ID correcto
- [ ] Re-deployment ejecutado

### Google Cloud Console (POR HACER) ⏳

- [ ] Google Sheets API habilitada para el proyecto 766269925587

---

## 🔍 DIFERENCIAS IMPORTANTES

### ID Incorrecto vs ID Correcto

**❌ ID Incorrecto (el que tenías):**
```
1vQ_aMuS5pJgbQ4ua-a1sGhvW5TbqwkjnFukuDxXelcn-k9KeT1wHl79hSMpLnhO2-3KPB0pnKFxG-8g
```
- Este es el ID de la **versión publicada en web**
- Comienza con caracteres raros
- NO funciona con la API

**✅ ID Correcto (el nuevo):**
```
1y3BSVe6CcHGeyIvLuSAhDdHyR7nRXSboulfiKPe6s-c
```
- Este es el ID real del **spreadsheet**
- Está en la URL del editor
- SÍ funciona con la API

### Variable Incorrecta vs Variable Correcta

**❌ Variable Incorrecta:**
```
VITE_GOOGLE_SHEETS_ID
```
- No coincide con el código
- El código busca `VITE_GOOGLE_SPREADSHEET_ID`

**✅ Variable Correcta:**
```
VITE_GOOGLE_SPREADSHEET_ID
```
- Coincide exactamente con [googleSheetsAPI.js:7](inventario-app/src/services/googleSheetsAPI.js#L7)

---

## 🎯 CHECKLIST FINAL

Antes de probar, asegúrate de:

- [ ] ✅ Archivos locales actualizados (`.env` y `.env.example`)
- [ ] Google Sheets API habilitada en Cloud Console
- [ ] Variable `VITE_GOOGLE_SPREADSHEET_ID` creada en Vercel
- [ ] Variable antigua `VITE_GOOGLE_SHEETS_ID` eliminada de Vercel
- [ ] Variables `VITE_USE_MOCK_DATA=false` y `VITE_USE_GOOGLE_SHEETS=true` en Vercel
- [ ] Código commiteado y pusheado a Git
- [ ] Vercel re-desplegado (automáticamente con el push)
- [ ] Esperado 1-2 minutos después del deployment
- [ ] Probado en https://muqui.vercel.app

---

## 🆘 SI AÚN NO FUNCIONA

### Error 403 persiste:

**Causa:** Google Sheets API aún no está habilitada

**Solución:** Espera 2-3 minutos más después de habilitarla

### Error "spreadsheet not found":

**Causa:** El Sheet no está compartido públicamente

**Solución:**
1. Abre: https://docs.google.com/spreadsheets/d/1y3BSVe6CcHGeyIvLuSAhDdHyR7nRXSboulfiKPe6s-c/edit
2. Click "Compartir" (esquina superior derecha)
3. Cambiar a "Cualquier persona con el enlace" → "Lector"
4. Click "Listo"

### Variables no se aplican:

**Causa:** No re-desplegaste después de cambiar variables

**Solución:** Haz push a Git o redeploy manual desde Vercel

---

## 📞 CONTACTO

**Tu Google Sheet:**
https://docs.google.com/spreadsheets/d/1y3BSVe6CcHGeyIvLuSAhDdHyR7nRXSboulfiKPe6s-c/edit

**Tu App en Vercel:**
https://muqui.vercel.app

**Google Cloud Console (para habilitar API):**
https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=766269925587

---

**Fecha:** 18 de Enero, 2026
**Estado:** Archivos locales ✅ | Vercel ⏳ | Google Cloud ⏳
**Siguiente Paso:** Habilitar Google Sheets API en Cloud Console
