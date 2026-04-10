import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dataService from '../services/dataService'

export function useRecetarios() {
  const queryClient = useQueryClient()

  const { data: recetarios = [], isLoading, error, refetch } = useQuery({
    queryKey: ['recetarios'],
    queryFn: () => dataService.getRecetarios(),
    staleTime: 5 * 60 * 1000
  })

  const crearRecetario = useMutation({
    mutationFn: (data) => dataService.createRecetario(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recetarios'] })
  })

  const actualizarRecetario = useMutation({
    mutationFn: ({ id, data }) => dataService.updateRecetario(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recetarios'] })
  })

  const eliminarRecetario = useMutation({
    mutationFn: (id) => dataService.deleteRecetario(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recetarios'] })
  })

  const importarRecetarios = useMutation({
    mutationFn: (recetarios) => dataService.batchCreateRecetarios(recetarios),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recetarios'] })
  })

  return {
    recetarios,
    isLoading,
    error,
    refetch,
    crearRecetario,
    actualizarRecetario,
    eliminarRecetario,
    importarRecetarios
  }
}

export default useRecetarios
