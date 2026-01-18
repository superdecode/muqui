import { useState, useEffect } from 'react'
import Button from '../common/Button'
import Input from '../common/Input'
import { X } from 'lucide-react'
import { UNIDADES_MEDIDA, CATEGORIAS_PRODUCTOS, FRECUENCIA_INVENTARIO } from '../../utils/constants'

export default function ProductoForm({ producto = null, onClose, onSave, isLoading = false }) {
  const [formData, setFormData] = useState({
    id: '',
    nombre: '',
    especificacion: '',
    unidad_medida: 'KG',
    stock_minimo: 10,
    frecuencia_inventario_Dias: 30,
    categoria: 'OTROS',
    estado: 'ACTIVO'
  })

  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (producto) {
      setFormData({
        id: producto.id || producto.producto_id || '',
        nombre: producto.nombre || producto.producto || '',
        especificacion: producto.especificacion || '',
        unidad_medida: producto.unidad_medida || 'KG',
        stock_minimo: producto.stock_minimo || producto.stock_minimo_default || 10,
        frecuencia_inventario_Dias: producto.frecuencia_inventario_Dias || producto.frecuencia_inventario_dias || 30,
        categoria: producto.categoria || 'OTROS',
        estado: producto.estado || 'ACTIVO'
      })
    }
  }, [producto])

  const validate = () => {
    const newErrors = {}

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido'
    }

    if (!formData.id.trim()) {
      newErrors.id = 'El ID es requerido'
    }

    if (formData.stock_minimo < 0) {
      newErrors.stock_minimo = 'El stock mínimo debe ser mayor o igual a 0'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    try {
      await onSave(formData)
    } catch (error) {
      console.error('Error guardando producto:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Limpiar error del campo
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-card-hover max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-ocean p-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
          <div className="relative z-10 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">
              {producto ? 'Editar Producto' : 'Nuevo Producto'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors"
            >
              <X className="text-white" size={24} />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ID */}
            <div>
              <Input
                label="ID del Producto"
                name="id"
                value={formData.id}
                onChange={handleChange}
                placeholder="Ej: PROD001"
                disabled={!!producto}
                error={errors.id}
                required
              />
              {producto && (
                <p className="text-xs text-slate-500 mt-1">El ID no se puede modificar</p>
              )}
            </div>

            {/* Nombre */}
            <div>
              <Input
                label="Nombre del Producto"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                placeholder="Ej: Tapioca Premium"
                error={errors.nombre}
                required
              />
            </div>

            {/* Especificación */}
            <div>
              <Input
                label="Especificación"
                name="especificacion"
                value={formData.especificacion}
                onChange={handleChange}
                placeholder="Ej: 3 KG, 900 ML"
              />
              <p className="text-xs text-slate-500 mt-1">Tamaño, peso o presentación</p>
            </div>

            {/* Unidad de Medida */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Unidad de Medida <span className="text-danger-500">*</span>
              </label>
              <select
                name="unidad_medida"
                value={formData.unidad_medida}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                required
              >
                {UNIDADES_MEDIDA.map(unidad => (
                  <option key={unidad} value={unidad}>{unidad}</option>
                ))}
              </select>
            </div>

            {/* Stock Mínimo */}
            <div>
              <Input
                label="Stock Mínimo"
                name="stock_minimo"
                type="number"
                value={formData.stock_minimo}
                onChange={handleChange}
                min="0"
                error={errors.stock_minimo}
                required
              />
              <p className="text-xs text-slate-500 mt-1">Cantidad mínima antes de alertar</p>
            </div>

            {/* Frecuencia de Inventario */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Frecuencia de Inventario <span className="text-danger-500">*</span>
              </label>
              <select
                name="frecuencia_inventario_Dias"
                value={formData.frecuencia_inventario_Dias}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                required
              >
                {Object.entries(FRECUENCIA_INVENTARIO).map(([key, { valor, label }]) => (
                  <option key={key} value={valor}>{label} ({valor} días)</option>
                ))}
              </select>
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Categoría <span className="text-danger-500">*</span>
              </label>
              <select
                name="categoria"
                value={formData.categoria}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                required
              >
                {CATEGORIAS_PRODUCTOS.map(categoria => (
                  <option key={categoria} value={categoria}>{categoria}</option>
                ))}
              </select>
            </div>

            {/* Estado */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Estado <span className="text-danger-500">*</span>
              </label>
              <select
                name="estado"
                value={formData.estado}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                required
              >
                <option value="ACTIVO">ACTIVO</option>
                <option value="INACTIVO">INACTIVO</option>
              </select>
            </div>
          </div>

          {/* Actions */}
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
              {producto ? 'Actualizar Producto' : 'Crear Producto'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
