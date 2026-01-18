# 📋 Resumen: Conexión Google Sheets + Deployment

## 🎯 Objetivo

Conectar la aplicación de inventario con Google Sheets como base de datos y deployarla para testing público.

## ✅ Lo que he preparado para ti

### 1. Guías Completas
- **[GUIA_GOOGLE_SHEETS.md](GUIA_GOOGLE_SHEETS.md)** - Configuración paso a paso de Google Sheets
- **[GUIA_DEPLOYMENT.md](GUIA_DEPLOYMENT.md)** - Opciones de deployment explicadas
- **[CHECKLIST_DEPLOYMENT.md](CHECKLIST_DEPLOYMENT.md)** - Checklist interactivo con todos los pasos

### 2. Archivos de Configuración
- **`.env.production`** - Variables de entorno para producción
- **`vercel.json`** - Configuración para Vercel
- **`netlify.toml`** - Configuración para Netlify
- **`deploy.sh`** - Script automatizado de deployment

### 3. Scripts npm Actualizados
```json
"build:prod": "vite build --mode production"
"deploy:prod": "npm run build:prod && gh-pages -d dist"
"deploy:vercel": "vercel --prod"
"deploy:netlify": "netlify deploy --prod --dir=dist"
```

## 🚀 Proceso Rápido (3 Pasos Principales)

### Paso 1: Configurar Google Sheets (30 minutos)

1. Crea una hoja de cálculo en Google Sheets
2. Crea 9 pestañas con las estructuras definidas
3. Copia los datos de ejemplo
4. Implementa el Google Apps Script
5. Obtén la URL de deployment

**Guía detallada**: [GUIA_GOOGLE_SHEETS.md](GUIA_GOOGLE_SHEETS.md)

### Paso 2: Conectar la Aplicación (5 minutos)

1. Edita `.env.production` con tu URL de Google Sheets
2. Cambia `VITE_USE_MOCK_DATA=false`
3. Prueba localmente:
```bash
cd /Users/quiron/CascadeProjects/muqui/inventario-app
cp .env.production .env
npm run dev
```

### Paso 3: Deploy (10 minutos)

**Opción más rápida - GitHub Pages:**
```bash
# 1. Inicializar git
git init
git add .
git commit -m "Initial commit"

# 2. Crear repo en GitHub y conectar
git remote add origin https://github.com/TU_USUARIO/inventario-muqui.git
git push -u origin main

# 3. Deploy
cd inventario-app
npm run deploy:prod
```

**Tu app estará en**: `https://TU_USUARIO.github.io/inventario-app/`

## 📊 Estructura de Google Sheets Necesaria

```
Inventario Muqui - Base de Datos/
├── Usuarios (3 usuarios de prueba)
├── Productos (10 productos)
├── Ubicaciones (3 ubicaciones)
├── Inventario (6 items)
├── Transferencias (2 transferencias)
├── DetalleTransferencias
├── Conteos (2 conteos)
├── DetalleConteos
└── Alertas (5 alertas activas)
```

## 🔑 Credenciales de Testing

```
Admin Global:
- Email: admin@muqui.com
- Password: admin123
- Acceso: Total

Gerente Operativo:
- Email: gerente@muqui.com
- Password: admin123
- Acceso: Gestión operativa

Jefe de Punto:
- Email: jefe@muqui.com
- Password: admin123
- Acceso: Su punto de venta
```

## 🎨 Opciones de Deployment

### GitHub Pages (Recomendado para testing)
- ✅ Gratis
- ✅ Fácil setup
- ✅ URL pública inmediata
- 📝 Guía: Sección "Opción 1" en [GUIA_DEPLOYMENT.md](GUIA_DEPLOYMENT.md)

### Vercel (Recomendado para producción)
- ✅ Muy rápido
- ✅ SSL automático
- ✅ Dominio personalizado
- 📝 Guía: Sección "Opción 2" en [GUIA_DEPLOYMENT.md](GUIA_DEPLOYMENT.md)

### Netlify
- ✅ Drag & drop simple
- ✅ Funciones serverless
- ✅ SSL automático
- 📝 Guía: Sección "Opción 3" en [GUIA_DEPLOYMENT.md](GUIA_DEPLOYMENT.md)

## 📝 Checklist Rápido

- [ ] Crear Google Sheet con 9 pestañas
- [ ] Implementar Google Apps Script
- [ ] Obtener URL de deployment de Apps Script
- [ ] Actualizar `.env.production` con la URL
- [ ] Probar localmente que funciona
- [ ] Elegir plataforma de deployment
- [ ] Deploy
- [ ] Testing final con usuarios

## 🛠️ Archivos Importantes

### Para Google Sheets
- **Código del backend**: [inventario-app/google-apps-script/Code.gs](inventario-app/google-apps-script/Code.gs)
- Este código maneja:
  - Autenticación
  - CRUD de inventario
  - Transferencias
  - Conteos
  - Alertas automáticas

### Para Configuración
- **Variables dev**: `.env` (actualmente usa mock data)
- **Variables prod**: `.env.production` (usa Google Sheets)
- **Config Vite**: `vite.config.js`
- **Config Vercel**: `vercel.json`
- **Config Netlify**: `netlify.toml`

## 🔄 Flujo de Datos

```
Usuario → App React → Google Apps Script → Google Sheets
                ↓
         Actualización en tiempo real
                ↓
    Dashboard, Inventario, Alertas, etc.
```

## ⚡ Comandos Útiles

```bash
# Desarrollo (con mock data)
npm run dev

# Build de producción
npm run build:prod

# Preview de producción local
npm run preview

# Deploy a GitHub Pages
npm run deploy:prod

# Deploy a Vercel
npm run deploy:vercel

# Deploy a Netlify
npm run deploy:netlify

# Script automatizado
./deploy.sh
```

## 🐛 Troubleshooting Común

### "Failed to fetch" al hacer login
- Verifica que la URL en `.env.production` sea correcta
- Asegúrate de que Apps Script esté desplegado como "Aplicación web"
- Verifica que "Quién tiene acceso" sea "Cualquier persona"

### Variables de entorno no funcionan
- Deben empezar con `VITE_`
- Reinicia el servidor después de cambiarlas
- En deployment, configúralas en la plataforma

### Datos no aparecen
- Abre DevTools → Network
- Busca la petición a Google Sheets
- Verifica el status code y response

## 📚 Documentación Adicional

- **Setup inicial**: [INICIAR_AQUI.md](INICIAR_AQUI.md)
- **Guía de inicio**: [inventario-app/GETTING_STARTED.md](inventario-app/GETTING_STARTED.md)
- **README técnico**: [inventario-app/README.md](inventario-app/README.md)
- **Implementación completa**: [IMPLEMENTACION_COMPLETA.md](IMPLEMENTACION_COMPLETA.md)

## 🎯 Tu Próximo Paso

1. **Abre**: [CHECKLIST_DEPLOYMENT.md](CHECKLIST_DEPLOYMENT.md)
2. **Sigue** cada paso marcando los checkboxes
3. **Empieza** con la configuración de Google Sheets
4. **Prueba** localmente
5. **Deploy** a tu plataforma preferida

## 📞 Testing Final

Una vez deployado, verifica:
- ✅ Login funciona con las credenciales de prueba
- ✅ Dashboard muestra datos de Google Sheets
- ✅ Inventario carga 6 productos
- ✅ Aparecen 5 alertas activas
- ✅ Transferencias se visualizan (2 transferencias)
- ✅ Navegación entre páginas funciona
- ✅ Responsive en móvil y desktop

## 🎉 Resultado Final

Tendrás:
- ✅ App funcionando con datos reales de Google Sheets
- ✅ URL pública para compartir y testing
- ✅ Base de datos editable (Google Sheets)
- ✅ Sistema completo de inventario multi-tienda
- ✅ 3 usuarios con diferentes roles
- ✅ Alertas automáticas funcionando

---

**Tiempo estimado total**: 45-60 minutos

**¿Listo para empezar?** → Abre [CHECKLIST_DEPLOYMENT.md](CHECKLIST_DEPLOYMENT.md)
