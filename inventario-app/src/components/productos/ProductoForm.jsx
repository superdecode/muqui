import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Button from '../common/Button'
import Input from '../common/Input'
import { X, RefreshCw } from 'lucide-react'
import { FRECUENCIA_INVENTARIO } from '../../utils/constants'
import dataService from '../../services/dataService'


export default function ProductoForm({ producto = null, onClose, onSave, isLoading = false }) {
  const [formData, setFormData] = useState({
    id: '',
    nombre: '',
    especificacion: '',
    unidad_medida: '',
    stock_minimo: 10,
    frecuencia_inventario_Dias: 30,
    categoria: '',
    estado: 'ACTIVO'
  })

  const [errors, setErrors] = useState({})

  // Cargar productos existentes para generar ID automático
  const { data: productosExistentes = [] } = useQuery({
    queryKey: ['productos'],
    queryFn: () => dataService.getProductos(),
    enabled: !producto // Solo cargar si es un nuevo producto
  })

  // Cargar categorías y unidades desde Firestore
  const { data: categoriasDB = [] } = useQuery({
    queryKey: ['config-categorias'],
    queryFn: () => dataService.getCategorias()
  })
  const { data: unidadesDB = [] } = useQuery({
    queryKey: ['config-unidades'],
    queryFn: () => dataService.getUnidadesMedida()
  })

  const categoriasOptions = (categoriasDB || []).filter(i => i.estado !== 'INACTIVO' && i.estado !== 'ELIMINADO').map(i => i.nombre).filter(Boolean)
  const unidadesOptions = (unidadesDB || []).filter(i => i.estado !== 'INACTIVO' && i.estado !== 'ELIMINADO').map(i => i.nombre).filter(Boolean)

  // Función para generar el siguiente ID disponible
  const generarNuevoID = () => {
    if (productosExistentes.length === 0) {
      return 'PROD-0001'
    }

    // Extraer números de IDs con formato PROD-XXXX
    const numeros = productosExistentes
      .map(p => p.id)
      .filter(id => /^PROD-\d+$/.test(id))
      .map(id => parseInt(id.split('-')[1]))
      .filter(num => !isNaN(num))

    // Encontrar el número máximo y sumar 1
    const maxNumero = numeros.length > 0 ? Math.max(...numeros) : 0
    const nuevoNumero = maxNumero + 1

    // Formatear con ceros a la izquierda (4 dígitos)
    return `PROD-${nuevoNumero.toString().padStart(4, '0')}`
  }

  useEffect(() => {
    if (producto) {
      // Modo edición: cargar datos del producto existente
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
    } else if (productosExistentes.length > 0 && !formData.id) {
      // Modo creación: generar ID automáticamente solo si aún no tiene uno
      setFormData(prev => ({
        ...prev,
        id: generarNuevoID()
      }))
    }
  }, [producto, productosExistentes])

  const validate = () => {
    const newErrors = {}

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido'
    }

    if (!formData.id.trim()) {
      newErrors.id = 'Error generando el ID. Por favor intenta nuevamente'
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
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-card-hover max-w-2xl w-full max-h-[90vh] overflow-hidden">
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
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                ID del Producto <span className="text-danger-500">*</span>
              </label>
              <div className="flex gap-2">
                <Input
                  name="id"
                  value={formData.id}
                  onChange={handleChange}
                  placeholder="Generando..."
                  disabled
                  error={errors.id}
                  className="flex-1"
                />
                {!producto && formData.id && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, id: generarNuevoID() }))}
                    className="px-3 py-2 bg-primary-100 hover:bg-primary-200 text-primary-700 rounded-xl transition-colors"
                    title="Regenerar ID"
                  >
                    <RefreshCw size={18} />
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {producto ? 'El ID no se puede modificar' : 'ID generado automáticamente'}
              </p>
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
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Tamaño, peso o presentación</p>
            </div>

            {/* Unidad de Medida */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Unidad de Medida <span className="text-danger-500">*</span>
              </label>
              <select
                name="unidad_medida"
                value={formData.unidad_medida}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                required
              >
                <option value="">Seleccionar unidad...</option>
                {unidadesOptions.map(unidad => (
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
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Cantidad mínima antes de alertar</p>
            </div>

            {/* Frecuencia de Inventario */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Frecuencia de Inventario <span className="text-danger-500">*</span>
              </label>
              <select
                name="frecuencia_inventario_Dias"
                value={formData.frecuencia_inventario_Dias}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                required
              >
                {Object.entries(FRECUENCIA_INVENTARIO).map(([key, { valor, label }]) => (
                  <option key={key} value={valor}>{label} ({valor} días)</option>
                ))}
              </select>
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Categoría <span className="text-danger-500">*</span>
              </label>
              <select
                name="categoria"
                value={formData.categoria}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                required
              >
                <option value="">Seleccionar categoría...</option>
                {categoriasOptions.map(categoria => (
                  <option key={categoria} value={categoria}>{categoria}</option>
                ))}
              </select>
            </div>

            {/* Estado */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Estado <span className="text-danger-500">*</span>
              </label>
              <select
                name="estado"
                value={formData.estado}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
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
