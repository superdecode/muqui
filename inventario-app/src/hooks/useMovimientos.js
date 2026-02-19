import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dataService from '../services/dataService'
import { useToastStore } from '../stores/toastStore'
import { triggerTransferenciaRecibida, triggerStockBajo } from '../services/notificationService'

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

  // Obtener movimientos (transferencias + ventas + mermas) con nombres de ubicación
  const {
    data: movimientosConNombres = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['movimientos', ubicacionId],
    queryFn: async () => {
      const [movimientos, ventas, mermas, ubicacionesData] = await Promise.all([
        dataService.getMovimientos(ubicacionId || null),
        dataService.getVentas().catch(() => []),
        dataService.getMermas().catch(() => []),
        dataService.getUbicaciones()
      ])

      // Ensure tipo_movimiento is set on transferencias
      const transferencias = movimientos.map(m => ({
        ...m,
        tipo_movimiento: m.tipo_movimiento || 'TRANSFERENCIA'
      }))

      // Merge all movement types
      const allMovimientos = [
        ...transferencias,
        ...ventas.map(v => ({ ...v, tipo_movimiento: 'VENTA' })),
        ...mermas.map(m => ({ ...m, tipo_movimiento: 'MERMA' }))
      ]

      // Filtrar por ubicación si se especifica
      const movimientosFiltrados = ubicacionId
        ? allMovimientos.filter(
            m => m.origen_id === ubicacionId || m.destino_id === ubicacionId
          )
        : allMovimientos

      // Agregar nombres de ubicación
      return movimientosFiltrados.map(movimiento => ({
        ...movimiento,
        origen_nombre: ubicacionesData.find(u => u.id === movimiento.origen_id)?.nombre || movimiento.origen_id,
        destino_nombre: ubicacionesData.find(u => u.id === movimiento.destino_id)?.nombre || movimiento.destino_id
      }))
    }
  })

  // Fetch usuarios for notification targeting
  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => dataService.getUsuarios()
  })

  // Crear movimiento/transferencia
  const crearMovimiento = useMutation({
    mutationFn: async (data) => {
      return await dataService.createTransferencia(data)
    },
    onSuccess: async (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['movimientos'] })
      queryClient.invalidateQueries({ queryKey: ['inventario'] })
      queryClient.invalidateQueries({ queryKey: ['alertas'] })
      toast.success(
        'Movimiento Creado',
        response.message || 'El movimiento se ha creado exitosamente'
      )
      // Notificaciones ahora se crean automáticamente en el backend (firestoreService.createTransferencia)
    },
    onError: (error) => {
      toast.error(
        'Error al Crear Movimiento',
        error.message || 'No se pudo crear el movimiento. Intenta nuevamente.'
      )
    }
  })

  // Iniciar recepción (PENDIENTE -> EN_PROCESO)
  const iniciarRecepcion = useMutation({
    mutationFn: async (data) => {
      return await dataService.iniciarRecepcion(data)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['movimientos'] })
      toast.success(
        'Recepción Iniciada',
        response.message || 'Se está verificando la mercancía recibida'
      )
    },
    onError: (error) => {
      toast.error(
        'Error al Iniciar Recepción',
        error.message || 'No se pudo iniciar la recepción.'
      )
    }
  })

  // Confirmar movimiento/transferencia -> COMPLETADO
  const confirmarMovimiento = useMutation({
    mutationFn: async (data) => {
      return await dataService.confirmarTransferencia(data)
    },
    onSuccess: async (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['movimientos'] })
      queryClient.invalidateQueries({ queryKey: ['inventario'] })
      queryClient.invalidateQueries({ queryKey: ['alertas'] })
      toast.success(
        'Recepción Confirmada',
        response.message || 'La mercancía ha sido recibida y el inventario actualizado'
      )

      // Check stock levels at origin and trigger alerts if below minimum
      try {
        const movimiento = movimientosConNombres.find(m => m.id === variables.movimiento_id)
        if (movimiento?.origen_id) {
          const [inventarioOrigen, productos] = await Promise.all([
            dataService.getInventario(movimiento.origen_id),
            dataService.getProductos()
          ])
          const origenUbicacion = ubicaciones.find(u => u.id === movimiento.origen_id)
          const productosStockBajo = []

          for (const inv of inventarioOrigen) {
            const producto = productos.find(p => p.id === inv.producto_id)
            if (!producto) continue
            const stockMinimo = parseInt(producto.stock_minimo) || 0
            if (stockMinimo > 0 && inv.stock_actual <= stockMinimo) {
              productosStockBajo.push({
                ...producto,
                stock_actual: inv.stock_actual,
                stock_minimo: stockMinimo
              })
            }
          }

          if (productosStockBajo.length > 0) {
            // Find users assigned to the origin location
            const usuariosOrigen = usuarios.filter(u => {
              if (u.estado && u.estado !== 'ACTIVO') return false
              let asignadas = []
              if (Array.isArray(u.ubicaciones_asignadas)) asignadas = u.ubicaciones_asignadas
              else if (typeof u.ubicaciones_asignadas === 'string') {
                try { asignadas = JSON.parse(u.ubicaciones_asignadas) } catch { asignadas = [] }
              }
              return asignadas.includes(movimiento.origen_id)
            }).map(u => u.codigo || u.id)

            // Include admin users
            const adminUserIds = usuarios.filter(u => {
              if (u.estado && u.estado !== 'ACTIVO') return false
              return u.rol === 'ADMIN_GLOBAL' || u.rol === 'ADMIN_EMPRESA'
            }).map(u => u.codigo || u.id)

            const stockBajoRecipients = [...new Set([...usuariosOrigen, ...adminUserIds])]

            await triggerStockBajo({
              producto: productosStockBajo,
              ubicacion: origenUbicacion,
              stockActual: productosStockBajo[0]?.stock_actual,
              stockMinimo: productosStockBajo[0]?.stock_minimo,
              usuariosDestino: stockBajoRecipients
            })
          }
        }
      } catch (alertError) {
        console.warn('Error checking stock alerts after transfer:', alertError)
      }
    },
    onError: (error) => {
      toast.error(
        'Error al Confirmar',
        error.message || 'No se pudo confirmar la recepción. Intenta nuevamente.'
      )
    }
  })

  // Cancelar movimiento
  const cancelarMovimiento = useMutation({
    mutationFn: async (data) => {
      return await dataService.cancelarMovimiento(data)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['movimientos'] })
      toast.success(
        'Movimiento Cancelado',
        response.message || 'El movimiento ha sido cancelado'
      )
    },
    onError: (error) => {
      toast.error(
        'Error al Cancelar',
        error.message || 'No se pudo cancelar el movimiento.'
      )
    }
  })

  // Eliminar movimiento
  const eliminarMovimiento = useMutation({
    mutationFn: async (movimientoId) => {
      return await dataService.deleteMovimiento(movimientoId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimientos'] })
      queryClient.invalidateQueries({ queryKey: ['inventario'] })
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

  // Normalizar estado para comparación
  const normalizeEstado = (estado) => {
    if (!estado) return ''
    const s = estado.toString().toUpperCase().trim()
    if (s === 'COMPLETADO' || s === 'COMPLETADA') return 'COMPLETADO'
    if (s === 'PARCIAL') return 'PARCIAL'
    if (s === 'RECIBIENDO') return 'RECIBIENDO'
    if (s.startsWith('CONFIRM')) return 'COMPLETADO'
    if (s.startsWith('CANCEL')) return 'CANCELADA'
    if (s.startsWith('PENDIEN')) return 'PENDIENTE'
    return s
  }

  // Crear venta
  const crearVenta = useMutation({
    mutationFn: async (data) => {
      return await dataService.createVenta(data)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['movimientos'] })
      queryClient.invalidateQueries({ queryKey: ['inventario'] })
      queryClient.invalidateQueries({ queryKey: ['ventas'] })
      toast.success('Venta Registrada', response.message || 'La venta se ha registrado exitosamente')
    },
    onError: (error) => {
      toast.error('Error al Registrar Venta', error.message || 'No se pudo registrar la venta.')
    }
  })

  // Crear merma
  const crearMerma = useMutation({
    mutationFn: async (data) => {
      return await dataService.createMerma(data)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['movimientos'] })
      queryClient.invalidateQueries({ queryKey: ['inventario'] })
      queryClient.invalidateQueries({ queryKey: ['mermas'] })
      toast.success('Merma Registrada', response.message || 'La merma se ha registrado exitosamente')
    },
    onError: (error) => {
      toast.error('Error al Registrar Merma', error.message || 'No se pudo registrar la merma.')
    }
  })

  // Estadísticas de movimientos (global)
  const getEstadisticas = () => {
    const pendientes = movimientosConNombres.filter(m => normalizeEstado(m.estado) === 'PENDIENTE').length
    const recibiendo = movimientosConNombres.filter(m => normalizeEstado(m.estado) === 'RECIBIENDO').length
    const completados = movimientosConNombres.filter(m => normalizeEstado(m.estado) === 'COMPLETADO').length
    const canceladas = movimientosConNombres.filter(m => normalizeEstado(m.estado) === 'CANCELADA').length
    const total = movimientosConNombres.length

    // Estadísticas por tipo de movimiento
    const transferencias = movimientosConNombres.filter(m => (m.tipo_movimiento || '').toUpperCase() === 'TRANSFERENCIA').length
    const ventas = movimientosConNombres.filter(m => (m.tipo_movimiento || '').toUpperCase() === 'VENTA').length
    const mermas = movimientosConNombres.filter(m => (m.tipo_movimiento || '').toUpperCase() === 'MERMA').length

    return {
      total,
      pendientes,
      recibiendo,
      completados,
      canceladas,
      transferencias,
      ventas,
      mermas
    }
  }

  // Estadísticas filtradas por dirección (salida vs recepcion)
  const getEstadisticasPorDireccion = (direction, userLocationIds = []) => {
    const filtered = movimientosConNombres.filter(m => {
      if (direction === 'salida') {
        // Salidas: usuario es ORIGEN
        return userLocationIds.length === 0 || userLocationIds.includes(m.origen_id)
      } else if (direction === 'recepcion') {
        // Recepciones: solo TRANSFERENCIAS donde usuario es DESTINO
        // Ventas y Mermas no tienen recepción (son unidireccionales)
        return (m.tipo_movimiento || '').toUpperCase() === 'TRANSFERENCIA' &&
               (userLocationIds.length === 0 || userLocationIds.includes(m.destino_id))
      }
      return true
    })

    return {
      total: filtered.length,
      pendientes: filtered.filter(m => normalizeEstado(m.estado) === 'PENDIENTE').length,
      completados: filtered.filter(m => normalizeEstado(m.estado) === 'COMPLETADO').length,
      canceladas: filtered.filter(m => normalizeEstado(m.estado) === 'CANCELADA').length,
      parciales: filtered.filter(m => normalizeEstado(m.estado) === 'PARCIAL').length,
      // Breakdown por tipo (para filtro en Salidas)
      transferencias: filtered.filter(m => (m.tipo_movimiento || '').toUpperCase() === 'TRANSFERENCIA').length,
      ventas: filtered.filter(m => (m.tipo_movimiento || '').toUpperCase() === 'VENTA').length,
      mermas: filtered.filter(m => (m.tipo_movimiento || '').toUpperCase() === 'MERMA').length
    }
  }

  // Estadísticas para AMBAS direcciones simultáneamente (para tarjetas interactivas)
  const getAllDirectionStats = (userLocationIds = []) => {
    // Filtrar movimientos de salida (usuario es ORIGEN)
    const salidaMovs = movimientosConNombres.filter(m =>
      userLocationIds.length === 0 || userLocationIds.includes(m.origen_id)
    )

    // Filtrar movimientos de recepción (solo TRANSFERENCIAS donde usuario es DESTINO)
    const recepcionMovs = movimientosConNombres.filter(m =>
      (m.tipo_movimiento || '').toUpperCase() === 'TRANSFERENCIA' &&
      (userLocationIds.length === 0 || userLocationIds.includes(m.destino_id))
    )

    return {
      salidasCompletadas: salidaMovs.filter(m => normalizeEstado(m.estado) === 'COMPLETADO').length,
      salidasPendientes: salidaMovs.filter(m => normalizeEstado(m.estado) === 'PENDIENTE').length,
      recepcionesCompletadas: recepcionMovs.filter(m => normalizeEstado(m.estado) === 'COMPLETADO').length,
      recepcionesPorRecibir: recepcionMovs.filter(m => normalizeEstado(m.estado) === 'PENDIENTE').length
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
    iniciarRecepcion: iniciarRecepcion.mutate,
    isIniciandoRecepcion: iniciarRecepcion.isPending,
    confirmarMovimiento: confirmarMovimiento.mutate,
    isConfirmando: confirmarMovimiento.isPending,
    cancelarMovimiento: cancelarMovimiento.mutate,
    isCancelando: cancelarMovimiento.isPending,
    eliminarMovimiento: eliminarMovimiento.mutate,
    isEliminando: eliminarMovimiento.isPending,
    crearVenta: crearVenta.mutate,
    isCreandoVenta: crearVenta.isPending,
    crearMerma: crearMerma.mutate,
    isCreandoMerma: crearMerma.isPending,
    normalizeEstado,
    estadisticas: getEstadisticas(),
    getEstadisticasPorDireccion,
    getAllDirectionStats
  }
}

export default useMovimientos
