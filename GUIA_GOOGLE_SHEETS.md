# 📋 Guía de Configuración de Google Sheets

## Paso 1: Crear la Hoja de Cálculo

1. Ve a [Google Sheets](https://sheets.google.com)
2. Crea una nueva hoja de cálculo
3. Nómbrala: **"Inventario Muqui - Base de Datos"**

## Paso 2: Crear las Hojas (Pestañas)

Crea las siguientes 9 pestañas en este orden:

### 1. Usuarios
Columnas (fila 1):
```
id | nombre_completo | email | password | rol | empresa_id | ubicacion_nombre | estado
```

Datos de ejemplo (filas 2-4):
```
1 | Admin Global | admin@muqui.com | admin123 | ADMIN_GLOBAL | 1 | Todas | ACTIVO
2 | Gerente Operativo | gerente@muqui.com | admin123 | GERENTE_OPERATIVO | 1 | Bodega Principal | ACTIVO
3 | Jefe de Punto | jefe@muqui.com | admin123 | JEFE_PUNTO | 1 | Punto de Venta 1 | ACTIVO
```

### 2. Productos
Columnas:
```
id | codigo | nombre | categoria | unidad_medida | es_importante | stock_minimo_global | estado
```

Datos de ejemplo:
```
1 | TAP-3KG | TAPIOCA (3 KG) | TAPIOCA | KG | true | 10 | ACTIVO
2 | TAP-MUQ | TAPIOCA MUQUI | TAPIOCA | KG | true | 20 | ACTIVO
3 | TE-VER | TÉ VERDE | TÉ | KG | false | 5 | ACTIVO
4 | LEC-POL | LECHE EN POLVO | LACTEOS | KG | true | 15 | ACTIVO
5 | LEC-LIQ | LECHE LIQUIDA | LACTEOS | LITRO | true | 10 | ACTIVO
6 | OREO | OREO | GALLETAS | PAQUETE | false | 5 | ACTIVO
7 | CAF-ARO | CAFÉ AROMATICO | CAFÉ | KG | false | 8 | ACTIVO
8 | CAF-ESP | CAFÉ ESPRESSO | CAFÉ | KG | true | 10 | ACTIVO
9 | AZU-BLA | AZÚCAR BLANCA | ENDULZANTES | KG | true | 20 | ACTIVO
10 | AZU-MOR | AZÚCAR MORENA | ENDULZANTES | KG | false | 15 | ACTIVO
```

### 3. Ubicaciones
Columnas:
```
id | nombre | tipo | empresa_id | direccion | estado
```

Datos:
```
1 | Bodega Principal | BODEGA | 1 | Calle Principal 123 | ACTIVA
2 | Punto de Venta 1 | PUNTO_VENTA | 1 | Av. Comercio 456 | ACTIVA
3 | Punto de Venta 2 | PUNTO_VENTA | 1 | Plaza Central 789 | ACTIVA
```

### 4. Inventario
Columnas:
```
id | producto_id | ubicacion_id | ubicacion_nombre | stock_actual | stock_minimo | stock_maximo | es_importante | ultima_actualizacion
```

Datos:
```
1 | 1 | 1 | Bodega Principal | 25 | 10 | 100 | true | 2026-01-17
2 | 2 | 1 | Bodega Principal | 45 | 20 | 150 | true | 2026-01-17
3 | 3 | 2 | Punto de Venta 1 | 3 | 5 | 50 | false | 2026-01-17
4 | 4 | 2 | Punto de Venta 1 | 0 | 15 | 80 | true | 2026-01-17
5 | 5 | 2 | Punto de Venta 1 | 8 | 10 | 60 | true | 2026-01-17
6 | 6 | 3 | Punto de Venta 2 | 5 | 5 | 40 | false | 2026-01-17
```

### 5. Transferencias
Columnas:
```
id | origen_id | tipo_origen | destino_id | tipo_destino | estado | usuario_creacion | usuario_confirmacion | fecha_creacion | fecha_confirmacion | fecha_limite_edicion | observaciones | observaciones_confirmacion
```

Datos:
```
1 | 1 | BODEGA | 2 | PUNTO_VENTA | PENDIENTE | 1 | | 2026-01-17 | | | Transferencia inicial |
2 | 1 | BODEGA | 3 | PUNTO_VENTA | CONFIRMADA | 1 | 3 | 2026-01-15 | 2026-01-16 | | Reposición semanal | Todo correcto
```

### 6. DetalleTransferencias
Columnas:
```
id | transferencia_id | producto_id | cantidad_enviada | cantidad_recibida | diferencia | observaciones
```

Datos:
```
1 | 1 | 1 | 10 | | |
2 | 1 | 2 | 15 | | |
3 | 2 | 3 | 20 | 20 | 0 |
4 | 2 | 4 | 25 | 25 | 0 |
```

### 7. Conteos
Columnas:
```
id | ubicacion_id | ubicacion_nombre | tipo | estado | fecha_programada | fecha_ejecucion | usuario_programo | usuario_ejecuto | observaciones
```

Datos:
```
1 | 2 | Punto de Venta 1 | PROGRAMADO | PENDIENTE | 2026-01-18 | | 1 | | Conteo mensual enero
2 | 3 | Punto de Venta 2 | COMPLETO | COMPLETADO | 2026-01-15 | 2026-01-15 | 1 | 3 | Conteo de verificación
```

### 8. DetalleConteos
Columnas:
```
id | conteo_id | producto_id | cantidad_sistema | cantidad_fisica | diferencia | observaciones
```

Datos:
```
1 | 2 | 1 | 10 | 9 | -1 | Posible desperdicio
2 | 2 | 2 | 15 | 16 | 1 | Diferencia menor
```

### 9. Alertas
Columnas:
```
id | tipo | prioridad | entidad_id | tipo_entidad | ubicacion_id | mensaje | estado | fecha_creacion | fecha_resolucion
```

Datos:
```
1 | STOCK_MINIMO | ALTA | 3 | INVENTARIO | 2 | Té Verde está por debajo del stock mínimo (3/5) | ACTIVA | 2026-01-17 |
2 | STOCK_MINIMO | CRITICA | 4 | INVENTARIO | 2 | Leche en Polvo sin stock (0/15) | ACTIVA | 2026-01-17 |
3 | STOCK_MINIMO | ALTA | 5 | INVENTARIO | 2 | Leche Líquida está por debajo del stock mínimo (8/10) | ACTIVA | 2026-01-17 |
4 | TRANSFERENCIA_SIN_CONFIRMAR | MEDIA | 1 | TRANSFERENCIA | 2 | Transferencia #1 pendiente de confirmación | ACTIVA | 2026-01-17 |
5 | CONTEO_PENDIENTE | MEDIA | 1 | CONTEO | 2 | Conteo programado para hoy | ACTIVA | 2026-01-18 |
```

## Paso 3: Implementar Google Apps Script

1. En tu hoja de cálculo, ve a **Extensiones → Apps Script**
2. Borra el código predeterminado
3. Copia todo el contenido del archivo `/Users/quiron/CascadeProjects/muqui/inventario-app/google-apps-script/Code.gs`
4. Pégalo en el editor de Apps Script
5. Guarda el proyecto (Ctrl/Cmd + S)
6. Nombra el proyecto: **"API Inventario Muqui"**

## Paso 4: Implementar el Script como Web App

1. En Apps Script, haz clic en **Implementar → Nueva implementación**
2. Selecciona tipo: **Aplicación web**
3. Configura:
   - **Descripción**: "API REST para Sistema de Inventario"
   - **Ejecutar como**: "Yo" (tu cuenta)
   - **Quién tiene acceso**: "Cualquier persona"
4. Haz clic en **Implementar**
5. **IMPORTANTE**: Copia la URL que aparece (algo como: `https://script.google.com/macros/s/AKfycby.../exec`)
6. Guarda esta URL, la necesitarás en el siguiente paso

## Paso 5: Configurar la Aplicación React

Ahora necesitas actualizar el archivo `.env` de tu aplicación con la URL de tu script.

Edita `/Users/quiron/CascadeProjects/muqui/inventario-app/.env` y actualiza:

```env
VITE_GOOGLE_SHEETS_API_URL=https://script.google.com/macros/s/TU_URL_AQUI/exec
VITE_APP_NAME=Sistema de Inventario Muqui
VITE_ENABLE_FIREBASE=false
VITE_USE_MOCK_DATA=false
```

**¡IMPORTANTE!**: Cambia `VITE_USE_MOCK_DATA` de `true` a `false`

## Paso 6: Probar la Conexión

1. Reinicia el servidor de desarrollo:
   ```bash
   cd /Users/quiron/CascadeProjects/muqui/inventario-app
   npm run dev
   ```

2. Abre [http://localhost:5173](http://localhost:5173)

3. Intenta hacer login con:
   - Email: `admin@muqui.com`
   - Password: `admin123`

4. Si todo funciona, verás:
   - Los datos reales de Google Sheets
   - Las 5 alertas activas
   - Estadísticas correctas

## Solución de Problemas

### Error: "Script function not found"
- Verifica que hayas guardado el script en Apps Script
- Asegúrate de haber implementado como "Aplicación web"

### Error: "Authorization required"
- Ve a Apps Script
- Ejecuta manualmente la función `doPost` una vez
- Autoriza el script cuando te lo pida

### Error: "CORS" o "blocked by CORS policy"
- Esto es normal con Google Apps Script
- Asegúrate de que "Quién tiene acceso" esté en "Cualquier persona"

### Los datos no se actualizan
- Cierra y abre el navegador
- Limpia el localStorage: F12 → Console → `localStorage.clear()`
- Recarga la página

## Notas Importantes

- Los cambios en Apps Script requieren **nueva implementación** cada vez que edites el código
- Usa "Gestionar implementaciones" para actualizar la implementación existente
- Los datos de prueba están configurados para ser realistas
- Puedes editar las hojas directamente y los cambios se reflejarán en la app

## Siguiente Paso: Deployment

Una vez que confirmes que todo funciona, puedes proceder con el deployment para testing.
