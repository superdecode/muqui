# Scripts de Migración a Firestore

Este directorio contiene scripts para migrar datos desde Google Sheets o archivos CSV a Firestore.

## Instalación de Dependencias

Antes de ejecutar los scripts, instala las dependencias necesarias:

```bash
npm install firebase-admin csv-parser
```

## Script de Migración: migrateData.js

### Descripción

Este script migra datos desde archivos CSV locales o desde Google Sheets a Firestore usando Firebase Admin SDK.

### Credenciales

El script usa las credenciales de Service Account ubicadas en `serviceAccountKey.json` en la raíz del proyecto.

### Preparar Datos

#### Opción 1: Archivos CSV Locales

1. Crea una carpeta `/data` en la raíz del proyecto:
   ```bash
   mkdir data
   ```

2. Coloca tus archivos CSV en la carpeta `/data` con estos nombres:
   - `empresas.csv`
   - `usuarios.csv`
   - `productos.csv`
   - `ubicaciones.csv`
   - `inventario.csv`
   - `movimientos.csv`
   - `detalle_movimientos.csv`
   - `conteos.csv`
   - `detalle_conteos.csv`
   - `alertas.csv`

3. Asegúrate de que cada CSV tenga una columna `id` que se usará como ID del documento en Firestore.

#### Opción 2: Desde Google Sheets

El script puede obtener datos directamente desde una hoja de Google Sheets publicada como CSV. Para usar esta opción:

1. En Google Sheets, ve a `Archivo > Compartir > Publicar en la web`
2. Selecciona la hoja y elige formato CSV
3. Copia la URL generada
4. En el script `migrateData.js`, descomenta la línea:
   ```javascript
   await migrateFromGoogleSheets()
   ```
5. Y actualiza la URL con tu URL de Google Sheets

### Ejecutar Migración

```bash
node scripts/migrateData.js
```

### Resultado

El script mostrará:
- Progreso de la migración para cada colección
- Número de registros migrados
- Resumen final con totales por colección

Ejemplo de salida:
```
🚀 Iniciando migración de datos a Firestore...

📦 Migrando 45 registros a la colección 'productos'...
  ✅ Total: 45 registros migrados a 'productos'

📊 RESUMEN DE MIGRACIÓN
  productos                    45 registros
  inventario                  120 registros
  ubicaciones                   8 registros
  TOTAL                       173 registros

✅ Migración completada exitosamente!
```

## Notas Importantes

1. **IDs de Documentos**: El script usa el campo `id` del CSV como ID del documento en Firestore. Si no existe, se genera uno automáticamente.

2. **Duplicados**: El script usa `merge: true`, por lo que si un documento ya existe, se actualizará en lugar de duplicarse.

3. **Límites de Batch**: Firestore tiene un límite de 500 operaciones por batch. El script maneja esto automáticamente.

4. **Campos Vacíos**: Los campos vacíos en el CSV se guardarán como strings vacíos ('') en Firestore.

## Estructura de CSV Recomendada

### productos.csv
```csv
id,nombre,especificacion,unidad_medida,stock_minimo,categoria,estado
PROD123,Martillo,Grande,UND,10,Herramientas,ACTIVO
```

### inventario.csv
```csv
id,producto_id,ubicacion_id,stock_actual,stock_minimo
INV001,PROD123,UB01,50,10
```

### ubicaciones.csv
```csv
id,nombre,tipo,direccion
UB01,Almacén Principal,ALMACEN,Calle 123
```

## Solución de Problemas

### Error: "Cannot find module 'csv-parser'"
```bash
npm install csv-parser
```

### Error: "Cannot find module 'firebase-admin'"
```bash
npm install firebase-admin
```

### Error: "serviceAccountKey.json not found"
Asegúrate de que el archivo `serviceAccountKey.json` esté en la raíz del proyecto.

### Error de permisos en Firestore
Verifica que tu Service Account tenga permisos de escritura en Firestore desde la consola de Firebase.
