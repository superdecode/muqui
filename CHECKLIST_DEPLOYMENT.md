# ✅ Checklist Completo: Conexión Google Sheets + Deployment

## Fase 1: Configuración de Google Sheets

### Paso 1.1: Crear Hoja de Cálculo
- [ ] Ir a [Google Sheets](https://sheets.google.com)
- [ ] Crear nueva hoja de cálculo
- [ ] Nombrarla: "Inventario Muqui - Base de Datos"

### Paso 1.2: Crear Pestañas (Hojas)
- [ ] Crear hoja "Usuarios" con columnas correctas
- [ ] Crear hoja "Productos" con columnas correctas
- [ ] Crear hoja "Ubicaciones" con columnas correctas
- [ ] Crear hoja "Inventario" con columnas correctas
- [ ] Crear hoja "Transferencias" con columnas correctas
- [ ] Crear hoja "DetalleTransferencias" con columnas correctas
- [ ] Crear hoja "Conteos" con columnas correctas
- [ ] Crear hoja "DetalleConteos" con columnas correctas
- [ ] Crear hoja "Alertas" con columnas correctas

> 💡 Ver detalles completos en [GUIA_GOOGLE_SHEETS.md](GUIA_GOOGLE_SHEETS.md)

### Paso 1.3: Agregar Datos de Prueba
- [ ] Copiar datos de usuarios (3 usuarios)
- [ ] Copiar datos de productos (10 productos)
- [ ] Copiar datos de ubicaciones (3 ubicaciones)
- [ ] Copiar datos de inventario (6 items)
- [ ] Copiar datos de transferencias (2 transferencias)
- [ ] Copiar datos de detalle de transferencias
- [ ] Copiar datos de conteos (2 conteos)
- [ ] Copiar datos de detalle de conteos
- [ ] Copiar datos de alertas (5 alertas)

## Fase 2: Implementar Google Apps Script

### Paso 2.1: Abrir Editor de Scripts
- [ ] En la hoja de cálculo: Extensiones → Apps Script
- [ ] Borrar código predeterminado

### Paso 2.2: Copiar Código
- [ ] Abrir archivo: `/Users/quiron/CascadeProjects/muqui/inventario-app/google-apps-script/Code.gs`
- [ ] Copiar TODO el contenido
- [ ] Pegar en el editor de Apps Script
- [ ] Guardar (Ctrl/Cmd + S)
- [ ] Nombrar proyecto: "API Inventario Muqui"

### Paso 2.3: Implementar como Web App
- [ ] Click en "Implementar" → "Nueva implementación"
- [ ] Tipo: "Aplicación web"
- [ ] Ejecutar como: "Yo"
- [ ] Quién tiene acceso: "Cualquier persona"
- [ ] Click "Implementar"
- [ ] **COPIAR LA URL** (empieza con https://script.google.com/macros/s/...)
- [ ] Guardar esta URL en un lugar seguro

### Paso 2.4: Autorizar Script
- [ ] Si aparece pantalla de autorización, click "Revisar permisos"
- [ ] Seleccionar tu cuenta Google
- [ ] Click "Avanzado" → "Ir a API Inventario Muqui"
- [ ] Click "Permitir"

## Fase 3: Configurar la Aplicación

### Paso 3.1: Actualizar Variables de Entorno
- [ ] Abrir archivo: `/Users/quiron/CascadeProjects/muqui/inventario-app/.env.production`
- [ ] Reemplazar `YOUR_DEPLOYMENT_ID` con tu URL de Apps Script
- [ ] Verificar que `VITE_USE_MOCK_DATA=false`

Ejemplo:
```env
VITE_GOOGLE_SHEETS_API_URL=https://script.google.com/macros/s/AKfycby.../exec
VITE_USE_MOCK_DATA=false
```

### Paso 3.2: Probar Conexión Localmente
- [ ] Abrir terminal
- [ ] Ejecutar:
```bash
cd /Users/quiron/CascadeProjects/muqui/inventario-app
cp .env.production .env
npm run dev
```

### Paso 3.3: Verificar Funcionamiento
- [ ] Abrir http://localhost:5173
- [ ] Intentar login: admin@muqui.com / admin123
- [ ] Verificar que Dashboard carga datos reales de Sheets
- [ ] Verificar que aparecen las 5 alertas
- [ ] Verificar estadísticas correctas
- [ ] Revisar Inventario (debe mostrar 6 productos)
- [ ] Revisar Transferencias (debe mostrar 2)

### Paso 3.4: Troubleshooting
Si algo falla:
- [ ] Abrir DevTools (F12)
- [ ] Ver Console para errores
- [ ] Ver Network tab para peticiones fallidas
- [ ] Verificar que la URL de Apps Script sea correcta
- [ ] Verificar que el script esté desplegado como "Aplicación web"

## Fase 4: Preparar Deployment

### Paso 4.1: Verificar Configuración
- [ ] Archivo `.env.production` tiene URL correcta
- [ ] Archivo `package.json` tiene scripts de deploy
- [ ] Archivos `vercel.json` y `netlify.toml` están presentes

### Paso 4.2: Build de Prueba
- [ ] Ejecutar:
```bash
cd /Users/quiron/CascadeProjects/muqui/inventario-app
npm run build:prod
```
- [ ] Verificar que no hay errores
- [ ] Verificar que carpeta `dist` se creó

### Paso 4.3: Preview Local de Build
- [ ] Ejecutar:
```bash
npm run preview
```
- [ ] Abrir http://localhost:4173
- [ ] Probar login y navegación
- [ ] Verificar que todo funciona igual que en dev

## Fase 5: Deployment (Elige una opción)

### Opción A: GitHub Pages

#### A1. Inicializar Git
- [ ] Ejecutar:
```bash
cd /Users/quiron/CascadeProjects/muqui
git init
git add .
git commit -m "Initial commit: Sistema de Inventario Muqui"
```

#### A2. Crear Repo en GitHub
- [ ] Ir a https://github.com/new
- [ ] Nombre: `inventario-muqui`
- [ ] Crear repositorio
- [ ] NO agregar README ni .gitignore

#### A3. Push a GitHub
- [ ] Ejecutar (reemplaza TU_USUARIO):
```bash
git remote add origin https://github.com/TU_USUARIO/inventario-muqui.git
git branch -M main
git push -u origin main
```

#### A4. Deploy
- [ ] Ejecutar:
```bash
cd inventario-app
npm run deploy:prod
```

#### A5. Verificar
- [ ] Ir a https://TU_USUARIO.github.io/inventario-app/
- [ ] Puede tardar 2-3 minutos
- [ ] Probar login y funcionalidades

### Opción B: Vercel

#### B1. Crear Cuenta
- [ ] Ir a https://vercel.com
- [ ] Sign up con GitHub

#### B2. Instalar CLI
- [ ] Ejecutar:
```bash
npm install -g vercel
```

#### B3. Login
- [ ] Ejecutar:
```bash
vercel login
```

#### B4. Deploy
- [ ] Ejecutar:
```bash
cd /Users/quiron/CascadeProjects/muqui/inventario-app
vercel
```

#### B5. Configurar Variables
- [ ] Ir a vercel.com → tu proyecto
- [ ] Settings → Environment Variables
- [ ] Agregar:
  - `VITE_GOOGLE_SHEETS_API_URL`: Tu URL
  - `VITE_USE_MOCK_DATA`: `false`
  - `VITE_APP_NAME`: `Sistema de Inventario Muqui`

#### B6. Redeploy
- [ ] Ejecutar:
```bash
vercel --prod
```

#### B7. Verificar
- [ ] Abrir URL proporcionada (ej: inventario-muqui.vercel.app)
- [ ] Probar todas las funcionalidades

### Opción C: Netlify

#### C1. Build
- [ ] Ejecutar:
```bash
cd /Users/quiron/CascadeProjects/muqui/inventario-app
npm run build:prod
```

#### C2. Deploy
- [ ] Ir a https://app.netlify.com/drop
- [ ] Arrastrar carpeta `dist`
- [ ] Esperar que termine

#### C3. Configurar Variables
- [ ] Site settings → Environment variables
- [ ] Agregar las mismas que en Vercel

#### C4. Verificar
- [ ] Abrir la URL generada
- [ ] Probar funcionalidades

## Fase 6: Testing Final

### Pruebas Funcionales
- [ ] Login funciona
- [ ] Dashboard muestra datos correctos
- [ ] Inventario carga productos desde Sheets
- [ ] Transferencias se visualizan
- [ ] Conteos aparecen
- [ ] Alertas están activas
- [ ] Navegación entre páginas funciona

### Pruebas de Datos
- [ ] Editar producto en Google Sheets
- [ ] Recargar app, verificar cambio
- [ ] Agregar nueva alerta en Sheets
- [ ] Verificar que aparece en la app

### Pruebas de Usuarios
- [ ] Login con admin@muqui.com
- [ ] Logout
- [ ] Login con gerente@muqui.com
- [ ] Logout
- [ ] Login con jefe@muqui.com
- [ ] Verificar que cada uno ve datos correctos

### Performance
- [ ] Tiempo de carga < 3 segundos
- [ ] Navegación fluida
- [ ] Sin errores en Console
- [ ] Responsive en móvil

## Fase 7: Documentación

### Compartir con el Equipo
- [ ] Crear documento con:
  - URL de la aplicación
  - Credenciales de acceso
  - URL de Google Sheets (solo para admins)
  - Guías de uso

### Credenciales para Testing
```
Admin Global:
Email: admin@muqui.com
Password: admin123

Gerente Operativo:
Email: gerente@muqui.com
Password: admin123

Jefe de Punto:
Email: jefe@muqui.com
Password: admin123
```

## 🎉 ¡Completado!

Una vez que todos los checks estén ✅, tu aplicación estará:
- ✅ Conectada a Google Sheets
- ✅ Funcionando con datos reales
- ✅ Desplegada y accesible públicamente
- ✅ Lista para testing con usuarios reales

---

## Soporte

Si encuentras problemas:
1. Revisa [GUIA_GOOGLE_SHEETS.md](GUIA_GOOGLE_SHEETS.md)
2. Revisa [GUIA_DEPLOYMENT.md](GUIA_DEPLOYMENT.md)
3. Verifica la sección de troubleshooting en cada guía

---

## Próximos Pasos (Opcional)

- [ ] Configurar dominio personalizado
- [ ] Agregar más usuarios en Sheets
- [ ] Personalizar datos para tu negocio
- [ ] Configurar alertas automáticas por email
- [ ] Implementar reportes personalizados
