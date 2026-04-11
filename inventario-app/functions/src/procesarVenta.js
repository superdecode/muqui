const admin = require('firebase-admin');
const OdooClient = require('./odooClient');

function crearOdooClient() {
  return new OdooClient(
    process.env.ODOO_URL,
    process.env.ODOO_DB,
    process.env.ODOO_USER,
    process.env.ODOO_PASSWORD
  );
}

/**
 * Busca un recetario activo en Firestore por SKU de Odoo.
 * Retorna el recetario o null si no existe.
 */
async function buscarRecetario(db, sku) {
  if (!sku) return null;
  const snap = await db.collection('recetarios')
    .where('sku_odoo', '==', sku)
    .where('activo', '==', true)
    .limit(1)
    .get();
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
}

/**
 * Decrementa el stock de un ingrediente en la colección inventario.
 */
async function decrementarStock(db, productoId, ubicacionId, cantidad) {
  const snap = await db.collection('inventario')
    .where('producto_id', '==', productoId)
    .where('ubicacion_id', '==', ubicacionId)
    .limit(1)
    .get();

  if (snap.empty) {
    console.warn(`    ⚠️  Sin inventario para producto ${productoId} en ${ubicacionId}`);
    return;
  }

  const docId = snap.docs[0].id;
  const actual = snap.docs[0].data().cantidad_actual || 0;
  const nuevo = Math.max(0, actual - cantidad);

  await db.collection('inventario').doc(docId).update({
    cantidad_actual: nuevo,
    ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`      📊 Stock: ${actual} → ${nuevo}`);
}

/**
 * Procesa una venta de Odoo (sale.order o pos.order).
 * Busca el recetario en Firestore por SKU y crea movimientos de SALIDA.
 *
 * @param {string|number} orderId  - ID de la orden en Odoo
 * @param {string}        ubicacionId - ID de la ubicación en Muqui
 * @param {string}        tipo     - 'sale_order' | 'pos_order'
 */
async function procesarVentaOdoo(orderId, ubicacionId = 'tienda_principal', tipo = 'sale_order') {
  const db = admin.firestore();
  const odooClient = crearOdooClient();

  try {
    console.log(`\n📦 Procesando ${tipo} #${orderId} → ubicación: ${ubicacionId}`);

    // 1. Obtener líneas de la orden según tipo
    const lines = tipo === 'pos_order'
      ? await odooClient.getPOSOrderLines(orderId)
      : await odooClient.getOrderLines(orderId);

    console.log(`  ✅ Líneas de orden: ${lines.length}`);

    let movimientosCreados = 0;

    for (const line of lines) {
      console.log(`\n  📌 Producto: ${line.productName} (qty: ${line.quantity})`);
      console.log(`     SKU variante: ${line.productSKU || 'N/A'} | SKU template: ${line.productTemplateSKU || 'N/A'}`);

      // 2. Buscar recetario: primero por SKU de variante, luego por template (herencia)
      let recetario = await buscarRecetario(db, line.productSKU);

      if (!recetario && line.productTemplateSKU) {
        console.log(`    🔄 Sin recetario para variante, buscando por template...`);
        recetario = await buscarRecetario(db, line.productTemplateSKU);
      }

      if (!recetario) {
        console.log(`    ⚠️  Sin recetario para este producto, saltando`);
        continue;
      }

      console.log(`    ✅ Recetario encontrado: "${recetario.nombre}" (${recetario.ingredientes?.length || 0} ingredientes)`);

      const ingredientes = recetario.ingredientes || [];

      // 3. Por cada ingrediente crear movimiento de SALIDA y decrementar stock
      for (const ing of ingredientes) {
        const cantidadTotal = ing.cantidad * line.quantity;
        const costoTotal = (ing.costo_unitario || 0) * cantidadTotal;

        const movimiento = {
          tipo: 'SALIDA',
          origen: 'ODOO_VENTA',
          tipo_orden: tipo,
          order_id: orderId,
          recetario_id: recetario.id,
          recetario_nombre: recetario.nombre,
          producto_odoo_nombre: line.productName,
          producto_odoo_sku: line.productSKU || line.productTemplateSKU,
          producto_id: ing.producto_id || null,
          nombre_producto: ing.nombre,
          sku: ing.sku || null,
          cantidad: cantidadTotal,
          unidad_medida: ing.unidad_medida || '',
          costo_unitario: ing.costo_unitario || 0,
          costo_total: costoTotal,
          ubicacion_id: ubicacionId,
          fecha_creacion: admin.firestore.FieldValue.serverTimestamp(),
          estado: 'COMPLETADO',
          exit_type: 'VENTA_ODOO',
          descripcion: `Venta Odoo: ${line.productName} (${line.quantity} × ${ing.cantidad} ${ing.unidad_medida || ''})`,
        };

        const movRef = await db.collection('movimientos').add(movimiento);
        console.log(`      ✅ Movimiento ${movRef.id}: ${ing.nombre} × ${cantidadTotal}`);

        // Decrementar stock si el producto existe en Muqui
        if (ing.producto_id) {
          await decrementarStock(db, ing.producto_id, ubicacionId, cantidadTotal);
        }

        movimientosCreados++;
      }
    }

    console.log(`\n✅ Procesado: ${movimientosCreados} movimientos creados`);
    return { success: true, movimientosCreados, orderId, tipo };
  } catch (error) {
    console.error(`❌ Error procesando venta: ${error.message}`);
    throw error;
  }
}

module.exports = { procesarVentaOdoo, decrementarStock, buscarRecetario };
