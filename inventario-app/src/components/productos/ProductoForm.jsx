import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Button from '../common/Button'
import Input from '../common/Input'
import StatusToggle from '../common/StatusToggle'
import { X, RefreshCw, MapPin, Package, Archive, AlertTriangle, Info, Trash2, Save, Plus, Tag, Box, BookOpen } from 'lucide-react'
import dataService from '../../services/dataService'
import { useAuthStore } from '../../stores/authStore'
import { getUserAllowedUbicacionIds, getUserAllowedEmpresaIds } from '../../utils/userFilters'
import ConfirmModal from '../common/ConfirmModal'


export default function ProductoForm({ producto = null, onClose, onSave, isLoading = false }) {
  const { user } = useAuthStore()

  const initialFormData = {
    nombre: '',
    especificacion: '',
    unidad_medida: '',
    purchase_unit_id: '',
    purchase_unit_qty: '',
    costo_unidad: 0,
    stock_minimo: 10,
    frecuencia_inventario: [],
    sin_alerta: false,
    categoria: '',
    etiquetas: [],
    estado: 'ACTIVO',
    inventariable: true,
    codigo_legible: '',
    empresas_permitidas: [],
    ubicaciones_permitidas: []
  }

  const [formData, setFormData] = useState({
    id: '',
    ...initialFormData
  })

  const [errors, setErrors] = useState({})
  const [showConfirmInventariable, setShowConfirmInventariable] = useState(false)

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

  const categoriasOptions = [...new Set((categoriasDB || []).filter(i => i.estado !== 'INACTIVO' && i.estado !== 'ELIMINADO').map(i => i.nombre).filter(Boolean))]
  const unidadesOptions = [...new Set((unidadesDB || []).filter(i => i.estado !== 'INACTIVO' && i.estado !== 'ELIMINADO').map(i => i.nombre).filter(Boolean))]

  // Función para generar el siguiente ID disponible
  const generarNuevoID = () => {
    if (productosExistentes.length === 0) {
      return 'PROD1'
    }

    // Extraer números de IDs con formato PRODXXXX o PROD-XXXX
    const numeros = productosExistentes
      .map(p => p.codigo_legible || p.id)
      .filter(id => /^PROD-?\d+$/.test(id))
      .map(id => {
        const match = id.match(/\d+/)
        return match ? parseInt(match[0]) : 0
      })
      .filter(num => !isNaN(num))

    // Encontrar el número máximo y sumar 1
    const maxNumero = numeros.length > 0 ? Math.max(...numeros) : 0
    const nuevoNumero = maxNumero + 1

    return `PROD${nuevoNumero}`
  }

  useEffect(() => {
    if (producto) {
      // Modo edición: cargar datos del producto existente
      const nuevoFormData = {
        id: producto.id || '',
        nombre: producto.nombre || '',
        especificacion: producto.especificacion || '',
        unidad_medida: producto.unidad_medida || 'KG',
        purchase_unit_id: producto.purchase_unit_id || '',
        purchase_unit_qty: producto.purchase_unit_qty || '',
        costo_unidad: producto.costo_unidad || 0,
        stock_minimo: producto.stock_minimo || producto.stock_minimo_default || 10,
        frecuencia_inventario: (() => {
          const rawFrecuencia = producto.frecuencia_inventario
          if (Array.isArray(rawFrecuencia)) return rawFrecuencia
          if (typeof rawFrecuencia === 'string' && rawFrecuencia.trim()) {
            return rawFrecuencia.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
          }
          return []
        })(),
        sin_alerta: producto.sin_alerta === true,
        categoria: producto.categoria || 'OTROS',
        etiquetas: Array.isArray(producto.etiquetas) ? producto.etiquetas : [],
        estado: producto.estado || 'ACTIVO',
        inventariable: producto.inventariable !== false,
        codigo_legible: producto.codigo_legible || '',
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

  // Helpers
  const isEditing = !!producto
  const isNoInventariable = isEditing && producto.inventariable === false

  // ─── SELECT STYLES ───────────────────────────────────────────────────────────
  const selectCls = 'w-full px-4 py-3 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-sm shadow-sm'

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {/* wider: max-w-4xl */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col">

        {/* ── HEADER BANNER ─────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 px-8 py-6 flex-shrink-0">
          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none" />
          <div className="absolute bottom-0 left-16 w-32 h-32 bg-white/10 rounded-full blur-2xl -mb-16 pointer-events-none" />

          <div className="relative z-10 flex items-start justify-between gap-4">
            {/* Left: icon + title + badges */}
            <div className="flex items-center gap-4">
              {/* Icon circle */}
              <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm ring-1 ring-white/30">
                <Package size={22} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white leading-tight">
                  {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
                </h2>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {/* ID badge */}
                  {(formData.codigo_legible || formData.id) && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white/20 text-white/90 text-xs font-mono rounded-full backdrop-blur-sm ring-1 ring-white/20">
                      {formData.codigo_legible || formData.id}
                    </span>
                  )}
                  {/* No Inventariable badge — solo en edición cuando el producto no es inventariable */}
                  {isEditing && isNoInventariable && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-900/50 text-blue-200 text-xs font-semibold rounded-full ring-1 ring-blue-400/40 backdrop-blur-sm">
                      <Archive size={11} />
                      No Inventariable
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Close btn */}
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2 hover:bg-white/20 rounded-xl transition-colors mt-0.5"
            >
              <X className="text-white" size={22} />
            </button>
          </div>
        </div>

        {/* ── FORM BODY ──────────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <div className="px-8 py-7 space-y-7 flex-1 overflow-y-auto">

            {/* ── ROW 1: ID + Nombre ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* ID */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
                  ID del Producto <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    name="id"
                    value={formData.codigo_legible || formData.id}
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
                      className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl transition-colors"
                      title="Regenerar ID"
                    >
                      <RefreshCw size={16} />
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {producto ? 'El ID no se puede modificar' : 'Generado automáticamente'}
                </p>
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
                  Nombre del Producto <span className="text-red-500">*</span>
                </label>
                <input
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  placeholder="Ej: Tapioca Premium"
                  required
                  className={`w-full px-4 py-3 border rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-sm shadow-sm placeholder:text-slate-400 ${errors.nombre ? 'border-red-400' : 'border-slate-200 dark:border-slate-600'}`}
                />
                {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre}</p>}
              </div>
            </div>

            {/* ── ROW 2: Unidad + Cantidad ──────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Unidad de Medida */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
                  Unidad de Medida <span className="text-red-500">*</span>
                </label>
                <select
                  name="purchase_unit_id"
                  value={formData.purchase_unit_id || ''}
                  onChange={e => {
                    const unitId = e.target.value
                    const unit = (unidadesDB || []).find(u => u.id === unitId)
                    
                    let symbol = unit?.abreviatura || ''
                    if (!symbol && unit?.nombre) {
                      symbol = unit.nombre.toLowerCase()
                      if (parseFloat(formData.purchase_unit_qty) > 1 && !symbol.endsWith('s')) {
                        symbol += 's'
                      }
                    }

                    setFormData(prev => ({
                      ...prev,
                      purchase_unit_id: unitId,
                      unidad_medida: unit ? unit.nombre : prev.unidad_medida,
                      especificacion: formData.purchase_unit_qty && unit ? `${formData.purchase_unit_qty} ${symbol}`.trim() : prev.especificacion
                    }))
                  }}
                  className={selectCls}
                  required
                >
                  <option value="">Seleccionar unidad...</option>
                  {(unidadesDB || []).filter(u => (u.estado !== 'INACTIVO' && u.estado !== 'ELIMINADO') || u.id === formData.purchase_unit_id).map(u => (
                    <option key={u.id} value={u.id}>{u.nombre} ({u.abreviatura || ''})</option>
                  ))}
                </select>
              </div>

              {/* Cantidad por unidad */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
                  {formData.purchase_unit_id
                    ? `Cantidad (ej: 3 ${((unidadesDB || []).find(u => u.id === formData.purchase_unit_id)?.abreviatura || '').trim()})`
                    : 'Cantidad por unidad'}
                </label>
                <input
                  name="purchase_unit_qty"
                  type="number"
                  value={formData.purchase_unit_qty}
                  onChange={e => {
                    const qty = e.target.value
                    const unit = (unidadesDB || []).find(u => u.id === formData.purchase_unit_id)
                    let symbol = unit?.abreviatura || ''
                    if (!symbol && unit?.nombre) {
                      symbol = unit.nombre.toLowerCase()
                      if (parseFloat(qty) > 1 && !symbol.endsWith('s')) symbol += 's'
                    }
                    setFormData(prev => ({
                      ...prev,
                      purchase_unit_qty: qty,
                      especificacion: qty ? `${qty} ${symbol}`.trim() : prev.especificacion
                    }))
                  }}
                  min="0"
                  step="any"
                  placeholder="Ej: 3"
                  className={selectCls}
                />
                <p className="text-xs text-slate-400 mt-1">
                  {formData.purchase_unit_qty && formData.purchase_unit_id
                    ? `Etiqueta: ${formData.nombre || 'Producto'} ${formData.purchase_unit_qty} ${((unidadesDB || []).find(u => u.id === formData.purchase_unit_id)?.abreviatura || '').trim()}`
                    : 'Tamaño, peso o presentación del producto'}
                </p>
              </div>
            </div>

            {/* ── ROW 3: Costo + Stock mínimo ──────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Costo por unidad */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
                  Costo por Unidad
                </label>
                <input
                  name="costo_unidad"
                  type="text"
                  value={formData.costo_formateado !== undefined ? formData.costo_formateado : (formData.costo_unidad ? Number(formData.costo_unidad).toLocaleString('es-CO', { maximumFractionDigits: 2 }) : '')}
                  onChange={e => {
                    let rawValue = e.target.value.replace(/[^\d,]/g, '')
                    const parts = rawValue.split(',')
                    let intPart = parts[0].replace(/\D/g, '')
                    if (intPart) intPart = Number(intPart).toLocaleString('es-CO')
                    const formatted = parts.length > 1 ? `${intPart},${parts.slice(1).join('').substring(0, 2)}` : intPart
                    setFormData(prev => ({
                      ...prev,
                      costo_unidad: parseFloat(rawValue.replace(',', '.')) || '',
                      costo_formateado: formatted
                    }))
                  }}
                  placeholder="Ej: 10.000"
                  className={selectCls}
                />
                <p className="text-xs text-slate-400 mt-1">Precio del producto en su presentación</p>
              </div>

              {/* Stock mínimo + Sin alerta toggle */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Stock Mínimo {!formData.sin_alerta && <span className="text-red-500">*</span>}
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, sin_alerta: !prev.sin_alerta }))}
                    className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    title="Sin alerta de stock mínimo"
                  >
                    <span className={formData.sin_alerta ? 'text-amber-500' : ''}>Sin alerta</span>
                    <span className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                      formData.sin_alerta ? 'bg-amber-400' : 'bg-slate-300 dark:bg-slate-600'
                    }`}>
                      <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                        formData.sin_alerta ? 'translate-x-3.5' : 'translate-x-0.5'
                      }`} />
                    </span>
                  </button>
                </div>
                {formData.sin_alerta ? (
                  <div className="w-full px-4 py-3 border border-dashed border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10 text-amber-500 dark:text-amber-400 rounded-xl text-xs text-center select-none">
                    Sin alerta activa — no se generará notificación de stock bajo
                  </div>
                ) : (
                  <>
                    <input
                      name="stock_minimo"
                      type="number"
                      value={formData.stock_minimo}
                      onChange={handleChange}
                      min="0"
                      step="any"
                      className={`${selectCls} ${errors.stock_minimo ? 'border-red-400' : ''}`}
                    />
                    {errors.stock_minimo
                      ? <p className="text-xs text-red-500 mt-1">{errors.stock_minimo}</p>
                      : <p className="text-xs text-slate-400 mt-1">Cantidad mínima antes de alertar</p>
                    }
                  </>
                )}
              </div>
            </div>

            {/* ── ROW 4: Tipo Conteo + Categoría ───────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Tipo de Conteo — multi-select */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
                  Tipo de Conteo
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {['diario', 'semanal', 'quincenal', 'mensual'].map(tipo => {
                    const selected = formData.frecuencia_inventario.includes(tipo)
                    return (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => {
                          const current = formData.frecuencia_inventario
                          const next = selected
                            ? current.filter(t => t !== tipo)
                            : [...current, tipo]
                          setFormData(prev => ({ ...prev, frecuencia_inventario: next }))
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all capitalize ${
                          selected
                            ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                            : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-primary-400'
                        }`}
                      >
                        {tipo === 'todos' ? 'Todos los conteos' : tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs text-slate-400 mt-1">Selecciona uno o varios tipos de conteo</p>
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
                  Categoría <span className="text-red-500">*</span>
                </label>
                <select
                  name="categoria"
                  value={formData.categoria}
                  onChange={handleChange}
                  className={selectCls}
                  required
                >
                  <option value="">Seleccionar categoría...</option>
                  {categoriasOptions.map(categoria => (
                    <option key={categoria} value={categoria}>{categoria}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ── ROW 5: Etiquetas + Estado toggle ─────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Observación */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
                  Observación
                </label>
                <input
                  type="text"
                  value={Array.isArray(formData.etiquetas) ? formData.etiquetas.join(', ') : ''}
                  onChange={e => {
                    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                    setFormData(prev => ({ ...prev, etiquetas: tags }))
                  }}
                  placeholder="Ej: Producto frágil, requiere refrigeración..."
                  className={selectCls}
                />
              </div>

              {/* Estado — professional toggle */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
                  Estado <span className="text-red-500">*</span>
                </label>
                <div className={`flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all duration-200 ${
                  formData.estado === 'ACTIVO'
                    ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-700/50 dark:bg-emerald-900/10'
                    : 'border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-700/30'
                }`}>
                  <div>
                    <p className={`text-sm font-semibold transition-colors ${formData.estado === 'ACTIVO' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                      {formData.estado === 'ACTIVO' ? 'Producto Activo' : 'Producto Inactivo'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formData.estado === 'ACTIVO'
                        ? 'Disponible para operaciones y reportes'
                        : 'No visible en operaciones ni reportes'}
                    </p>
                  </div>
                  <StatusToggle
                    value={formData.estado}
                    onChange={val => setFormData(prev => ({ ...prev, estado: val }))}
                    size="md"
                    showLabel={false}
                  />
                </div>
              </div>
            </div>

            {/* ── INVENTARIABLE — Solo en CREACIÓN ─────────────────────────────── */}
            {!isEditing && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
                  ¿Es inventariable?
                </label>
                <div className={`flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all duration-200 ${
                  formData.inventariable
                    ? 'border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-700/30'
                    : 'border-blue-200 bg-blue-50 dark:border-blue-700/50 dark:bg-blue-900/10'
                }`}>
                  <div className="flex-1 pr-4">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {formData.inventariable ? 'Producto Inventariable' : 'No Inventariable'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {formData.inventariable
                        ? 'Participa en conteos, movimientos y reportes de inventario'
                        : 'Solo disponible para recetas o costos. No genera movimientos ni conteos.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (formData.inventariable) {
                        setShowConfirmInventariable(true)
                      } else {
                        setFormData(prev => ({ ...prev, inventariable: true }))
                      }
                    }}
                    className={`
                      relative inline-flex flex-shrink-0 h-6 w-11 items-center rounded-full
                      transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                      ${formData.inventariable
                        ? 'bg-slate-300 dark:bg-slate-500 focus-visible:ring-slate-400'
                        : 'bg-blue-500 focus-visible:ring-blue-500 shadow-[0_0_0_2px_rgba(59,130,246,0.3)]'
                      }
                    `}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${
                      formData.inventariable ? 'translate-x-1' : 'translate-x-6'
                    }`} />
                  </button>
                </div>
                {!formData.inventariable && (
                  <p className="mt-1.5 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />
                    Una vez guardado, no podrás revertirlo como inventariable.
                  </p>
                )}
              </div>
            )}

            {/* ── SECCIÓN DE UBICACIONES ─────────────────────────────────────────── */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                  <MapPin size={16} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Ubicaciones Permitidas</h3>
                  <p className="text-xs text-slate-400">Define dónde estará disponible este producto</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Empresas */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Empresas</label>
                    <button 
                      type="button"
                      onClick={() => toggleAllEmpresas()}
                      className="text-xs px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 transition-colors font-medium"
                    >
                      {formData.empresas_permitidas.length === empresasFiltradas.length ? 'Quitar todas' : 'Seleccionar todas'}
                    </button>
                  </div>
                  <div className="max-h-40 overflow-y-auto p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-200 dark:border-slate-700 space-y-0.5">
                    {empresasFiltradas.map(emp => (
                      <label key={emp.id} className="flex items-center gap-2.5 text-sm cursor-pointer hover:bg-white dark:hover:bg-slate-600/50 px-2 py-1.5 rounded-lg transition-colors">
                        <input 
                          type="checkbox" 
                          checked={formData.empresas_permitidas.includes(emp.id)} 
                          onChange={() => toggleEmpresa(emp.id)} 
                          className="rounded border-slate-300 text-indigo-600 w-4 h-4" 
                        />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">{emp.nombre}</span>
                      </label>
                    ))}
                    {empresasFiltradas.length === 0 && 
                      <p className="text-xs text-slate-400 py-2 text-center">No hay empresas</p>
                    }
                  </div>
                </div>

                {/* Ubicaciones */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Ubicaciones</label>
                    <button 
                      type="button"
                      onClick={() => toggleAllUbicaciones()}
                      className="text-xs px-2.5 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg hover:bg-purple-100 transition-colors font-medium"
                    >
                      {formData.ubicaciones_permitidas.length === ubicacionesFiltradas.filter(u => u.estado !== 'INACTIVO').length ? 'Quitar todas' : 'Seleccionar todas'}
                    </button>
                  </div>
                  <div className="max-h-40 overflow-y-auto p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-200 dark:border-slate-700 space-y-0.5">
                    {ubicacionesFiltradas.filter(u => u.estado !== 'INACTIVO').map(ub => { 
                      const emp = empresas.find(e => e.id === ub.empresa_id)
                      return (
                        <label key={ub.id} className="flex items-center gap-2.5 text-sm cursor-pointer hover:bg-white dark:hover:bg-slate-600/50 px-2 py-1.5 rounded-lg transition-colors">
                          <input 
                            type="checkbox" 
                            checked={formData.ubicaciones_permitidas.includes(ub.id)} 
                            onChange={() => toggleUbicacion(ub.id)} 
                            className="rounded border-slate-300 text-purple-600 w-4 h-4" 
                          />
                          <span className="text-slate-700 dark:text-slate-300 font-medium flex-1">{ub.nombre}</span>
                          {emp && <span className="text-xs text-slate-400 ml-auto">{emp.nombre}</span>}
                        </label>
                      )
                    })}
                    {ubicacionesFiltradas.filter(u => u.estado !== 'INACTIVO').length === 0 && 
                      <p className="text-xs text-slate-400 py-2 text-center">Selecciona empresas primero</p>
                    }
                  </div>
                </div>
              </div>

              <div className="mt-3 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/15 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                <p className="text-xs text-indigo-700 dark:text-indigo-300">
                  <strong>Nota:</strong> Si no seleccionas ninguna empresa o ubicación, el producto estará disponible en todas.
                </p>
              </div>
            </div>
          </div>

          {/* ── FOOTER ACTIONS ─────────────────────────────────────────────────────── */}
          <div className="flex gap-3 px-8 py-5 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex-shrink-0">
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
      {/* Modal de Confirmación para Inventariable */}
      <ConfirmModal
        isOpen={showConfirmInventariable}
        onClose={() => setShowConfirmInventariable(false)}
        onConfirm={() => {
          setFormData(prev => ({ ...prev, inventariable: false }))
          setShowConfirmInventariable(false)
        }}
        title="¿Cambiar a No Inventariable?"
        message="Esta acción es permanente para este producto una vez guardado. Los productos no inventariables no generan stocks ni aparecen en conteos. Solo se utilizan para recetas (BOM) o referencia de costos."
        confirmText="Confirmar cambio"
        variant="warning"
        icon={AlertTriangle}
      />
    </div>
  )
}
