import * as XLSX from 'xlsx'

/**
 * Exportar reporte consolidado multi-ubicación a Excel con múltiples hojas
 */
export function exportConsolidatedToExcel(consolidatedData, ubicaciones, productos) {
  const wb = XLSX.utils.book_new()
  
  // ========== HOJA 1: CONSOLIDADO ==========
  const consolidadoData = consolidatedData.map(item => {
    const producto = productos.find(p => p.id === item.producto_id)
    const totalUnidades = item.por_ubicacion.reduce((sum, ub) => sum + ub.cantidad, 0)
    const stockMinimo = producto?.stock_minimo || 0
    const enStockBajo = item.por_ubicacion.some(ub => ub.cantidad <= stockMinimo)
    
    return {
      'Producto': item.nombre,
      'Total Unidades': totalUnidades,
      'Stock Mínimo': stockMinimo,
      'Estado': enStockBajo ? 'BAJO' : 'NORMAL',
      'Ubicaciones con Stock': item.por_ubicacion.length
    }
  })
  
  const wsConsolidado = XLSX.utils.json_to_sheet(consolidadoData)
  
  // Aplicar estilos al encabezado
  const range = XLSX.utils.decode_range(wsConsolidado['!ref'])
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const address = XLSX.utils.encode_col(C) + "1"
    if (!wsConsolidado[address]) continue
    wsConsolidado[address].s = {
      font: { bold: true },
      fill: { fgColor: { rgb: "4472C4" } },
      alignment: { horizontal: "center" }
    }
  }
  
  // Ajustar ancho de columnas
  wsConsolidado['!cols'] = [
    { wch: 30 }, // Producto
    { wch: 15 }, // Total Unidades
    { wch: 15 }, // Stock Mínimo
    { wch: 12 }, // Estado
    { wch: 20 }  // Ubicaciones con Stock
  ]
  
  XLSX.utils.book_append_sheet(wb, wsConsolidado, 'Consolidado')
  
  // ========== HOJA 2: DESGLOSE DETALLADO ==========
  const detalladoData = []
  consolidatedData.forEach(item => {
    const producto = productos.find(p => p.id === item.producto_id)
    const stockMinimo = producto?.stock_minimo || 0
    
    item.por_ubicacion.forEach(ub => {
      const ubicacion = ubicaciones.find(u => u.id === ub.ubicacion_id)
      detalladoData.push({
        'Producto': item.nombre,
        'Ubicación': ubicacion?.nombre || ub.ubicacion_id,
        'Cantidad': ub.cantidad,
        'Stock Mínimo': stockMinimo,
        'Estado': ub.cantidad <= stockMinimo ? 'BAJO' : 'NORMAL'
      })
    })
  })
  
  const wsDetallado = XLSX.utils.json_to_sheet(detalladoData)
  wsDetallado['!cols'] = [
    { wch: 30 }, // Producto
    { wch: 25 }, // Ubicación
    { wch: 12 }, // Cantidad
    { wch: 15 }, // Stock Mínimo
    { wch: 12 }  // Estado
  ]
  
  XLSX.utils.book_append_sheet(wb, wsDetallado, 'Desglose Detallado')
  
  // ========== HOJAS INDIVIDUALES POR UBICACIÓN ==========
  ubicaciones.forEach(ubicacion => {
    const ubData = []
    
    consolidatedData.forEach(item => {
      const ubInfo = item.por_ubicacion.find(u => u.ubicacion_id === ubicacion.id)
      if (ubInfo && ubInfo.cantidad > 0) {
        const producto = productos.find(p => p.id === item.producto_id)
        const stockMinimo = producto?.stock_minimo || 0
        
        ubData.push({
          'Producto': item.nombre,
          'Cantidad': ubInfo.cantidad,
          'Stock Mínimo': stockMinimo,
          'Estado': ubInfo.cantidad <= stockMinimo ? 'BAJO' : 'NORMAL'
        })
      }
    })
    
    if (ubData.length > 0) {
      const ws = XLSX.utils.json_to_sheet(ubData)
      ws['!cols'] = [
        { wch: 30 }, // Producto
        { wch: 12 }, // Cantidad
        { wch: 15 }, // Stock Mínimo
        { wch: 12 }  // Estado
      ]
      
      // Limitar nombre de hoja a 31 caracteres (límite de Excel)
      const sheetName = ubicacion.nombre.substring(0, 31)
      XLSX.utils.book_append_sheet(wb, ws, sheetName)
    }
  })
  
  // ========== HOJA DE RESUMEN/KPIs ==========
  const totalProductos = consolidatedData.length
  const totalUnidades = consolidatedData.reduce((sum, item) => 
    sum + item.por_ubicacion.reduce((s, ub) => s + ub.cantidad, 0), 0
  )
  const productosStockBajo = consolidatedData.filter(item => {
    const producto = productos.find(p => p.id === item.producto_id)
    const stockMinimo = producto?.stock_minimo || 0
    return item.por_ubicacion.some(ub => ub.cantidad <= stockMinimo)
  }).length
  
  const resumenData = [
    { 'Métrica': 'Total Productos Únicos', 'Valor': totalProductos },
    { 'Métrica': 'Total Unidades en Inventario', 'Valor': totalUnidades },
    { 'Métrica': 'Productos en Stock Bajo', 'Valor': productosStockBajo },
    { 'Métrica': 'Ubicaciones Analizadas', 'Valor': ubicaciones.length },
    { 'Métrica': 'Fecha de Generación', 'Valor': new Date().toLocaleString('es-MX') }
  ]
  
  const wsResumen = XLSX.utils.json_to_sheet(resumenData)
  wsResumen['!cols'] = [
    { wch: 35 }, // Métrica
    { wch: 30 }  // Valor
  ]
  
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')
  
  // Descargar archivo
  const fecha = new Date().toISOString().split('T')[0]
  XLSX.writeFile(wb, `Reporte_Consolidado_${fecha}.xlsx`)
}

/**
 * Exportar reporte simple a Excel (una sola ubicación)
 */
export function exportSimpleToExcel(data, sheetName = 'Reporte') {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(data)
  
  // Auto-ajustar ancho de columnas
  const maxWidth = 50
  const colWidths = {}
  
  data.forEach(row => {
    Object.keys(row).forEach(key => {
      const value = String(row[key] || '')
      const width = Math.min(Math.max(value.length, key.length) + 2, maxWidth)
      colWidths[key] = Math.max(colWidths[key] || 0, width)
    })
  })
  
  ws['!cols'] = Object.values(colWidths).map(w => ({ wch: w }))
  
  XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31))
  
  const fecha = new Date().toISOString().split('T')[0]
  XLSX.writeFile(wb, `${sheetName}_${fecha}.xlsx`)
}
