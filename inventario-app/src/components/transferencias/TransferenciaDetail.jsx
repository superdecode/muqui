import { useState, useRef, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Button from '../common/Button'
import LoadingSpinner from '../common/LoadingSpinner'
import { Package, MapPin, Calendar, FileText, CheckCircle, User, X, Download, Edit3, Ban, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import dataService from '../../services/dataService'
import { useToastStore } from '../../stores/toastStore'
import { exportTransferenciaToExcel } from '../../utils/exportUtils'
import { formatDisplayId } from '../../utils/formatters'

// Función para normalizar estados (importada del hook useMovimientos)
const normalizeEstado = (estado) => {
  if (!estado) return ''
  const s = estado.toString().toUpperCase().trim()
  if (s === 'COMPLETADO' || s === 'COMPLETADA') return 'COMPLETADO'
  if (s === 'PARCIAL') return 'PARCIAL'
  if (s === 'RECIBIENDO') return 'RECIBIENDO'
  if (s.startsWith('CONFIRM')) return 'COMPLETADO'
  if (s.startsWith('CANCEL')) return 'CANCELADA'
  if (s.startsWith('PENDIEN')) return 'PENDIENTE'
  return s
}

export default function TransferenciaDetail({ transferencia, onClose, onConfirmar, onConfirmarParcial, isConfirmando, onCancelar, canCancel = false }) {
  const toast = useToastStore()
  const [modoRecepcion, setModoRecepcion] = useState(null) // null | 'total' | 'parcial'
  const [cantidadesRecibidas, setCantidadesRecibidas] = useState({})
  const inputRefs = useRef({})

  // Cancel modal state
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [motivoCancelacion, setMotivoCancelacion] = useState('')
  const [isCancelling, setIsCancelling] = useState(false)

  // Observaciones de recepción
  const [observacionesRecepcion, setObservacionesRecepcion] = useState('')

  // Validación inicial para evitar errores
  if (!transferencia) {
    console.error('TransferenciaDetail: transferencia es null o undefined')
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl shadow-card-hover max-w-md w-full p-6 text-center">
          <p className="text-slate-600">Error: No se encontró información del movimiento</p>
          <Button onClick={onClose} className="mt-4">Cerrar</Button>
        </div>
      </div>
    )
  }

  // Debug: Mostrar TODOS los campos disponibles para identificar fechas
  console.log('TransferenciaDetail - Todos los campos disponibles:', {
    id: transferencia.id,
    campos: Object.keys(transferencia),
    valoresFechas: Object.keys(transferencia)
      .filter(key => key.toLowerCase().includes('fecha') || key.toLowerCase().includes('date') || key.toLowerCase().includes('created') || key.toLowerCase().includes('updated') || key.toLowerCase().includes('time'))
      .reduce((obj, key) => {
        obj[key] = transferencia[key]
        return obj
      }, {}),
    datosCompletos: transferencia
  })

  // Cargar detalles del movimiento
  const { data: detalles = [], isLoading, error: detallesError } = useQuery({
    queryKey: ['movimiento-detalle', transferencia.id],
    queryFn: () => {
      if (transferencia.tipo_movimiento === 'VENTA') {
        return dataService.getDetalleVentas(transferencia.id)
      } else {
        return dataService.getDetalleMovimientos(transferencia.id)
      }
    },
    enabled: !!transferencia?.id
  })

  // Cargar productos para obtener información completa
  const { data: productos = [], error: productosError } = useQuery({
    queryKey: ['productos'],
    queryFn: () => dataService.getProductos()
  })

  // Cargar usuarios para mostrar nombres reales
  const { data: usuarios = [], error: usuariosError } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => dataService.getUsuarios()
  })

  // Cargar ubicaciones para export
  const { data: ubicaciones = [], error: ubicacionesError } = useQuery({
    queryKey: ['ubicaciones'],
    queryFn: () => dataService.getUbicaciones()
  })

  // Manejo de errores en las consultas
  if (detallesError || productosError || usuariosError || ubicacionesError) {
    console.error('TransferenciaDetail: Error en consultas:', { detallesError, productosError, usuariosError, ubicacionesError })
  }

  const handleExportExcel = () => {
    try {
      exportTransferenciaToExcel(transferencia, detalles, productos, ubicaciones)
      toast.success('Exportado', 'Transferencia exportada a Excel')
    } catch (err) {
      toast.error('Error', err.message || 'No se pudo exportar')
    }
  }

  // Función para obtener información completa del producto
  const getProductoInfo = (productoId) => {
    if (!productoId) {
      console.log('TransferenciaDetail: productoId es null/undefined')
      return {
        id: 'N/A',
        nombre: 'Producto no especificado',
        especificacion: '',
        unidad_medida: ''
      }
    }
    
    // Convertir ambos IDs a string para comparación (pueden ser numéricos o strings)
    const productoIdStr = String(productoId)
    const producto = productos.find(p => String(p.id) === productoIdStr)
    
    if (!producto) {
      console.log('TransferenciaDetail - Producto NO encontrado:', {
        buscando: productoIdStr,
        totalProductos: productos.length,
        primeros5ProductosIDs: productos.slice(0, 5).map(p => ({ id: p.id, tipo: typeof p.id })),
        detalles: detalles.length,
        primerDetalle: detalles[0]
      })
    }
    
    return producto || {
      id: productoId,
      nombre: `Producto ${productoId}`,
      especificacion: 'No disponible',
      unidad_medida: 'N/A'
    }
  }

  // Función para obtener nombre del usuario
  const getUsuarioNombre = (usuarioId) => {
    if (!usuarioId) return '-'
    // First try to find by doc.id (Firestore ID)
    let usuario = usuarios.find(u => u.id === usuarioId)
    // If not found, try to find by codigo field
    if (!usuario) {
      usuario = usuarios.find(u => u.codigo === usuarioId)
    }
    return usuario ? usuario.nombre : usuarioId
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    try {
      console.log('formatDate - Procesando:', dateString, 'Tipo:', typeof dateString)
      
      // Manejar diferentes formatos de fecha
      let date
      
      // Si es un objeto Timestamp de Firestore (con segundos y nanosegundos)
      if (typeof dateString === 'object' && dateString !== null) {
        console.log('formatDate - Es objeto, checking Firestore Timestamp...')
        
        // Timestamp de Firestore { seconds: number, nanoseconds: number }
        if (dateString.seconds !== undefined && dateString.nanoseconds !== undefined) {
          console.log('formatDate - Firestore Timestamp detectado:', dateString)
          date = new Date(dateString.seconds * 1000 + dateString.nanoseconds / 1000000)
        }
        // Otro tipo de objeto con toDate()
        else if (typeof dateString.toDate === 'function') {
          console.log('formatDate - Objeto con toDate() detectado')
          date = dateString.toDate()
        }
        // Objeto Date normal
        else if (dateString instanceof Date) {
          console.log('formatDate - Objeto Date detectado')
          date = dateString
        }
        // Otro objeto, intentar convertir
        else {
          console.log('formatDate - Objeto desconocido, intentando convertir')
          date = new Date(dateString)
        }
      }
      // Si es un timestamp de Firestore (segundos o milisegundos)
      else if (typeof dateString === 'number') {
        console.log('formatDate - Es número:', dateString)
        // Si parece estar en segundos (timestamp de Firestore), convertir a milisegundos
        if (dateString < 10000000000) {
          console.log('formatDate - Asumiendo segundos, convirtiendo a ms')
          date = new Date(dateString * 1000)
        } else {
          console.log('formatDate - Asumiendo milisegundos')
          date = new Date(dateString)
        }
      } 
      // Si es string
      else if (typeof dateString === 'string') {
        console.log('formatDate - Es string:', dateString)
        // Si es string, intentar crear fecha directamente
        date = new Date(dateString)
        
        // Si falla, intentar con timestamp numérico
        if (isNaN(date.getTime()) && !isNaN(dateString)) {
          const timestamp = parseFloat(dateString)
          console.log('formatDate - String inválido, intentando como timestamp:', timestamp)
          if (timestamp < 10000000000) {
            date = new Date(timestamp * 1000)
          } else {
            date = new Date(timestamp)
          }
        }
      } else {
        console.log('formatDate - Tipo desconocido, intentando new Date()')
        date = new Date(dateString)
      }
      
      // Validar fecha final
      if (isNaN(date.getTime())) {
        console.warn('FormatDate: Fecha inválida:', dateString)
        return '-'
      }
      
      const resultado = format(date, "d 'de' MMMM, yyyy", { locale: es })
      console.log('formatDate - Resultado formateado:', resultado)
      return resultado
    } catch (error) {
      console.error('FormatDate: Error formateando fecha:', dateString, error)
      return '-'
    }
  }

  // Función para obtener la mejor fecha de creación disponible
  const getFechaCreacion = () => {
    // Intentar diferentes campos en orden de preferencia
    const posiblesFechas = [
      transferencia.fecha_creacion,
      transferencia.createdAt,
      transferencia.created_at,
      transferencia.fecha,
      transferencia.timestamp,
      transferencia.created,
      transferencia.creation_date,
      transferencia.date_created,
      // Timestamps de Firestore (pueden ser objetos con seconds)
      transferencia._documentCreateTime,
      transferencia._createTime,
      transferencia.createTime
    ].filter(fecha => fecha != null && fecha !== '' && fecha !== undefined)
    
    console.log('getFechaCreacion - Fechas encontradas:', posiblesFechas)
    
    if (posiblesFechas.length > 0) {
      const fecha = posiblesFechas[0]
      console.log('getFechaCreacion - Usando fecha:', fecha, 'Tipo:', typeof fecha)
      return formatDate(fecha)
    }
    
    console.log('getFechaCreacion - No se encontraron fechas')
    return '-'
  }

  // Función para obtener la mejor fecha de confirmación disponible
  const getFechaConfirmacion = () => {
    // Intentar diferentes campos en orden de preferencia
    const posiblesFechas = [
      transferencia.fecha_confirmacion,
      transferencia.updatedAt,
      transferencia.updated_at,
      transferencia.fecha_ultima_actualizacion,
      transferencia.last_updated,
      transferencia.modified_at,
      transferencia.confirmation_date,
      transferencia.date_confirmed,
      // Timestamps de Firestore
      transferencia._documentUpdateTime,
      transferencia._updateTime,
      transferencia.updateTime
    ].filter(fecha => fecha != null && fecha !== '' && fecha !== undefined)
    
    console.log('getFechaConfirmacion - Fechas encontradas:', posiblesFechas)
    
    if (posiblesFechas.length > 0) {
      const fecha = posiblesFechas[0]
      console.log('getFechaConfirmacion - Usando fecha:', fecha, 'Tipo:', typeof fecha)
      return formatDate(fecha)
    }
    
    console.log('getFechaConfirmacion - No se encontraron fechas')
    return null // Retornar null para no mostrar la sección si no hay fecha
  }

  // Check if any detalle already has cantidad_recibida set (already confirmed)
  const detalle_has_recibida = detalles.some(d => d.cantidad_recibida !== null && d.cantidad_recibida !== undefined)

  // Inicializar cantidades recibidas con los valores enviados cuando se activa el modo parcial
  useEffect(() => {
    if (modoRecepcion === 'parcial' && detalles.length > 0) {
      const cantidadesIniciales = {}
      detalles.forEach(d => {
        const cantEnviada = d.cantidad_enviada ?? d.cantidad
        cantidadesIniciales[d.id] = cantEnviada
      })
      setCantidadesRecibidas(cantidadesIniciales)
    }
  }, [modoRecepcion, detalles])

  const handleConfirmarTodo = () => {
    if (onConfirmar) onConfirmar(null, observacionesRecepcion)
  }

  const handleConfirmarParcial = () => {
    const productosRecibidos = detalles.map(d => ({
      detalle_id: d.id,
      producto_id: d.producto_id,
      cantidad_recibida: cantidadesRecibidas[d.id] || (d.cantidad_enviada ?? d.cantidad)
    }))
    if (onConfirmarParcial) {
      onConfirmarParcial(productosRecibidos, observacionesRecepcion)
    } else if (onConfirmar) {
      onConfirmar(productosRecibidos, observacionesRecepcion)
    }
  }

  const handleCancelarMovimiento = async () => {
    if (!motivoCancelacion.trim()) {
      toast.error('Motivo requerido', 'Por favor ingresa un motivo para la cancelación')
      return
    }
    setIsCancelling(true)
    try {
      if (onCancelar) {
        await onCancelar(motivoCancelacion)
      }
      setShowCancelModal(false)
      setMotivoCancelacion('')
      toast.success('Movimiento Cancelado', 'El movimiento ha sido cancelado exitosamente')
    } catch (err) {
      toast.error('Error', err.message || 'No se pudo cancelar el movimiento')
    } finally {
      setIsCancelling(false)
    }
  }

  const getEstadoBadge = (estado) => {
    const map = {
      PENDIENTE: 'bg-yellow-500 text-white',
      PARCIAL: 'bg-orange-500 text-white',
      COMPLETADO: 'bg-green-500 text-white',
      CANCELADA: 'bg-red-500 text-white'
    }
    return map[estado] || 'bg-slate-500 text-white'
  }

  // Mostrar estado de carga inicial
  if (isLoading && detalles.length === 0) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl shadow-card-hover max-w-md w-full p-6 text-center">
          <LoadingSpinner text="Cargando detalles del movimiento..." />
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-card-hover max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-ocean p-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Detalle de Movimiento</h2>
                <p className="text-white/90 mt-1">Código: {formatDisplayId(transferencia, 'MV')}</p>
                {onConfirmar && normalizeEstado(transferencia.estado) === 'PENDIENTE' && (
                  <p className="text-white/80 text-sm mt-2 flex items-center gap-2">
                    <CheckCircle size={16} />
                    Listo para confirmar recepción
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getEstadoBadge(transferencia.estado)}`}>
                  {transferencia.estado === 'PARCIAL' ? 'Parcial' : transferencia.estado}
                </span>
                {(transferencia.estado === 'COMPLETADO' || transferencia.estado === 'PARCIAL') && detalles.length > 0 && (
                  <button
                    onClick={handleExportExcel}
                    className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                    title="Exportar a Excel"
                  >
                    <Download className="text-white" size={20} />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <X className="text-white" size={24} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] space-y-6">
          {/* Info General */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Calendar className="text-primary-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Fecha Creación</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{getFechaCreacion()}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <User className="text-primary-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Creado por</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{getUsuarioNombre(transferencia.usuario_creacion_id)}</p>
              </div>
            </div>

            {getFechaConfirmacion() && (
              <>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="text-green-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Fecha Confirmación</p>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{getFechaConfirmacion()}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <User className="text-green-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Confirmado por</p>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{getUsuarioNombre(transferencia.usuario_confirmacion_id)}</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Ubicaciones */}
          <div className="border-l-4 border-primary-500 pl-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <MapPin size={20} className="text-primary-600" />
              Movimiento
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Origen</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {transferencia.origen_nombre || ubicaciones.find(u => u.id === transferencia.origen_id)?.nombre || transferencia.origen_id}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                  {transferencia.tipo_movimiento === 'VENTA' ? 'Beneficiario' : 'Destino'}
                </p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {transferencia.tipo_movimiento === 'VENTA' 
                    ? (transferencia.beneficiario_nombre || 'Beneficiario no especificado')
                    : (transferencia.destino_nombre || ubicaciones.find(u => u.id === transferencia.destino_id)?.nombre || transferencia.destino_id)
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Productos */}
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Package size={24} className="text-primary-600" />
              {transferencia.tipo_movimiento === 'VENTA' ? 'Productos Vendidos' : 'Productos Transferidos'} {detalles.length > 0 && `(${detalles.length} items)`}
            </h3>

            {isLoading ? (
              <div className="py-12">
                <LoadingSpinner text="Cargando detalles..." />
              </div>
            ) : detalles.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                <Package size={64} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-600 dark:text-slate-400 text-lg">No hay productos en este movimiento</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                {modoRecepcion === 'parcial' && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-700 px-4 py-3">
                    <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                      <span className="font-semibold">Modo de Recepción Parcial:</span>
                      <span className="text-orange-600 font-medium">Naranja = Recibido &gt; Enviado</span>
                      <span className="text-blue-600 font-medium">Azul = Recibido &lt; Enviado</span>
                    </p>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-4 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Producto</th>
                        <th className="px-4 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Especificación</th>
                        <th className="px-4 py-4 text-center text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {transferencia.tipo_movimiento === 'VENTA' ? 'Cantidad' : 'Enviada'}
                      </th>
                        {(modoRecepcion === 'parcial' || detalle_has_recibida) && (
                          <th className="px-4 py-4 text-center text-sm font-semibold text-slate-700 dark:text-slate-300">Recibida</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {detalles.map((detalle, index) => {
                        const productoInfo = getProductoInfo(detalle.producto_id)
                        const cantEnviada = detalle.cantidad_enviada ?? detalle.cantidad
                        const cantRecibida = detalle.cantidad_recibida
                        return (
                          <tr key={detalle.id || index} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-primary-100 rounded-lg">
                                  <Package size={14} className="text-primary-600" />
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{productoInfo.nombre}</p>
                                  <p className="text-xs text-slate-500">{productoInfo.unidad_medida || ''}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <p className="text-sm text-slate-700 dark:text-slate-300">
                                {productoInfo.especificacion || <span className="text-slate-400 italic">—</span>}
                              </p>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className="text-lg font-bold text-primary-600">
                                {cantEnviada}
                              </span>
                            </td>
                            {modoRecepcion === 'parcial' && (
                              <td className="px-4 py-4 text-center">
                                <input
                                  ref={el => { inputRefs.current[index] = el }}
                                  type="number"
                                  min="0"
                                  value={cantidadesRecibidas[detalle.id] || cantEnviada}
                                  onChange={(e) => {
                                    const val = Math.max(0, parseInt(e.target.value) || 0)
                                    setCantidadesRecibidas(prev => ({ ...prev, [detalle.id]: val }))
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault()
                                      const nextInput = inputRefs.current[index + 1]
                                      if (nextInput) nextInput.focus()
                                    }
                                  }}
                                  className={`w-20 px-2 py-1.5 text-center border rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                                    (cantidadesRecibidas[detalle.id] || cantEnviada) > cantEnviada 
                                      ? 'border-orange-300 bg-orange-50 text-orange-700' 
                                      : (cantidadesRecibidas[detalle.id] || cantEnviada) < cantEnviada
                                        ? 'border-blue-300 bg-blue-50 text-blue-700'
                                        : 'border-slate-300 bg-white text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100'
                                  }`}
                                />
                                {(cantidadesRecibidas[detalle.id] || cantEnviada) !== cantEnviada && (
                                  <div className="text-xs mt-1">
                                    {(cantidadesRecibidas[detalle.id] || cantEnviada) > cantEnviada ? (
                                      <span className="text-orange-600 font-medium">+{((cantidadesRecibidas[detalle.id] || cantEnviada) - cantEnviada)}</span>
                                    ) : (
                                      <span className="text-blue-600 font-medium">-{(cantEnviada - (cantidadesRecibidas[detalle.id] || cantEnviada))}</span>
                                    )}
                                  </div>
                                )}
                              </td>
                            )}
                            {modoRecepcion !== 'parcial' && detalle_has_recibida && (
                              <td className="px-4 py-4 text-center">
                                <span className={`text-lg font-bold ${cantRecibida !== null && cantRecibida < cantEnviada ? 'text-orange-600' : 'text-green-600'}`}>
                                  {cantRecibida !== null ? cantRecibida : '—'}
                                </span>
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Observaciones guardadas */}
          {(transferencia.observaciones_creacion || transferencia.observaciones_confirmacion) && (
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileText size={20} className="text-primary-600" />
                Observaciones
              </h3>
              {transferencia.observaciones_creacion && (
                <div className="border-l-4 border-slate-400 pl-4 py-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Observaciones de Salida</p>
                  <p className="text-slate-700 dark:text-slate-300">{transferencia.observaciones_creacion}</p>
                </div>
              )}
              {transferencia.observaciones_confirmacion && (
                <div className="border-l-4 border-green-500 pl-4 py-2">
                  <p className="text-xs text-green-600 mb-1">Observaciones de Recepción</p>
                  <p className="text-slate-700 dark:text-slate-300">{transferencia.observaciones_confirmacion}</p>
                </div>
              )}
            </div>
          )}

          {/* Textarea observaciones de recepción al confirmar */}
          {onConfirmar && normalizeEstado(transferencia.estado) !== 'CANCELADA' && normalizeEstado(transferencia.estado) !== 'COMPLETADO' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Observaciones de Recepción (Opcional)
              </label>
              <textarea
                value={observacionesRecepcion}
                onChange={(e) => setObservacionesRecepcion(e.target.value)}
                placeholder="Notas sobre la recepción del producto..."
                rows={3}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              />
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            {/* Cancel button - left side */}
            <div>
              {canCancel && normalizeEstado(transferencia.estado) !== 'CANCELADA' && normalizeEstado(transferencia.estado) !== 'COMPLETADO' && (
                <Button
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  onClick={() => setShowCancelModal(true)}
                >
                  <Ban size={16} className="mr-1.5" />
                  Cancelar Movimiento
                </Button>
              )}
            </div>

            {/* Action buttons - right side */}
            <div className="flex gap-4">
              <Button variant="ghost" onClick={() => { setModoRecepcion(null); onClose() }}>
                Cerrar
              </Button>
              {onConfirmar && !modoRecepcion && normalizeEstado(transferencia.estado) !== 'CANCELADA' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setModoRecepcion('parcial')}
                  >
                    <Edit3 size={16} className="mr-1.5" />
                    Recibir Parcial
                  </Button>
                  <Button
                    variant="success"
                    onClick={handleConfirmarTodo}
                    loading={isConfirmando}
                  >
                    <CheckCircle size={16} className="mr-1.5" />
                    {isConfirmando ? 'Procesando...' : 'Confirmar Recepción Completa'}
                  </Button>
                </>
              )}
              {modoRecepcion === 'parcial' && (
                <>
                  <Button variant="ghost" onClick={() => setModoRecepcion(null)}>
                    Volver
                  </Button>
                  <Button
                    variant="success"
                    onClick={handleConfirmarParcial}
                    loading={isConfirmando}
                  >
                    <CheckCircle size={16} className="mr-1.5" />
                    {isConfirmando ? 'Procesando...' : 'Confirmar Recepción Parcial'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Cancelación */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <AlertTriangle className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Cancelar Movimiento</h3>
                  <p className="text-white/80 text-sm">Esta acción no se puede deshacer</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Importante:</strong> Al cancelar este movimiento, no se realizará ninguna afectación al inventario.
                  El registro permanecerá visible solo para trazabilidad.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Motivo de cancelación *
                </label>
                <textarea
                  value={motivoCancelacion}
                  onChange={(e) => setMotivoCancelacion(e.target.value)}
                  placeholder="Ingresa el motivo de la cancelación..."
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCancelModal(false)
                    setMotivoCancelacion('')
                  }}
                  className="flex-1"
                  disabled={isCancelling}
                >
                  Volver
                </Button>
                <Button
                  variant="danger"
                  onClick={handleCancelarMovimiento}
                  loading={isCancelling}
                  className="flex-1"
                >
                  <Ban size={16} className="mr-1.5" />
                  {isCancelling ? 'Cancelando...' : 'Confirmar Cancelación'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
