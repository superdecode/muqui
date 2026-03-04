import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dataService from '../services/dataService'
import { useToastStore } from '../stores/toastStore'

export const useConteos = (ubicacionId) => {
  const queryClient = useQueryClient()
  const toast = useToastStore()

  // Obtener ubicaciones
  const {
    data: ubicaciones = []
  } = useQuery({
    queryKey: ['ubicaciones'],
    queryFn: () => dataService.getUbicaciones()
  })

  // Obtener conteos con nombres de ubicación
  const {
    data: conteosConNombres = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['conteos', ubicacionId],
    queryFn: async () => {
      // Convertir undefined a null para evitar errores en Firestore
      const conteos = await dataService.getConteos(ubicacionId || null)
      const ubicacionesData = await dataService.getUbicaciones()
      
      // Agregar nombres de ubicación
      return conteos.map(conteo => ({
        ...conteo,
        ubicacion_nombre: ubicacionesData.find(u => u.id === conteo.ubicacion_id)?.nombre || conteo.ubicacion_id
      }))
    },
    onError: (error) => {
      console.error('Error cargando datos de conteos:', error)
    }
  })

  // Crear/programar conteo
  const crearConteo = useMutation({
    mutationFn: async (data) => {
      return await dataService.createConteo(data)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['conteos'] })
      queryClient.invalidateQueries({ queryKey: ['alertas'] })
      toast.success(
        'Conteo Programado',
        response.message || 'El conteo se ha programado exitosamente'
      )
    },
    onError: (error) => {
      toast.error(
        'Error al Programar Conteo',
        error.message || 'No se pudo programar el conteo. Intenta nuevamente.'
      )
    }
  })

  // Iniciar conteo (PENDIENTE -> EN_PROGRESO)
  const iniciarConteo = useMutation({
    mutationFn: async ({ conteoId, usuarioId }) => {
      return await dataService.iniciarConteo(conteoId, usuarioId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conteos'] })
      toast.success('Conteo Iniciado', 'El conteo está ahora en progreso')
    },
    onError: (error) => {
      toast.error('Error al Iniciar Conteo', error.message || 'No se pudo iniciar el conteo.')
    }
  })

  // Ejecutar conteo (completar o editar)
  const ejecutarConteo = useMutation({
    mutationFn: async (data) => {
      return await dataService.ejecutarConteo(data)
    },
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conteos'] })
      queryClient.invalidateQueries({ queryKey: ['inventario'] })
      queryClient.invalidateQueries({ queryKey: ['alertas'] })
      queryClient.invalidateQueries({ queryKey: ['conteo-detalle'] })

      // Mensaje diferente para edición vs ejecución normal
      if (variables.es_edicion) {
        toast.success(
          'Conteo Editado',
          response.message || 'Los cambios han sido guardados correctamente'
        )
      } else {
        toast.success(
          'Conteo Completado',
          response.message || 'El conteo se ha ejecutado exitosamente'
        )
      }
    },
    onError: (error, variables) => {
      const errorTitle = variables.es_edicion ? 'Error al Editar Conteo' : 'Error al Ejecutar Conteo'
      toast.error(
        errorTitle,
        error.message || 'No se pudo procesar el conteo. Intenta nuevamente.'
      )
    }
  })

  // Eliminar conteo
  const eliminarConteo = useMutation({
    mutationFn: async (conteoId) => {
      return await dataService.deleteConteo(conteoId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conteos'] })
      queryClient.invalidateQueries({ queryKey: ['inventario'] })
      toast.success(
        'Conteo Eliminado',
        'El conteo se ha eliminado exitosamente'
      )
    },
    onError: (error) => {
      toast.error(
        'Error al Eliminar',
        error.message || 'No se pudo eliminar el conteo. Intenta nuevamente.'
      )
    }
  })

  // Cancelar conteo
  const cancelarConteo = useMutation({
    mutationFn: async (data) => {
      return await dataService.cancelarConteo(data)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['conteos'] })
      queryClient.invalidateQueries({ queryKey: ['alertas'] })
      toast.success(
        'Conteo Cancelado',
        response.message || 'El conteo se ha cancelado exitosamente'
      )
    },
    onError: (error) => {
      toast.error(
        'Error al Cancelar',
        error.message || 'No se pudo cancelar el conteo. Intenta nuevamente.'
      )
    }
  })

  // Eliminar detalle de conteo (producto individual)
  const eliminarDetalleConteo = useMutation({
    mutationFn: async (detalleId) => {
      return await dataService.deleteDetalleConteo(detalleId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conteo-detalle'] })
      toast.success('Producto Eliminado', 'El producto fue eliminado del conteo')
    },
    onError: (error) => {
      toast.error('Error', error.message || 'No se pudo eliminar el producto del conteo')
    }
  })

  // Estadísticas de conteos
  const getEstadisticas = () => {
    const pendientes = conteosConNombres.filter(c => c.estado === 'PENDIENTE').length
    const enProgreso = conteosConNombres.filter(c => c.estado === 'EN_PROGRESO').length
    const completados = conteosConNombres.filter(c => c.estado === 'COMPLETADO' || c.estado === 'PARCIALMENTE_COMPLETADO').length
    const cancelados = conteosConNombres.filter(c => c.estado === 'CANCELADO').length
    const total = conteosConNombres.length

    return {
      total,
      pendientes,
      enProgreso,
      completados,
      cancelados
    }
  }

  return {
    conteos: conteosConNombres,
    ubicaciones,
    isLoading,
    error,
    refetch,
    crearConteo: crearConteo.mutate,
    isCreando: crearConteo.isPending,
    iniciarConteo: iniciarConteo.mutate,
    isIniciando: iniciarConteo.isPending,
    ejecutarConteo: ejecutarConteo.mutate,
    isEjecutando: ejecutarConteo.isPending,
    eliminarConteo: eliminarConteo.mutate,
    isEliminando: eliminarConteo.isPending,
    cancelarConteo: cancelarConteo.mutate,
    isCancelando: cancelarConteo.isPending,
    eliminarDetalleConteo: eliminarDetalleConteo.mutate,
    isEliminandoDetalle: eliminarDetalleConteo.isPending,
    estadisticas: getEstadisticas()
  }
}

export default useConteos
