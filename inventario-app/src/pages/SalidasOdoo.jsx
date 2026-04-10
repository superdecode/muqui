import { useEffect, useState } from 'react'
import { useFirestore } from '../hooks/useFirestore'

export function SalidasOdoo() {
  const [salidas, setSalidas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtros, setFiltros] = useState({
    estado: 'PENDIENTE',
    rango: '7days'
  })

  const { query } = useFirestore()

  useEffect(() => {
    cargarSalidas()
  }, [filtros])

  const cargarSalidas = async () => {
    setLoading(true)
    try {
      // Query salidas de Odoo
      let q = query('movimientos', [
        ['origen', '==', 'ODOO_VENTA']
      ])

      // Filtro por estado
      if (filtros.estado) {
        q = query('movimientos', [
          ['origen', '==', 'ODOO_VENTA'],
          ['estado', '==', filtros.estado]
        ])
      }

      const resultado = await q.get()
      const docs = resultado.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      // Ordenar por fecha descendente
      docs.sort((a, b) => {
        const dateA = a.fecha_creacion?.toDate?.() || new Date(0)
        const dateB = b.fecha_creacion?.toDate?.() || new Date(0)
        return dateB - dateA
      })

      setSalidas(docs)
    } catch (error) {
      console.error('Error cargando salidas:', error)
    } finally {
      setLoading(false)
    }
  }

  const marcarComoProcesada = async (salidaId) => {
    try {
      // Aquí integrar actualización en Firestore
      console.log('Marcando salida como procesada:', salidaId)
    } catch (error) {
      console.error('Error actualizando salida:', error)
    }
  }

  const formatearFecha = (timestamp) => {
    if (!timestamp) return '-'
    const date = timestamp.toDate?.() || new Date(timestamp)
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>📦 Salidas Odoo</h1>
      <p>Movimientos de inventario generados automáticamente por ventas en Odoo</p>

      {/* Filtros */}
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
        <label style={{ marginRight: '20px' }}>
          Estado:
          <select
            value={filtros.estado}
            onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
            style={{ marginLeft: '10px', padding: '5px' }}
          >
            <option value="">Todos</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="PROCESADA">Procesada</option>
            <option value="ERROR">Error</option>
          </select>
        </label>
      </div>

      {/* Tabla de salidas */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>Cargando...</div>
      ) : salidas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
          No hay salidas Odoo en este período
        </div>
      ) : (
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginTop: '20px'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#007bff', color: 'white' }}>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #0056b3' }}>Orden</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #0056b3' }}>Producto</th>
              <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #0056b3' }}>Cantidad</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #0056b3' }}>Ubicación</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #0056b3' }}>Fecha</th>
              <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #0056b3' }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {salidas.map((salida) => (
              <tr key={salida.id} style={{ borderBottom: '1px solid #ddd', backgroundColor: salida.estado === 'ERROR' ? '#ffe0e0' : 'white' }}>
                <td style={{ padding: '12px' }}>
                  <strong>#{salida.sale_order_id}</strong>
                </td>
                <td style={{ padding: '12px' }}>
                  <div>{salida.nombre_producto}</div>
                  <small style={{ color: '#666' }}>SKU: {salida.sku || '-'}</small>
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <strong>{salida.cantidad}</strong>
                </td>
                <td style={{ padding: '12px' }}>
                  {salida.ubicacion_id}
                </td>
                <td style={{ padding: '12px' }}>
                  {formatearFecha(salida.fecha_creacion)}
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    backgroundColor: salida.estado === 'PENDIENTE' ? '#fff3cd' : salida.estado === 'PROCESADA' ? '#d4edda' : '#f8d7da',
                    color: salida.estado === 'PENDIENTE' ? '#856404' : salida.estado === 'PROCESADA' ? '#155724' : '#721c24'
                  }}>
                    {salida.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Resumen */}
      {salidas.length > 0 && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#e7f3ff',
          borderLeft: '4px solid #007bff',
          borderRadius: '4px'
        }}>
          <strong>Total de salidas:</strong> {salidas.length}
          <br />
          <strong>Pendientes:</strong> {salidas.filter(s => s.estado === 'PENDIENTE').length}
          <br />
          <strong>Procesadas:</strong> {salidas.filter(s => s.estado === 'PROCESADA').length}
        </div>
      )}
    </div>
  )
}

export default SalidasOdoo
