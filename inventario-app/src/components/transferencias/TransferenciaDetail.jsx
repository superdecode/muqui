import Modal from '../common/Modal'
import Button from '../common/Button'
import { Package, MapPin, Calendar, FileText, CheckCircle } from 'lucide-react'
import { formatDate } from '../../utils/formatters'

export default function TransferenciaDetail({ transferencia, onClose }) {
  return (
    <Modal onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-card max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-ocean p-6 rounded-t-2xl">
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

        <div className="p-6 space-y-6">
          {/* Info General */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Calendar className="text-primary-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-slate-600">Fecha</p>
                <p className="font-semibold text-slate-900">{formatDate(transferencia.fecha)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-slate-600">Estado</p>
                <p className="font-semibold text-slate-900">{transferencia.estado}</p>
              </div>
            </div>
          </div>

          {/* Ubicaciones */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <MapPin size={20} className="text-primary-600" />
              Ubicaciones
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-600 mb-1">Origen</p>
                <p className="font-medium text-slate-900">{transferencia.origen}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Destino</p>
                <p className="font-medium text-slate-900">{transferencia.destino}</p>
              </div>
            </div>
          </div>

          {/* Productos */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Package size={20} className="text-primary-600" />
              Productos ({transferencia.total_productos} items)
            </h3>
            <div className="space-y-3">
              {transferencia.productos?.map((producto, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <Package size={18} className="text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{producto.nombre}</p>
                      <p className="text-sm text-slate-600">Cantidad: {producto.cantidad}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Observaciones */}
          {transferencia.observaciones && (
            <div>
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <FileText size={20} className="text-primary-600" />
                Observaciones
              </h3>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-slate-700">{transferencia.observaciones}</p>
              </div>
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
