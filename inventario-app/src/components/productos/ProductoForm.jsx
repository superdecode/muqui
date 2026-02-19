import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Button from '../common/Button'
import Input from '../common/Input'
import { X, RefreshCw, MapPin, Building2 } from 'lucide-react'
import dataService from '../../services/dataService'
import { useAuthStore } from '../../stores/authStore'
import { getUserAllowedUbicacionIds, getUserAllowedEmpresaIds } from '../../utils/userFilters'


export default function ProductoForm({ producto = null, onClose, onSave, isLoading = false }) {
  const { user } = useAuthStore()

  const initialFormData = {
    nombre: '',
    especificacion: '',
    unidad_medida: '',
    stock_minimo: 10,
    frecuencia_inventario: '',
    categoria: '',
    estado: 'ACTIVO',
    empresas_permitidas: [],
    ubicaciones_permitidas: []
  }

  const [formData, setFormData] = useState({
    id: '',
    ...initialFormData
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

  // Cargar empresas y ubicaciones para el selector
  const { data: empresas = [] } = useQuery({
    queryKey: ['empresas'],
    queryFn: () => dataService.getEmpresas()
  })
  const { data: ubicaciones = [] } = useQuery({
    queryKey: ['ubicaciones'],
    queryFn: () => dataService.getUbicaciones()
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
      const nuevoFormData = {
        id: producto.id || '',
        nombre: producto.nombre || '',
        especificacion: producto.especificacion || '',
        unidad_medida: producto.unidad_medida || 'KG',
        stock_minimo: producto.stock_minimo || producto.stock_minimo_default || 10,
        frecuencia_inventario: (producto.frecuencia_inventario || '').toLowerCase(),
        categoria: producto.categoria || 'OTROS',
        estado: producto.estado || 'ACTIVO',
        empresas_permitidas: producto.empresas_permitidas || [],
        ubicaciones_permitidas: producto.ubicaciones_permitidas || []
      }
      setFormData(nuevoFormData)
    } else if (productosExistentes.length > 0 && !formData.id) {
      // Modo creación: generar ID y poblar TODAS las ubicaciones activas
            const todasUbicacionesIds = ubicaciones
        .filter(u => u.estado !== 'INACTIVO' && u.estado !== 'ELIMINADO')
        .map(u => u.id)
      setFormData(prev => ({
        ...prev,
        id: generarNuevoID(),
        ubicaciones_permitidas: todasUbicacionesIds
      }))
    }
  }, [producto, productosExistentes, ubicaciones])

  
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
      const result = await onSave(formData)
    } catch (error) {
      // Manejar error
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

  // Manejadores para empresas y ubicaciones
  const toggleEmpresa = (empresaId) => {
    setFormData(prev => {
      const nuevasEmpresas = prev.empresas_permitidas.includes(empresaId)
        ? prev.empresas_permitidas.filter(id => id !== empresaId)
        : [...prev.empresas_permitidas, empresaId]
      
      // Limpiar ubicaciones que no pertenecen a las empresas seleccionadas
      const empresasIds = nuevasEmpresas
      const ubicacionesFiltradas = prev.ubicaciones_permitidas.filter(ubicId => {
        const ubicacion = ubicaciones.find(u => u.id === ubicId)
        return ubicacion && empresasIds.includes(ubicacion.empresa_id)
      })
      
      return {
        ...prev,
        empresas_permitidas: nuevasEmpresas,
        ubicaciones_permitidas: ubicacionesFiltradas
      }
    })
  }

  const toggleUbicacion = (ubicacionId) => {
    setFormData(prev => ({
      ...prev,
      ubicaciones_permitidas: prev.ubicaciones_permitidas.includes(ubicacionId)
        ? prev.ubicaciones_permitidas.filter(id => id !== ubicacionId)
        : [...prev.ubicaciones_permitidas, ubicacionId]
    }))
  }

  const toggleAllEmpresas = () => {
    setFormData(prev => {
      const allEmpIds = empresasFiltradas.map(e => e.id)
      const allSelected = allEmpIds.every(id => prev.empresas_permitidas.includes(id))
      const newEmpresas = allSelected ? [] : allEmpIds
      
      // Si seleccionamos todas las empresas, también seleccionamos todas las ubicaciones
      const newUbicaciones = allSelected ? [] : ubicaciones.filter(u => 
        u.estado !== 'INACTIVO' && allEmpIds.includes(u.empresa_id)
      ).map(u => u.id)
      
      return {
        ...prev,
        empresas_permitidas: newEmpresas,
        ubicaciones_permitidas: newUbicaciones
      }
    })
  }

  const toggleAllUbicaciones = () => {
    setFormData(prev => {
      const allUbIds = ubicacionesFiltradas.filter(u => u.estado !== 'INACTIVO').map(u => u.id)
      const allSelected = allUbIds.every(id => prev.ubicaciones_permitidas.includes(id))
      return {
        ...prev,
        ubicaciones_permitidas: allSelected ? [] : allUbIds
      }
    })
  }

  // Empresas visibles según permisos del usuario
  const empresasFiltradas = useMemo(() => {
    const userEmpresaIds = getUserAllowedEmpresaIds(user)
    if (userEmpresaIds.length === 0) return empresas.filter(e => e.estado !== 'INACTIVO')
    return empresas.filter(e => e.estado !== 'INACTIVO' && userEmpresaIds.includes(e.id))
  }, [empresas, user])

  // Obtener ubicaciones filtradas por empresas seleccionadas y permisos del usuario
  const ubicacionesFiltradas = useMemo(() => {
    let filtradas = ubicaciones.filter(u =>
      formData.empresas_permitidas.length === 0 ||
      formData.empresas_permitidas.includes(u.empresa_id)
    )
    // Limitar a las ubicaciones asignadas al usuario (aplica en crear y editar)
    const userUbicIds = getUserAllowedUbicacionIds(user, ubicaciones, empresas)
    if (userUbicIds.length > 0) {
      filtradas = filtradas.filter(u => userUbicIds.includes(u.id))
    }
    return filtradas
  }, [ubicaciones, empresas, formData.empresas_permitidas, user])

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

            
            {/* Tipo de Conteo */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Tipo de Conteo
              </label>
              <select
                name="frecuencia_inventario"
                value={formData.frecuencia_inventario}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              >
                <option value="">Seleccionar tipo...</option>
                <option value="diario">Diario</option>
                <option value="semanal">Semanal</option>
                <option value="quincenal">Quincenal</option>
                <option value="mensual">Mensual</option>
                <option value="todos">Todos los conteos</option>
              </select>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Tipo de conteo en el que se incluye este producto</p>
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

          {/* SECCIÓN DE UBICACIONES */}
          <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-6">
              <MapPin size={20} className="text-primary-600" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Ubicaciones Permitidas
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Empresas */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-slate-900 dark:text-slate-100">Empresas</label>
                  <button 
                    type="button"
                    onClick={() => toggleAllEmpresas()}
                    className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                  >
                    {formData.empresas_permitidas.length === empresasFiltradas.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                  </button>
                </div>
                <div className="max-h-36 overflow-y-auto p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  {empresasFiltradas.map(emp => (
                    <label key={emp.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white dark:hover:bg-slate-600 p-1.5 rounded-lg">
                      <input 
                        type="checkbox" 
                        checked={formData.empresas_permitidas.includes(emp.id)} 
                        onChange={() => toggleEmpresa(emp.id)} 
                        className="rounded border-slate-300 text-primary-600" 
                      />
                      <span className="text-slate-700 dark:text-slate-300">{emp.nombre}</span>
                    </label>
                  ))}
                  {empresasFiltradas.length === 0 && 
                    <p className="text-xs text-slate-400">No hay empresas</p>
                  }
                </div>
              </div>

              {/* Ubicaciones */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-slate-900 dark:text-slate-100">Ubicaciones</label>
                  <button 
                    type="button"
                    onClick={() => toggleAllUbicaciones()}
                    className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors"
                  >
                    {formData.ubicaciones_permitidas.length === ubicacionesFiltradas.filter(u => u.estado !== 'INACTIVO').length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                  </button>
                </div>
                <div className="max-h-36 overflow-y-auto p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  {ubicacionesFiltradas.filter(u => u.estado !== 'INACTIVO').map(ub => { 
                    const emp = empresas.find(e => e.id === ub.empresa_id)
                    return (
                      <label key={ub.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-white dark:hover:bg-slate-600 p-1.5 rounded-lg">
                        <input 
                          type="checkbox" 
                          checked={formData.ubicaciones_permitidas.includes(ub.id)} 
                          onChange={() => toggleUbicacion(ub.id)} 
                          className="rounded border-slate-300 text-primary-600" 
                        />
                        <span className="text-slate-700 dark:text-slate-300">{ub.nombre}</span>
                        {emp && <span className="text-xs text-slate-400 ml-auto">({emp.nombre})</span>}
                      </label>
                    )
                  })}
                  {ubicacionesFiltradas.filter(u => u.estado !== 'INACTIVO').length === 0 && 
                    <p className="text-xs text-slate-400">Selecciona empresas primero</p>
                  }
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>Nota:</strong> Si no seleccionas ninguna empresa o ubicación, el producto estará disponible en todas las ubicaciones.
              </p>
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
