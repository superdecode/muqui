import Modal from '../common/Modal'
import Button from '../common/Button'
import { Package, MapPin, Calendar, User, CheckCircle, AlertCircle } from 'lucide-react'
import { formatDate } from '../../utils/formatters'

export default function ConteoDetail({ conteo, onClose }) {
  const getDiferencia = (producto) => {
    if (producto.stock_fisico === null || producto.stock_fisico === undefined) return null
    return producto.stock_fisico - producto.stock_sistema
  }

  return (
    <Modal onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-card max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-ocean p-6 rounded-t-2xl">
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

        <div className="p-6 space-y-6">
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
                <p className="font-semibold text-slate-900">{conteo.ubicacion}</p>
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
                <p className="font-semibold text-slate-900">{conteo.responsable}</p>
              </div>
            </div>
          </div>

          {/* Productos */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Package size={20} className="text-primary-600" />
              Productos Contados
            </h3>
            <div className="space-y-3">
              {conteo.productos?.map((producto, index) => {
                const diferencia = getDiferencia(producto)
                return (
                  <div key={index} className="border border-slate-200 rounded-xl p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                      <div className="md:col-span-1">
                        <p className="font-medium text-slate-900">{producto.nombre}</p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-xs text-slate-600 mb-1">Stock Sistema</p>
                        <p className="text-lg font-bold text-slate-900">{producto.stock_sistema}</p>
                      </div>

                      <div className="text-center">
                        <p className="text-xs text-slate-600 mb-1">Stock Físico</p>
                        <p className="text-lg font-bold text-slate-900">
                          {producto.stock_fisico !== null && producto.stock_fisico !== undefined 
                            ? producto.stock_fisico 
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
                          <p className="text-slate-400">Pendiente</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
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
