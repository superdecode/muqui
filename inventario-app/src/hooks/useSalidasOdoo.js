import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dataService from '../services/dataService'

export function useSalidasOdoo() {
  const queryClient = useQueryClient()

  const { data: recetas = [], isLoading, error, refetch } = useQuery({
    queryKey: ['salidas_odoo_recetas'],
    queryFn: () => dataService.getRecetas(),
    staleTime: 5 * 60 * 1000
  })

  const crearReceta = useMutation({
    mutationFn: (data) => dataService.createReceta(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salidas_odoo_recetas'] })
  })

  const actualizarReceta = useMutation({
    mutationFn: ({ id, data }) => dataService.updateReceta(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salidas_odoo_recetas'] })
  })

  const eliminarReceta = useMutation({
    mutationFn: (id) => dataService.deleteReceta(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salidas_odoo_recetas'] })
  })

  const importarRecetas = useMutation({
    mutationFn: (recetas) => dataService.batchCreateRecetas(recetas),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salidas_odoo_recetas'] })
  })

  return {
    recetas,
    isLoading,
    error,
    refetch,
    crearReceta,
    actualizarReceta,
    eliminarReceta,
    importarRecetas
  }
}

export default useSalidasOdoo
