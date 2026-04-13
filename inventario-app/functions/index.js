const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { procesarVentaOdoo } = require('./src/procesarVenta');

admin.initializeApp();

/**
 * Cloud Function programada para verificar conteos pendientes
 * Se ejecuta diariamente a las 8:00 AM (horario configurado)
 */
exports.verificarConteosPendientes = functions.pubsub
  .schedule('0 8 * * *')
  .timeZone('America/Mexico_City')
  .onRun(async (context) => {
    const db = admin.firestore();
    
    try {
      console.log('🔍 Iniciando verificación de conteos pendientes...');
      
      // 1. Obtener configuración global
      const configDoc = await db.collection('configuracion_notificaciones').doc('global').get();
      const config = configDoc.exists() ? configDoc.data() : null;
      
      if (!config || !config.notificaciones_conteo_activas) {
        console.log('⚠️ Notificaciones de conteo desactivadas en configuración');
        return null;
      }
      
      const frecuenciaDias = config.frecuencia_conteo_dias || 7;
      console.log(`📅 Frecuencia de conteo configurada: ${frecuenciaDias} días`);
      
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      
      // 2. Obtener todas las ubicaciones activas
      const ubicacionesSnap = await db.collection('ubicaciones')
        .where('estado', '==', 'ACTIVO')
        .get();
      
      console.log(`📍 Ubicaciones activas encontradas: ${ubicacionesSnap.size}`);
      
      let notificacionesCreadas = 0;
      
      // 3. Para cada ubicación, verificar productos pendientes
      for (const ubicacionDoc of ubicacionesSnap.docs) {
        const ubicacion = { id: ubicacionDoc.id, ...ubicacionDoc.data() };
        console.log(`\n🏢 Procesando ubicación: ${ubicacion.nombre}`);
        
        // Obtener inventario de esta ubicación
        const inventarioSnap = await db.collection('inventario')
          .where('ubicacion_id', '==', ubicacion.id)
          .get();
        
        if (inventarioSnap.empty) {
          console.log(`  ⚠️ Sin inventario en ${ubicacion.nombre}`);
          continue;
        }
        
        const productosPendientes = [];
        
        // 4. Para cada producto en inventario, verificar último conteo
        for (const invDoc of inventarioSnap.docs) {
          const inventario = invDoc.data();
          const productoId = inventario.producto_id;
          
          // Obtener datos del producto
          const productoDoc = await db.collection('productos').doc(productoId).get();
          if (!productoDoc.exists()) continue;
          
          const producto = { id: productoDoc.id, ...productoDoc.data() };
          
          // Buscar último conteo completado que incluya este producto
          const conteosSnap = await db.collection('conteos')
            .where('ubicacion_id', '==', ubicacion.id)
            .where('estado', 'in', ['COMPLETADO', 'PARCIALMENTE_COMPLETADO'])
            .orderBy('fecha_completado', 'desc')
            .limit(10)
            .get();
          
          let necesitaConteo = true;
          let diasDesdeUltimoConteo = null;
          
          if (!conteosSnap.empty) {
            // Verificar si alguno de estos conteos incluye este producto
            for (const conteoDoc of conteosSnap.docs) {
              const conteo = conteoDoc.data();
              
              // Buscar si este producto fue contado
              const detallesSnap = await db.collection('detalle_conteos')
                .where('conteo_id', '==', conteoDoc.id)
                .where('producto_id', '==', productoId)
                .where('contado', '==', true)
                .get();
              
              if (!detallesSnap.empty) {
                // Producto fue contado en este conteo
                const fechaConteo = conteo.fecha_completado.toDate();
                diasDesdeUltimoConteo = Math.floor((hoy - fechaConteo) / (1000 * 60 * 60 * 24));
                necesitaConteo = diasDesdeUltimoConteo >= frecuenciaDias;
                break;
              }
            }
          }
          
          if (necesitaConteo) {
            productosPendientes.push({
              id: producto.id,
              producto_id: producto.id,
              nombre: producto.nombre,
              dias_sin_contar: diasDesdeUltimoConteo || 999,
              frecuencia_dias: frecuenciaDias
            });
          }
        }
        
        console.log(`  📦 Productos pendientes de conteo: ${productosPendientes.length}`);
        
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
            
            // Incluir si tiene acceso a esta ubicación
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
          
          if (destinatariosUnicos.length === 0) {
            console.log(`  ⚠️ No hay usuarios para notificar en ${ubicacion.nombre}`);
            continue;
          }
          
          // Verificar si ya existe notificación activa para hoy
          const hoyInicio = admin.firestore.Timestamp.fromDate(hoy);
          const hoyFin = admin.firestore.Timestamp.fromDate(new Date(hoy.getTime() + 24 * 60 * 60 * 1000));
          
          const notifExistenteSnap = await db.collection('notificaciones')
            .where('tipo', '==', 'conteo_recordatorio')
            .where('activa', '==', true)
            .where('fecha_creacion', '>=', hoyInicio)
            .where('fecha_creacion', '<', hoyFin)
            .get();
          
          // Verificar si alguna es para esta ubicación
          const yaExiste = notifExistenteSnap.docs.some(doc => {
            const data = doc.data();
            return data.datos_adicionales?.ubicacion_id === ubicacion.id;
          });
          
          if (yaExiste) {
            console.log(`  ℹ️ Ya existe notificación activa para ${ubicacion.nombre} hoy`);
            continue;
          }
          
          // Crear nueva notificación
          const isGrouped = productosPendientes.length > 3;
          const titulo = isGrouped 
            ? `${productosPendientes.length} productos requieren conteo`
            : `Conteo pendiente: ${productosPendientes.slice(0, 3).map(p => p.nombre).join(', ')}`;
          
          const mensaje = `${productosPendientes.length} producto(s) requieren conteo en ${ubicacion.nombre}`;
          
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
          
          notificacionesCreadas++;
          console.log(`  ✅ Notificación creada: ${productosPendientes.length} productos para ${destinatariosUnicos.length} usuarios`);
        }
      }
      
      console.log(`\n✅ Verificación completada. Notificaciones creadas: ${notificacionesCreadas}`);
      return null;
      
    } catch (error) {
      console.error('❌ Error en verificación de conteos:', error);
      throw error;
    }
  });

/**
 * Webhook HTTP para recibir eventos de Odoo cuando se confirma una venta.
 * Soporta sale.order y pos.order.
 *
 * Body esperado:
 *   { tipo: 'sale_order' | 'pos_order', sale_order_id: N, ubicacion_id: '...' }
 *   { tipo: 'pos_order', pos_order_id: N, ubicacion_id: '...' }
 *
 * Requiere header X-Odoo-Secret con el secreto configurado.
 */
exports.odooWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Accept secret via header OR query param (native Odoo webhook uses query param)
  const secret = req.headers['x-odoo-secret'] || req.query.secret;
  const expectedSecret = process.env.ODOO_WEBHOOK_SECRET;

  if (!secret || secret !== expectedSecret) {
    console.warn('❌ Webhook: secreto inválido');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const body = req.body;

    // Native Odoo webhook format: { _model, id, state, ... }
    // Legacy format: { tipo, pos_order_id/sale_order_id, ubicacion_id }
    let tipo, orderId, ubicacion_id;

    if (body._model) {
      // Native Odoo webhook
      const model = body._model; // 'pos.order' or 'sale.order'
      const state = body.state;
      orderId = body.id;
      ubicacion_id = body.ubicacion_id || 'tienda_principal';
      tipo = model === 'pos.order' ? 'pos_order' : 'sale_order';

      // Only process paid/done orders
      if (!['paid', 'done', 'sale'].includes(state)) {
        console.log(`⏭️  Ignorando estado: ${state} para orden #${orderId}`);
        return res.status(200).json({ success: true, skipped: true, state });
      }
    } else {
      // Legacy format
      tipo = body.tipo || 'sale_order';
      orderId = tipo === 'pos_order' ? body.pos_order_id : body.sale_order_id;
      ubicacion_id = body.ubicacion_id || 'tienda_principal';
    }

    if (!orderId) {
      return res.status(400).json({ error: 'Missing order id' });
    }

    console.log(`🎯 Webhook recibido - Tipo: ${tipo}, Orden: #${orderId}, Ubicación: ${ubicacion_id}`);

    procesarVentaOdoo(orderId, ubicacion_id, tipo).catch((error) => {
      console.error('❌ Error procesando venta en background:', error);
    });

    return res.status(200).json({ success: true, tipo, orderId, ubicacion_id });
  } catch (error) {
    console.error('❌ Error en webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// SALIDAS ODOO: Sincronizar ventas del día desde Odoo (pull manual)
exports.sincronizarVentasHoy = functions.runWith({ timeoutSeconds: 540, memory: "512MB" }).https.onCall(async (data, context) => {
  try {
    const OdooClient = require('./src/odooClient');
    const odoo = new OdooClient(
      process.env.ODOO_URL,
      process.env.ODOO_DB,
      process.env.ODOO_USER,
      process.env.ODOO_PASSWORD
    );

    const ubicacionId = (data && data.ubicacion_id) || 'tienda_principal';

    // 1. Obtener órdenes POS pagadas hoy
    const orders = await odoo.getTodayPOSOrders();
    console.log(`📋 Órdenes POS hoy: ${orders.length}`);

    if (orders.length === 0) {
      return { success: true, procesadas: 0, omitidas: 0, errores: 0, detalle: [] };
    }

    // 2. Verificar cuáles ya fueron procesadas (evitar duplicados)
    const db = require('firebase-admin').firestore();
    const yaProcessedSnap = await db.collection('movimientos')
      .where('origen', '==', 'ODOO_VENTA')
      .where('tipo_orden', '==', 'pos_order')
      .get();

    const yaProcessedIds = new Set(
      yaProcessedSnap.docs.map(d => String(d.data().order_id))
    );

    // 3. Procesar solo las nuevas
    let procesadas = 0, omitidas = 0, errores = 0;
    const detalle = [];

    for (const order of orders) {
      const orderId = String(order.id);
      if (yaProcessedIds.has(orderId)) {
        omitidas++;
        detalle.push({ id: order.id, nombre: order.name, estado: 'omitida', razon: 'ya procesada' });
        continue;
      }

      try {
        const result = await procesarVentaOdoo(order.id, ubicacionId, 'pos_order', order.name);
        procesadas++;
        detalle.push({
          id: order.id,
          nombre: order.name,
          estado: 'procesada',
          movimientos: result.movimientosCreados
        });
      } catch (err) {
        errores++;
        detalle.push({ id: order.id, nombre: order.name, estado: 'error', razon: err.message });
        console.error(`❌ Error procesando orden ${order.id}:`, err.message);
      }
    }

    console.log(`✅ Sync: ${procesadas} procesadas, ${omitidas} omitidas, ${errores} errores`);
    return { success: true, procesadas, omitidas, errores, detalle };

  } catch (error) {
    console.error('❌ Error en sincronizarVentasHoy:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// SALIDAS ODOO: Obtener lista de Puntos de Venta (POS) desde Odoo
exports.getOdooPOS = functions.https.onCall(async (data, context) => {
  try {
    const OdooClient = require('./src/odooClient');
    const odoo = new OdooClient(
      process.env.ODOO_URL,
      process.env.ODOO_DB,
      process.env.ODOO_USER,
      process.env.ODOO_PASSWORD
    );
    const posList = await odoo.getPOSConfigs();
    return { success: true, posList };
  } catch (error) {
    console.error('Error obteniendo POS de Odoo:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// SALIDAS ODOO: Obtener lista de Productos (Variantes) desde Odoo
exports.getOdooProducts = functions.https.onCall(async (data, context) => {
  try {
    const OdooClient = require('./src/odooClient');
    const odoo = new OdooClient(
      process.env.ODOO_URL,
      process.env.ODOO_DB,
      process.env.ODOO_USER,
      process.env.ODOO_PASSWORD
    );
    const products = await odoo.getProducts();
    return { success: true, products };
  } catch (error) {
    console.error('Error obteniendo productos de Odoo:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
