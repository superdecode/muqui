import { useQuery } from '@tanstack/react-query'
import Modal from '../common/Modal'
import Button from '../common/Button'
import LoadingSpinner from '../common/LoadingSpinner'
import { Package, MapPin, Calendar, User, CheckCircle, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import dataService from '../../services/dataService'

export default function ConteoDetail({ conteo, onClose }) {
  // Cargar detalles del conteo
  const { data: detalles = [], isLoading } = useQuery({
    queryKey: ['conteo-detalle', conteo.id],
    queryFn: () => dataService.getDetalleConteos(conteo.id)
  })

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    try {
      return format(new Date(dateString), "d 'de' MMMM, yyyy", { locale: es })
    } catch {
      return '-'
    }
  }

  const getDiferencia = (cantidad_fisica, cantidad_sistema) => {
    if (cantidad_fisica === null || cantidad_fisica === undefined) return null
    return cantidad_fisica - cantidad_sistema
  }

  return (
    <Modal onClose={onClose}>
      <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-light-blue p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Detalle de Conteo</h2>
              <p className="text-white/90">ID: #{conteo.id}</p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
              conteo.estado === 'PENDIENTE' 
                ? 'bg-yellow-500 text-white' 
                : conteo.estado === 'COMPLETADO'
                ? 'bg-green-500 text-white'
                : 'bg-blue-500 text-white'
            }`}>
              {conteo.estado}
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
                <p className="text-sm text-slate-600">Fecha Programada</p>
                <p className="font-semibold text-slate-900">{formatDate(conteo.fecha_programada)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <MapPin className="text-purple-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-slate-600">Ubicación</p>
                <p className="font-semibold text-slate-900">{conteo.ubicacion_id}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-slate-600">Tipo de Conteo</p>
                <p className="font-semibold text-slate-900">{conteo.tipo_conteo}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <User className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-slate-600">Responsable</p>
                <p className="font-semibold text-slate-900">{conteo.usuario_responsable_id || '-'}</p>
              </div>
            </div>

            {conteo.usuario_ejecutor_id && (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <User className="text-blue-600" size={20} />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Ejecutado por</p>
                  <p className="font-semibold text-slate-900">{conteo.usuario_ejecutor_id}</p>
                </div>
              </div>
            )}
          </div>

          {/* Productos */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Package size={20} className="text-primary-600" />
              Productos Contados {detalles.length > 0 && `(${detalles.length} items)`}
            </h3>

            {isLoading ? (
              <div className="py-8">
                <LoadingSpinner text="Cargando detalles..." />
              </div>
            ) : detalles.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl">
                <Package size={48} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-600">No hay productos contados en este conteo</p>
              </div>
            ) : (
              <div className="space-y-3">
                {detalles.map((detalle, index) => {
                  const diferencia = getDiferencia(detalle.cantidad_fisica, detalle.cantidad_sistema)
                  return (
                    <div key={index} className="border border-slate-200 rounded-xl p-4">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                        <div className="md:col-span-2">
                          <p className="font-medium text-slate-900">{detalle.producto_id}</p>
                          {detalle.observaciones && (
                            <p className="text-xs text-slate-500 mt-1">{detalle.observaciones}</p>
                          )}
                        </div>

                        <div className="text-center">
                          <p className="text-xs text-slate-600 mb-1">Stock Sistema</p>
                          <p className="text-lg font-bold text-slate-900">{detalle.cantidad_sistema || 0}</p>
                        </div>

                        <div className="text-center">
                          <p className="text-xs text-slate-600 mb-1">Stock Físico</p>
                          <p className="text-lg font-bold text-slate-900">
                            {detalle.cantidad_fisica !== null && detalle.cantidad_fisica !== undefined
                              ? detalle.cantidad_fisica
                              : '-'}
                          </p>
                        </div>

                        <div className="text-center">
                          <p className="text-xs text-slate-600 mb-1">Diferencia</p>
                          {diferencia !== null ? (
                            <div className="flex items-center justify-center gap-2">
                              {diferencia === 0 ? (
                                <CheckCircle className="text-green-600" size={20} />
                              ) : (
                                <AlertCircle className="text-yellow-600" size={20} />
                              )}
                              <p className={`text-lg font-bold ${
                                diferencia === 0 ? 'text-green-600' :
                                diferencia > 0 ? 'text-blue-600' : 'text-red-600'
                              }`}>
                                {diferencia > 0 ? '+' : ''}{diferencia}
                              </p>
                            </div>
                          ) : (
                            <p className="text-slate-400">-</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Observaciones */}
          {conteo.observaciones && (
            <div className="bg-slate-50 rounded-xl p-4">
              <h4 className="font-semibold text-slate-900 mb-2">Observaciones</h4>
              <p className="text-slate-700">{conteo.observaciones}</p>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-4 pt-4 border-t border-slate-200">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
