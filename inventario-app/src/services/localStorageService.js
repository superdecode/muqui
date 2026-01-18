/**
 * Servicio para manejar datos locales cuando Google Sheets está en modo solo lectura
 * Los cambios se guardan en localStorage y se sincronizan con los datos de Google Sheets
 */

const STORAGE_KEYS = {
  PRODUCTOS: 'muqui_productos_local',
  INVENTARIO: 'muqui_inventario_local',
  MOVIMIENTOS: 'muqui_movimientos_local',
  CONTEOS: 'muqui_conteos_local',
  DETALLE_MOVIMIENTOS: 'muqui_detalle_movimientos_local',
  DETALLE_CONTEOS: 'muqui_detalle_conteos_local'
}

class LocalStorageService {
  // Obtener datos locales
  getLocal(key) {
    try {
      const data = localStorage.getItem(STORAGE_KEYS[key])
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error(`Error leyendo ${key} de localStorage:`, error)
      return null
    }
  }

  // Guardar datos locales
  setLocal(key, data) {
    try {
      localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(data))
      return true
    } catch (error) {
      console.error(`Error guardando ${key} en localStorage:`, error)
      return false
    }
  }

  // Limpiar datos locales
  clearLocal(key) {
    try {
      localStorage.removeItem(STORAGE_KEYS[key])
      return true
    } catch (error) {
      console.error(`Error limpiando ${key} de localStorage:`, error)
      return false
    }
  }

  // Limpiar todos los datos locales
  clearAll() {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
  }

  // PRODUCTOS
  getProductosLocal() {
    return this.getLocal('PRODUCTOS') || []
  }

  saveProductosLocal(productos) {
    return this.setLocal('PRODUCTOS', productos)
  }

  // INVENTARIO
  getInventarioLocal() {
    return this.getLocal('INVENTARIO') || []
  }

  saveInventarioLocal(inventario) {
    return this.setLocal('INVENTARIO', inventario)
  }

  // MOVIMIENTOS
  getMovimientosLocal() {
    return this.getLocal('MOVIMIENTOS') || []
  }

  saveMovimientosLocal(movimientos) {
    return this.setLocal('MOVIMIENTOS', movimientos)
  }

  // CONTEOS
  getConteosLocal() {
    return this.getLocal('CONTEOS') || []
  }

  saveConteosLocal(conteos) {
    return this.setLocal('CONTEOS', conteos)
  }

  // DETALLE MOVIMIENTOS
  getDetalleMovimientosLocal() {
    return this.getLocal('DETALLE_MOVIMIENTOS') || []
  }

  saveDetalleMovimientosLocal(detalle) {
    return this.setLocal('DETALLE_MOVIMIENTOS', detalle)
  }

  // DETALLE CONTEOS
  getDetalleConteosLocal() {
    return this.getLocal('DETALLE_CONTEOS') || []
  }

  saveDetalleConteosLocal(detalle) {
    return this.setLocal('DETALLE_CONTEOS', detalle)
  }

  // Verificar si hay cambios locales
  hasLocalChanges() {
    return Object.values(STORAGE_KEYS).some(key => {
      return localStorage.getItem(key) !== null
    })
  }

  // Obtener resumen de cambios
  getChangesSummary() {
    const summary = {}
    Object.entries(STORAGE_KEYS).forEach(([key, storageKey]) => {
      const data = localStorage.getItem(storageKey)
      if (data) {
        try {
          const parsed = JSON.parse(data)
          summary[key] = Array.isArray(parsed) ? parsed.length : 1
        } catch (error) {
          summary[key] = 'Error'
        }
      }
    })
    return summary
  }
}

export default new LocalStorageService()
