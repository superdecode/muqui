import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dataService from '../services/dataService'
import { useToastStore } from '../stores/toastStore'
import { triggerSolicitudRecibida } from '../services/notificationService'

export const useSolicitudes = () => {
  const queryClient = useQueryClient()
  const toast = useToastStore()

  // Obtener ubicaciones
  const { data: ubicaciones = [] } = useQuery({
    queryKey: ['ubicaciones'],
    queryFn: () => dataService.getUbicaciones()
  })

  // Obtener usuarios
  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => dataService.getUsuarios()
  })

  // Obtener productos
  const { data: productos = [] } = useQuery({
    queryKey: ['productos'],
    queryFn: () => dataService.getProductos()
  })

  // Obtener solicitudes con nombres enriquecidos
  const {
    data: solicitudesConNombres = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['solicitudes'],
    queryFn: async () => {
      const [solicitudes, ubicacionesData, usuariosData] = await Promise.all([
        dataService.getSolicitudes(),
        dataService.getUbicaciones(),
        dataService.getUsuarios()
      ])

      // Helper function to get user name
      const getUserName = (userId) => {
        if (!userId) return null
        let user = usuariosData.find(u => u.id === userId)
        if (!user) {
          user = usuariosData.find(u => u.codigo === userId)
        }
        return user ? user.nombre : userId
      }

      // Agregar nombres de ubicación y usuarios
      return solicitudes.map(solicitud => ({
        ...solicitud,
        origen_nombre: ubicacionesData.find(u => u.id === solicitud.ubicacion_origen_id)?.nombre || solicitud.ubicacion_origen_id,
        destino_nombre: ubicacionesData.find(u => u.id === solicitud.ubicacion_destino_id)?.nombre || solicitud.ubicacion_destino_id,
        usuario_creacion_nombre: getUserName(solicitud.usuario_creacion_id),
        usuario_confirmacion_nombre: getUserName(solicitud.usuario_confirmacion_id),
        usuario_cancelacion_nombre: getUserName(solicitud.usuario_cancelacion_id)
      }))
    }
  })

  // Crear solicitud
  const crearSolicitud = useMutation({
    mutationFn: async (data) => {
      return await dataService.createSolicitud(data)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['solicitudes'] })
      toast.success(
        'Solicitud Creada',
        response.message || 'La solicitud se ha guardado como borrador'
      )
    },
    onError: (error) => {
      toast.error(
        'Error al Crear Solicitud',
        error.message || 'No se pudo crear la solicitud. Intenta nuevamente.'
      )
    }
  })

  // Actualizar solicitud
  const actualizarSolicitud = useMutation({
    mutationFn: async ({ solicitudId, data }) => {
      return await dataService.updateSolicitud(solicitudId, data)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['solicitudes'] })
      toast.success(
        'Solicitud Actualizada',
        response.message || 'La solicitud se ha actualizado exitosamente'
      )
    },
    onError: (error) => {
      toast.error(
        'Error al Actualizar',
        error.message || 'No se pudo actualizar la solicitud.'
      )
    }
  })

  // Enviar solicitud
  const enviarSolicitud = useMutation({
    mutationFn: async ({ solicitudId, usuarioId }) => {
      const result = await dataService.enviarSolicitud(solicitudId, usuarioId)
      return { ...result, solicitudId }
    },
    onSuccess: async (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['solicitudes'] })
      toast.success(
        'Solicitud Enviada',
        response.message || 'La solicitud ha sido enviada para procesamiento'
      )

      // Disparar notificación a usuarios de ubicación origen
      try {
        const solicitud = solicitudesConNombres.find(s => s.id === variables.solicitudId)
        if (solicitud) {
          const detalles = await dataService.getDetalleSolicitudes(variables.solicitudId)
          const origen = ubicaciones.find(u => u.id === solicitud.ubicacion_origen_id)
          const destino = ubicaciones.find(u => u.id === solicitud.ubicacion_destino_id)
          const usuarioCreador = usuarios.find(u => u.id === solicitud.usuario_creacion_id || u.codigo === solicitud.usuario_creacion_id)

          // Encontrar usuarios asignados a la ubicación ORIGEN (quienes procesan)
          const usuariosOrigen = usuarios.filter(u => {
            if (u.estado && u.estado !== 'ACTIVO') return false
            let asignadas = []
            if (Array.isArray(u.ubicaciones_asignadas)) asignadas = u.ubicaciones_asignadas
            else if (typeof u.ubicaciones_asignadas === 'string') {
              try { asignadas = JSON.parse(u.ubicaciones_asignadas) } catch { asignadas = [] }
            }
            return asignadas.includes(solicitud.ubicacion_origen_id)
          }).map(u => u.codigo || u.id)

          // Incluir admins
          const adminUserIds = usuarios.filter(u => {
            if (u.estado && u.estado !== 'ACTIVO') return false
            const rolNorm = String(u.rol || '').toUpperCase()
            return rolNorm === 'ADMIN_GLOBAL' || rolNorm === 'ADMIN_EMPRESA'
          }).map(u => u.codigo || u.id)

          const destinatarios = [...new Set([...usuariosOrigen, ...adminUserIds])]

          // Enriquecer productos con nombres
          const productosConNombres = detalles.map(d => {
            const producto = productos.find(p => p.id === d.producto_id)
            return {
              producto_id: d.producto_id,
              nombre: producto?.nombre || 'Producto',
              cantidad_solicitada: d.cantidad_solicitada
            }
          })

          if (destinatarios.length > 0) {
            await triggerSolicitudRecibida({
              solicitud: { id: variables.solicitudId, codigo_legible: solicitud.codigo_legible },
              productos: productosConNombres,
              origen: { id: origen?.id, nombre: origen?.nombre },
              destino: { id: destino?.id, nombre: destino?.nombre },
              usuarioCreador: { nombre: usuarioCreador?.nombre || 'Usuario' },
              usuariosDestino: destinatarios
            })
          }
        }
      } catch (notifError) {
        console.warn('Error enviando notificación de solicitud:', notifError)
      }
    },
    onError: (error) => {
      toast.error(
        'Error al Enviar',
        error.message || 'No se pudo enviar la solicitud.'
      )
    }
  })

  // Procesar solicitud (crear salida)
  const procesarSolicitud = useMutation({
    mutationFn: async (data) => {
      return await dataService.procesarSolicitud(data)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['solicitudes'] })
      queryClient.invalidateQueries({ queryKey: ['movimientos'] })
      queryClient.invalidateQueries({ queryKey: ['inventario'] })
      toast.success(
        'Solicitud Procesada',
        response.message || `Salida ${response.data?.codigo_movimiento || ''} creada exitosamente`
      )
    },
    onError: (error) => {
      toast.error(
        'Error al Procesar',
        error.message || 'No se pudo procesar la solicitud.'
      )
    }
  })

  // Cancelar solicitud
  const cancelarSolicitud = useMutation({
    mutationFn: async ({ solicitudId, usuarioId, motivo }) => {
      return await dataService.cancelarSolicitud(solicitudId, usuarioId, motivo)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['solicitudes'] })
      toast.success(
        'Solicitud Cancelada',
        response.message || 'La solicitud ha sido cancelada'
      )
    },
    onError: (error) => {
      toast.error(
        'Error al Cancelar',
        error.message || 'No se pudo cancelar la solicitud.'
      )
    }
  })

  // Eliminar solicitud
  const eliminarSolicitud = useMutation({
    mutationFn: async (solicitudId) => {
      return await dataService.deleteSolicitud(solicitudId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitudes'] })
      toast.success(
        'Solicitud Eliminada',
        'La solicitud se ha eliminado exitosamente'
      )
    },
    onError: (error) => {
      toast.error(
        'Error al Eliminar',
        error.message || 'No se pudo eliminar la solicitud.'
      )
    }
  })

  // Normalizar estado para comparación
  const normalizeEstado = (estado) => {
    if (!estado) return ''
    const s = estado.toString().toLowerCase().trim()
    if (s === 'iniciada' || s === 'creada') return 'iniciada'
    if (s === 'enviada') return 'enviada'
    if (s === 'recibida') return 'recibida'
    if (s === 'procesada') return 'procesada'
    if (s === 'cancelada') return 'cancelada'
    return s
  }

  // Estadísticas para tabs "Mis Solicitudes"
  const getEstadisticasMisSolicitudes = (usuarioId) => {
    const misSolicitudes = solicitudesConNombres.filter(s =>
      s.usuario_creacion_id === usuarioId
    )
    return {
      total: misSolicitudes.length,
      iniciadas: misSolicitudes.filter(s => normalizeEstado(s.estado) === 'iniciada').length,
      enviadas: misSolicitudes.filter(s => normalizeEstado(s.estado) === 'enviada').length,
      canceladas: misSolicitudes.filter(s => normalizeEstado(s.estado) === 'cancelada').length,
      procesadas: misSolicitudes.filter(s => normalizeEstado(s.estado) === 'procesada').length
    }
  }

  // Estadísticas para tabs "Recibidas"
  const getEstadisticasRecibidas = (ubicacionesAsignadas = []) => {
    const recibidas = solicitudesConNombres.filter(s => {
      // Solicitudes donde el usuario está asignado a la ubicación origen
      // (son quienes procesan las solicitudes)
      const estadoNorm = normalizeEstado(s.estado)
      // Solo mostrar solicitudes enviadas, procesadas o canceladas (no borradores)
      if (estadoNorm === 'iniciada') return false
      return ubicacionesAsignadas.length === 0 || ubicacionesAsignadas.includes(s.ubicacion_origen_id)
    })
    return {
      total: recibidas.length,
      recibidas: recibidas.filter(s => normalizeEstado(s.estado) === 'enviada' || normalizeEstado(s.estado) === 'recibida').length,
      procesadas: recibidas.filter(s => normalizeEstado(s.estado) === 'procesada').length,
      canceladas: recibidas.filter(s => normalizeEstado(s.estado) === 'cancelada').length
    }
  }

  // Estadísticas globales para tarjetas superiores
  const getEstadisticasGlobales = (usuarioId, ubicacionesAsignadas = []) => {
    const misSolicitudesStats = getEstadisticasMisSolicitudes(usuarioId)
    const recibidasStats = getEstadisticasRecibidas(ubicacionesAsignadas)

    return {
      pendientesEnvio: misSolicitudesStats.iniciadas,
      porProcesar: recibidasStats.recibidas
    }
  }

  return {
    solicitudes: solicitudesConNombres,
    ubicaciones,
    usuarios,
    productos,
    isLoading,
    error,
    refetch,
    crearSolicitud: crearSolicitud.mutate,
    isCreando: crearSolicitud.isPending,
    actualizarSolicitud: actualizarSolicitud.mutate,
    isActualizando: actualizarSolicitud.isPending,
    enviarSolicitud: enviarSolicitud.mutate,
    isEnviando: enviarSolicitud.isPending,
    procesarSolicitud: procesarSolicitud.mutate,
    isProcesando: procesarSolicitud.isPending,
    cancelarSolicitud: cancelarSolicitud.mutate,
    isCancelando: cancelarSolicitud.isPending,
    eliminarSolicitud: eliminarSolicitud.mutate,
    isEliminando: eliminarSolicitud.isPending,
    normalizeEstado,
    getEstadisticasMisSolicitudes,
    getEstadisticasRecibidas,
    getEstadisticasGlobales
  }
}

export default useSolicitudes
