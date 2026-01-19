import { useQuery } from '@tanstack/react-query'
import Button from '../common/Button'
import LoadingSpinner from '../common/LoadingSpinner'
import { Package, MapPin, Calendar, FileText, CheckCircle, User, X } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import dataService from '../../services/dataService'

export default function TransferenciaDetail({ transferencia, onClose, onConfirmar, isConfirmando }) {
  // Cargar detalles del movimiento
  const { data: detalles = [], isLoading } = useQuery({
    queryKey: ['movimiento-detalle', transferencia.id],
    queryFn: () => dataService.getDetalleMovimientos(transferencia.id)
  })

  // Cargar productos para obtener información completa
  const { data: productos = [] } = useQuery({
    queryKey: ['productos'],
    queryFn: () => dataService.getProductos()
  })

  // Cargar usuarios para mostrar nombres reales
  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => dataService.getUsuarios()
  })

  // Función para obtener información completa del producto
  const getProductoInfo = (productoId) => {
    if (!productoId) {
      console.log('TransferenciaDetail: productoId es null/undefined')
      return {
        id: 'N/A',
        nombre: 'Producto no especificado',
        especificacion: '',
        unidad_medida: ''
      }
    }
    
    // Convertir ambos IDs a string para comparación (pueden ser numéricos o strings)
    const productoIdStr = String(productoId)
    const producto = productos.find(p => String(p.id) === productoIdStr)
    
    if (!producto) {
      console.log('TransferenciaDetail - Producto NO encontrado:', {
        buscando: productoIdStr,
        totalProductos: productos.length,
        primeros5ProductosIDs: productos.slice(0, 5).map(p => ({ id: p.id, tipo: typeof p.id })),
        detalles: detalles.length,
        primerDetalle: detalles[0]
      })
    }
    
    return producto || {
      id: productoId,
      nombre: `Producto ${productoId}`,
      especificacion: 'No disponible',
      unidad_medida: 'N/A'
    }
  }

  // Función para obtener nombre del usuario
  const getUsuarioNombre = (usuarioId) => {
    if (!usuarioId) return '-'
    const usuario = usuarios.find(u => u.id === usuarioId)
    return usuario ? `${usuario.nombre} - ${usuario.rol}` : usuarioId
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    try {
      return format(new Date(dateString), "d 'de' MMMM, yyyy", { locale: es })
    } catch {
      return '-'
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-card-hover max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-ocean p-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Detalle de Movimiento</h2>
                <p className="text-white/90 mt-1">ID: #{transferencia.id}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  transferencia.estado === 'PENDIENTE' 
                    ? 'bg-yellow-500 text-white' 
                    : 'bg-green-500 text-white'
                }`}>
                  {transferencia.estado}
                </span>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <X className="text-white" size={24} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] space-y-6">
          {/* Info General */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Calendar className="text-primary-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-slate-600">Fecha Creación</p>
                <p className="font-semibold text-slate-900">{formatDate(transferencia.fecha_creacion)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <User className="text-primary-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-slate-600">Creado por</p>
                <p className="font-semibold text-slate-900">{getUsuarioNombre(transferencia.usuario_creacion_id)}</p>
              </div>
            </div>

            {transferencia.fecha_confirmacion && (
              <>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="text-green-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Fecha Confirmación</p>
                    <p className="font-semibold text-slate-900">{formatDate(transferencia.fecha_confirmacion)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <User className="text-green-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Confirmado por</p>
                    <p className="font-semibold text-slate-900">{getUsuarioNombre(transferencia.usuario_confirmacion_id)}</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Ubicaciones */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <MapPin size={20} className="text-primary-600" />
              Movimiento
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-600 mb-1">Origen</p>
                <p className="font-medium text-slate-900">{transferencia.origen_id}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Destino</p>
                <p className="font-medium text-slate-900">{transferencia.destino_id}</p>
              </div>
            </div>
          </div>

          {/* Productos */}
          <div>
            <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Package size={24} className="text-primary-600" />
              Productos Transferidos {detalles.length > 0 && `(${detalles.length} items)`}
            </h3>

            {isLoading ? (
              <div className="py-12">
                <LoadingSpinner text="Cargando detalles..." />
              </div>
            ) : detalles.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl">
                <Package size={64} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-600 text-lg">No hay productos en este movimiento</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">ID Producto</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Nombre</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Especificación</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Unidad de Medida</th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">Cantidad</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {detalles.map((detalle, index) => {
                        const productoInfo = getProductoInfo(detalle.producto_id)
                        return (
                          <tr key={index} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="p-2 bg-primary-100 rounded-lg">
                                  <Package size={16} className="text-primary-600" />
                                </div>
                                <span className="font-mono text-sm font-medium text-slate-900">
                                  {productoInfo.id}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-semibold text-slate-900">{productoInfo.nombre}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-slate-700">
                                {productoInfo.especificacion || <span className="text-slate-400 italic">Sin especificación</span>}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                {productoInfo.unidad_medida || 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-lg font-bold text-primary-600">
                                {detalle.cantidad}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Observaciones */}
          {(transferencia.observaciones_creacion || transferencia.observaciones_confirmacion) && (
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <FileText size={20} className="text-primary-600" />
                Observaciones
              </h3>
              {transferencia.observaciones_creacion && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 mb-1">Creación</p>
                  <p className="text-slate-700">{transferencia.observaciones_creacion}</p>
                </div>
              )}
              {transferencia.observaciones_confirmacion && (
                <div className="bg-green-50 rounded-xl p-4">
                  <p className="text-xs text-green-600 mb-1">Confirmación</p>
                  <p className="text-slate-700">{transferencia.observaciones_confirmacion}</p>
                </div>
              )}
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-4 pt-4 border-t border-slate-200">
            <Button variant="ghost" onClick={onClose} className="flex-1">
              Cerrar
            </Button>
            {onConfirmar && transferencia.estado === 'PENDIENTE' && (
              <Button
                variant="success"
                onClick={onConfirmar}
                loading={isConfirmando}
                className="flex-1"
              >
                {isConfirmando ? 'Confirmando...' : 'Confirmar Recepción'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
