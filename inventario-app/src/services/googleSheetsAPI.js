/**
 * Servicio para conectar con Google Sheets API v4
 * Usa las credenciales proporcionadas para acceder a la hoja de datos
 */

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || ''
const SPREADSHEET_ID = import.meta.env.VITE_GOOGLE_SPREADSHEET_ID || ''

// OAuth 2.0 credentials (para futuras implementaciones con escritura)
export const OAUTH_CONFIG = {
  clientId: import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || '',
  clientSecret: import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_SECRET || '',
  redirectUri: window.location.origin
}

/**
 * Construye la URL para obtener datos de una hoja específica
 */
const buildSheetURL = (sheetName, range = '') => {
  const fullRange = range ? `${sheetName}!${range}` : sheetName
  return `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${fullRange}?key=${GOOGLE_API_KEY}`
}

/**
 * Obtiene datos de una hoja específica
 */
export const getSheetData = async (sheetName, range = '') => {
  try {
    const url = buildSheetURL(sheetName, range)
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Error al obtener datos: ${response.statusText}`)
    }

    const data = await response.json()
    return parseSheetData(data.values)
  } catch (error) {
    console.error(`Error obteniendo datos de ${sheetName}:`, error)
    throw error
  }
}

/**
 * Convierte los datos de Sheets (array de arrays) a array de objetos
 */
const parseSheetData = (values) => {
  if (!values || values.length === 0) {
    return []
  }

  const headers = values[0]
  const rows = values.slice(1)

  return rows.map(row => {
    const obj = {}
    headers.forEach((header, index) => {
      obj[header] = row[index] || ''
    })
    return obj
  })
}

/**
 * Obtiene todas las empresas
 */
export const getEmpresas = async () => {
  try {
    const data = await getSheetData('Empresas')
    return data.map(empresa => ({
      id: empresa.id,
      nombre: empresa.nombre,
      tipo: empresa.tipo,
      estado: empresa.estado || 'ACTIVO',
      fecha_creacion: empresa.fecha_creacion
    }))
  } catch (error) {
    console.error('Error obteniendo empresas:', error)
    return []
  }
}

/**
 * Obtiene todos los productos
 */
export const getProductos = async () => {
  try {
    const data = await getSheetData('Productos')
    return data.map(producto => ({
      id: producto.id,
      nombre: producto.nombre,
      especificacion: producto.especificacion || '',
      unidad_medida: producto.unidad_medida,
      concatenado: producto.concatenado || '',
      stock_minimo: parseInt(producto.stock_minimo) || 0,
      frecuencia_inventario_Dias: parseInt(producto.frecuencia_inventario_Dias) || 1,
      categoria: producto.categoria,
      estado: producto.estado || 'ACTIVO',
      ubicacion_id: producto.ubicacion_id ? producto.ubicacion_id.split(',').map(id => id.trim().replace(/"/g, '')) : []
    }))
  } catch (error) {
    console.error('Error obteniendo productos:', error)
    return []
  }
}

/**
 * Obtiene todas las ubicaciones
 */
export const getUbicaciones = async () => {
  try {
    const data = await getSheetData('Ubicaciones')
    return data.map(ubicacion => ({
      id: ubicacion.id,
      nombre: ubicacion.nombre,
      empresa_id: ubicacion.empresa_id,
      direccion: ubicacion.direccion || '',
      responsable_id: ubicacion.responsable_id,
      tipo_ubicacion: ubicacion.tipo_ubicacion,
      estado: ubicacion.estado || 'ACTIVO',
      fecha_creacion: ubicacion.fecha_creacion
    }))
  } catch (error) {
    console.error('Error obteniendo ubicaciones:', error)
    return []
  }
}

/**
 * Obtiene todo el inventario
 */
export const getInventario = async () => {
  try {
    const data = await getSheetData('Inventario')
    return data.map(inv => ({
      id: inv.id,
      producto_id: inv.producto_id,
      producto: inv.producto,
      ubicacion_id: inv.ubicacion_id,
      ubicacion: inv.ubicacion,
      stock_actual: parseInt(inv.stock_actual) || 0,
      especificacion: inv.especificacion || '',
      unidad_medida: inv.unidad_medida,
      categoria: inv.categoria,
      ultima_actualizacion: inv.ultima_actualizacion
    }))
  } catch (error) {
    console.error('Error obteniendo inventario:', error)
    return []
  }
}

/**
 * Obtiene todos los movimientos
 */
export const getMovimientos = async () => {
  try {
    const data = await getSheetData('Movimientos')
    return data.map(mov => ({
      id: mov.id,
      tipo_movimiento: mov.tipo_movimiento,
      origen_id: mov.origen_id,
      destino_id: mov.destino_id,
      estado: mov.estado,
      usuario_creacion_id: mov.usuario_creacion_id,
      usuario_confirmacion_id: mov.usuario_confirmacion_id,
      fecha_creacion: mov.fecha_creacion,
      fecha_confirmacion: mov.fecha_confirmacion,
      fecha_limite_edicion: mov.fecha_limite_edicion,
      observaciones_creacion: mov.observaciones_creacion || '',
      observaciones_confirmacion: mov.observaciones_confirmacion || ''
    }))
  } catch (error) {
    console.error('Error obteniendo movimientos:', error)
    return []
  }
}

/**
 * Obtiene detalles de movimientos
 */
export const getDetalleMovimientos = async () => {
  try {
    const data = await getSheetData('Detalle_movimientos')
    return data.map(det => ({
      id: det.id,
      movimiento_id: det.movimiento_id,
      producto_id: det.producto_id,
      cantidad: parseInt(det.cantidad) || 0,
      observaciones: det.observaciones || ''
    }))
  } catch (error) {
    console.error('Error obteniendo detalle movimientos:', error)
    return []
  }
}

/**
 * Obtiene todos los conteos
 */
export const getConteos = async () => {
  try {
    const data = await getSheetData('Conteos')
    return data.map(conteo => ({
      id: conteo.id,
      ubicacion_id: conteo.ubicacion_id,
      tipo_ubicacion: conteo.tipo_ubicacion,
      tipo_conteo: conteo.tipo_conteo,
      estado: conteo.estado,
      usuario_responsable_id: conteo.usuario_responsable_id,
      usuario_ejecutor_id: conteo.usuario_ejecutor_id,
      fecha_programada: conteo.fecha_programada,
      fecha_inicio: conteo.fecha_inicio,
      fecha_completado: conteo.fecha_completado,
      observaciones: conteo.observaciones || ''
    }))
  } catch (error) {
    console.error('Error obteniendo conteos:', error)
    return []
  }
}

/**
 * Obtiene detalles de conteos
 */
export const getDetalleConteos = async () => {
  try {
    const data = await getSheetData('Detalle_conteos')
    return data.map(det => ({
      id: det.id,
      conteo_id: det.conteo_id,
      producto_id: det.producto_id,
      cantidad_sistema: parseInt(det.cantidad_sistema) || 0,
      cantidad_fisica: det.cantidad_fisica ? parseInt(det.cantidad_fisica) : null,
      diferencia: det.diferencia ? parseInt(det.diferencia) : null,
      observaciones: det.observaciones || '',
      contado: det.contado === 'SI'
    }))
  } catch (error) {
    console.error('Error obteniendo detalle conteos:', error)
    return []
  }
}

/**
 * Obtiene todas las alertas
 */
export const getAlertas = async () => {
  try {
    const data = await getSheetData('Alertas')
    return data.map(alerta => ({
      id: alerta.id,
      tipo: alerta.tipo,
      prioridad: alerta.prioridad,
      entidad_relacionada_id: alerta.entidad_relacionada_id,
      tipo_entidad: alerta.tipo_entidad,
      ubicacion_id: alerta.ubicacion_id,
      mensaje: alerta.mensaje,
      estado: alerta.estado,
      usuarios_notificados: alerta.usuarios_notificados ? JSON.parse(alerta.usuarios_notificados) : [],
      fecha_creacion: alerta.fecha_creacion,
      fecha_resolucion: alerta.fecha_resolucion
    }))
  } catch (error) {
    console.error('Error obteniendo alertas:', error)
    return []
  }
}

/**
 * Obtiene todos los usuarios
 */
export const getUsuarios = async () => {
  try {
    const data = await getSheetData('Usuarios')
    return data.map(usuario => ({
      id: usuario.id,
      email: usuario.email,
      password: usuario.password,
      nombre: usuario.nombre,
      rol: usuario.rol,
      empresa_id: usuario.empresa_id,
      ubicaciones_asignadas: usuario.ubicaciones_asignadas ? usuario.ubicaciones_asignadas.split(',').map(id => id.trim().replace(/"/g, '')) : [],
      estado: usuario.estado || 'ACTIVO',
      fecha_creacion: usuario.fecha_creacion
    }))
  } catch (error) {
    console.error('Error obteniendo usuarios:', error)
    return []
  }
}


/**
 * Login con Google Sheets
 */
export const loginWithSheets = async (email, password) => {
  try {
    const usuarios = await getUsuarios()
    const user = usuarios.find(u => u.email === email)

    if (!user) {
      return {
        success: false,
        message: 'Usuario no encontrado'
      }
    }

    // En producción, deberías verificar el password hasheado
    // Por ahora, aceptamos admin123 o el password del sheet
    if (password === 'admin123' || password === user.password) {
      return {
        success: true,
        user: user,
        token: `token_${user.id}_${Date.now()}`
      }
    }

    return {
      success: false,
      message: 'Contraseña incorrecta'
    }
  } catch (error) {
    console.error('Error en login:', error)
    return {
      success: false,
      message: 'Error al intentar iniciar sesión'
    }
  }
}

export default {
  getProductos,
  getUbicaciones,
  getInventario,
  getMovimientos,
  getDetalleMovimientos,
  getConteos,
  getDetalleConteos,
  getAlertas,
  getUsuarios,
  getEmpresas,
  loginWithSheets
}
