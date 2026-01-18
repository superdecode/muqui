import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAlertasStore } from '../stores/alertasStore'
import api from '../services/api'
import { mockAlertas } from '../data/mockData'

const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true'

export const useAlertas = (usuarioId) => {
  const queryClient = useQueryClient()
  const { setAlertas, marcarComoLeida, marcarComoResuelta } = useAlertasStore()

  // Obtener alertas
  const {
    data: alertas = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['alertas', usuarioId],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 400))
        return mockAlertas
      }
      return api.getAlertas(usuarioId)
    },
    refetchInterval: 60000 // Refetch cada minuto
  })

  // Actualizar store cuando cambien las alertas
  useEffect(() => {
    if (alertas.length > 0) {
      setAlertas(alertas)
    }
  }, [alertas, setAlertas])

  // Marcar como leída
  const marcarLeida = useMutation({
    mutationFn: async (alertaId) => {
      if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 200))
        return { success: true }
      }
      return api.marcarAlertaLeida(alertaId)
    },
    onSuccess: (_, alertaId) => {
      marcarComoLeida(alertaId)
      queryClient.invalidateQueries(['alertas'])
    }
  })

  // Marcar como resuelta
  const marcarResuelta = useMutation({
    mutationFn: async (alertaId) => {
      if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 200))
        return { success: true }
      }
      return api.marcarAlertaResuelta(alertaId)
    },
    onSuccess: (_, alertaId) => {
      marcarComoResuelta(alertaId)
      queryClient.invalidateQueries(['alertas'])
    }
  })

  return {
    alertas,
    isLoading,
    error,
    refetch,
    marcarLeida: marcarLeida.mutate,
    marcarResuelta: marcarResuelta.mutate
  }
}

export default useAlertas
