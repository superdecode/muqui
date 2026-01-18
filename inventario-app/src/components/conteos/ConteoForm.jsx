import { useState } from 'react'
import Button from '../common/Button'
import Modal from '../common/Modal'
import Alert from '../common/Alert'
import { Calendar, MapPin, AlertCircle } from 'lucide-react'

export default function ConteoForm({ onClose, onSave, isLoading = false }) {
  const [formData, setFormData] = useState({
    fecha_programada: new Date().toISOString().split('T')[0],
    ubicacion_id: '',
    tipo_conteo: 'DIARIO',
    observaciones: ''
  })
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.ubicacion_id) {
      setError('Por favor selecciona una ubicación')
      return
    }

    try {
      await onSave({
        ...formData,
        tipo_ubicacion: 'BODEGA'
      })
    } catch (err) {
      setError('Error al programar el conteo. Por favor intenta nuevamente.')
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-ocean p-6 rounded-t-2xl">
          <h2 className="text-2xl font-bold text-white">Programar Conteo</h2>
          <p className="text-white/90">Crea un nuevo conteo de inventario</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Alert */}
          {error && (
            <Alert type="error" className="mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle size={18} />
                {error}
              </div>
            </Alert>
          )}

          {/* Fecha */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Calendar size={16} className="inline mr-2" />
              Fecha Programada
            </label>
            <input
              type="date"
              value={formData.fecha_programada}
              onChange={(e) => setFormData({ ...formData, fecha_programada: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          {/* Ubicación */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <MapPin size={16} className="inline mr-2" />
              Ubicación
            </label>
            <select
              value={formData.ubicacion_id}
              onChange={(e) => setFormData({ ...formData, ubicacion_id: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value="">Seleccionar ubicación</option>
              <option value="BOD001">Bodega Principal</option>
              <option value="PV001">Punto de Venta 1</option>
              <option value="PV002">Punto de Venta 2</option>
              <option value="TDA001">Tienda Centro</option>
            </select>
          </div>

          {/* Tipo de Conteo */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Tipo de Conteo
            </label>
            <select
              value={formData.tipo_conteo}
              onChange={(e) => setFormData({ ...formData, tipo_conteo: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="DIARIO">Diario</option>
              <option value="SEMANAL">Semanal</option>
              <option value="MENSUAL">Mensual</option>
              <option value="EXTRAORDINARIO">Extraordinario</option>
            </select>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Observaciones (Opcional)
            </label>
            <textarea
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              placeholder="Notas adicionales..."
              rows={3}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-4 pt-4 border-t border-slate-200">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={isLoading}>
              {isLoading ? 'Programando...' : 'Programar Conteo'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
