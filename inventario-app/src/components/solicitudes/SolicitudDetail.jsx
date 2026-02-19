import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import Button from '../common/Button'
import LoadingSpinner from '../common/LoadingSpinner'
import { X, Triangle, Package, Calendar, User, MapPin, ArrowRight, ExternalLink, XCircle, Send, Edit } from 'lucide-react'
import dataService from '../../services/dataService'
import firestoreService from '../../services/firestoreService'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const estadoConfig = {
  iniciada: { label: 'Iniciada', color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
  enviada: { label: 'Enviada', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  recibida: { label: 'Recibida', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  procesada: { label: 'Procesada', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  cancelada: { label: 'Cancelada', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
}

export default function SolicitudDetail({
  solicitud,
  onClose,
  onEditar,
  onEnviar,
  onCancelar,
  onProcesar,
  isOwner = false,
  canProcess = false,
  isLoading = false
}) {
  const navigate = useNavigate()
  const [detalles, setDetalles] = useState([])
  const [loadingDetalles, setLoadingDetalles] = useState(true)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [motivoCancelacion, setMotivoCancelacion] = useState('')
  
  
  
  // Cargar productos para nombres
  const { data: productos = [] } = useQuery({
    queryKey: ['productos'],
    queryFn: () => dataService.getProductos()
  })

  // Cargar detalles de la solicitud
  useEffect(() => {
    const loadDetalles = async () => {
      if (!solicitud?.id) return
      setLoadingDetalles(true)
      try {
        const data = await dataService.getDetalleSolicitudes(solicitud.id)
        setDetalles(data)
      } catch (error) {
        console.error('Error cargando detalles:', error)
        // No cerrar el modal por errores de Firebase
        setDetalles([])
      } finally {
        setLoadingDetalles(false)
      }
    }
    loadDetalles()
  }, [solicitud?.id])

  if (!solicitud) return null

  const estadoNorm = solicitud.estado?.toLowerCase() || 'iniciada'
  const config = estadoConfig[estadoNorm] || estadoConfig.iniciada

  const formatFecha = (fecha) => {
    if (!fecha) return '-'
    try {
      const date = fecha.toDate ? fecha.toDate() : new Date(fecha.seconds ? fecha.seconds * 1000 : fecha)
      return format(date, "d 'de' MMMM, yyyy HH:mm", { locale: es })
    } catch {
      return '-'
    }
  }

  const handleCancelar = () => {
    if (!motivoCancelacion.trim()) return
    onCancelar?.(motivoCancelacion)
    setShowCancelModal(false)
  }

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#004AFF] to-[#002980] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Triangle className="text-white" size={20} />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-white">
                    {solicitud.codigo_legible || 'Solicitud'}
                  </h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
                    {config.label}
                  </span>
                  {/* Link a salida si está procesada - misma fila */}
                  {solicitud.salida_id && (
                    <div className="flex items-center gap-1">
                      <span className="text-white/50 text-sm">→</span>
                      <button
                        onClick={() => {
                          navigate(`/movimientos/salidas?id=${solicitud.salida_id}`)
                        }}
                        className="text-green-400 font-medium hover:text-green-300 underline decoration-2 underline-offset-2 transition-colors flex items-center gap-1"
                        title="Ver movimiento de salida"
                      >
                        <ExternalLink size={14} className="text-green-400" />
                        {solicitud.codigo_salida || 'MV...'}
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-white/70 text-sm">
                  Detalle de solicitud de transferencia
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors"
            >
              <X className="text-white" size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loadingDetalles ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Información general */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                    <Calendar size={16} />
                    <span className="text-xs uppercase font-medium">Fecha Creación</span>
                  </div>
                  <div className="text-slate-700 dark:text-slate-200 font-medium">
                    {formatFecha(solicitud.fecha_creacion)}
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                    <User size={16} />
                    <span className="text-xs uppercase font-medium">Solicitado por</span>
                  </div>
                  <div className="text-slate-700 dark:text-slate-200 font-medium">
                    {solicitud.usuario_creacion_nombre || solicitud.usuario_creacion_id || '-'}
                  </div>
                </div>

                {solicitud.fecha_envio && (
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                      <Send size={16} />
                      <span className="text-xs uppercase font-medium">Fecha Envío</span>
                    </div>
                    <div className="text-slate-700 dark:text-slate-200 font-medium">
                      {formatFecha(solicitud.fecha_envio)}
                    </div>
                  </div>
                )}

                {solicitud.fecha_procesamiento && (
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                      <Calendar size={16} />
                      <span className="text-xs uppercase font-medium">Fecha Procesamiento</span>
                    </div>
                    <div className="text-slate-700 dark:text-slate-200 font-medium">
                      {formatFecha(solicitud.fecha_procesamiento)}
                    </div>
                  </div>
                )}
              </div>

              {/* Ubicaciones */}
              <div className="flex items-center justify-center gap-4 py-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-slate-500 dark:text-slate-400 mb-1">
                    <MapPin size={14} />
                    <span>Desde (Origen)</span>
                  </div>
                  <div className="font-medium text-slate-700 dark:text-slate-200">
                    {solicitud.origen_nombre || solicitud.ubicacion_origen_id}
                  </div>
                </div>
                <ArrowRight className="text-primary-500" size={24} />
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-slate-500 dark:text-slate-400 mb-1">
                    <MapPin size={14} />
                    <span>Hacia (Destino)</span>
                  </div>
                  <div className="font-medium text-slate-700 dark:text-slate-200">
                    {solicitud.destino_nombre || solicitud.ubicacion_destino_id}
                  </div>
                </div>
              </div>

              {/* Productos */}
              <div>
                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Productos solicitados ({detalles.length})
                </h3>
                <div className="border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Producto</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Cantidad Solicitada</th>
                        {estadoNorm === 'procesada' && (
                          <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Cantidad Aprobada</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-600">
                      {detalles.map(detalle => {
                        const producto = productos.find(p => p.id === detalle.producto_id)
                        return (
                          <tr key={detalle.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Package className="text-slate-400" size={16} />
                                <span className="font-medium text-slate-700 dark:text-slate-200">
                                  {producto?.concatenado || producto?.nombre || detalle.producto_id}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center font-medium text-slate-700 dark:text-slate-200">
                              {detalle.cantidad_solicitada}
                            </td>
                            {estadoNorm === 'procesada' && (
                              <td className="px-4 py-3 text-center font-medium text-green-600">
                                {detalle.cantidad_aprobada ?? detalle.cantidad_solicitada}
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Observaciones */}
              {(solicitud.observaciones_creacion || solicitud.observaciones_procesamiento) && (
                <div className="space-y-3">
                  {solicitud.observaciones_creacion && (
                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">
                        Observaciones del solicitante
                      </div>
                      <div className="text-slate-700 dark:text-slate-200">
                        {solicitud.observaciones_creacion}
                      </div>
                    </div>
                  )}
                  {solicitud.observaciones_procesamiento && (
                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">
                        Observaciones del procesamiento
                      </div>
                      <div className="text-slate-700 dark:text-slate-200">
                        {solicitud.observaciones_procesamiento}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Motivo de cancelación */}
              {estadoNorm === 'cancelada' && solicitud.motivo_cancelacion && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
                    <XCircle size={16} />
                    <span className="text-xs font-medium uppercase">Motivo de cancelación</span>
                  </div>
                  <div className="text-red-700 dark:text-red-300">
                    {solicitud.motivo_cancelacion}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer con acciones */}
        <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex flex-wrap gap-3 justify-end">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>

            {/* Acciones para el creador (owner) */}
            {isOwner && estadoNorm === 'iniciada' && (
              <>
                <Button variant="secondary" onClick={onEditar} disabled={isLoading}>
                  <Edit size={16} className="mr-2" />
                  Editar
                </Button>
                <Button variant="outline" onClick={() => setShowCancelModal(true)} disabled={isLoading}>
                  <XCircle size={16} className="mr-2" />
                  Cancelar
                </Button>
                <Button onClick={onEnviar} loading={isLoading}>
                  <Send size={16} className="mr-2" />
                  Enviar Solicitud
                </Button>
              </>
            )}

            {/* Acciones para quien procesa */}
            {canProcess && (estadoNorm === 'enviada' || estadoNorm === 'recibida') && (
              <>
                <Button variant="outline" onClick={() => setShowCancelModal(true)} disabled={isLoading}>
                  <XCircle size={16} className="mr-2" />
                  Rechazar
                </Button>
                <Button onClick={onProcesar} loading={isLoading}>
                  Procesar Solicitud
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal de cancelación */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="bg-red-600 p-4">
              <div className="flex items-center gap-2">
                <XCircle className="text-white" size={20} />
                <h3 className="text-lg font-bold text-white">Cancelar Solicitud</h3>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-slate-600 dark:text-slate-300">
                Por favor indica el motivo de la cancelación.
              </p>
              <textarea
                value={motivoCancelacion}
                onChange={(e) => setMotivoCancelacion(e.target.value)}
                placeholder="Motivo de cancelación..."
                rows={3}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              />
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowCancelModal(false)} className="flex-1">
                  Volver
                </Button>
                <Button
                  variant="danger"
                  onClick={handleCancelar}
                  disabled={!motivoCancelacion.trim()}
                  className="flex-1"
                >
                  Confirmar Cancelación
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
