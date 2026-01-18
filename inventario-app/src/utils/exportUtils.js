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

export default {
  arrayToCSV,
  downloadFile,
  exportInventarioToCSV,
  exportProductosToCSV,
  exportMovimientosToCSV,
  exportConteosToCSV,
  exportReporteStockBajoToCSV,
  createPrintableTable
}
