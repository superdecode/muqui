import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dataService from '../services/dataService'
import { useToastStore } from '../stores/toastStore'

export const useMovimientos = (ubicacionId) => {
  const queryClient = useQueryClient()
  const toast = useToastStore()

  // Obtener movimientos
  const {
    data: movimientos = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['movimientos', ubicacionId],
    queryFn: async () => {
      const movimientos = await dataService.getMovimientos(ubicacionId)
      // Filtrar por ubicación si se especifica
      return ubicacionId
        ? movimientos.filter(
            m => m.origen_id === ubicacionId || m.destino_id === ubicacionId
          )
        : movimientos
    }
  })

  // Crear movimiento/transferencia
  const crearMovimiento = useMutation({
    mutationFn: async (data) => {
      return await dataService.createTransferencia(data)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries(['movimientos'])
      queryClient.invalidateQueries(['inventario'])
      queryClient.invalidateQueries(['alertas'])
      toast.success(
        'Movimiento Creado',
        response.message || 'El movimiento se ha creado exitosamente'
      )
    },
    onError: (error) => {
      toast.error(
        'Error al Crear Movimiento',
        error.message || 'No se pudo crear el movimiento. Intenta nuevamente.'
      )
    }
  })

  // Confirmar movimiento/transferencia
  const confirmarMovimiento = useMutation({
    mutationFn: async (data) => {
      return await dataService.confirmarTransferencia(data)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries(['movimientos'])
      queryClient.invalidateQueries(['inventario'])
      queryClient.invalidateQueries(['alertas'])
      toast.success(
        'Movimiento Confirmado',
        response.message || 'El movimiento se ha confirmado exitosamente'
      )
    },
    onError: (error) => {
      toast.error(
        'Error al Confirmar',
        error.message || 'No se pudo confirmar el movimiento. Intenta nuevamente.'
      )
    }
  })

  // Estadísticas de movimientos
  const getEstadisticas = () => {
    const pendientes = movimientos.filter(m => m.estado === 'PENDIENTE').length
    const confirmadas = movimientos.filter(m => m.estado === 'CONFIRMADA').length
    const canceladas = movimientos.filter(m => m.estado === 'CANCELADA').length
    const total = movimientos.length

    return {
      total,
      pendientes,
      confirmadas,
      canceladas
    }
  }

  return {
    movimientos,
    isLoading,
    error,
    refetch,
    crearMovimiento: crearMovimiento.mutate,
    isCreando: crearMovimiento.isPending,
    confirmarMovimiento: confirmarMovimiento.mutate,
    isConfirmando: confirmarMovimiento.isPending,
    estadisticas: getEstadisticas()
  }
}

export default useMovimientos
