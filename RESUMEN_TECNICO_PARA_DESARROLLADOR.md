# Sistema de Gestión de Inventario Multi-tienda - Resumen Técnico

## 🎯 VISIÓN GENERAL

**Aplicación web responsive** para gestionar inventario multi-tienda (3 bodegas + 6 puntos de venta) que elimina la gestión manual mediante Google Sheets, proporcionando control centralizado, automatización y visibilidad por roles.

---

## 🏗️ ARQUITECTURA DEL SISTEMA

### **Frontend: React + Vite**
```
├── src/
│   ├── components/          # Componentes UI reutilizables
│   │   ├── common/          # Componentes genéricos (AlertsPanel, UserMenu, etc.)
│   │   ├── layout/          # Layout principal (Header, Sidebar, etc.)
│   │   └── [feature]/       # Componentes por funcionalidad
│   ├── pages/               # Páginas principales
│   ├── services/            # Lógica de negocio y API
│   ├── stores/              # Estado global (Zustand)
│   ├── data/                # Mock data para desarrollo
│   └── config/              # Configuración centralizada
```

### **Backend: Multi-fuente de datos**
```
1. Google Sheets API (lectura) - Datos maestros
2. LocalStorage (escritura) - Cambios temporales
3. Mock Data (desarrollo) - Datos de prueba
4. API REST (futuro) - Backend completo
```

---

## 📊 MODELO DE DATOS

### **Entidades Principales**

#### 🏢 EMPRESA
```javascript
{
  id: "MK001",                    // ID único
  nombre: "Muqui",               // Nombre empresa
  tipo: "CORPORATIVO",           // CORPORATIVO | FRANQUICIADO
  estado: "ACTIVO",              // ACTIVO | INACTIVO
  fecha_creacion: "2025-01-01"
}
```

#### 👤 USUARIO
```javascript
{
  id: "USR001",
  nombre: "Admin Global",
  email: "muqui.coo@gmail.com",
  rol: "ADMIN_GLOBAL",           // ADMIN_GLOBAL | GERENTE_OPERATIVO | SUPERVISOR
  empresa_id: "MK001",
  ubicaciones_asignadas: ["LM001", "LM004"], // Ubicaciones que puede gestionar
  estado: "ACTIVO"
}
```

#### 📍 UBICACIÓN
```javascript
{
  id: "LM001",
  nombre: "Bodega Principal Corporativa",
  empresa_id: "MK001",
  tipo_ubicacion: "BODEGA",      // BODEGA | TIENDA | KIOSCO
  direccion: "Av. Principal #123",
  responsable_id: "USR001",
  estado: "ACTIVO"
}
```

#### 📦 PRODUCTO
```javascript
{
  id: "PROD001",
  nombre: "TAPIOCA",
  especificacion: "3 KG",
  unidad_medida: "KG",
  stock_minimo: 10,
  categoria: "MATERIA_PRIMA",
  ubicacion_id: ["LM001", "LM004"], // Ubicaciones donde existe
  estado: "ACTIVO"
}
```

#### 📋 INVENTARIO
```javascript
{
  id: "INV001",
  producto_id: "PROD001",
  ubicacion_id: "LM001",
  stock_actual: 150,
  ultima_actualizacion: "2025-01-18T10:30:00Z"
}
```

#### 🔄 MOVIMIENTO (Transferencias)
```javascript
{
  id: "MV001",
  tipo_movimiento: "TRANSFERENCIA",
  origen_id: "LM001",             // Ubicación origen
  destino_id: "LM004",            // Ubicación destino
  estado: "PENDIENTE",            // PENDIENTE | CONFIRMADA | CANCELADA
  usuario_creacion_id: "USR001",
  fecha_creacion: "2025-01-18",
  productos: [                    // Detalle de productos transferidos
    {
      producto_id: "PROD001",
      cantidad: 25,
      observaciones: "Urgente"
    }
  ]
}
```

#### 📊 CONTEO
```javascript
{
  id: "CONT001",
  ubicacion_id: "LM004",
  tipo_conteo: "GENERAL",         // GENERAL | PARCIAL | CICLICO
  estado: "PENDIENTE",            // PENDIENTE | EN_PROGRESO | COMPLETADO
  usuario_responsable_id: "USR001",
  fecha_programada: "2025-01-20",
  productos: [] // Detalle de conteo
}
```

#### ⚠️ ALERTA
```javascript
{
  id: "ALERT001",
  tipo: "STOCK_BAJO",            // STOCK_BAJO | TRANSFERENCIA_SIN_CONFIRMAR | CONTEO_PENDIENTE
  prioridad: "ALTA",             // BAJA | MEDIA | ALTA
  entidad_relacionada_id: "PROD001",
  mensaje: "Stock bajo de TAPIOCA en LM004",
  usuarios_notificados: ["USR001"],
  estado: "ACTIVA"
}
```

---

## 🔧 SERVICIOS Y LÓGICA DE NEGOCIO

### **dataService.js - Orquestador Principal**
```javascript
// Estrategia de obtención de datos
if (USE_GOOGLE_SHEETS) {
  // 1. Obtener de Google Sheets (datos maestros)
  // 2. Combinar con cambios locales (LocalStorage)
  // 3. Retornar datos mergeados
} else if (USE_MOCK_DATA) {
  // Datos de prueba para desarrollo
} else {
  // API REST (futuro)
}
```

### **googleSheetsAPI.js - Integración Google Sheets**
- **Lectura únicamente** (Google Sheets API v4)
- Datos públicos via `pub?output=csv`
- Parseo de CSV a objetos JavaScript
- Manejo de errores y timeouts

### **localStorageService.js - Persistencia Local**
- **Escritura temporal** (mientras no hay backend)
- Guardar cambios locales (CRUD)
- Sincronización con datos de Sheets
- Estructura por tipo de dato:

```javascript
{
  productos_local: [],
  movimientos_local: [],
  conteos_local: [],
  inventario_local: []
}
```

---

## 🎨 FLUJOS DE USUARIO PRINCIPALES

### **1. Login y Autenticación**
```
Login → Validar contra Google Sheets → 
Asignar permisos por rol/ubicaciones → 
Redirigir a Dashboard
```

### **2. Gestión de Transferencias**
```
Seleccionar Origen/Destino → 
Elegir Productos → 
Especificar Cantidades → 
Crear Movimiento (PENDIENTE) → 
Notificar Destino → 
Confirmar Recepción → 
Actualizar Stock en ambas ubicaciones
```

### **3. Ejecución de Conteos**
```
Programar Conteo → 
Asignar Responsable → 
Ejecutar Conteo (móvil) → 
Comparar Sistema vs Físico → 
Generar Diferencias → 
Ajustar Inventario si es necesario
```

### **4. Gestión de Alertas**
```
Monitoreo Automático → 
Detectar Condiciones → 
Generar Alertas → 
Notificar Usuarios Relevantes → 
Seguimiento y Resolución
```

---

## 🔐 ROLES Y PERMISOS

### **ADMIN_GLOBAL**
- ✅ Acceso a todas las ubicaciones
- ✅ CRUD completo de productos
- ✅ Transferencias entre cualquier ubicación
- ✅ Configuración del sistema
- ✅ Reportes consolidados

### **GERENTE_OPERATIVO**
- ✅ Acceso a ubicaciones asignadas
- ✅ Transferencias entre sus ubicaciones
- ✅ Ajustes de inventario
- ✅ Programación de conteos
- ✅ Reportes de su área

### **SUPERVISOR**
- ✅ Solo consulta de sus ubicaciones
- ✅ Ejecución de conteos asignados
- ✅ Confirmación de transferencias recibidas
- ✅ Reportes básicos

---

## 📱 CARACTERÍSTICAS TÉCNICAS

### **Responsive Design**
- Mobile-first approach
- Optimizado para tablets y móviles
- Touch-friendly UI

### **Estado Global (Zustand)**
```javascript
// Stores principales
- authStore: Autenticación y usuario
- alertasStore: Gestión de alertas
- productosStore: Catálogo de productos
- ubicacionesStore: Ubicaciones disponibles
```

### **Rutas React Router**
```
/login → Página de login
/dashboard → Panel principal
/inventario → Gestión de inventario
/transferencias → Transferencias
/conteos → Gestión de conteos
/alertas → Panel de alertas
/reportes → Reportes y analytics
```

### **Estilos (Tailwind CSS)**
- Sistema de diseño consistente
- Componentes reutilizables
- Tema personalizado (colores corporativos)

---

## 🚀 DEPLOYMENT Y CONFIGURACIÓN

### **Variables de Entorno**
```bash
VITE_USE_MOCK_DATA=false          # Usar datos reales
VITE_USE_GOOGLE_SHEETS=true       # Conectar a Google Sheets
VITE_GOOGLE_API_KEY=...           # API Key de Google
VITE_GOOGLE_SPREADSHEET_ID=...    # ID del Sheet principal
```

### **Producción: Vercel**
- **URL:** https://muqui.vercel.app
- **Build:** `npm run build:prod`
- **Root:** `/inventario-app`
- **Framework:** Vite

### **Desarrollo Local**
```bash
cd inventario-app
npm install
npm run dev        # http://localhost:5173
```

---

## 🔄 ESTADO ACTUAL vs FUTURO

### **✅ Funcionalidades Actuales**
- Login con Google Sheets
- Dashboard con estadísticas
- Gestión completa de inventario
- Transferencias con confirmación
- Programación y ejecución de conteos
- Sistema de alertas en tiempo real
- Reportes básicos

### **🚧 Próximas Mejoras**
1. **Backend Completo** (Node.js + PostgreSQL)
2. **Sincronización Bidireccional** con Google Sheets
3. **Módulo de Compras** y Proveedores
4. **Reportes Avanzados** y Analytics
5. **Notificaciones Push** y Email
6. **Offline Mode** con PWA
7. **API para Integraciones** externas

---

## 👥 EQUIPO DE DESARROLLO SUGERIDO

### **Frontend Developer (React)**
- Experiencia con React Router, Zustand
- Conocimiento de Tailwind CSS
- Familiaridad con Vite

### **Backend Developer (Node.js)**
- Experiencia con REST APIs
- Conocimiento de PostgreSQL
- Integración con Google Sheets API

### **DevOps**
- Experiencia con Vercel/Netlify
- Configuración de CI/CD
- Gestión de variables de entorno

---

## 📋 REQUISITOS TÉCNICOS MÍNIMOS

### **Para Desarrollo**
- Node.js 18+
- npm o yarn
- Editor de código (VS Code recomendado)
- Google Chrome (para desarrollo)

### **Para Producción**
- Cuenta de Vercel (o similar)
- Google Cloud Project (para Sheets API)
- Dominio personalizado (opcional)

---

## 🎯 OBJETIVOS DE NEGOCIO

### **Problemas Resueltos**
- ❌ Duplicación de datos → ✅ Fuente única de verdad
- ❌ Errores manuales → ✅ Validaciones automáticas
- ❌ Falta de visibilidad → ✅ Dashboard en tiempo real
- ❌ Transferencias no confirmadas → ✅ Seguimiento completo
- ❌ Conteos manuales → ✅ Proceso estandarizado

### **ROI Esperado**
- Reducción del 70% en errores de inventario
- Ahorro de 15 horas/semana en gestión manual
- Visibilidad 100% del stock en tiempo real
- Toma de decisiones basada en datos

---

## 📞 CONTACTO Y SOPORTE

### **Documentación Técnica**
- `/inventario-app/DEPLOYMENT_SUCCESS.md`
- `/inventario-app/INSTRUCCIONES_FINALES_VERCEL.md`
- `/inventario-app/GUIA_GOOGLE_SHEETS.md`

### **Acceso Directo**
- **Producción:** https://muqui.vercel.app
- **Credenciales Demo:** muqui.coo@gmail.com / temporal123

---

*Este documento proporciona una visión completa para que cualquier desarrollador pueda entender rápidamente la arquitectura, funcionalidades y estado actual del sistema.*
