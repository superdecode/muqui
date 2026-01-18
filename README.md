# 🏪 Sistema de Inventario Multi-tienda - Muqui

Sistema completo de gestión de inventario para múltiples ubicaciones (bodegas y puntos de venta) con Google Sheets como backend.

## 🎯 Estado del Proyecto

**✅ COMPLETO Y LISTO PARA DEPLOYMENT**

- ✅ Aplicación React completamente funcional
- ✅ Google Apps Script backend implementado
- ✅ Mock data para desarrollo
- ✅ Configuración para producción preparada
- ✅ Guías de deployment completas
- ✅ Documentación exhaustiva

## 🚀 Inicio Rápido

### Para Desarrollo Local (con mock data)

```bash
cd inventario-app
npm install
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173)

**Credenciales**:
- Email: `admin@muqui.com`
- Password: `admin123`

### Para Producción (con Google Sheets)

Sigue la guía completa: **[RESUMEN_DEPLOYMENT.md](RESUMEN_DEPLOYMENT.md)**

## 📚 Documentación

### 🎯 Empieza aquí
- **[INICIAR_AQUI.md](INICIAR_AQUI.md)** - Guía de inicio rápido para el proyecto
- **[RESUMEN_DEPLOYMENT.md](RESUMEN_DEPLOYMENT.md)** - Resumen ejecutivo del proceso de deployment

### 📋 Guías Paso a Paso
- **[CHECKLIST_DEPLOYMENT.md](CHECKLIST_DEPLOYMENT.md)** - Checklist interactivo completo
- **[GUIA_GOOGLE_SHEETS.md](GUIA_GOOGLE_SHEETS.md)** - Configuración de Google Sheets
- **[GUIA_DEPLOYMENT.md](GUIA_DEPLOYMENT.md)** - Opciones de deployment detalladas

### 📖 Documentación Técnica
- **[IMPLEMENTACION_COMPLETA.md](IMPLEMENTACION_COMPLETA.md)** - Resumen completo de implementación
- **[inventario-app/README.md](inventario-app/README.md)** - Documentación técnica de la app
- **[inventario-app/GETTING_STARTED.md](inventario-app/GETTING_STARTED.md)** - Tutorial detallado
- **[inventario-app/PROJECT_SUMMARY.md](inventario-app/PROJECT_SUMMARY.md)** - Resumen del proyecto
- **[inventario-app/QUICK_START.md](inventario-app/QUICK_START.md)** - Referencia rápida

## 🗂️ Estructura del Proyecto

```
muqui/
├── inventario-app/              # Aplicación React
│   ├── src/
│   │   ├── components/         # Componentes reutilizables
│   │   ├── pages/              # Páginas principales
│   │   ├── services/           # Servicios de API
│   │   ├── stores/             # Estado global (Zustand)
│   │   ├── hooks/              # Custom hooks
│   │   ├── utils/              # Utilidades
│   │   ├── config/             # Configuración
│   │   └── data/               # Mock data
│   ├── google-apps-script/     # Backend de Google Sheets
│   ├── .env                    # Variables de desarrollo
│   ├── .env.production         # Variables de producción
│   ├── vercel.json             # Config Vercel
│   ├── netlify.toml            # Config Netlify
│   └── deploy.sh               # Script de deployment
├── RESUMEN_DEPLOYMENT.md       # 👈 EMPIEZA AQUÍ
├── CHECKLIST_DEPLOYMENT.md     # Checklist completo
├── GUIA_GOOGLE_SHEETS.md       # Guía de Google Sheets
├── GUIA_DEPLOYMENT.md          # Guía de deployment
└── IMPLEMENTACION_COMPLETA.md  # Documentación técnica
```

## 🎯 Funcionalidades

### ✅ Implementadas
- Dashboard interactivo con estadísticas
- Gestión de inventario multi-ubicación
- Sistema de transferencias entre ubicaciones
- Conteos de inventario programables
- Generación de reportes
- Sistema de alertas automáticas
- Autenticación con roles y permisos
- Responsive design (móvil y desktop)

### 🎨 Características Técnicas
- React 18 + Vite
- Tailwind CSS
- Zustand (estado global)
- TanStack Query (data fetching)
- React Router (navegación)
- Google Sheets backend
- Mock data para desarrollo

## 👥 Usuarios de Prueba

```
Admin Global:
Email: admin@muqui.com
Password: admin123
Acceso: Total

Gerente Operativo:
Email: gerente@muqui.com
Password: admin123
Acceso: Gestión operativa

Jefe de Punto:
Email: jefe@muqui.com
Password: admin123
Acceso: Su punto de venta
```

## 🚀 Proceso de Deployment

### Opción 1: GitHub Pages (Más Rápido)
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TU_USUARIO/inventario-muqui.git
git push -u origin main
cd inventario-app
npm run deploy:prod
```

### Opción 2: Vercel (Recomendado)
```bash
npm install -g vercel
cd inventario-app
vercel
```

### Opción 3: Netlify
```bash
cd inventario-app
npm run build:prod
# Luego arrastra carpeta 'dist' a netlify.com/drop
```

## 📊 Datos de Ejemplo Incluidos

- **3 usuarios** con diferentes roles
- **10 productos** del catálogo
- **3 ubicaciones** (1 bodega + 2 puntos de venta)
- **6 items** de inventario
- **2 transferencias** (1 pendiente, 1 confirmada)
- **2 conteos** (1 pendiente, 1 completado)
- **5 alertas** activas

## 🔧 Comandos Disponibles

```bash
# Desarrollo
npm run dev              # Servidor de desarrollo
npm run build            # Build de desarrollo
npm run build:prod       # Build de producción
npm run preview          # Preview del build

# Deployment
npm run deploy           # Deploy a GitHub Pages
npm run deploy:prod      # Deploy producción a GitHub Pages
npm run deploy:vercel    # Deploy a Vercel
npm run deploy:netlify   # Deploy a Netlify
./deploy.sh              # Script automatizado
```

## 🗺️ Roadmap Sugerido

1. **Ahora**: Configurar Google Sheets y hacer deployment para testing
2. **Corto plazo**:
   - Agregar formularios para crear/editar transferencias
   - Implementar confirmación de transferencias desde la app
   - Agregar más tipos de reportes
3. **Mediano plazo**:
   - Migrar a Firebase para mejor performance
   - Agregar notificaciones push
   - Implementar PWA para uso offline
4. **Largo plazo**:
   - App móvil nativa
   - Integración con escáners de códigos de barras
   - Analytics avanzados

## 🐛 Troubleshooting

### Error: "Failed to fetch"
- Verifica URL de Google Sheets en `.env.production`
- Asegúrate de que Apps Script esté desplegado como "Aplicación web"
- Verifica permisos: "Quién tiene acceso" = "Cualquier persona"

### Variables de entorno no funcionan
- Deben empezar con `VITE_`
- Reinicia el servidor después de cambiarlas
- En producción, configúralas en tu plataforma de deployment

### Puerto ocupado
- Edita `vite.config.js` y cambia el puerto

## 📞 Soporte

Para problemas o dudas:
1. Revisa la documentación en las guías
2. Verifica la sección de troubleshooting
3. Revisa los logs en DevTools (F12)

## 📄 Licencia

Este proyecto fue desarrollado específicamente para Muqui.

## 🎉 ¡Listo para Empezar!

### Si es tu primera vez:
1. Lee [INICIAR_AQUI.md](INICIAR_AQUI.md)
2. Ejecuta `npm run dev` para ver la app funcionando con mock data

### Si quieres hacer deployment:
1. Lee [RESUMEN_DEPLOYMENT.md](RESUMEN_DEPLOYMENT.md)
2. Sigue [CHECKLIST_DEPLOYMENT.md](CHECKLIST_DEPLOYMENT.md)

### Si necesitas configurar Google Sheets:
1. Lee [GUIA_GOOGLE_SHEETS.md](GUIA_GOOGLE_SHEETS.md)
2. Implementa el código de [inventario-app/google-apps-script/Code.gs](inventario-app/google-apps-script/Code.gs)

---

**Desarrollado con ❤️ para Muqui**

**Versión**: 1.0.0
**Última actualización**: Enero 2026
