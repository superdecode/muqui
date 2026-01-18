import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dataService from '../services/dataService'
import { useToastStore } from '../stores/toastStore'

export const useConteos = (ubicacionId) => {
  const queryClient = useQueryClient()
  const toast = useToastStore()

  // Obtener conteos
  const {
    data: conteos = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['conteos', ubicacionId],
    queryFn: () => dataService.getConteos(ubicacionId)
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

  // Estadísticas de conteos
  const getEstadisticas = () => {
    const pendientes = conteos.filter(c => c.estado === 'PENDIENTE').length
    const enProgreso = conteos.filter(c => c.estado === 'EN_PROGRESO').length
    const completados = conteos.filter(c => c.estado === 'COMPLETADO').length
    const total = conteos.length

    return {
      total,
      pendientes,
      enProgreso,
      completados
    }
  }

  return {
    conteos,
    isLoading,
    error,
    refetch,
    crearConteo: crearConteo.mutate,
    isCreando: crearConteo.isPending,
    ejecutarConteo: ejecutarConteo.mutate,
    isEjecutando: ejecutarConteo.isPending,
    estadisticas: getEstadisticas()
  }
}

export default useConteos
