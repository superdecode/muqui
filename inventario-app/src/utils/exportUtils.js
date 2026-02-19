/**
 * Utilidades para exportar datos a diferentes formatos
 */

/**
 * Convierte un array de objetos a formato CSV
 */
export const arrayToCSV = (data, headers = null) => {
  if (!data || data.length === 0) {
    throw new Error('No hay datos para exportar')
  }

  // Si no se proporcionan headers, usar las keys del primer objeto
  const columns = headers || Object.keys(data[0])

  // Crear header row
  const headerRow = columns.join(',')

  // Crear data rows
  const dataRows = data.map(row => {
    return columns.map(col => {
      const value = row[col]
      // Escapar valores que contengan comas o comillas
      if (value === null || value === undefined) return ''
      const stringValue = String(value)
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }
      return stringValue
    }).join(',')
  })

  return [headerRow, ...dataRows].join('\n')
}

/**
 * Descarga un string como archivo
 */
export const downloadFile = (content, filename, type = 'text/csv') => {
  const blob = new Blob([content], { type })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

/**
 * Exporta un array de objetos a CSV (función genérica)
 */
export const exportToCSV = (data, filename) => {
  if (!data || data.length === 0) {
    throw new Error('No hay datos para exportar')
  }

  const csv = arrayToCSV(data)
  downloadFile(csv, `${filename}.csv`)
}

/**
 * Exporta inventario a CSV
 */
export const exportInventarioToCSV = (inventario) => {
  const headers = [
    'producto',
    'especificacion',
    'ubicacion',
    'stock_actual',
    'unidad_medida',
    'categoria',
    'ultima_actualizacion'
  ]

  const data = inventario.map(item => ({
    producto: item.producto,
    especificacion: item.especificacion || '',
    ubicacion: item.ubicacion,
    stock_actual: item.stock_actual,
    unidad_medida: item.unidad_medida,
    categoria: item.categoria,
    ultima_actualizacion: item.ultima_actualizacion
  }))

  const csv = arrayToCSV(data, headers)
  const fecha = new Date().toISOString().split('T')[0]
  downloadFile(csv, `inventario_${fecha}.csv`)
}

/**
 * Exporta productos a CSV
 */
export const exportProductosToCSV = (productos) => {
  const headers = [
    'id',
    'nombre',
    'especificacion',
    'unidad_medida',
    'stock_minimo',
    'categoria',
    'estado'
  ]

  const data = productos.map(item => ({
    id: item.id,
    nombre: item.nombre,
    especificacion: item.especificacion || '',
    unidad_medida: item.unidad_medida,
    stock_minimo: item.stock_minimo,
    categoria: item.categoria,
    estado: item.estado
  }))

  const csv = arrayToCSV(data, headers)
  const fecha = new Date().toISOString().split('T')[0]
  downloadFile(csv, `productos_${fecha}.csv`)
}

/**
 * Exporta movimientos/transferencias a CSV
 */
export const exportMovimientosToCSV = (movimientos) => {
  const headers = [
    'id',
    'tipo_movimiento',
    'origen',
    'destino',
    'estado',
    'fecha_creacion',
    'fecha_confirmacion',
    'observaciones'
  ]

  const data = movimientos.map(item => ({
    id: item.id,
    tipo_movimiento: item.tipo_movimiento,
    origen: item.origen_id,
    destino: item.destino_id,
    estado: item.estado,
    fecha_creacion: item.fecha_creacion,
    fecha_confirmacion: item.fecha_confirmacion || '',
    observaciones: item.observaciones_creacion || ''
  }))

  const csv = arrayToCSV(data, headers)
  const fecha = new Date().toISOString().split('T')[0]
  downloadFile(csv, `movimientos_${fecha}.csv`)
}

/**
 * Exporta conteos a CSV
 */
export const exportConteosToCSV = (conteos) => {
  const headers = [
    'id',
    'ubicacion_id',
    'tipo_conteo',
    'estado',
    'fecha_programada',
    'fecha_completado',
    'responsable',
    'observaciones'
  ]

  const data = conteos.map(item => ({
    id: item.id,
    ubicacion_id: item.ubicacion_id,
    tipo_conteo: item.tipo_conteo,
    estado: item.estado,
    fecha_programada: item.fecha_programada,
    fecha_completado: item.fecha_completado || '',
    responsable: item.usuario_responsable_id,
    observaciones: item.observaciones || ''
  }))

  const csv = arrayToCSV(data, headers)
  const fecha = new Date().toISOString().split('T')[0]
  downloadFile(csv, `conteos_${fecha}.csv`)
}

/**
 * Exporta reporte de stock bajo a CSV
 */
export const exportReporteStockBajoToCSV = (productos) => {
  const headers = [
    'producto',
    'ubicacion',
    'stock_actual',
    'stock_minimo',
    'diferencia',
    'unidad_medida',
    'categoria'
  ]

  const data = productos.map(item => ({
    producto: item.producto,
    ubicacion: item.ubicacion,
    stock_actual: item.stock_actual,
    stock_minimo: item.stock_minimo,
    diferencia: item.stock_actual - item.stock_minimo,
    unidad_medida: item.unidad_medida,
    categoria: item.categoria
  }))

  const csv = arrayToCSV(data, headers)
  const fecha = new Date().toISOString().split('T')[0]
  downloadFile(csv, `reporte_stock_bajo_${fecha}.csv`)
}

/**
 * Crea una tabla HTML para imprimir
 */
export const createPrintableTable = (data, columns, title) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
        }
        h1 {
          color: #334155;
          margin-bottom: 20px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th {
          background-color: #0ea5e9;
          color: white;
          padding: 12px;
          text-align: left;
          font-weight: 600;
        }
        td {
          padding: 10px;
          border-bottom: 1px solid #e2e8f0;
        }
        tr:nth-child(even) {
          background-color: #f8fafc;
        }
        .fecha {
          color: #64748b;
          font-size: 14px;
          margin-top: 10px;
        }
        @media print {
          button {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <p class="fecha">Generado el: ${new Date().toLocaleString('es-ES')}</p>
      <table>
        <thead>
          <tr>
            ${columns.map(col => `<th>${col.header}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>
              ${columns.map(col => `<td>${row[col.key] || ''}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="margin-top: 30px;">
        <button onclick="window.print()" style="padding: 10px 20px; background-color: #0ea5e9; color: white; border: none; border-radius: 6px; cursor: pointer;">
          Imprimir
        </button>
        <button onclick="window.close()" style="padding: 10px 20px; background-color: #64748b; color: white; border: none; border-radius: 6px; cursor: pointer; margin-left: 10px;">
          Cerrar
        </button>
      </div>
    </body>
    </html>
  `

  const printWindow = window.open('', '_blank')
  printWindow.document.write(html)
  printWindow.document.close()
}

/**
 * Genera contenido HTML-table para exportar como .xls (Excel compatible)
 */
const buildExcelHTML = (title, headers, rows) => {
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>${title}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
<body><table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:11px">
<tr style="background:#0ea5e9;color:white;font-weight:bold">${headers.map(h => `<td>${h}</td>`).join('')}</tr>
${rows.map(r => `<tr>${r.map(c => `<td>${c ?? ''}</td>`).join('')}</tr>`).join('\n')}
</table></body></html>`
}

/**
 * Exporta un conteo confirmado con sus detalles a Excel
 */
export const exportConteoToExcel = (conteo, detalles, productos, ubicaciones) => {
  const ubicacion = (ubicaciones || []).find(u => u.id === conteo.ubicacion_id)
  const headers = ['Producto', 'Especificación', 'Cant. Sistema', 'Cant. Física', 'Diferencia', 'Observaciones']
  const rows = (detalles || []).map(d => {
    const prod = (productos || []).find(p => p.id === d.producto_id)
    return [
      prod?.nombre || d.producto_id,
      prod?.especificacion || '',
      d.cantidad_sistema ?? '',
      d.cantidad_fisica ?? '',
      d.diferencia ?? (d.cantidad_fisica - d.cantidad_sistema),
      d.observaciones || ''
    ]
  })

  const title = `Conteo ${conteo.codigo_legible || conteo.id}`
  const infoRows = [
    ['Código', conteo.codigo_legible || conteo.id, '', '', '', ''],
    ['Ubicación', ubicacion?.nombre || conteo.ubicacion_id, '', '', '', ''],
    ['Tipo', conteo.tipo_conteo || '', '', '', '', ''],
    ['Estado', conteo.estado, '', '', '', ''],
    ['Fecha Creación', conteo.fecha_creacion ? (conteo.fecha_creacion.toDate ? conteo.fecha_creacion.toDate().toISOString().split('T')[0] : new Date(conteo.fecha_creacion).toISOString().split('T')[0]) : '', '', '', '', ''],
    ['', '', '', '', '', '']
  ]

  const html = buildExcelHTML(title, headers, [...infoRows, ...rows])
  const fecha = new Date().toISOString().split('T')[0]
  downloadFile(html, `conteo_${conteo.codigo_legible || conteo.id}_${fecha}.xls`, 'application/vnd.ms-excel')
}

/**
 * Exporta una transferencia confirmada con sus detalles a Excel
 */
export const exportTransferenciaToExcel = (movimiento, detalles, productos, ubicaciones) => {
  const origen = (ubicaciones || []).find(u => u.id === movimiento.origen_id)
  const destino = (ubicaciones || []).find(u => u.id === movimiento.destino_id)
  const headers = ['Producto', 'Especificación', 'Cantidad', 'Observaciones']
  const rows = (detalles || []).map(d => {
    const prod = (productos || []).find(p => p.id === d.producto_id)
    return [
      prod?.nombre || d.producto_id,
      prod?.especificacion || '',
      d.cantidad ?? '',
      d.observaciones || ''
    ]
  })

  const title = `Transferencia ${movimiento.codigo_legible || movimiento.id}`
  const infoRows = [
    ['Código', movimiento.codigo_legible || movimiento.id, '', ''],
    ['Origen', origen?.nombre || movimiento.origen_id, '', ''],
    ['Destino', destino?.nombre || movimiento.destino_id, '', ''],
    ['Estado', movimiento.estado, '', ''],
    ['Tipo', movimiento.tipo_movimiento || 'TRANSFERENCIA', '', ''],
    ['', '', '', '']
  ]

  const html = buildExcelHTML(title, headers, [...infoRows, ...rows])
  const fecha = new Date().toISOString().split('T')[0]
  downloadFile(html, `transferencia_${movimiento.codigo_legible || movimiento.id}_${fecha}.xls`, 'application/vnd.ms-excel')
}

export default {
  arrayToCSV,
  downloadFile,
  exportInventarioToCSV,
  exportProductosToCSV,
  exportMovimientosToCSV,
  exportConteosToCSV,
  exportReporteStockBajoToCSV,
  createPrintableTable,
  exportConteoToExcel,
  exportTransferenciaToExcel
}
