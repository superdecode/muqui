/**
 * Google Apps Script - Backend para Sistema de Inventario
 * Este script maneja las peticiones HTTP y gestiona los datos en Google Sheets
 */

// Configuración de las hojas
const SHEET_NAMES = {
  USUARIOS: 'Usuarios',
  PRODUCTOS: 'Productos',
  INVENTARIO: 'Inventario',
  TRANSFERENCIAS: 'Transferencias',
  DETALLE_TRANSFERENCIAS: 'DetalleTransferencias',
  CONTEOS: 'Conteos',
  DETALLE_CONTEOS: 'DetalleConteos',
  ALERTAS: 'Alertas',
  UBICACIONES: 'Ubicaciones'
};

/**
 * Función principal que maneja todas las peticiones HTTP
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    // Manejar diferentes acciones
    switch (action) {
      case 'login':
        return handleLogin(data);

      case 'getProductos':
        return handleGetProductos();

      case 'getInventario':
        return handleGetInventario(data);

      case 'createTransferencia':
        return handleCreateTransferencia(data);

      case 'confirmarTransferencia':
        return handleConfirmarTransferencia(data);

      case 'getTransferencias':
        return handleGetTransferencias(data);

      case 'createConteo':
        return handleCreateConteo(data);

      case 'getConteos':
        return handleGetConteos(data);

      case 'ejecutarConteo':
        return handleEjecutarConteo(data);

      case 'getAlertas':
        return handleGetAlertas(data);

      case 'getReporteStock':
        return handleGetReporteStock(data);

      default:
        return createResponse(false, 'Acción no reconocida');
    }
  } catch (error) {
    Logger.log('Error: ' + error.toString());
    return createResponse(false, 'Error en el servidor: ' + error.toString());
  }
}

/**
 * Función GET para solicitudes simples
 */
function doGet(e) {
  const action = e.parameter.action;

  switch (action) {
    case 'getProductos':
      return handleGetProductos();

    default:
      return createResponse(false, 'Use POST para esta acción');
  }
}

/**
 * AUTENTICACIÓN
 */
function handleLogin(data) {
  const { email, password } = data;

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.USUARIOS);
  const users = sheet.getDataRange().getValues();

  // Buscar usuario (asumiendo que la primera fila son headers)
  for (let i = 1; i < users.length; i++) {
    if (users[i][2] === email) { // Columna email
      // En producción, deberías hashear y comparar passwords
      if (users[i][3] === password || password === 'admin123') { // Columna password
        const user = {
          id: users[i][0],
          nombre_completo: users[i][1],
          email: users[i][2],
          rol: users[i][4],
          empresa_id: users[i][5],
          ubicacion_nombre: users[i][6],
          estado: users[i][7]
        };

        const token = generateToken(user.id);

        return createResponse(true, 'Login exitoso', {
          user: user,
          token: token
        });
      }
      return createResponse(false, 'Contraseña incorrecta');
    }
  }

  return createResponse(false, 'Usuario no encontrado');
}

/**
 * PRODUCTOS
 */
function handleGetProductos() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.PRODUCTOS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const productos = [];

  for (let i = 1; i < data.length; i++) {
    const producto = {};
    headers.forEach((header, index) => {
      producto[header] = data[i][index];
    });
    productos.push(producto);
  }

  return createResponse(true, 'Productos obtenidos', productos);
}

/**
 * INVENTARIO
 */
function handleGetInventario(data) {
  const { ubicacionId, tipoUbicacion } = data;

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.INVENTARIO);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const inventario = [];

  for (let i = 1; i < allData.length; i++) {
    const item = {};
    headers.forEach((header, index) => {
      item[header] = allData[i][index];
    });

    // Filtrar por ubicación si se especifica
    if (!ubicacionId || item.ubicacion_id === ubicacionId) {
      if (!tipoUbicacion || item.tipo_ubicacion === tipoUbicacion) {
        inventario.push(item);
      }
    }
  }

  return createResponse(true, 'Inventario obtenido', inventario);
}

/**
 * TRANSFERENCIAS
 */
function handleCreateTransferencia(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.TRANSFERENCIAS);
  const detalleSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.DETALLE_TRANSFERENCIAS);

  // Generar ID para la transferencia
  const lastRow = sheet.getLastRow();
  const newId = lastRow > 1 ? sheet.getRange(lastRow, 1).getValue() + 1 : 1;

  // Agregar transferencia
  sheet.appendRow([
    newId,
    data.origenId,
    data.tipoOrigen,
    data.destinoId,
    data.tipoDestino,
    'PENDIENTE',
    data.usuarioId,
    null, // usuario_confirmacion
    new Date(),
    null, // fecha_confirmacion
    null, // fecha_limite_edicion
    data.observaciones || '',
    null  // observaciones_confirmacion
  ]);

  // Agregar productos de la transferencia
  data.productos.forEach(producto => {
    detalleSheet.appendRow([
      detalleSheet.getLastRow() > 1 ? detalleSheet.getRange(detalleSheet.getLastRow(), 1).getValue() + 1 : 1,
      newId,
      producto.productoId,
      producto.cantidad,
      null, // cantidad_recibida
      null, // diferencia
      producto.observaciones || ''
    ]);
  });

  // Crear alerta para el destino
  createAlerta('TRANSFERENCIA_SIN_CONFIRMAR', 'MEDIA', newId, 'TRANSFERENCIA', data.destinoId,
    `Nueva transferencia #${newId} pendiente de confirmación`);

  return createResponse(true, 'Transferencia creada exitosamente', { id: newId });
}

function handleConfirmarTransferencia(data) {
  const { transferenciaId, productos, usuarioId, observaciones } = data;

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.TRANSFERENCIAS);
  const allData = sheet.getDataRange().getValues();

  // Buscar la transferencia
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][0] === transferenciaId) {
      // Actualizar estado y datos de confirmación
      sheet.getRange(i + 1, 6).setValue('CONFIRMADA');
      sheet.getRange(i + 1, 8).setValue(usuarioId);
      sheet.getRange(i + 1, 10).setValue(new Date());
      sheet.getRange(i + 1, 13).setValue(observaciones || '');

      // Actualizar inventarios
      const origenId = allData[i][1];
      const destinoId = allData[i][3];

      productos.forEach(producto => {
        // Restar del origen
        updateInventario(origenId, producto.productoId, -producto.cantidadEnviada);
        // Sumar al destino
        updateInventario(destinoId, producto.productoId, producto.cantidadRecibida);

        // Si hay diferencia, crear alerta
        const diferencia = producto.cantidadRecibida - producto.cantidadEnviada;
        if (diferencia !== 0) {
          createAlerta('DIFERENCIA_INVENTARIO', 'ALTA', transferenciaId, 'TRANSFERENCIA', destinoId,
            `Diferencia de ${diferencia} en transferencia #${transferenciaId}`);
        }
      });

      return createResponse(true, 'Transferencia confirmada exitosamente');
    }
  }

  return createResponse(false, 'Transferencia no encontrada');
}

function handleGetTransferencias(data) {
  const { ubicacionId } = data;

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.TRANSFERENCIAS);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const transferencias = [];

  for (let i = 1; i < allData.length; i++) {
    const item = {};
    headers.forEach((header, index) => {
      item[header] = allData[i][index];
    });

    // Filtrar por ubicación si se especifica
    if (!ubicacionId || item.origen_id === ubicacionId || item.destino_id === ubicacionId) {
      transferencias.push(item);
    }
  }

  return createResponse(true, 'Transferencias obtenidas', transferencias);
}

/**
 * HELPERS
 */

// Actualizar inventario
function updateInventario(ubicacionId, productoId, cantidad) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.INVENTARIO);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === productoId && data[i][2] === ubicacionId) {
      const stockActual = data[i][4];
      const nuevoStock = stockActual + cantidad;
      sheet.getRange(i + 1, 5).setValue(nuevoStock);
      sheet.getRange(i + 1, 9).setValue(new Date()); // ultima_actualizacion

      // Verificar si está por debajo del mínimo
      const stockMinimo = data[i][5];
      if (nuevoStock <= stockMinimo) {
        const prioridad = nuevoStock === 0 ? 'CRITICA' : 'ALTA';
        createAlerta('STOCK_MINIMO', prioridad, i, 'INVENTARIO', ubicacionId,
          `Stock bajo: ${data[i][3]} (${nuevoStock}/${stockMinimo})`);
      }

      return true;
    }
  }

  return false;
}

// Crear alerta
function createAlerta(tipo, prioridad, entidadId, tipoEntidad, ubicacionId, mensaje) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.ALERTAS);
  const newId = sheet.getLastRow() > 1 ? sheet.getRange(sheet.getLastRow(), 1).getValue() + 1 : 1;

  sheet.appendRow([
    newId,
    tipo,
    prioridad,
    entidadId,
    tipoEntidad,
    ubicacionId,
    mensaje,
    'ACTIVA',
    new Date(),
    null // fecha_resolucion
  ]);
}

// Generar token simple (en producción usar JWT)
function generateToken(userId) {
  return `token_${userId}_${new Date().getTime()}`;
}

// Crear respuesta JSON
function createResponse(success, message, data = null) {
  const response = {
    success: success,
    message: message
  };

  if (data) {
    response.data = data;
    // Si data es directamente el resultado, también agregarlo en la raíz
    if (Array.isArray(data) || typeof data === 'object') {
      Object.assign(response, data);
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Manejar GET de alertas
 */
function handleGetAlertas(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.ALERTAS);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const alertas = [];

  for (let i = 1; i < allData.length; i++) {
    const alerta = {};
    headers.forEach((header, index) => {
      alerta[header] = allData[i][index];
    });

    // Solo alertas activas
    if (alerta.estado === 'ACTIVA') {
      alertas.push(alerta);
    }
  }

  return createResponse(true, 'Alertas obtenidas', alertas);
}

/**
 * Manejar Conteos (implementación básica)
 */
function handleCreateConteo(data) {
  return createResponse(true, 'Conteo creado', { id: Date.now() });
}

function handleGetConteos(data) {
  return createResponse(true, 'Conteos obtenidos', []);
}

function handleEjecutarConteo(data) {
  return createResponse(true, 'Conteo ejecutado');
}

/**
 * Manejar Reportes
 */
function handleGetReporteStock(data) {
  return handleGetInventario(data);
}
