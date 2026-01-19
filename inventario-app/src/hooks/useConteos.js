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
      const conteos = await dataService.getConteos(ubicacionId)
      const ubicacionesData = await dataService.getUbicaciones()
      
      // Agregar nombres de ubicación
      return conteos.map(conteo => ({
        ...conteo,
        ubicacion_nombre: ubicacionesData.find(u => u.id === conteo.ubicacion_id)?.nombre || conteo.ubicacion_id
      }))
    }
  })

  // Crear/programar conteo
  const crearConteo = useMutation({
    mutationFn: async (data) => {
      return await dataService.createConteo(data)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries(['conteos'])
      queryClient.invalidateQueries(['alertas'])
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

  // Ejecutar conteo (completar)
  const ejecutarConteo = useMutation({
    mutationFn: async (data) => {
      return await dataService.ejecutarConteo(data)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries(['conteos'])
      queryClient.invalidateQueries(['inventario'])
      queryClient.invalidateQueries(['alertas'])
      toast.success(
        'Conteo Completado',
        response.message || 'El conteo se ha ejecutado exitosamente'
      )
    },
    onError: (error) => {
      toast.error(
        'Error al Ejecutar Conteo',
        error.message || 'No se pudo ejecutar el conteo. Intenta nuevamente.'
      )
    }
  })

  // Eliminar conteo
  const eliminarConteo = useMutation({
    mutationFn: async (conteoId) => {
      return await dataService.deleteConteo(conteoId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['conteos'])
      queryClient.invalidateQueries(['inventario'])
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

  // Estadísticas de conteos
  const getEstadisticas = () => {
    const pendientes = conteosConNombres.filter(c => c.estado === 'PENDIENTE').length
    const enProgreso = conteosConNombres.filter(c => c.estado === 'EN_PROGRESO').length
    const completados = conteosConNombres.filter(c => c.estado === 'COMPLETADO').length
    const total = conteosConNombres.length

    return {
      total,
      pendientes,
      enProgreso,
      completados
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
    ejecutarConteo: ejecutarConteo.mutate,
    isEjecutando: ejecutarConteo.isPending,
    eliminarConteo: eliminarConteo.mutate,
    isEliminando: eliminarConteo.isPending,
    estadisticas: getEstadisticas()
  }
}

export default useConteos
