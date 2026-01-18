import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import { mockTransferencias } from '../data/mockData'

const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true'

export const useTransferencias = (ubicacionId) => {
  const queryClient = useQueryClient()

  // Obtener transferencias
  const {
    data: transferencias = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['transferencias', ubicacionId],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 500))
        return ubicacionId
          ? mockTransferencias.filter(
              t => t.origen_id === ubicacionId || t.destino_id === ubicacionId
            )
          : mockTransferencias
      }
      return api.getTransferencias(ubicacionId)
    }
  })

  // Crear transferencia
  const crearTransferencia = useMutation({
    mutationFn: async (data) => {
      if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 800))
        return {
          success: true,
          message: 'Transferencia creada correctamente',
          id: Date.now()
        }
      }
      return api.createTransferencia(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['transferencias'])
    }
  })

  // Confirmar transferencia
  const confirmarTransferencia = useMutation({
    mutationFn: async (data) => {
      if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 800))
        return {
          success: true,
          message: 'Transferencia confirmada correctamente'
        }
      }
      return api.confirmarTransferencia(data)
    },
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
