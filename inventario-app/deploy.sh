#!/bin/bash

# Script de Deployment para Sistema de Inventario Muqui
# Este script construye y despliega la aplicación para testing

echo "🚀 Iniciando proceso de deployment..."

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Debes ejecutar este script desde el directorio inventario-app${NC}"
    exit 1
fi

# Verificar que se haya configurado la URL de Google Sheets
if grep -q "YOUR_DEPLOYMENT_ID" .env.production; then
    echo -e "${YELLOW}⚠️  ADVERTENCIA: No has configurado la URL de Google Sheets en .env.production${NC}"
    echo -e "${YELLOW}   Edita el archivo .env.production y reemplaza YOUR_DEPLOYMENT_ID con tu ID real${NC}"
    read -p "¿Deseas continuar de todos modos? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${GREEN}✓${NC} Instalando dependencias..."
npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error instalando dependencias${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Construyendo aplicación para producción..."
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error en el build${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Build completado exitosamente!${NC}"
echo ""
echo "📦 Archivos generados en: ./dist"
echo ""
echo "🌐 Opciones de deployment:"
echo ""
echo "1️⃣  GitHub Pages:"
echo "   - Inicializa un repositorio Git si no lo has hecho"
echo "   - Ejecuta: npm run deploy"
echo ""
echo "2️⃣  Vercel:"
echo "   - Instala Vercel CLI: npm i -g vercel"
echo "   - Ejecuta: vercel --prod"
echo ""
echo "3️⃣  Netlify:"
echo "   - Instala Netlify CLI: npm i -g netlify-cli"
echo "   - Ejecuta: netlify deploy --prod --dir=dist"
echo ""
echo "4️⃣  Servidor local de prueba:"
echo "   - Ejecuta: npm run preview"
echo "   - Abre: http://localhost:4173"
echo ""
echo -e "${YELLOW}📝 IMPORTANTE:${NC}"
echo "   - Asegúrate de haber configurado Google Sheets según GUIA_GOOGLE_SHEETS.md"
echo "   - Verifica que .env.production tenga la URL correcta de tu Apps Script"
echo ""
