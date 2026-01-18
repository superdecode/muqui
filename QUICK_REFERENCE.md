# ⚡ Referencia Rápida - Deployment

## 🎯 3 Pasos Principales

### 1️⃣ Google Sheets (30 min)
```
1. Crear hoja: "Inventario Muqui - Base de Datos"
2. Crear 9 pestañas con datos
3. Apps Script → Pegar código
4. Implementar → Copiar URL
```
📖 Guía: [GUIA_GOOGLE_SHEETS.md](GUIA_GOOGLE_SHEETS.md)

### 2️⃣ Configurar App (5 min)
```bash
cd /Users/quiron/CascadeProjects/muqui/inventario-app
# Editar .env.production con tu URL
cp .env.production .env
npm run dev
# Probar: http://localhost:5173
```

### 3️⃣ Deploy (10 min)
```bash
# OPCIÓN RÁPIDA: GitHub Pages
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TU_USUARIO/inventario-muqui.git
git push -u origin main
npm run deploy:prod

# OPCIÓN PRO: Vercel
npm install -g vercel
vercel
```

---

## 🔑 Credenciales

```
admin@muqui.com / admin123 (Admin)
gerente@muqui.com / admin123 (Gerente)
jefe@muqui.com / admin123 (Jefe)
```

---

## 📝 Comandos

```bash
# Desarrollo
npm run dev

# Build
npm run build:prod

# Deploy
npm run deploy:prod     # GitHub Pages
vercel --prod           # Vercel
netlify deploy --prod   # Netlify
./deploy.sh             # Auto
```

---

## 📁 Archivos Clave

- `.env.production` → Configuración producción
- `google-apps-script/Code.gs` → Backend
- `CHECKLIST_DEPLOYMENT.md` → Pasos completos

---

## 🆘 Problemas Comunes

### "Failed to fetch"
→ Verifica URL en `.env.production`
→ Apps Script desplegado como "Aplicación web"
→ "Quién tiene acceso" = "Cualquier persona"

### Variables no funcionan
→ Deben empezar con `VITE_`
→ Reinicia servidor
→ Recarga página

### Datos no aparecen
→ F12 → Network → Busca petición a Sheets
→ Verifica response

---

## 📚 Documentación

| Archivo | Propósito |
|---------|-----------|
| [README.md](README.md) | Índice general |
| [RESUMEN_DEPLOYMENT.md](RESUMEN_DEPLOYMENT.md) | Resumen ejecutivo |
| [CHECKLIST_DEPLOYMENT.md](CHECKLIST_DEPLOYMENT.md) | Checklist paso a paso |
| [GUIA_GOOGLE_SHEETS.md](GUIA_GOOGLE_SHEETS.md) | Setup de Sheets |
| [GUIA_DEPLOYMENT.md](GUIA_DEPLOYMENT.md) | Opciones de deploy |

---

## ✅ Testing Final

- [ ] Login funciona
- [ ] Dashboard carga datos
- [ ] 5 alertas visibles
- [ ] 6 productos en inventario
- [ ] 2 transferencias
- [ ] Navegación fluida

---

## 🎯 Próximo Paso

👉 **[CHECKLIST_DEPLOYMENT.md](CHECKLIST_DEPLOYMENT.md)**
