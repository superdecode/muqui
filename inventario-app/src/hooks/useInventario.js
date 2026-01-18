import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import { mockInventario, mockProductos } from '../data/mockData'

const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true'

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
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        // Simular delay de red
        await new Promise(resolve => setTimeout(resolve, 500))
        return ubicacionId
          ? mockInventario.filter(item => item.ubicacion_id === ubicacionId)
          : mockInventario
      }
      return api.getInventario(ubicacionId, tipoUbicacion)
    },
    enabled: !!ubicacionId || ubicacionId === undefined
  })

  // Obtener productos
  const {
    data: productos = []
  } = useQuery({
    queryKey: ['productos'],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 300))
        return mockProductos
      }
      return api.getProductos()
    }
  })

  // Ajustar inventario
  const ajustarInventario = useMutation({
    mutationFn: async (data) => {
      if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 500))
        return { success: true, message: 'Inventario ajustado correctamente' }
      }
      return api.ajustarInventario(data)
    },
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
