# 📊 Configuración de Google Sheets para Pruebas Reales

## ✅ Configuración Actual

He configurado la aplicación para usar **Google Sheets real** con estas variables:

```
VITE_USE_MOCK_DATA=false
VITE_USE_GOOGLE_SHEETS=true
VITE_GOOGLE_API_KEY=AIzaSyAnCEFz9o1DX9ymBW78iDcE6Z3ckOAb_Gg
VITE_GOOGLE_SHEETS_ID=1vQ_aMuS5pJgbQ4ua-a1sGhvW5TbqwkjnFukuDxXelcn-k9KeT1wHl79hSMpLnhO2-3KPB0pnKFxG-8g
```

## 📋 Requisitos de Google Sheets

Para que funcione correctamente, tu hoja de Google Sheets debe cumplir:

### 1. Hoja Publicada en la Web

**Pasos:**
1. Abre tu Google Sheet: https://docs.google.com/spreadsheets/d/1vQ_aMuS5pJgbQ4ua-a1sGhvW5TbqwkjnFukuDxXelcn-k9KeT1wHl79hSMpLnhO2-3KPB0pnKFxG-8g
2. Ve a **Archivo → Compartir → Publicar en la web**
3. Selecciona **Toda la hoja**
4. Formato: **Página web**
5. Click en **Publicar**
6. Confirma la publicación

### 2. Pestañas Requeridas

Tu hoja debe tener estas 8 pestañas con estos nombres exactos:

1. **Usuarios** - Para autenticación
2. **Productos** - Catálogo de productos
3. **Inventario** - Stock actual por ubicación
4. **Ubicaciones** - Tiendas/bodegas
5. **Transferencias** - Movimientos entre ubicaciones
6. **Conteos** - Conteos físicos de inventario
7. **Alertas** - Notificaciones de stock bajo
8. **Empresas** - Información de la empresa

### 3. Estructura de la Pestaña "Usuarios"

**Columnas requeridas (primera fila):**
```
id | email | password | nombre_completo | rol | ubicacion_id | ubicacion_nombre | estado
```

**Datos de ejemplo (agregar en fila 2):**
```
1 | admin@muqui.com | admin123 | Administrador | ADMIN | 1 | Bodega Principal | ACTIVO
```

**Datos de ejemplo (agregar en fila 3):**
```
2 | gerente@muqui.com | admin123 | Gerente | GERENTE | 1 | Bodega Principal | ACTIVO
```

### 4. Estructura de la Pestaña "Productos"

**Columnas requeridas:**
```
id | nombre | especificacion | unidad_medida | stock_minimo_default | frecuencia_inventario_dias | categoria | estado | fecha_creacion
```

**Ejemplo:**
```
1 | Laptop Dell XPS | 15 pulgadas | UNIDAD | 5 | 30 | Electrónica | ACTIVO | 2026-01-01
2 | Mouse Logitech | Inalámbrico | UNIDAD | 10 | 30 | Accesorios | ACTIVO | 2026-01-01
```

### 5. Estructura de la Pestaña "Ubicaciones"

**Columnas requeridas:**
```
id | nombre | tipo | direccion | responsable | estado
```

**Ejemplo:**
```
1 | Bodega Principal | BODEGA | Calle Principal 123 | Juan Pérez | ACTIVO
2 | Punto de Venta 1 | TIENDA | Av. Central 456 | María García | ACTIVO
```

### 6. Estructura de la Pestaña "Inventario"

**Columnas requeridas:**
```
id | producto_id | producto | ubicacion_id | ubicacion | stock_actual | stock_minimo | unidad_medida | categoria | ultima_actualizacion
```

**Ejemplo:**
```
1 | 1 | Laptop Dell XPS | 1 | Bodega Principal | 10 | 5 | UNIDAD | Electrónica | 2026-01-17
2 | 2 | Mouse Logitech | 1 | Bodega Principal | 25 | 10 | UNIDAD | Accesorios | 2026-01-17
```

## 🚀 Probar Localmente

1. **Iniciar servidor de desarrollo:**
```bash
cd /Users/quiron/CascadeProjects/muqui/inventario-app
npm run dev
```

2. **Abrir en navegador:**
```
http://localhost:5173
```

3. **Login con credenciales de Google Sheets:**
```
Usuario: admin@muqui.com
Contraseña: admin123
```

## 🔧 Troubleshooting

### Error: "Failed to fetch" en login

**Causa:** La hoja no está publicada o el API Key es inválido

**Solución:**
1. Verifica que la hoja esté publicada en la web
2. Prueba el API manualmente:
```
https://sheets.googleapis.com/v4/spreadsheets/1vQ_aMuS5pJgbQ4ua-a1sGhvW5TbqwkjnFukuDxXelcn-k9KeT1wHl79hSMpLnhO2-3KPB0pnKFxG-8g/values/Usuarios?key=AIzaSyAnCEFz9o1DX9ymBW78iDcE6Z3ckOAb_Gg
```

### Error: "Usuario no encontrado"

**Causa:** La pestaña "Usuarios" no tiene los datos correctos

**Solución:**
1. Verifica que la pestaña se llame exactamente "Usuarios"
2. Verifica que la primera fila tenga los nombres de columnas
3. Verifica que haya al menos un usuario en la fila 2

### Error: CORS

**Causa:** Google Sheets API tiene restricciones CORS

**Solución:**
1. Asegúrate que la hoja esté publicada
2. Verifica que el API Key tenga permisos para Google Sheets API
3. En producción, Vercel maneja CORS automáticamente

## 📊 Verificar Conexión

Abre DevTools (F12) → Console y ejecuta:

```javascript
fetch('https://sheets.googleapis.com/v4/spreadsheets/1vQ_aMuS5pJgbQ4ua-a1sGhvW5TbqwkjnFukuDxXelcn-k9KeT1wHl79hSMpLnhO2-3KPB0pnKFxG-8g/values/Usuarios?key=AIzaSyAnCEFz9o1DX9ymBW78iDcE6Z3ckOAb_Gg')
  .then(r => r.json())
  .then(d => console.log(d))
```

Deberías ver los datos de la pestaña Usuarios.

## 🌐 Deploy a Vercel con Google Sheets

### Paso 1: Configurar Variables en Vercel

Ve a: https://vercel.com/quirons-projects/inventario-app/settings/environment-variables

Agrega estas variables:

```
VITE_USE_MOCK_DATA = false
VITE_USE_GOOGLE_SHEETS = true
VITE_GOOGLE_API_KEY = AIzaSyAnCEFz9o1DX9ymBW78iDcE6Z3ckOAb_Gg
VITE_GOOGLE_SHEETS_ID = 1vQ_aMuS5pJgbQ4ua-a1sGhvW5TbqwkjnFukuDxXelcn-k9KeT1wHl79hSMpLnhO2-3KPB0pnKFxG-8g
VITE_APP_NAME = Sistema de Inventario Muqui
VITE_ENABLE_FIREBASE = false
```

### Paso 2: Solucionar Error de Git

El error que estás viendo:
```
Error: Git author muqui.coo@gmail.com must have access to the team Quiron's projects
```

**Soluciones:**

**Opción 1: Deploy sin Git (Recomendado)**
```bash
cd /Users/quiron/CascadeProjects/muqui/inventario-app
vercel --prod --force
```

**Opción 2: Cambiar autor de Git**
```bash
git config user.email "tu-email-de-vercel@gmail.com"
git config user.name "Tu Nombre"
vercel --prod
```

**Opción 3: Deploy desde Dashboard de Vercel**
1. Ve a https://vercel.com/quirons-projects/inventario-app
2. Click en "Deployments"
3. Click en "Redeploy" del último deployment
4. Selecciona "Use existing Build Cache"
5. Click en "Redeploy"

### Paso 3: Verificar Deploy

Una vez deployado, prueba:
1. Login con admin@muqui.com / admin123
2. Verifica que cargue datos de Google Sheets
3. Prueba crear transferencias y conteos

---

**Build actual:** 366.53 kB JS (109.00 kB gzip)  
**Estado:** ✅ Configurado para Google Sheets real  
**Fecha:** 17 de Enero, 2026
