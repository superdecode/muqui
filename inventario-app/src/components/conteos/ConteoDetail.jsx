import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Button from '../common/Button'
import LoadingSpinner from '../common/LoadingSpinner'
import { Package, MapPin, Calendar, User, CheckCircle, AlertCircle, X, Download, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import dataService from '../../services/dataService'
import { useToastStore } from '../../stores/toastStore'
import { exportConteoToExcel } from '../../utils/exportUtils'
import { formatDisplayId } from '../../utils/formatters'
import { usePermissions } from '../../hooks/usePermissions'

export default function ConteoDetail({ conteo, onClose }) {
  const toast = useToastStore()
  const queryClient = useQueryClient()
  const { canEdit } = usePermissions()
  const [eliminandoId, setEliminandoId] = useState(null)
  const [confirmDetalle, setConfirmDetalle] = useState(null)

  const eliminarDetalleMutation = useMutation({
    mutationFn: (detalleId) => dataService.deleteDetalleConteo(detalleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conteo-detalle', conteo.id] })
      toast.success('Eliminado', 'El producto fue eliminado del conteo')
      setEliminandoId(null)
    },
    onError: (error) => {
      toast.error('Error', error.message || 'No se pudo eliminar el producto')
      setEliminandoId(null)
    }
  })

  const handleEliminarProducto = (detalle) => {
    setConfirmDetalle(detalle)
  }

  const confirmarEliminar = () => {
    if (!confirmDetalle) return
    setEliminandoId(confirmDetalle.id)
    eliminarDetalleMutation.mutate(confirmDetalle.id)
    setConfirmDetalle(null)
  }

  // Cargar detalles del conteo
  const { data: detalles = [], isLoading } = useQuery({
    queryKey: ['conteo-detalle', conteo.id],
    queryFn: () => dataService.getDetalleConteos(conteo.id)
  })

  // Cargar productos para obtener información completa
  const { data: productos = [] } = useQuery({
    queryKey: ['productos'],
    queryFn: () => dataService.getProductos()
  })

  // Cargar usuarios para mostrar nombres reales
  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => dataService.getUsuarios()
  })

  // Cargar ubicaciones para export
  const { data: ubicaciones = [] } = useQuery({
    queryKey: ['ubicaciones'],
    queryFn: () => dataService.getUbicaciones()
  })

  const handleExportExcel = () => {
    try {
      exportConteoToExcel(conteo, detalles, productos, ubicaciones)
      toast.success('Exportado', 'Conteo exportado a Excel')
    } catch (err) {
      toast.error('Error', err.message || 'No se pudo exportar')
    }
  }

  // Función para obtener información completa del producto
  const getProductoInfo = (productoId) => {
    if (!productoId) {
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

  // Función para obtener nombre de la ubicación
  const getUbicacionNombre = (ubicacionId) => {
    if (!ubicacionId) return '-'
    const ubicacion = ubicaciones.find(u => u.id === ubicacionId)
    return ubicacion ? ubicacion.nombre : ubicacionId
  }

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
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-card-hover max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-ocean p-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Detalle de Conteo</h2>
                <p className="text-white/90 mt-1">Código: {formatDisplayId(conteo, 'CT')}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  conteo.estado === 'PROGRAMADO' 
                    ? 'bg-blue-500 text-white' 
                    : conteo.estado === 'COMPLETADO'
                    ? 'bg-green-500 text-white'
                    : 'bg-yellow-500 text-white'
                }`}>
                  {conteo.estado}
                </span>
                {(conteo.estado === 'COMPLETADO' || conteo.estado === 'PARCIALMENTE_COMPLETADO') && detalles.length > 0 && (
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
          <div className="space-y-6">
            {/* Primera fila: Fecha Programada y Responsable */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Calendar className="text-primary-600" size={20} />
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Fecha Creación</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{conteo.fecha_creacion ? formatDate(conteo.fecha_creacion.toDate ? conteo.fecha_creacion.toDate() : new Date(conteo.fecha_creacion)) : '-'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <User className="text-green-600" size={20} />
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Responsable</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{getUsuarioNombre(conteo.usuario_responsable_id)}</p>
                </div>
              </div>
            </div>

            {/* Segunda fila: Tipo de Conteo y Ubicación */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="text-blue-600" size={20} />
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Tipo de Conteo</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{conteo.tipo_conteo?.toUpperCase()}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <MapPin className="text-purple-600" size={20} />
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Ubicación</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{getUbicacionNombre(conteo.ubicacion_id)}</p>
                </div>
              </div>
            </div>

            {/* Tercera fila: Ejecución (solo si existe) */}
            {conteo.usuario_ejecutor_id && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {conteo.fecha_completado && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Calendar className="text-blue-600" size={20} />
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Completado el</p>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {(() => {
                          try {
                            let date;
                            if (conteo.fecha_completado?.seconds) {
                              // Firestore Timestamp
                              date = new Date(conteo.fecha_completado.seconds * 1000);
                            } else if (typeof conteo.fecha_completado === 'string') {
                              // ISO String
                              date = new Date(conteo.fecha_completado);
                            } else if (conteo.fecha_completado instanceof Date) {
                              // Date object
                              date = conteo.fecha_completado;
                            } else {
                              // Fallback
                              date = new Date();
                            }
                            
                            if (isNaN(date.getTime())) {
                              return 'Fecha no válida';
                            }
                            
                            return format(date, "d 'de' MMMM 'de' yyyy' 'a las' HH:mm", { locale: es });
                          } catch (error) {
                            console.error('Error formateando fecha:', error);
                            return 'Error en fecha';
                          }
                        })()}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <User className="text-green-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Ejecutado por</p>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{getUsuarioNombre(conteo.usuario_ejecutor_id)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Productos */}
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Package size={24} className="text-primary-600" />
              Productos Contados {detalles.length > 0 && `(${detalles.length} items)`}
            </h3>

            {isLoading ? (
              <div className="py-12">
                <LoadingSpinner text="Cargando detalles..." />
              </div>
            ) : detalles.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                <Package size={64} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-600 dark:text-slate-400 text-lg">No hay productos contados en este conteo</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">ID Producto</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Nombre</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Especificación</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Unidad de Medida</th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700 dark:text-slate-300">Stock Sistema</th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700 dark:text-slate-300">Stock Físico</th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700 dark:text-slate-300">Diferencia</th>
                        {conteo.estado === 'EN_PROGRESO' && canEdit('conteos') && (
                          <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700 dark:text-slate-300">Acciones</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {detalles.map((detalle, index) => {
                        const productoInfo = getProductoInfo(detalle.producto_id)
                        const diferencia = getDiferencia(detalle.cantidad_fisica, detalle.cantidad_sistema)
                        return (
                          <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="p-2 bg-primary-100 rounded-lg">
                                  <Package size={16} className="text-primary-600" />
                                </div>
                                <span className="font-mono text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {productoInfo.id}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-semibold text-slate-900 dark:text-slate-100">{productoInfo.nombre}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-slate-700 dark:text-slate-300">
                                {productoInfo.especificacion || <span className="text-slate-400 italic">Sin especificación</span>}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                {productoInfo.unidad_medida || 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                {detalle.cantidad_sistema || 0}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                {detalle.cantidad_fisica !== null && detalle.cantidad_fisica !== undefined
                                  ? detalle.cantidad_fisica
                                  : '-'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {diferencia !== null ? (
                                <div className="flex items-center justify-center gap-2">
                                  {diferencia === 0 ? (
                                    <CheckCircle className="text-green-600" size={20} />
                                  ) : (
                                    <AlertCircle className="text-yellow-600" size={20} />
                                  )}
                                  <span className={`text-lg font-bold ${
                                    diferencia === 0 ? 'text-green-600' :
                                    diferencia > 0 ? 'text-blue-600' : 'text-red-600'
                                  }`}>
                                    {diferencia > 0 ? '+' : ''}{diferencia}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            {conteo.estado === 'EN_PROGRESO' && canEdit('conteos') && (
                              <td className="px-6 py-4 text-center">
                                <button
                                  onClick={() => handleEliminarProducto(detalle)}
                                  disabled={eliminandoId === detalle.id}
                                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                  title="Eliminar del conteo"
                                >
                                  <Trash2 size={16} />
                                </button>
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

          {/* Observaciones */}
          {conteo.observaciones && (
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Observaciones</h4>
              <p className="text-slate-700 dark:text-slate-300">{conteo.observaciones}</p>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="ghost" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de confirmación para eliminar producto */}
      {confirmDetalle && (
        <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-10 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full flex-shrink-0">
                <Trash2 className="text-red-600" size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                  Eliminar producto del conteo
                </h3>
                <p className="text-slate-700 dark:text-slate-300 font-medium mb-2">
                  {getProductoInfo(confirmDetalle.producto_id).nombre}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Elimina este producto si no corresponde a la frecuencia de conteo configurada o a la empresa. Puedes ajustar su configuración en el módulo <strong>Productos</strong>.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                variant="ghost"
                onClick={() => setConfirmDetalle(null)}
                className="flex-1"
                disabled={eliminandoId !== null}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={confirmarEliminar}
                loading={eliminandoId !== null}
                className="flex-1"
              >
                {eliminandoId !== null ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
