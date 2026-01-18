import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dataService from '../services/dataService'

export const useInventario = (ubicacionId, tipoUbicacion) => {
  const queryClient = useQueryClient()

  // Obtener inventario
  const {
    data: inventario = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['inventario', ubicacionId, tipoUbicacion],
    queryFn: () => dataService.getInventario(ubicacionId, tipoUbicacion),
    enabled: !!ubicacionId || ubicacionId === undefined
  })

  // Obtener productos
  const {
    data: productos = []
  } = useQuery({
    queryKey: ['productos'],
    queryFn: () => dataService.getProductos()
  })

  // Ajustar inventario
  const ajustarInventario = useMutation({
    mutationFn: (data) => dataService.ajustarInventario(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['inventario'])
    }
  })

  return {
    inventario,
    productos,
    isLoading,
    error,
    refetch,
    ajustarInventario: ajustarInventario.mutate,
    isAjustando: ajustarInventario.isPending
  }
}

export default useInventario
