# 🚀 Guía de Deployment - Sistema de Inventario Muqui

## Prerequisitos

Antes de hacer deployment, asegúrate de haber completado:

1. ✅ Configuración de Google Sheets (ver [GUIA_GOOGLE_SHEETS.md](GUIA_GOOGLE_SHEETS.md))
2. ✅ Implementación de Google Apps Script
3. ✅ URL de Apps Script agregada a `.env.production`
4. ✅ Probado localmente que la conexión funciona

## Opción 1: GitHub Pages (Recomendado para Testing Rápido)

### Ventajas
- Gratis
- Fácil de configurar
- URL pública inmediata
- Ideal para testing

### Pasos

1. **Inicializar repositorio Git** (si no lo has hecho):
```bash
cd /Users/quiron/CascadeProjects/muqui
git init
git add .
git commit -m "Initial commit: Sistema de Inventario Muqui"
```

2. **Crear repositorio en GitHub**:
   - Ve a [GitHub](https://github.com/new)
   - Crea un nuevo repositorio (puede ser privado o público)
   - Nombre sugerido: `inventario-muqui`
   - NO inicialices con README (ya tienes archivos)

3. **Conectar con GitHub**:
```bash
git remote add origin https://github.com/TU_USUARIO/inventario-muqui.git
git branch -M main
git push -u origin main
```

4. **Configurar GitHub Pages**:
   - Ve a tu repositorio en GitHub
   - Settings → Pages
   - Source: "Deploy from a branch"
   - Branch: selecciona `gh-pages` (se creará automáticamente)

5. **Deploy**:
```bash
cd inventario-app
npm run deploy:prod
```

6. **Acceder a tu app**:
   - URL: `https://TU_USUARIO.github.io/inventario-app/`
   - Puede tardar 2-3 minutos en estar disponible

### Actualizaciones Futuras
Cada vez que hagas cambios:
```bash
git add .
git commit -m "Descripción de cambios"
git push
cd inventario-app
npm run deploy:prod
```

---

## Opción 2: Vercel (Recomendado para Producción)

### Ventajas
- Extremadamente rápido
- SSL automático
- Previews automáticos de PRs
- CDN global
- Dominio personalizado gratis

### Pasos

1. **Crear cuenta en Vercel**:
   - Ve a [vercel.com](https://vercel.com)
   - Regístrate con GitHub

2. **Instalar Vercel CLI**:
```bash
npm install -g vercel
```

3. **Login**:
```bash
vercel login
```

4. **Deploy**:
```bash
cd /Users/quiron/CascadeProjects/muqui/inventario-app
vercel
```

Sigue las instrucciones:
- Set up and deploy? → Y
- Which scope? → Tu cuenta
- Link to existing project? → N
- Project name? → inventario-muqui
- In which directory? → ./
- Want to override settings? → N

5. **Deploy a producción**:
```bash
npm run deploy:vercel
```

6. **Configurar variables de entorno en Vercel**:
   - Ve a tu proyecto en vercel.com
   - Settings → Environment Variables
   - Agrega:
     - `VITE_GOOGLE_SHEETS_API_URL`: Tu URL de Apps Script
     - `VITE_USE_MOCK_DATA`: `false`
     - `VITE_APP_NAME`: `Sistema de Inventario Muqui`

7. **Redeploy** para aplicar variables:
```bash
vercel --prod
```

Tu app estará en: `https://inventario-muqui.vercel.app`

---

## Opción 3: Netlify

### Ventajas
- Fácil drag & drop
- Formularios integrados
- Functions serverless
- SSL automático

### Método A: Drag & Drop (Más Fácil)

1. **Build local**:
```bash
cd /Users/quiron/CascadeProjects/muqui/inventario-app
npm run build:prod
```

2. **Deploy**:
   - Ve a [netlify.com](https://www.netlify.com)
   - Arrastra la carpeta `dist` a Netlify Drop

3. **Configurar variables**:
   - Site settings → Environment variables
   - Agrega las mismas que en Vercel

### Método B: Netlify CLI

1. **Instalar CLI**:
```bash
npm install -g netlify-cli
```

2. **Login**:
```bash
netlify login
```

3. **Deploy**:
```bash
cd /Users/quiron/CascadeProjects/muqui/inventario-app
npm run deploy:netlify
```

---

## Opción 4: Servidor Propio / VPS

### Para servidores con Node.js

1. **Build**:
```bash
npm run build:prod
```

2. **Subir archivos**:
   - Sube la carpeta `dist` a tu servidor
   - Configura nginx o Apache para servir archivos estáticos

3. **Configuración Nginx** (ejemplo):
```nginx
server {
    listen 80;
    server_name tudominio.com;
    root /var/www/inventario-muqui/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## Testing del Deployment

Una vez deployado, verifica:

### 1. Login Funcional
```
Email: admin@muqui.com
Password: admin123
```

### 2. Datos Reales
- Dashboard muestra estadísticas reales de Google Sheets
- Alertas aparecen correctamente
- Inventario se carga desde Sheets

### 3. Funcionalidades
- [ ] Login/Logout
- [ ] Dashboard carga datos
- [ ] Inventario muestra productos
- [ ] Transferencias se visualizan
- [ ] Alertas funcionan
- [ ] Navegación entre páginas

### 4. Performance
- Abre DevTools (F12)
- Network tab: verifica que las peticiones a Google Sheets funcionen
- Console: no debe haber errores críticos

---

## Configuración de Dominio Personalizado

### GitHub Pages
1. Compra un dominio
2. Settings → Pages → Custom domain
3. Agrega el dominio
4. Configura DNS:
   - Tipo A: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - O CNAME: `TU_USUARIO.github.io`

### Vercel
1. Project Settings → Domains
2. Add Domain
3. Sigue las instrucciones de DNS

### Netlify
1. Domain settings → Add custom domain
2. Sigue las instrucciones

---

## Solución de Problemas

### Error: "Failed to fetch" al hacer login
- Verifica que `VITE_GOOGLE_SHEETS_API_URL` esté correctamente configurada
- Asegúrate de que el Apps Script esté desplegado como "Aplicación web"
- Verifica que "Quién tiene acceso" sea "Cualquier persona"

### Error: "404 Not Found" en rutas
- En Vercel/Netlify: crea archivo `vercel.json` o `netlify.toml`
- En GitHub Pages: ya configurado en `vite.config.js`

### Datos no se cargan
- Abre DevTools → Network
- Busca la petición a Google Sheets
- Verifica el response

### Variables de entorno no funcionan
- Recuerda que variables DEBEN empezar con `VITE_`
- Redeploy después de cambiar variables
- En desarrollo local, reinicia `npm run dev`

---

## Mantenimiento

### Actualizar después de cambios en Sheets
- Los cambios en Google Sheets se reflejan automáticamente
- No necesitas redeploy de la app

### Actualizar código de la app
```bash
# Hacer cambios en el código
git add .
git commit -m "Descripción"
git push

# Redeploy según plataforma:
npm run deploy:prod      # GitHub Pages
vercel --prod           # Vercel
netlify deploy --prod   # Netlify
```

---

## Recomendación Final

Para **testing inicial**: **GitHub Pages**
- Fácil, rápido, gratis
- Perfecto para mostrar a clientes/equipo

Para **producción real**: **Vercel**
- Mejor performance
- Más profesional
- Mejor UX para usuarios finales

---

## Script Automatizado

Hemos incluido un script que hace todo automáticamente:

```bash
cd /Users/quiron/CascadeProjects/muqui/inventario-app
./deploy.sh
```

Este script:
1. ✅ Verifica configuración
2. ✅ Instala dependencias
3. ✅ Hace build de producción
4. ✅ Muestra opciones de deployment

---

## Siguiente Paso

Elige tu plataforma preferida y sigue los pasos correspondientes. ¡En minutos tendrás tu app live!

🎯 **Recomendación**: Empieza con GitHub Pages para testing rápido.
