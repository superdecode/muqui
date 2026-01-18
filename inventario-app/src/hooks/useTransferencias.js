import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dataService from '../services/dataService'

export const useTransferencias = (ubicacionId) => {
  const queryClient = useQueryClient()

  // Obtener transferencias (ahora llamado movimientos)
  const {
    data: transferencias = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['transferencias', ubicacionId],
    queryFn: async () => {
      const movimientos = await dataService.getMovimientos(ubicacionId)
      // Filtrar por ubicación si se especifica
      return ubicacionId
        ? movimientos.filter(
            t => t.origen_id === ubicacionId || t.destino_id === ubicacionId
          )
        : movimientos
    }
  })

  // Crear transferencia
  const crearTransferencia = useMutation({
    mutationFn: (data) => dataService.createTransferencia(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['transferencias'])
    }
  })

  // Confirmar transferencia
  const confirmarTransferencia = useMutation({
    mutationFn: (data) => dataService.confirmarTransferencia(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['transferencias'])
      queryClient.invalidateQueries(['inventario'])
      queryClient.invalidateQueries(['alertas'])
    }
  })

  return {
    transferencias,
    isLoading,
    error,
    refetch,
    crearTransferencia: crearTransferencia.mutate,
    isCreando: crearTransferencia.isPending,
    confirmarTransferencia: confirmarTransferencia.mutate,
    isConfirmando: confirmarTransferencia.isPending
  }
}

export default useTransferencias
