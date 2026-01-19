import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dataService from '../services/dataService'
import { useToastStore } from '../stores/toastStore'

export const useMovimientos = (ubicacionId) => {
  const queryClient = useQueryClient()
  const toast = useToastStore()

  // Obtener ubicaciones
  const {
    data: ubicaciones = []
  } = useQuery({
    queryKey: ['ubicaciones'],
    queryFn: () => dataService.getUbicaciones()
  })

  // Obtener movimientos con nombres de ubicación
  const {
    data: movimientosConNombres = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['movimientos', ubicacionId],
    queryFn: async () => {
      const movimientos = await dataService.getMovimientos(ubicacionId)
      const ubicacionesData = await dataService.getUbicaciones()
      
      // Filtrar por ubicación si se especifica
      const movimientosFiltrados = ubicacionId
        ? movimientos.filter(
            m => m.origen_id === ubicacionId || m.destino_id === ubicacionId
          )
        : movimientos
      
      // Agregar nombres de ubicación
      return movimientosFiltrados.map(movimiento => ({
        ...movimiento,
        origen_nombre: ubicacionesData.find(u => u.id === movimiento.origen_id)?.nombre || movimiento.origen_id,
        destino_nombre: ubicacionesData.find(u => u.id === movimiento.destino_id)?.nombre || movimiento.destino_id
      }))
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

  // Eliminar movimiento
  const eliminarMovimiento = useMutation({
    mutationFn: async (movimientoId) => {
      return await dataService.deleteMovimiento(movimientoId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['movimientos'])
      queryClient.invalidateQueries(['inventario'])
      toast.success(
        'Movimiento Eliminado',
        'El movimiento se ha eliminado exitosamente'
      )
    },
    onError: (error) => {
      toast.error(
        'Error al Eliminar',
        error.message || 'No se pudo eliminar el movimiento. Intenta nuevamente.'
      )
    }
  })

  // Estadísticas de movimientos
  const getEstadisticas = () => {
    const pendientes = movimientosConNombres.filter(m => m.estado === 'PENDIENTE').length
    const confirmadas = movimientosConNombres.filter(m => m.estado === 'CONFIRMADA').length
    const canceladas = movimientosConNombres.filter(m => m.estado === 'CANCELADA').length
    const total = movimientosConNombres.length

    return {
      total,
      pendientes,
      confirmadas,
      canceladas
    }
  }

  return {
    movimientos: movimientosConNombres,
    ubicaciones,
    isLoading,
    error,
    refetch,
    crearMovimiento: crearMovimiento.mutate,
    isCreando: crearMovimiento.isPending,
    confirmarMovimiento: confirmarMovimiento.mutate,
    isConfirmando: confirmarMovimiento.isPending,
    eliminarMovimiento: eliminarMovimiento.mutate,
    isEliminando: eliminarMovimiento.isPending,
    estadisticas: getEstadisticas()
  }
}

export default useMovimientos
