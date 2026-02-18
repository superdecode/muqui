import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Button from '../common/Button'
import Alert from '../common/Alert'
import LoadingSpinner from '../common/LoadingSpinner'
import { Calendar, MapPin, AlertCircle, X } from 'lucide-react'
import dataService from '../../services/dataService'
import { useAuthStore } from '../../stores/authStore'

export default function ConteoForm({ onClose, onSave, isLoading = false }) {
  const { user } = useAuthStore()
  const [formData, setFormData] = useState({
    fecha_programada: new Date().toISOString().split('T')[0],
    ubicacion_id: '',
    tipo_conteo: 'DIARIO',
    observaciones: ''
  })
  const [error, setError] = useState('')

  // Cargar ubicaciones desde la base de datos
  const { data: todasUbicaciones = [], isLoading: isLoadingUbicaciones } = useQuery({
    queryKey: ['ubicaciones'],
    queryFn: () => dataService.getUbicaciones()
  })

  // Filtrar ubicaciones asignadas al usuario
  const ubicaciones = todasUbicaciones.filter(ubicacion => {
    if (!user?.ubicaciones_asignadas) return false
    
    let ubicacionIds = []
    if (typeof user.ubicaciones_asignadas === 'string') {
      try {
        ubicacionIds = JSON.parse(user.ubicaciones_asignadas)
      } catch {
        ubicacionIds = user.ubicaciones_asignadas.split(',').map(id => id.trim().replace(/"/g, ''))
      }
    } else if (Array.isArray(user.ubicaciones_asignadas)) {
      ubicacionIds = user.ubicaciones_asignadas
    }
    
    return ubicacionIds.includes(ubicacion.id)
  })

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
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-card-hover max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-ocean p-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Programar Conteo</h2>
              <p className="text-white/90">Crea un nuevo conteo de inventario</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors"
            >
              <X className="text-white" size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] space-y-6">
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
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <Calendar size={16} className="inline mr-2" />
              Fecha Programada
            </label>
            <input
              type="date"
              value={formData.fecha_programada}
              onChange={(e) => setFormData({ ...formData, fecha_programada: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          {/* Ubicación */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <MapPin size={16} className="inline mr-2" />
              Ubicación
            </label>
            {isLoadingUbicaciones ? (
              <div className="py-4">
                <LoadingSpinner text="Cargando ubicaciones..." />
              </div>
            ) : (
              <select
                value={formData.ubicacion_id}
                onChange={(e) => setFormData({ ...formData, ubicacion_id: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              >
                <option value="">Seleccionar ubicación</option>
                {ubicaciones.map(ubicacion => (
                  <option key={ubicacion.id} value={ubicacion.id}>
                    {ubicacion.nombre} ({ubicacion.tipo})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Tipo de Conteo */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Tipo de Conteo
            </label>
            <select
              value={formData.tipo_conteo}
              onChange={(e) => setFormData({ ...formData, tipo_conteo: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="DIARIO">Diario</option>
              <option value="SEMANAL">Semanal</option>
              <option value="MENSUAL">Mensual</option>
              <option value="EXTRAORDINARIO">Extraordinario</option>
            </select>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Observaciones (Opcional)
            </label>
            <textarea
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              placeholder="Notas adicionales..."
              rows={3}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Botones */}
          <div className="flex gap-4 mt-8">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isLoading}
              className="flex-1"
            >
              {isLoading ? 'Programando...' : 'Programar Conteo'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
