# 🚀 Guía de Inicio - Sistema de Inventario Muqui

## ¡Todo está listo para usar!

El proyecto ha sido completamente configurado con datos de prueba y está listo para ejecutarse.

## 📋 Pasos para Iniciar

### 1. Iniciar el Servidor de Desarrollo

```bash
cd /Users/quiron/CascadeProjects/muqui/inventario-app
npm run dev
```

La aplicación se abrirá automáticamente en [http://localhost:5173](http://localhost:5173)

### 2. Iniciar Sesión

Usa cualquiera de estas credenciales de prueba:

#### Usuario Admin Global
- **Email**: admin@muqui.com
- **Password**: admin123
- **Permisos**: Acceso total al sistema

#### Usuario Gerente Operativo
- **Email**: gerente@muqui.com
- **Password**: admin123
- **Permisos**: Gestión de bodegas y puntos corporativos

#### Usuario Jefe de Punto
- **Email**: jefe@muqui.com
- **Password**: admin123
- **Permisos**: Gestión de su punto de venta

## 🎯 Funcionalidades Implementadas

### ✅ Dashboard
- Estadísticas en tiempo real
- 5 alertas activas de ejemplo
- Widgets de acceso rápido
- Datos mock completamente funcionales

### ✅ Inventario
- Vista completa de productos
- Filtros por categoría y búsqueda
- Indicadores de stock (OK, Bajo, Sin Stock)
- 6 productos de ejemplo con diferentes estados

### ✅ Transferencias
- Creación de transferencias
- Confirmación de recepción
- Estados: Pendiente, Confirmada
- 2 transferencias de ejemplo

### ✅ Conteos
- Programación de conteos
- Ejecución y registro
- 2 conteos de ejemplo

### ✅ Reportes
- Reporte de stock actual
- Reporte de consumo
- Rotación de inventario
- Exportación (preparado)

### ✅ Alertas
- Stock mínimo (5 alertas activas)
- Transferencias sin confirmar
- Conteos pendientes
- Sistema de prioridades

## 🗂️ Datos de Prueba Incluidos

### Productos (10 productos)
- TAPIOCA (3 KG) - 25 unidades
- TAPIOCA MUQUI - 45 unidades
- TÉ VERDE - 3 unidades (ALERTA: Bajo stock)
- LECHE EN POLVO - 0 unidades (ALERTA: Sin stock)
- LECHE LIQUIDA - 8 unidades (ALERTA: Bajo stock)
- OREO - 5 unidades
- Y más...

### Ubicaciones (3 ubicaciones)
- Bodega Principal
- Punto de Venta 1
- Punto de Venta 2

### Alertas (5 alertas activas)
- 3 alertas de stock mínimo (1 crítica, 2 altas)
- 1 transferencia sin confirmar
- 1 conteo pendiente

## 🔧 Comandos Útiles

```bash
# Desarrollo
npm run dev

# Build para producción
npm run build

# Preview de producción
npm run preview

# Deploy a GitHub Pages (cuando esté configurado)
npm run deploy
```

## 📱 Navegación de la App

```
/ (Dashboard)
├── /inventario
├── /transferencias
├── /conteos
└── /reportes
```

## 🎨 Características de UI/UX

- **Responsive**: Funciona perfectamente en móvil, tablet y desktop
- **Dark Sidebar**: Navegación lateral oscura elegante
- **Indicadores visuales**: Colores según estado (verde=OK, amarillo=bajo, rojo=crítico)
- **Alertas en tiempo real**: Badge con contador de alertas no leídas
- **Loading states**: Spinners mientras cargan los datos

## 🔄 Modo de Desarrollo vs Producción

### Modo Actual: DESARROLLO (Mock Data)
- Variable: `VITE_USE_MOCK_DATA=true` en [.env](.env)
- Usa datos de prueba de [src/data/mockData.js](src/data/mockData.js)
- No requiere backend configurado
- Simula delays de red realistas

### Para Cambiar a Producción:
1. Edita `.env` y cambia:
   ```
   VITE_USE_MOCK_DATA=false
   VITE_GOOGLE_SHEETS_API_URL=https://script.google.com/macros/s/TU_ID/exec
   ```

2. Configura Google Sheets API (ver [README.md](README.md))

3. Implementa el Google Apps Script del directorio [google-apps-script/](google-apps-script/)

## 🐛 Solución de Problemas

### El servidor no inicia
```bash
# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

### Puerto ocupado
- Edita [vite.config.js](vite.config.js)
- Cambia `server.port` a otro número (ej: 5174)

### Cambios no se reflejan
- Presiona Ctrl+C para detener el servidor
- Ejecuta `npm run dev` nuevamente

## 📚 Próximos Pasos Recomendados

1. **Explora la aplicación** con los diferentes roles de usuario
2. **Revisa el código** en [src/](src/) para entender la estructura
3. **Personaliza** colores y estilos en [tailwind.config.js](tailwind.config.js)
4. **Agrega funcionalidades** siguiendo los patrones existentes
5. **Configura Google Sheets** cuando estés listo para datos reales

## 💡 Tips

- **Hot Reload**: Los cambios en el código se reflejan automáticamente
- **Console del navegador**: Presiona F12 para ver logs y debuggear
- **React DevTools**: Instala la extensión para inspeccionar componentes
- **Network Tab**: Útil para ver las "peticiones" a la API mock

## 📞 Soporte

- **Documentación completa**: [README.md](README.md)
- **Resumen técnico**: [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)
- **Quick Start**: [QUICK_START.md](QUICK_START.md)

---

## 🎉 ¡Listo para Empezar!

```bash
npm run dev
```

**URL**: http://localhost:5173
**Email**: admin@muqui.com
**Password**: admin123

¡Disfruta explorando tu Sistema de Inventario Multi-tienda! 🚀
