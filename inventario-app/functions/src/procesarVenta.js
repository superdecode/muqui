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
 * Carga el mapa de equivalencias de unidades desde Firestore.
 * Retorna un Map<fromId, Map<toId, factor>> con entradas bidireccionales.
 */
async function cargarEquivalencias(db) {
  const snap = await db.collection('unit_equivalences').get();
  const map = new Map();
  const ensure = (id) => { if (!map.has(id)) map.set(id, new Map()); };
  snap.docs.forEach(d => {
    const { from_unit_id, to_unit_id, factor } = d.data();
    if (!from_unit_id || !to_unit_id || !factor) return;
    ensure(from_unit_id); ensure(to_unit_id);
    map.get(from_unit_id).set(to_unit_id, factor);
    map.get(to_unit_id).set(from_unit_id, 1 / factor);
  });
  // Cierre transitivo (Floyd-Warshall)
  const ids = Array.from(map.keys());
  for (const k of ids) {
    for (const i of ids) {
      for (const j of ids) {
        if (i !== j && map.get(i).has(k) && map.get(k).has(j) && !map.get(i).has(j)) {
          map.get(i).set(j, map.get(i).get(k) * map.get(k).get(j));
        }
      }
    }
  }
  ids.forEach(id => map.get(id).set(id, 1));
  return map;
}

/**
 * Convierte un valor de una unidad a otra usando el mapa de equivalencias.
 * Retorna null si no hay camino.
 */
function convertirUnidades(valor, fromId, toId, eqMap) {
  if (fromId === toId) return valor;
  const fromMap = eqMap.get(fromId);
  if (fromMap && fromMap.has(toId)) return valor * fromMap.get(toId);
  return null;
}

/**
 * Calcula cuántas presentaciones (unidades de stock) equivale una cantidad en unidad de consumo.
 * stockUnits = cantidad_consumo * factor(consumo → base) / purchase_unit_qty
 */
function calcCantidadEnStock(cantidadConsumo, consumptionUnitId, purchaseUnitId, purchaseUnitQty, eqMap) {
  if (!consumptionUnitId || consumptionUnitId === '__presentation__') {
    // __presentation__ = una presentación completa
    return cantidadConsumo;
  }
  if (consumptionUnitId === purchaseUnitId || !purchaseUnitId) {
    return cantidadConsumo / (purchaseUnitQty || 1);
  }
  const factor = convertirUnidades(1, consumptionUnitId, purchaseUnitId, eqMap);
  if (factor === null) {
    // Sin equivalencia: asumir mismo factor
    console.warn(`    ⚠️  Sin equivalencia entre ${consumptionUnitId} y ${purchaseUnitId}, usando cantidad directa`);
    return cantidadConsumo / (purchaseUnitQty || 1);
  }
  return (cantidadConsumo * factor) / (purchaseUnitQty || 1);
}

/**
 * Calcula el costo por unidad de consumo.
 * costoPorConsUnit = (costoUnitario / purchaseUnitQty) / factor(purchase → consumption)
 */
function calcCostoEnUnidadConsumo(costoUnitario, consumptionUnitId, purchaseUnitId, purchaseUnitQty, eqMap) {
  if (!consumptionUnitId || consumptionUnitId === '__presentation__') {
    return costoUnitario;
  }
  if (consumptionUnitId === purchaseUnitId || !purchaseUnitId) {
    return costoUnitario / (purchaseUnitQty || 1);
  }
  const factor = convertirUnidades(1, purchaseUnitId, consumptionUnitId, eqMap);
  if (factor === null) return costoUnitario / (purchaseUnitQty || 1);
  return (costoUnitario / (purchaseUnitQty || 1)) / factor;
}

/**
 * Busca un recetario activo en Firestore por SKU de Odoo.
 * Retorna el recetario o null si no existe.
 */
async function buscarRecetario(db, sku) {
  if (!sku) return null;

  // First try: active recipe
  const activeSnap = await db.collection('salidas_odoo_recetas')
    .where('sku_odoo', '==', sku)
    .where('activo', '==', true)
    .orderBy('fecha_creacion', 'asc')
    .limit(1)
    .get();

  if (!activeSnap.empty) {
    return { id: activeSnap.docs[0].id, ...activeSnap.docs[0].data() };
  }

  // Check if there's a deactivated recipe
  const anySnap = await db.collection('salidas_odoo_recetas')
    .where('sku_odoo', '==', sku)
    .limit(1)
    .get();

  if (!anySnap.empty) {
    return { id: anySnap.docs[0].id, ...anySnap.docs[0].data(), _deactivated: true };
  }

  return null;
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
  const data = snap.docs[0].data();
  const actual = data.stock_actual ?? data.cantidad_actual ?? 0;
  const nuevo = actual - cantidad;

  await db.collection('inventario').doc(docId).update({
    stock_actual: nuevo,
    ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`      📊 Stock: ${actual} → ${nuevo}`);
}

/**
 * Resuelve el ubicacion_id local a partir del mapeo_pos.
 * Primero busca por odoo_pos_id numérico, luego por odoo_pos_name.
 * Si no hay mapeo, devuelve el valor original.
 */
/**
 * Busca un documento en mapeo_pos probando el valor como String Y como Number.
 * Necesario porque Firestore es estrictamente tipado y la UI puede guardar
 * odoo_pos_id como número o como cadena dependiendo del campo del formulario.
 */
async function buscarMapeoPOS(db, campo, valor) {
  // Intento 1: con activo == true, valor como string
  const s1 = await db.collection('mapeo_pos')
    .where(campo, '==', String(valor))
    .where('activo', '==', true)
    .limit(1).get();
  if (!s1.empty) return s1.docs[0].data().ubicacion_id;

  // Intento 2: con activo == true, valor como number
  const numVal = Number(valor);
  if (!isNaN(numVal)) {
    const s2 = await db.collection('mapeo_pos')
      .where(campo, '==', numVal)
      .where('activo', '==', true)
      .limit(1).get();
    if (!s2.empty) return s2.docs[0].data().ubicacion_id;
  }

  // Intento 3: sin filtro activo (por si no está configurado el campo)
  const s3 = await db.collection('mapeo_pos')
    .where(campo, '==', String(valor))
    .limit(1).get();
  if (!s3.empty) return s3.docs[0].data().ubicacion_id;

  if (!isNaN(numVal)) {
    const s4 = await db.collection('mapeo_pos')
      .where(campo, '==', numVal)
      .limit(1).get();
    if (!s4.empty) return s4.docs[0].data().ubicacion_id;
  }

  return null;
}

async function resolverUbicacion(db, rawUbicacionId, configId) {
  // 1. Intentar por configId (ID numérico del POS config en Odoo)
  if (configId) {
    const mapped = await buscarMapeoPOS(db, 'odoo_pos_id', configId);
    if (mapped) {
      console.log(`  🗺️  Mapeo POS: config_id ${configId} → ${mapped}`);
      return mapped;
    }
  }

  // 2. Intentar por rawUbicacionId como odoo_pos_id
  if (rawUbicacionId && rawUbicacionId !== 'tienda_principal') {
    const byId = await buscarMapeoPOS(db, 'odoo_pos_id', rawUbicacionId);
    if (byId) {
      console.log(`  🗺️  Mapeo POS: id "${rawUbicacionId}" → ${byId}`);
      return byId;
    }

    // 3. Intentar por odoo_pos_name
    const byName = await buscarMapeoPOS(db, 'odoo_pos_name', rawUbicacionId);
    if (byName) {
      console.log(`  🗺️  Mapeo POS: name "${rawUbicacionId}" → ${byName}`);
      return byName;
    }
  }

  // 4. Verificar si rawUbicacionId ya es un ID válido en ubicaciones
  if (rawUbicacionId && rawUbicacionId !== 'tienda_principal') {
    const ubSnap = await db.collection('ubicaciones').doc(rawUbicacionId).get();
    if (ubSnap.exists) return rawUbicacionId;
  }

  // 5. Leer ubicación por defecto global (guardada desde el panel de Muqui)
  const defaultSnap = await db.collection('mapeo_pos').doc('__default__').get();
  if (defaultSnap.exists) {
    const defaultUbicacion = defaultSnap.data().ubicacion_id;
    if (defaultUbicacion) {
      console.log(`  🗺️  Usando ubicación por defecto global: ${defaultUbicacion}`);
      return defaultUbicacion;
    }
  }

  console.warn(`  ⚠️  Sin mapeo POS para "${rawUbicacionId}" / configId ${configId}. Revisa colección mapeo_pos.`);
  return rawUbicacionId || 'tienda_principal';
}

/**
 * Procesa una venta de Odoo (sale.order o pos.order).
 * Busca el recetario en Firestore por SKU y crea movimientos de SALIDA.
 *
 * @param {string|number} orderId      - ID de la orden en Odoo
 * @param {string}        ubicacionId  - ID de ubicación raw (puede ser Odoo POS id/name)
 * @param {string}        tipo         - 'sale_order' | 'pos_order'
 * @param {string}        [orderName]  - Referencia legible de la orden (ej. POS/2024/0001)
 */
async function procesarVentaOdoo(orderId, ubicacionId = 'tienda_principal', tipo = 'sale_order', orderName = null) {
  const db = admin.firestore();
  const odooClient = crearOdooClient();

  try {
    console.log(`\n📦 Procesando ${tipo} #${orderId} → ubicación raw: ${ubicacionId}`);

    // 1. Obtener líneas de la orden según tipo
    const lines = tipo === 'pos_order'
      ? await odooClient.getPOSOrderLines(orderId)
      : await odooClient.getOrderLines(orderId);

    console.log(`  ✅ Líneas de orden: ${lines.length}`);

    // Determinar order_name desde líneas si no se pasó explícitamente
    const resolvedOrderName = orderName || lines[0]?.orderName || String(orderId);

    // Resolver ubicación a través de mapeo_pos
    const configIdFromLines = lines[0]?.configId || null;
    const resolvedUbicacionId = await resolverUbicacion(db, ubicacionId, configIdFromLines);
    console.log(`  📍 Ubicación resuelta: ${resolvedUbicacionId}`);

    // Cargar equivalencias de unidades una sola vez
    const eqMap = await cargarEquivalencias(db);

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

      // Handle deactivated recipe — create error movement
      if (recetario._deactivated) {
        console.log(`    ❌ Receta desactivada para SKU ${line.productSKU || line.productTemplateSKU}`);
        await db.collection('movimientos').add({
          tipo: 'SALIDA',
          origen: 'ODOO_VENTA',
          tipo_orden: tipo,
          order_id: orderId,
          producto_odoo_nombre: line.productName,
          producto_odoo_sku: line.productSKU || line.productTemplateSKU,
          cantidad: line.quantity,
          ubicacion_id: resolvedUbicacionId,
          fecha_creacion: admin.firestore.FieldValue.serverTimestamp(),
          estado: 'ERROR',
          error_detalle: `Receta desactivada sin alternativa activa para SKU ${line.productSKU || line.productTemplateSKU}. Activar receta y reprocesar.`,
          exit_type: 'VENTA_ODOO',
        });
        movimientosCreados++;
        continue;
      }

      console.log(`    ✅ Recetario encontrado: "${recetario.nombre}" (${recetario.ingredientes?.length || 0} ingredientes)`);

      const ingredientes = recetario.ingredientes || [];

      // 3. Por cada ingrediente crear movimiento de SALIDA y decrementar stock
      for (const ing of ingredientes) {
        const cantidadUso = parseFloat(ing.cantidad) || 0;
        const cantidadTotalConsumo = cantidadUso * line.quantity; // en unidad de consumo

        // Obtener purchase_unit_qty del producto para conversión de stock
        let purchaseUnitQty = 1;
        if (ing.producto_id) {
          const prodSnap = await db.collection('productos').doc(ing.producto_id).get();
          if (prodSnap.exists) purchaseUnitQty = prodSnap.data().purchase_unit_qty || 1;
        }

        const consumptionUnitId = ing.consumption_unit_id || ing.purchase_unit_id || '';
        const purchaseUnitId = ing.purchase_unit_id || '';

        // Cantidad a descontar del stock (en presentaciones/purchase units)
        const cantidadStock = calcCantidadEnStock(
          cantidadTotalConsumo, consumptionUnitId, purchaseUnitId, purchaseUnitQty, eqMap
        );

        // Costo por unidad de consumo → costo total correcto
        const costoPorUnidadConsumo = calcCostoEnUnidadConsumo(
          parseFloat(ing.costo_unitario) || 0, consumptionUnitId, purchaseUnitId, purchaseUnitQty, eqMap
        );
        const costoTotal = costoPorUnidadConsumo * cantidadTotalConsumo;

        const movimiento = {
          tipo: 'SALIDA',
          origen: 'ODOO_VENTA',
          tipo_orden: tipo,
          order_id: orderId,
          order_name: resolvedOrderName,
          odoo_qty_line: line.quantity,
          recetario_id: recetario.id,
          recetario_nombre: recetario.nombre,
          producto_odoo_nombre: line.productName,
          producto_odoo_sku: line.productSKU || line.productTemplateSKU,
          producto_id: ing.producto_id || null,
          nombre_producto: ing.nombre,
          sku: ing.sku || null,
          cantidad: cantidadTotalConsumo,         // en unidad de consumo (para referencia)
          cantidad_stock: cantidadStock,           // en presentaciones (para descuento de stock)
          unidad_medida: ing.unidad_medida || '',
          consumption_unit_id: consumptionUnitId,
          purchase_unit_id: purchaseUnitId,
          costo_unitario: ing.costo_unitario || 0,
          costo_por_unidad_consumo: costoPorUnidadConsumo,
          costo_total: costoTotal,
          ubicacion_id: resolvedUbicacionId,
          fecha_creacion: admin.firestore.FieldValue.serverTimestamp(),
          estado: 'COMPLETADO',
          exit_type: 'VENTA_ODOO',
          descripcion: `Venta Odoo: ${line.productName} (${line.quantity} × ${cantidadUso} ${ing.unidad_medida || ''})`,
        };

        const movRef = await db.collection('movimientos').add(movimiento);
        console.log(`      ✅ Movimiento ${movRef.id}: ${ing.nombre} × ${cantidadTotalConsumo} ${ing.unidad_medida || ''} (stock: ${cantidadStock.toFixed(4)} uds)`);

        // Decrementar stock usando cantidad en presentaciones
        if (ing.producto_id) {
          await decrementarStock(db, ing.producto_id, resolvedUbicacionId, cantidadStock);
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
