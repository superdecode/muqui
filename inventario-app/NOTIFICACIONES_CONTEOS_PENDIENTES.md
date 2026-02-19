# Implementación de Notificaciones de Conteos Pendientes

## Descripción General

Sistema de notificaciones automáticas que alerta a los usuarios sobre productos que requieren conteo según la frecuencia configurada.

## Arquitectura

### 1. Configuración Global

Crear documento en Firestore: `configuracion_notificaciones/global`

```javascript
{
  horario_notificaciones_conteo: "08:00",  // Formato HH:mm
  frecuencia_conteo_dias: 7,               // Días entre conteos
  notificaciones_conteo_activas: true,     // Habilitar/deshabilitar
  timezone: "America/Mexico_City"
}
```

### 2. Cloud Function Programada

**Archivo**: `functions/src/scheduledNotifications.js`

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Ejecutar diariamente a las 8:00 AM (horario configurado)
exports.verificarConteosPendientes = functions.pubsub
  .schedule('0 8 * * *')
  .timeZone('America/Mexico_City')
  .onRun(async (context) => {
    const db = admin.firestore();
    
    try {
      // 1. Obtener configuración
      const configDoc = await db.collection('configuracion_notificaciones').doc('global').get();
      const config = configDoc.data();
      
      if (!config || !config.notificaciones_conteo_activas) {
        console.log('Notificaciones de conteo desactivadas');
        return null;
      }
      
      const frecuenciaDias = config.frecuencia_conteo_dias || 7;
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      
      // 2. Obtener todas las ubicaciones activas
      const ubicacionesSnap = await db.collection('ubicaciones')
        .where('estado', '==', 'ACTIVO')
        .get();
      
      // 3. Para cada ubicación, verificar productos pendientes
      for (const ubicacionDoc of ubicacionesSnap.docs) {
        const ubicacion = { id: ubicacionDoc.id, ...ubicacionDoc.data() };
        
        // Obtener productos de esta ubicación
        const productosSnap = await db.collection('productos')
          .where('ubicacion_id', 'array-contains', ubicacion.id)
          .where('estado', '==', 'ACTIVO')
          .get();
        
        const productosPendientes = [];
        
        // 4. Para cada producto, verificar último conteo
        for (const productoDoc of productosSnap.docs) {
          const producto = { id: productoDoc.id, ...productoDoc.data() };
          
          // Buscar último conteo completado
          const conteosSnap = await db.collection('conteos')
            .where('ubicacion_id', '==', ubicacion.id)
            .where('estado', 'in', ['COMPLETADO', 'PARCIALMENTE_COMPLETADO'])
            .orderBy('fecha_completado', 'desc')
            .limit(1)
            .get();
          
          let necesitaConteo = true;
          
          if (!conteosSnap.empty) {
            const ultimoConteo = conteosSnap.docs[0].data();
            
            // Verificar si este producto estaba en el conteo
            const detallesSnap = await db.collection('detalle_conteos')
              .where('conteo_id', '==', conteosSnap.docs[0].id)
              .where('producto_id', '==', producto.id)
              .get();
            
            if (!detallesSnap.empty) {
              const fechaConteo = ultimoConteo.fecha_completado.toDate();
              const diasTranscurridos = Math.floor((hoy - fechaConteo) / (1000 * 60 * 60 * 24));
              necesitaConteo = diasTranscurridos >= frecuenciaDias;
            }
          }
          
          if (necesitaConteo) {
            productosPendientes.push({
              id: producto.id,
              nombre: producto.nombre,
              frecuencia_dias: frecuenciaDias
            });
          }
        }
        
        // 5. Si hay productos pendientes, crear notificación
        if (productosPendientes.length > 0) {
          // Obtener usuarios con acceso a esta ubicación
          const usuariosSnap = await db.collection('usuarios')
            .where('estado', '==', 'ACTIVO')
            .get();
          
          const usuariosDestino = [];
          
          usuariosSnap.forEach(doc => {
            const usuario = doc.data();
            let ubicacionesAsignadas = [];
            
            if (Array.isArray(usuario.ubicaciones_asignadas)) {
              ubicacionesAsignadas = usuario.ubicaciones_asignadas;
            } else if (typeof usuario.ubicaciones_asignadas === 'string') {
              try {
                ubicacionesAsignadas = JSON.parse(usuario.ubicaciones_asignadas);
              } catch (e) {
                ubicacionesAsignadas = [];
              }
            }
            
            if (ubicacionesAsignadas.includes(ubicacion.id)) {
              usuariosDestino.push(doc.id);
            }
            
            // Incluir admins globales
            const rolNorm = String(usuario.rol || '').toUpperCase();
            if (rolNorm === 'ADMIN_GLOBAL' || rolNorm === 'ADMIN GLOBAL' || rolNorm === 'ADMINISTRADOR') {
              usuariosDestino.push(doc.id);
            }
          });
          
          const destinatariosUnicos = [...new Set(usuariosDestino)];
          
          if (destinatariosUnicos.length > 0) {
            // Verificar si ya existe notificación activa
            const notifExistente = await db.collection('notificaciones')
              .where('tipo', '==', 'conteo_recordatorio')
              .where('datos_adicionales.ubicacion_id', '==', ubicacion.id)
              .where('activa', '==', true)
              .where('expiraEn', '>', admin.firestore.Timestamp.now())
              .get();
            
            if (notifExistente.empty) {
              // Crear nueva notificación
              const isGrouped = productosPendientes.length > 3;
              const titulo = isGrouped 
                ? `${productosPendientes.length} productos requieren conteo`
                : `Conteo pendiente: ${productosPendientes.map(p => p.nombre).join(', ')}`;
              
              const mensaje = `${productosPendientes.length} producto(s) requieren conteo hoy en ${ubicacion.nombre}`;
              
              const expiraEn = new Date();
              expiraEn.setHours(expiraEn.getHours() + 24);
              
              await db.collection('notificaciones').add({
                tipo: 'conteo_recordatorio',
                prioridad: 'baja',
                titulo,
                mensaje,
                datos_adicionales: {
                  ubicacion_id: ubicacion.id,
                  ubicacion_nombre: ubicacion.nombre,
                  accionUrl: '/conteos'
                },
                fecha_creacion: admin.firestore.FieldValue.serverTimestamp(),
                usuarios_destino: destinatariosUnicos,
                leido_por: [],
                abierta_por: [],
                activa: true,
                agrupada: isGrouped,
                productos_afectados: productosPendientes,
                cantidad_items: productosPendientes.length,
                expiraEn: admin.firestore.Timestamp.fromDate(expiraEn)
              });
              
              console.log(`✅ Notificación creada: ${productosPendientes.length} productos en ${ubicacion.nombre}`);
            } else {
              console.log(`ℹ️ Ya existe notificación activa para ${ubicacion.nombre}`);
            }
          }
        }
      }
      
      console.log('✅ Verificación de conteos pendientes completada');
      return null;
    } catch (error) {
      console.error('❌ Error en verificación de conteos:', error);
      throw error;
    }
  });
```

## Instalación y Configuración

### 1. Inicializar Firebase Functions

```bash
cd /Users/quiron/CascadeProjects/muqui/inventario-app
firebase init functions
```

### 2. Instalar Dependencias

```bash
cd functions
npm install firebase-admin firebase-functions
```

### 3. Configurar package.json

```json
{
  "name": "functions",
  "engines": {
    "node": "18"
  },
  "dependencies": {
    "firebase-admin": "^11.0.0",
    "firebase-functions": "^4.0.0"
  }
}
```

### 4. Crear Documento de Configuración

Ejecutar en consola de Firebase o mediante script:

```javascript
// Script: scripts/init-config-notificaciones.js
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function initConfig() {
  await db.collection('configuracion_notificaciones').doc('global').set({
    horario_notificaciones_conteo: "08:00",
    frecuencia_conteo_dias: 7,
    notificaciones_conteo_activas: true,
    timezone: "America/Mexico_City",
    created_at: admin.firestore.FieldValue.serverTimestamp()
  });
  
  console.log('✅ Configuración creada');
  process.exit(0);
}

initConfig();
```

### 5. Desplegar Functions

```bash
firebase deploy --only functions
```

## Configuración en UI

Agregar sección en página de Configuraciones para que administradores puedan:

1. Activar/desactivar notificaciones de conteo
2. Configurar frecuencia de conteos (días)
3. Configurar horario de notificación

```jsx
// En Configuraciones.jsx
const [conteoConfig, setConteoConfig] = useState({
  activas: true,
  frecuencia_dias: 7,
  horario: "08:00"
});

const guardarConfigConteo = async () => {
  await updateDoc(doc(db, 'configuracion_notificaciones', 'global'), {
    notificaciones_conteo_activas: conteoConfig.activas,
    frecuencia_conteo_dias: conteoConfig.frecuencia_dias,
    horario_notificaciones_conteo: conteoConfig.horario
  });
};
```

## Monitoreo y Logs

### Ver Logs de Ejecución

```bash
firebase functions:log --only verificarConteosPendientes
```

### Probar Manualmente

```bash
firebase functions:shell
verificarConteosPendientes()
```

## Consideraciones

1. **Deduplicación**: La función verifica que no exista notificación activa antes de crear una nueva
2. **Expiración**: Las notificaciones expiran después de 24 horas
3. **Consolidación**: Si hay más de 3 productos, se crea notificación agrupada
4. **Timezone**: Configurar correctamente la zona horaria en la Cloud Function
5. **Costos**: Cloud Functions tiene capa gratuita de 2M invocaciones/mes

## Testing

### Test Local

```javascript
// test/test-conteos-notif.js
const { verificarConteosPendientes } = require('../functions/src/scheduledNotifications');

async function test() {
  await verificarConteosPendientes({});
}

test();
```

### Test en Producción

Cambiar temporalmente el schedule a cada minuto para probar:

```javascript
.schedule('* * * * *') // Cada minuto
```

Luego revertir a:

```javascript
.schedule('0 8 * * *') // 8:00 AM diario
```

## Mantenimiento

1. Revisar logs semanalmente
2. Ajustar frecuencia según necesidades del negocio
3. Monitorear tasa de notificaciones creadas vs ignoradas
4. Actualizar lógica si cambia estructura de conteos

## Alternativa Sin Cloud Functions

Si no se pueden usar Cloud Functions, implementar cron job en servidor propio:

```javascript
// server/cron/conteos-notificaciones.js
const cron = require('node-cron');

// Ejecutar diariamente a las 8:00 AM
cron.schedule('0 8 * * *', async () => {
  // Mismo código que Cloud Function
  await verificarConteosPendientes();
});
```
