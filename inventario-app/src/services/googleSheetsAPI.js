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
      stock_minimo_default: parseInt(producto.stock_minimo_default) || 0,
      frecuencia_inventario_dias: parseInt(producto.frecuencia_inventario_dias) || 30,
      categoria: producto.categoria,
      estado: producto.estado || 'ACTIVO',
      fecha_creacion: producto.fecha_creacion
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
    return await getSheetData('Ubicaciones')
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
    return await getSheetData('Inventario')
  } catch (error) {
    console.error('Error obteniendo inventario:', error)
    return []
  }
}

/**
 * Obtiene todas las transferencias
 */
export const getTransferencias = async () => {
  try {
    return await getSheetData('Transferencias')
  } catch (error) {
    console.error('Error obteniendo transferencias:', error)
    return []
  }
}

/**
 * Obtiene todos los conteos
 */
export const getConteos = async () => {
  try {
    return await getSheetData('Conteos')
  } catch (error) {
    console.error('Error obteniendo conteos:', error)
    return []
  }
}

/**
 * Obtiene todas las alertas
 */
export const getAlertas = async () => {
  try {
    return await getSheetData('Alertas')
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
    return await getSheetData('Usuarios')
  } catch (error) {
    console.error('Error obteniendo usuarios:', error)
    return []
  }
}

/**
 * Obtiene las empresas
 */
export const getEmpresas = async () => {
  try {
    return await getSheetData('Empresas')
  } catch (error) {
    console.error('Error obteniendo empresas:', error)
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
  getTransferencias,
  getConteos,
  getAlertas,
  getUsuarios,
  getEmpresas,
  loginWithSheets
}
