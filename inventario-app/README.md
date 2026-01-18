# Sistema de Gestión de Inventario Multi-tienda

Sistema web responsive de gestión de inventario para múltiples tiendas y bodegas, construido con React + Vite + Tailwind CSS.

## Características

- Dashboard con estadísticas en tiempo real
- Gestión de inventario por ubicación
- Sistema de transferencias entre ubicaciones
- Conteos de inventario programables
- Reportes y exportación de datos
- Sistema de alertas (stock bajo, transferencias pendientes, etc.)
- Control de acceso basado en roles
- Diseño responsive (mobile-first)

## Stack Tecnológico

### Frontend
- **React 18** - Biblioteca de UI
- **Vite** - Build tool y dev server
- **Tailwind CSS** - Framework de estilos
- **React Router DOM** - Navegación
- **Zustand** - Gestión de estado
- **TanStack Query** - Manejo de datos asíncronos
- **Axios** - Cliente HTTP
- **Lucide React** - Iconos
- **date-fns** - Manejo de fechas

### Backend (Fase 1)
- **Google Sheets API** - Base de datos
- **Google Apps Script** - API REST

### Hosting
- **GitHub Pages** - Alojamiento estático

## Estructura del Proyecto

```
inventario-app/
├── public/
├── src/
│   ├── components/
│   │   ├── layout/          # Componentes de layout (Sidebar, Header)
│   │   ├── common/          # Componentes reutilizables (Button, Input, etc.)
│   │   ├── inventario/      # Componentes específicos de inventario
│   │   ├── transferencias/  # Componentes de transferencias
│   │   ├── conteos/         # Componentes de conteos
│   │   └── reportes/        # Componentes de reportes
│   ├── pages/              # Páginas de la aplicación
│   ├── services/           # Servicios de API
│   ├── stores/             # Zustand stores
│   ├── utils/              # Utilidades (formatters, validators)
│   ├── config/             # Configuraciones
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## Instalación

### Prerrequisitos
- Node.js 16+ y npm

### Pasos

1. Clonar el repositorio:
```bash
git clone <repository-url>
cd inventario-app
```

2. Instalar dependencias:
```bash
npm install
```

3. Crear archivo `.env` basado en `.env.example`:
```bash
cp .env.example .env
```

4. Configurar variables de entorno en `.env`:
```
VITE_GOOGLE_SHEETS_API_URL=https://script.google.com/macros/s/TU_DEPLOYMENT_ID/exec
VITE_APP_NAME=Sistema de Inventario
VITE_ENABLE_FIREBASE=false
```

5. Iniciar servidor de desarrollo:
```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:5173](http://localhost:5173)

## Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm run preview` - Previsualiza la build de producción
- `npm run deploy` - Construye y despliega a GitHub Pages

## Sistema de Roles y Permisos

### Roles Disponibles

1. **ADMIN_GLOBAL** - Acceso total al sistema
2. **ADMIN_EMPRESA** - Acceso a su empresa (franquiciados)
3. **GERENTE_OPERATIVO** - Gestión de bodegas y puntos corporativos
4. **JEFE_PUNTO** - Gestión de su punto de venta
5. **OPERADOR** - Operaciones básicas en su punto
6. **CONSULTA** - Solo lectura

### Permisos por Módulo

| Módulo | Crear | Ver | Editar | Exportar |
|--------|-------|-----|--------|----------|
| Inventario | Admin, Gerente | Todos | Admin, Gerente, Jefe | Admin, Gerente |
| Transferencias | Admin, Gerente | Todos | Admin, Gerente | Admin, Gerente |
| Conteos | Admin, Gerente | Todos | Admin, Gerente | Admin, Gerente |
| Reportes | - | Todos menos Operador | - | Todos menos Operador |

## Credenciales de Prueba

```
Email: admin@muqui.com
Password: admin123
```

## Deployment

### GitHub Pages

1. Actualizar el `base` en `vite.config.js` con el nombre de tu repositorio:
```javascript
base: '/nombre-repositorio/'
```

2. Ejecutar:
```bash
npm run deploy
```

### Vercel (Fase 2 - Futuro)

```bash
npm i -g vercel
vercel --prod
```

## Configuración de Google Sheets API

### 1. Crear Proyecto en Google Cloud

1. Ir a [Google Cloud Console](https://console.cloud.google.com/)
2. Crear un nuevo proyecto
3. Habilitar Google Sheets API

### 2. Crear Google Apps Script

1. Crear nuevo Google Sheets
2. Extensions → Apps Script
3. Implementar endpoints REST según documentación en `/docs/google-apps-script.md`

### 3. Deploy como Web App

1. Deploy → New deployment
2. Execute as: Me
3. Who has access: Anyone
4. Copiar URL del deployment
5. Agregar URL en `.env` como `VITE_GOOGLE_SHEETS_API_URL`

## Roadmap

### Fase 1 - MVP (Actual)
- [x] Setup del proyecto
- [x] Sistema de autenticación
- [x] Dashboard
- [x] Módulo de inventario
- [x] Módulo de transferencias
- [x] Módulo de conteos
- [x] Módulo de reportes
- [x] Sistema de alertas
- [ ] Integración con Google Sheets API
- [ ] Deployment a GitHub Pages

### Fase 2 - Mejoras
- [ ] PWA (funcionalidad offline)
- [ ] Migración a Firebase Auth
- [ ] Notificaciones push
- [ ] Gráficas y visualizaciones
- [ ] Exportación avanzada (Excel, PDF)
- [ ] Modo oscuro

### Fase 3 - Escalabilidad
- [ ] Migración a base de datos relacional (PostgreSQL/Supabase)
- [ ] API REST con Node.js/Python
- [ ] WebSockets para actualizaciones en tiempo real
- [ ] App móvil nativa

## Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## Soporte

Para reportar bugs o solicitar features, por favor abre un issue en GitHub.

## Licencia

MIT License - ver archivo LICENSE para más detalles

## Contacto

Proyecto desarrollado para Muqui
