# Guía de Inicio Rápido

## 1. Instalación (5 minutos)

```bash
# Asegúrate de tener Node.js 16+ instalado
node --version

# Instalar dependencias
npm install
```

## 2. Configuración (2 minutos)

```bash
# Crear archivo de variables de entorno
cp .env.example .env

# Editar .env con tus credenciales
# (Opcional en desarrollo - usa datos de ejemplo)
```

## 3. Iniciar Aplicación (1 minuto)

```bash
# Modo desarrollo
npm run dev

# La app se abrirá en http://localhost:5173
```

## 4. Login

Usa las credenciales de prueba:
- **Email**: admin@muqui.com
- **Password**: admin123

## Estructura de Navegación

```
/login          → Página de inicio de sesión
/               → Dashboard (requiere auth)
/inventario     → Gestión de inventario
/transferencias → Transferencias entre ubicaciones
/conteos        → Conteos de inventario
/reportes       → Reportes y exportación
```

## Comandos Útiles

```bash
# Desarrollo
npm run dev

# Build para producción
npm run build

# Preview de producción
npm run preview

# Deploy a GitHub Pages
npm run deploy
```

## Próximos Pasos

1. **Conectar con Google Sheets API**
   - Ver [README.md](README.md#configuración-de-google-sheets-api)

2. **Personalizar la Aplicación**
   - Modificar colores en [tailwind.config.js](tailwind.config.js)
   - Actualizar nombre en [.env](.env.example)

3. **Agregar Más Funcionalidad**
   - Ver estructura en [src/](src/)
   - Seguir patrones existentes

## Solución de Problemas

### El servidor no inicia
```bash
# Limpiar node_modules
rm -rf node_modules
npm install
```

### Error de puerto ocupado
```bash
# Cambiar puerto en vite.config.js
# server: { port: 5174 }
```

### Cambios no se reflejan
```bash
# Reiniciar servidor dev
# Ctrl+C y luego npm run dev
```

## Recursos

- [Documentación completa](README.md)
- [Resumen del proyecto](PROJECT_SUMMARY.md)
- [Estructura de carpetas](PROJECT_SUMMARY.md#estructura-completa-del-proyecto)

---

¿Listo? ¡Ejecuta `npm install && npm run dev` y comienza! 🚀
