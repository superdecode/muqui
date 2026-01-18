# 🚀 Despliegue a Producción - Sistema de Inventario Muqui

## ✅ Estado Actual

- ✅ Build exitoso
- ✅ Todos los errores corregidos
- ✅ Diseño moderno aplicado
- ✅ Módulo de gestión de productos creado
- ✅ Conexión con Google Sheets configurada

## 🌐 Opción 1: Vercel (RECOMENDADO - MÁS RÁPIDO)

### Pasos para Deployment a Vercel:

#### 1. Instalar Vercel CLI

```bash
npm install -g vercel
```

#### 2. Login en Vercel

```bash
vercel login
```

Sigue las instrucciones en el navegador para autenticarte.

#### 3. Deploy desde el directorio de la app

```bash
cd /Users/quiron/CascadeProjects/muqui/inventario-app
vercel
```

La primera vez te preguntará:
- **Set up and deploy?** → Y
- **Which scope?** → Tu cuenta personal
- **Link to existing project?** → N
- **Project name?** → `inventario-muqui`
- **In which directory?** → `.` (dejar en blanco)
- **Want to override settings?** → N

#### 4. Deploy a Producción

```bash
vercel --prod
```

#### 5. Configurar Variables de Entorno en Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Encuentra tu proyecto `inventario-muqui`
3. Ve a **Settings** → **Environment Variables**
4. Agrega estas variables:

```
VITE_GOOGLE_API_KEY = AIzaSyAnCEFz9o1DX9ymBW78iDcE6Z3ckOAb_Gg
VITE_GOOGLE_SHEETS_ID = 1vQ_aMuS5pJgbQ4ua-a1sGhvW5TbqwkjnFukuDxXelcn-k9KeT1wHl79hSMpLnhO2-3KPB0pnKFxG-8g
VITE_USE_MOCK_DATA = false
VITE_USE_GOOGLE_SHEETS = true
VITE_APP_NAME = Sistema de Inventario Muqui
VITE_ENABLE_FIREBASE = false
```

#### 6. Redeploy para aplicar variables

```bash
vercel --prod
```

**¡Listo!** Tu app estará en: `https://inventario-muqui.vercel.app` (o similar)

---

## 🌐 Opción 2: Netlify

### Deployment con Netlify CLI

#### 1. Instalar Netlify CLI

```bash
npm install -g netlify-cli
```

#### 2. Login

```bash
netlify login
```

#### 3. Deploy

```bash
cd /Users/quiron/CascadeProjects/muqui/inventario-app
netlify deploy --prod --dir=dist
```

Sigue las instrucciones:
- **Create & configure a new site?** → Y
- **Team** → Tu equipo personal
- **Site name** → `inventario-muqui`

#### 4. Configurar Variables de Entorno

En [app.netlify.com](https://app.netlify.com):
1. Encuentra tu sitio
2. Site settings → Environment variables
3. Agrega las mismas variables que para Vercel

---

## 🌐 Opción 3: GitHub Pages

### Prerequisitos: Necesitas un repositorio en GitHub

#### 1. Crear repositorio en GitHub

1. Ve a [github.com/new](https://github.com/new)
2. Nombre: `inventario-muqui`
3. Privado o Público (tu elección)
4. NO agregar README, .gitignore ni LICENSE
5. Crear repositorio

#### 2. Inicializar Git y Push

```bash
cd /Users/quiron/CascadeProjects/muqui
git init
git add .
git commit -m "feat: Sistema de inventario con diseño moderno y gestión de productos"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/inventario-muqui.git
git push -u origin main
```

#### 3. Configurar GitHub Pages

1. Ve a tu repositorio en GitHub
2. Settings → Pages
3. Source: **Deploy from a branch**
4. Branch: Selecciona `gh-pages`
   (Si no existe, selecciona `main` y carpeta `/docs` por ahora)

#### 4. Deploy

```bash
cd inventario-app
npm run deploy:prod
```

Esto creará la rama `gh-pages` automáticamente y hará el deployment.

#### 5. Acceder

Tu sitio estará en: `https://TU_USUARIO.github.io/inventario-app/`

**Nota**: GitHub Pages no soporta variables de entorno de servidor, así que asegúrate de que tu `.env.production` esté configurado antes del build.

---

## 📋 Checklist Pre-Deployment

### Configuración de Google Sheets

- [ ] Tu hoja de Google Sheets está creada
- [ ] Tiene las 8 pestañas necesarias (Usuarios, Productos, Inventario, etc.)
- [ ] La hoja está **publicada en la web** (Archivo → Compartir → Publicar en la web)
- [ ] Tienes datos de prueba en las hojas

### Verificación Local

- [ ] `npm run build` funciona sin errores ✅
- [ ] El archivo `.env.production` tiene la configuración correcta
- [ ] Has probado localmente con `npm run dev`

### Git y GitHub

- [ ] Has inicializado el repositorio git
- [ ] Has hecho commit de todos los archivos
- [ ] Has creado un repositorio en GitHub (si usas GitHub Pages)

---

## 🚀 Deployment Rápido con Vercel (5 minutos)

### Opción más rápida - Sin configuración previa:

```bash
# 1. Instalar Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Deploy
cd /Users/quiron/CascadeProjects/muqui/inventario-app
vercel --prod
```

Sigue las instrucciones en pantalla y ¡listo!

---

## 🔧 Configuración Post-Deployment

### 1. Verifica que todo funcione

- [ ] Abre la URL de tu deployment
- [ ] Prueba el login con: `admin@muqui.com` / `admin123`
- [ ] Verifica que el Dashboard cargue
- [ ] Prueba crear un producto nuevo
- [ ] Verifica que los datos de Google Sheets se muestren

### 2. Configura un dominio personalizado (Opcional)

**En Vercel**:
1. Settings → Domains
2. Add Domain → Ingresa tu dominio
3. Sigue las instrucciones de DNS

**En Netlify**:
1. Domain settings → Add custom domain
2. Sigue las instrucciones

### 3. Habilita HTTPS (Automático en Vercel y Netlify)

Tanto Vercel como Netlify habilitan HTTPS automáticamente con Let's Encrypt.

---

## 📊 URLs Finales

Después del deployment, tu aplicación estará disponible en:

- **Vercel**: `https://inventario-muqui.vercel.app` (o tu dominio personalizado)
- **Netlify**: `https://inventario-muqui.netlify.app` (o tu dominio personalizado)
- **GitHub Pages**: `https://TU_USUARIO.github.io/inventario-app/`

---

## 🐛 Troubleshooting

### Error: "Module not found" en producción

Asegúrate de que todos los imports usen rutas relativas correctas:
```javascript
import Button from '../components/common/Button'  // ✅ Correcto
import Button from '@/components/common/Button'  // ❌ Solo funciona con alias configurado
```

### Error: "Failed to fetch" en login

1. Verifica que las variables de entorno estén configuradas en tu plataforma
2. Asegúrate de que Google Sheets API Key sea válida
3. Verifica que la hoja esté publicada

### El diseño no se ve bien

1. Verifica que Tailwind CSS esté compilando correctamente
2. Revisa que `tailwind.config.js` incluya todos los archivos: `"./src/**/*.{js,jsx,ts,tsx}"`
3. Asegúrate de que `index.css` tenga las directivas de Tailwind

---

## ✅ Todo Listo para Live

Tu aplicación está lista para ser desplegada. Sigue el método que prefieras:

1. **Vercel** - 5 minutos, más rápido
2. **Netlify** - 5 minutos, muy fácil
3. **GitHub Pages** - 10 minutos, gratis y simple

**Recomendación**: Usa **Vercel** para producción.

---

## 📞 Próximos Pasos Después del Deployment

1. **Comparte la URL** con tu equipo
2. **Prueba** todas las funcionalidades en producción
3. **Ajusta** los datos en Google Sheets según necesites
4. **Personaliza** colores y branding si es necesario
5. **Agrega** más productos y ubicaciones

---

**¿Listo para deployar?** Ejecuta:

```bash
npm install -g vercel
vercel login
cd /Users/quiron/CascadeProjects/muqui/inventario-app
vercel --prod
```

🎉 **¡Eso es todo!**
