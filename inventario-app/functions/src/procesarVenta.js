const admin = require('firebase-admin');
const OdooClient = require('./odooClient');

async function procesarVentaOdoo(orderId, ubicacionId = 'tienda_principal') {
  const db = admin.firestore();
  const odooClient = new OdooClient(
    process.env.ODOO_URL,
    process.env.ODOO_DB,
    process.env.ODOO_USER,
    process.env.ODOO_PASSWORD
  );

  try {
    console.log(`📦 Procesando venta Odoo: ${orderId}`);

    // 1. Obtener líneas de la orden
    const orderLines = await odooClient.getOrderLines(orderId);
    console.log(`  ✅ Líneas obtenidas: ${orderLines.length}`);

    let movimientosCreados = 0;

    // 2. Para cada producto vendido
    for (const line of orderLines) {
      console.log(`  📌 Producto: ${line.productName} (qty: ${line.quantity})`);

      // 3. Obtener recetario (BoM)
      const bom = await odooClient.getBOM(line.productId);

      if (bom.length === 0) {
        console.log(`    ⚠️  No tiene recetario, saltando`);
        continue;
      }

      console.log(`    ✅ Recetario con ${bom.length} componentes`);

      // 4. Por cada ingrediente, crear salida
      for (const component of bom) {
        const cantidadTotal = component.quantity * line.quantity;

        // Obtener SKU del componente
        const { sku, name } = await odooClient.getProductSKU(component.componentId);

        // Crear movimiento de SALIDA
        const movimiento = {
          tipo: 'SALIDA',
          origen: 'ODOO_VENTA',
          sale_order_id: orderId,
          producto_id: component.componentId,
          sku,
          nombre_producto: name,
          cantidad: cantidadTotal,
          ubicacion_id: ubicacionId,
          fecha_creacion: admin.firestore.FieldValue.serverTimestamp(),
          estado: 'PENDIENTE',
          descripcion: `Salida automática: ${line.productName} (${line.quantity} x ${component.quantity})`,
        };

        // Guardar movimiento
        const movRef = await db.collection('movimientos').add(movimiento);
        console.log(`      ✅ Movimiento creado: ${movRef.id}`);

        // Decrementar stock en inventario
        await decrementarStock(db, component.componentId, ubicacionId, cantidadTotal);

        movimientosCreados++;
      }
    }

    console.log(`\n✅ Venta procesada: ${movimientosCreados} movimientos creados`);
    return { success: true, movimientosCreados, orderId };
  } catch (error) {
    console.error(`❌ Error procesando venta: ${error.message}`);
    throw error;
  }
}

async function decrementarStock(db, productoId, ubicacionId, cantidad) {
  const inventarioRef = db.collection('inventario').where('producto_id', '==', productoId).where('ubicacion_id', '==', ubicacionId);

  const snapshot = await inventarioRef.get();

  if (snapshot.empty) {
    console.warn(`⚠️  No hay inventario para ${productoId} en ${ubicacionId}`);
    return;
  }

  const docId = snapshot.docs[0].id;
  const docData = snapshot.docs[0].data();

  // Decrementar cantidad
  const nuevoStock = Math.max(0, docData.cantidad_actual - cantidad);

  await db.collection('inventario').doc(docId).update({
    cantidad_actual: nuevoStock,
    ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`      📊 Stock decrementado: ${docData.cantidad_actual} → ${nuevoStock}`);
}

module.exports = { procesarVentaOdoo, decrementarStock };
