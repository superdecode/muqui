# 🚀 INICIA AQUÍ - Sistema de Inventario Muqui

## ⚡ Inicio Rápido (2 comandos)

```bash
cd inventario-app
npm run dev
```

Luego abre: **http://localhost:5173**

## 🔑 Credenciales de Acceso

```
Email:    admin@muqui.com
Password: admin123
```

---

## 📂 Archivos Importantes

| Archivo | Descripción |
|---------|-------------|
| [GETTING_STARTED.md](inventario-app/GETTING_STARTED.md) | 👈 **Empieza aquí** - Tutorial completo |
| [IMPLEMENTACION_COMPLETA.md](IMPLEMENTACION_COMPLETA.md) | Resumen de todo lo implementado |
| [inventario-app/README.md](inventario-app/README.md) | Documentación técnica completa |
| [inventario-app/QUICK_START.md](inventario-app/QUICK_START.md) | Referencia rápida de comandos |

---

## ✅ Estado del Proyecto

### **TODO ESTÁ LISTO Y FUNCIONANDO** ✨

- ✅ **190 dependencias** instaladas
- ✅ **47 archivos** de código creados
- ✅ **Mock data** completo con datos de prueba
- ✅ **6 páginas** funcionales
- ✅ **5 alertas** activas de ejemplo
- ✅ **10 productos** en catálogo
- ✅ **3 usuarios** de prueba
- ✅ **Documentación** completa

---

## 🎯 ¿Qué Puedes Hacer?

### Explorar la Aplicación
1. **Dashboard** - Ver estadísticas y alertas
2. **Inventario** - Filtrar y buscar productos
3. **Transferencias** - Ver movimientos entre ubicaciones
4. **Conteos** - Revisar conteos programados
5. **Reportes** - Generar reportes

### Probar Diferentes Roles
Cierra sesión y prueba con:
- `gerente@muqui.com` (Gerente Operativo)
- `jefe@muqui.com` (Jefe de Punto)

### Modificar el Código
- Todos los archivos están en `inventario-app/src/`
- Hot reload activado (cambios automáticos)
- Datos mock en `src/data/mockData.js`

---

## 🛠️ Comandos Esenciales

```bash
# Desarrollo
npm run dev          # Inicia servidor (puerto 5173)

# Producción
npm run build        # Construye para producción
npm run preview      # Vista previa de build

# Limpieza
rm -rf node_modules  # Borrar dependencias
npm install          # Reinstalar
```

---

## 📱 Navegación

```
/ ..................... Dashboard principal
/inventario ........... Gestión de productos
/transferencias ....... Movimientos entre ubicaciones
/conteos .............. Conteos de inventario
/reportes ............. Reportes y exportación
/login ................ Inicio de sesión
```

---

## 💡 Tips Importantes

### Modo Desarrollo Activo
- Variable `VITE_USE_MOCK_DATA=true` en `.env`
- Usa datos de prueba (no necesita backend)
- Simula delays de red realistas

### Hot Reload
- Guarda cualquier archivo → Los cambios aparecen automáticamente
- No necesitas recargar el navegador

### React DevTools
- Presiona F12 → Consola del navegador
- Instala React DevTools para debugging

---

## 🐛 ¿Problemas?

### Puerto ocupado
```bash
# Edita inventario-app/vite.config.js
# Cambia: server: { port: 5174 }
```

### No carga
```bash
# Reinstala dependencias
cd inventario-app
rm -rf node_modules
npm install
npm run dev
```

### Errores en consola
- Abre F12 → Console
- Revisa los mensajes de error
- La mayoría son advertencias normales

---

## 🎓 Aprende Más

### Archivos Clave para Entender
1. `src/App.jsx` - Rutas y estructura
2. `src/pages/Dashboard.jsx` - Ejemplo completo
3. `src/hooks/useInventario.js` - Hook personalizado
4. `src/data/mockData.js` - Datos de ejemplo

### Personalizar
1. **Colores** → `tailwind.config.js`
2. **Constantes** → `src/utils/constants.js`
3. **Mock Data** → `src/data/mockData.js`
4. **Configuración** → `.env`

---

## 📊 Datos de Ejemplo Incluidos

- **10 productos** (Tapioca, Té, Lácteos, Café, etc.)
- **6 items** en inventario con diferentes estados
- **3 ubicaciones** (1 bodega + 2 puntos de venta)
- **2 transferencias** (1 pendiente, 1 confirmada)
- **2 conteos** (1 pendiente, 1 completado)
- **5 alertas** activas de diferentes tipos

---

## 🚀 Siguiente Nivel

### Cuando Estés Listo
1. Configurar Google Sheets API
2. Implementar Google Apps Script
3. Cambiar a modo producción
4. Deploy a GitHub Pages

**Guía completa en**: [README.md](inventario-app/README.md)

---

## ✨ Empecemos

```bash
cd inventario-app && npm run dev
```

**¡Abre http://localhost:5173 y disfruta! 🎉**

---

*¿Preguntas? Revisa: [GETTING_STARTED.md](inventario-app/GETTING_STARTED.md)*
