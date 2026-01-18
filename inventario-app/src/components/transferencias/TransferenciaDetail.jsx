import { useQuery } from '@tanstack/react-query'
import Modal from '../common/Modal'
import Button from '../common/Button'
import LoadingSpinner from '../common/LoadingSpinner'
import { Package, MapPin, Calendar, FileText, CheckCircle, User } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import dataService from '../../services/dataService'

export default function TransferenciaDetail({ transferencia, onClose, onConfirmar, isConfirmando }) {
  // Cargar detalles del movimiento
  const { data: detalles = [], isLoading } = useQuery({
    queryKey: ['movimiento-detalle', transferencia.id],
    queryFn: () => dataService.getDetalleMovimientos(transferencia.id)
  })

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    try {
      return format(new Date(dateString), "d 'de' MMMM, yyyy", { locale: es })
    } catch {
      return '-'
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-light-blue p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Detalle de Transferencia</h2>
              <p className="text-white/90">ID: #{transferencia.id}</p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
              transferencia.estado === 'PENDIENTE' 
                ? 'bg-yellow-500 text-white' 
                : 'bg-green-500 text-white'
            }`}>
              {transferencia.estado}
            </span>
          </div>
        </div>

        <div className="p-6 space-y-6 bg-white rounded-b-2xl">
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
                <p className="font-semibold text-slate-900">{transferencia.usuario_creacion_id || '-'}</p>
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
                    <p className="font-semibold text-slate-900">{transferencia.usuario_confirmacion_id || '-'}</p>
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
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Package size={20} className="text-primary-600" />
              Productos {detalles.length > 0 && `(${detalles.length} items)`}
            </h3>

            {isLoading ? (
              <div className="py-8">
                <LoadingSpinner text="Cargando detalles..." />
              </div>
            ) : detalles.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl">
                <Package size={48} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-600">No hay productos en este movimiento</p>
              </div>
            ) : (
              <div className="space-y-3">
                {detalles.map((detalle, index) => (
                  <div key={index} className="p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 bg-primary-100 rounded-lg">
                          <Package size={18} className="text-primary-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{detalle.producto_nombre || detalle.producto_id}</p>
                          {detalle.producto_especificacion && (
                            <p className="text-sm text-slate-600">{detalle.producto_especificacion}</p>
                          )}
                          <div className="flex gap-4 mt-2">
                            <span className="text-sm text-slate-600">
                              Cantidad: <span className="font-semibold text-slate-900">{detalle.cantidad}</span>
                            </span>
                            {detalle.unidad_medida && (
                              <span className="text-sm text-slate-600">
                                Unidad: <span className="font-semibold text-slate-900">{detalle.unidad_medida}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            {onConfirmar && transferencia.estado === 'PENDIENTE' && (
              <Button
                variant="success"
                onClick={onConfirmar}
                loading={isConfirmando}
              >
                {isConfirmando ? 'Confirmando...' : 'Confirmar Recepción'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
