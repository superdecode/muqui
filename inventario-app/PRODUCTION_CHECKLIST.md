# ✅ Checklist de Producción - Sistema de Inventario Muqui

## Estado Actual del Sistema

### ✅ Completado
- [x] Build exitoso (sin errores)
- [x] Botón de transferencias habilitado
- [x] Formulario de transferencias funcional
- [x] Diseño con colores azul #004AFF
- [x] Badges con colores sólidos
- [x] Headers optimizados (espacios reducidos)
- [x] Sidebar con gradiente azul

### 🔧 Configuración de Variables de Entorno

#### Variables Actuales en Vercel
Debes configurar estas variables en Vercel Dashboard:

1. Ve a: https://vercel.com/quirons-projects/inventario-app
2. Settings → Environment Variables
3. Agrega/Verifica estas variables:

```
VITE_GOOGLE_API_KEY=AIzaSyAnCEFz9o1DX9ymBW78iDcE6Z3ckOAb_Gg
VITE_GOOGLE_SHEETS_ID=1vQ_aMuS5pJgbQ4ua-a1sGhvW5TbqwkjnFukuDxXelcn-k9KeT1wHl79hSMpLnhO2-3KPB0pnKFxG-8g
VITE_USE_MOCK_DATA=false
VITE_USE_GOOGLE_SHEETS=true
VITE_APP_NAME=Sistema de Inventario Muqui
VITE_ENABLE_FIREBASE=false
```

### 📋 Verificación de Google Sheets

#### Requisitos de la Hoja de Google Sheets:

1. **Hoja debe estar publicada en la web**
   - Archivo → Compartir → Publicar en la web
   - Publicar toda la hoja
   - Formato: Página web

2. **Pestañas requeridas:**
   - ✅ Usuarios
   - ✅ Productos
   - ✅ Inventario
   - ✅ Ubicaciones
   - ✅ Transferencias
   - ✅ Conteos
   - ✅ Alertas
   - ✅ Empresas

3. **Estructura de la pestaña Usuarios:**
   ```
   id | email | password | nombre_completo | rol | ubicacion_id | ubicacion_nombre | estado
   ```

4. **Datos de prueba en Usuarios:**
   ```
   1 | admin@muqui.com | admin123 | Administrador | ADMIN | 1 | Bodega Principal | ACTIVO
   2 | gerente@muqui.com | admin123 | Gerente | GERENTE | 1 | Bodega Principal | ACTIVO
   ```

### 🚀 Pasos para Deploy a Producción

#### Opción 1: Deploy Automático (Recomendado)
```bash
cd /Users/quiron/CascadeProjects/muqui/inventario-app
vercel --prod
```

#### Opción 2: Deploy Manual
1. Commit cambios:
   ```bash
   git add .
   git commit -m "feat: add transfer form, update colors to #004AFF, optimize headers"
   git push
   ```

2. Vercel detectará automáticamente el push y desplegará

### 🧪 Testing Post-Deploy

Después del deploy, verifica:

1. **Login funciona:**
   - URL: https://inventario-app-sand.vercel.app
   - Usuario: admin@muqui.com
   - Contraseña: admin123

2. **Navegación funciona:**
   - Dashboard carga correctamente
   - Inventario muestra productos
   - Transferencias abre formulario
   - Sidebar con colores azules

3. **Datos de Google Sheets:**
   - Productos se cargan desde Sheets
   - Usuarios pueden autenticarse
   - Inventario refleja datos reales

### ⚠️ Troubleshooting

#### Si el login falla en producción:
1. Verifica que las variables de entorno estén configuradas en Vercel
2. Confirma que `VITE_USE_GOOGLE_SHEETS=true`
3. Verifica que la hoja de Google Sheets esté publicada
4. Revisa que el API Key sea válido

#### Si la página queda en blanco:
1. Abre DevTools (F12) → Console
2. Busca errores de JavaScript
3. Verifica que los assets se carguen correctamente
4. Confirma que no haya errores 404

#### Si Google Sheets no funciona:
1. Verifica que la hoja esté publicada en la web
2. Confirma que el SHEETS_ID sea correcto
3. Prueba el API Key en: 
   ```
   https://sheets.googleapis.com/v4/spreadsheets/SHEETS_ID/values/Usuarios?key=API_KEY
   ```

### 📊 URLs del Proyecto

- **Producción:** https://inventario-app-sand.vercel.app
- **Vercel Dashboard:** https://vercel.com/quirons-projects/inventario-app
- **Repositorio:** /Users/quiron/CascadeProjects/muqui

### 🎯 Próximos Pasos Después del Deploy

1. Prueba todas las funcionalidades en producción
2. Agrega datos reales a Google Sheets
3. Invita usuarios a probar el sistema
4. Monitorea errores en Vercel Dashboard
5. Ajusta permisos y roles según necesidad

---

**Fecha de última actualización:** 17 de Enero, 2026
**Versión:** 1.0.0
