import { useState, useMemo, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Package, Plus, ArrowRightLeft, Download, CheckCircle, Clock, XCircle, Trash2, AlertTriangle, RefreshCw, Search, ArrowUpRight, ArrowDownLeft, Loader, PackageCheck, Eye, ShoppingCart, TrendingDown } from 'lucide-react'
import Card from '../components/common/Card'
import DataTable from '../components/common/DataTable'
import Button from '../components/common/Button'
import LoadingSpinner from '../components/common/LoadingSpinner'
import TransferenciaForm from '../components/transferencias/TransferenciaForm'
import TransferenciaDetail from '../components/transferencias/TransferenciaDetail'
import useMovimientos from '../hooks/useMovimientos'
import { useAuthStore } from '../stores/authStore'
import { usePermissions } from '../hooks/usePermissions'
import { useToastStore } from '../stores/toastStore'
import { exportMovimientosToCSV } from '../utils/exportUtils'
import { safeFormatDate, formatDisplayId } from '../utils/formatters'
import { getUserAllowedUbicacionIds } from '../utils/userFilters'
import dataService from '../services/dataService'

export default function Movimientos() {
  const location = useLocation()
  const [directionTab, setDirectionTab] = useState('salida')
  const [statusTab, setStatusTab] = useState('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [sedeFilter, setSedeFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [selectedMovimiento, setSelectedMovimiento] = useState(null)
  const [tipoSalidaFilter, setTipoSalidaFilter] = useState('')

  const { user } = useAuthStore()
  const { canEdit, isReadOnly, isAdmin } = usePermissions()
  const toast = useToastStore()

  // Permission checks for this module
  const canWriteMovimientos = canEdit('movimientos')
  const isReadOnlyMovimientos = isReadOnly('movimientos')
  const esAdmin = isAdmin()

  // Leer parámetros de URL al montar (ej: desde notificaciones)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const tab = params.get('tab')
    const filtro = params.get('filtro')
    if (tab === 'recepcion') {
      setDirectionTab('recepcion')
      if (filtro === 'pendiente') setStatusTab('pendientes')
    }
  }, [location.search])

  const { data: empresas = [] } = useQuery({
    queryKey: ['empresas'],
    queryFn: () => dataService.getEmpresas()
  })

  const {
    movimientos,
    ubicaciones,
    isLoading,
    error,
    refetch,
    crearMovimiento,
    isCreando,
    confirmarMovimiento,
    isConfirmando,
    cancelarMovimiento,
    isCancelando,
    eliminarMovimiento,
    isEliminando,
    crearVenta,
    isCreandoVenta,
    crearMerma,
    isCreandoMerma,
    normalizeEstado,
    getAllDirectionStats
  } = useMovimientos()

  // Get user's allowed locations
  const userUbicacionIds = useMemo(() => {
    return getUserAllowedUbicacionIds(user, ubicaciones, empresas)
  }, [user, ubicaciones, empresas])

  // Estadísticas para AMBAS direcciones (tarjetas interactivas)
  const allStats = useMemo(() => {
    return getAllDirectionStats(userUbicacionIds)
  }, [userUbicacionIds, movimientos])

  // Estado para tarjeta seleccionada (feedback visual)
  const [selectedCard, setSelectedCard] = useState(null)

  // Handler para click en tarjetas interactivas
  const handleCardClick = (direction, status) => {
    setDirectionTab(direction)
    setStatusTab(status)
    setSelectedCard(`${direction}-${status}`)
  }

  // Auto-set sede filter for single-location users
  const effectiveSedeFilter = (userUbicacionIds.length === 1 && !sedeFilter) ? userUbicacionIds[0] : sedeFilter

  // Ubicaciones for filter dropdown
  const ubicacionesFilter = useMemo(() => {
    if (esAdmin) return ubicaciones || []
    if (userUbicacionIds.length > 0) {
      return (ubicaciones || []).filter(u => userUbicacionIds.includes(u.id))
    }
    const ids = new Set()
    ;(movimientos || []).forEach(m => { if (m.origen_id) ids.add(m.origen_id); if (m.destino_id) ids.add(m.destino_id) })
    return (ubicaciones || []).filter(u => ids.has(u.id))
  }, [movimientos, ubicaciones, userUbicacionIds, esAdmin])

  // Auto-open sede filter when a transfer arrives from a sede not currently filtered
  useEffect(() => {
    if (!effectiveSedeFilter || esAdmin) return
    const pendingFromOtherSede = (movimientos || []).some(m => {
      const estado = normalizeEstado(m.estado)
      return estado === 'PENDIENTE' &&
        m.destino_id && userUbicacionIds.includes(m.destino_id) &&
        m.destino_id !== effectiveSedeFilter
    })
    if (pendingFromOtherSede && userUbicacionIds.length > 1) {
      setSedeFilter('')
    }
  }, [movimientos, effectiveSedeFilter, userUbicacionIds, esAdmin])

  const isReceiver = (mov) => {
    if (esAdmin) return true
    // userUbicacionIds vacío significa admin global sin restricciones
    if (userUbicacionIds.length === 0) return true
    return userUbicacionIds.includes(mov.destino_id)
  }

  // --- STATE LABELS DEPEND ON DIRECTION ---
  // Salidas: PENDIENTE -> "Pendiente", COMPLETADO -> "Completado"
  // Recepciones: PENDIENTE -> "Recibiendo", COMPLETADO -> "Completado"
  const getEstadoLabel = (estado, direction) => {
    const norm = normalizeEstado(estado)
    if (direction === 'recepcion') {
      if (norm === 'PENDIENTE') return 'Recibiendo'
      if (norm === 'PARCIAL') return 'Parcial'
      if (norm === 'COMPLETADO') return 'Completado'
      if (norm === 'CANCELADA') return 'Cancelada'
      return norm
    }
    if (norm === 'PENDIENTE') return 'Pendiente'
    if (norm === 'PARCIAL') return 'Parcial'
    if (norm === 'COMPLETADO') return 'Completado'
    if (norm === 'CANCELADA') return 'Cancelada'
    return norm
  }

  const getEstadoBadge = (estado, direction) => {
    const norm = normalizeEstado(estado)
    const label = getEstadoLabel(estado, direction)
    const map = {
      PENDIENTE: direction === 'recepcion'
        ? { color: 'bg-blue-100 text-blue-800', icon: Loader }
        : { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      PARCIAL: { color: 'bg-orange-100 text-orange-800', icon: PackageCheck },
      COMPLETADO: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      CANCELADA: { color: 'bg-red-100 text-red-800', icon: XCircle }
    }
    const cfg = map[norm] || map.PENDIENTE
    const Icon = cfg.icon
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
        <Icon size={14} />
        {label}
      </span>
    )
  }

  // --- STATUS TABS DEPEND ON DIRECTION ---
  const getStatusTabs = () => {
    if (directionTab === 'recepcion') {
      return [
        { id: 'todos', label: 'Todos' },
        { id: 'recibiendo', label: 'Recibiendo', matchEstado: 'PENDIENTE' },
        { id: 'completados', label: 'Completados', matchEstados: ['COMPLETADO', 'PARCIAL'] }
      ]
    }
    // salida
    return [
      { id: 'todos', label: 'Todos' },
      { id: 'pendientes', label: 'Pendientes', matchEstado: 'PENDIENTE' },
      { id: 'completados', label: 'Completados', matchEstado: 'COMPLETADO' }
    ]
  }

  // Reset status tab when direction changes
  useEffect(() => {
    setStatusTab('todos')
  }, [directionTab])

  // --- FILTERING LOGIC ---
  // Step 1: Filter by direction + sede + search + user assignments
  // IMPORTANT: Salidas = movimientos donde el origen es una sede del usuario (o todas si admin/sin ubicaciones)
  //            Recepciones = SOLO TRANSFERENCIAS donde el destino es una sede del usuario (o todas si admin/sin ubicaciones)
  const movimientosFiltradosPorDireccion = useMemo(() => {
    return (movimientos || []).filter(m => {
      // Si es admin o no tiene ubicaciones asignadas, ve todo (igual que estadísticas)
      const hasLocationRestriction = !esAdmin && userUbicacionIds.length > 0

      if (directionTab === 'salida') {
        // Para Salidas: el origen DEBE ser una sede del usuario (si tiene restricción)
        if (hasLocationRestriction && !userUbicacionIds.includes(m.origen_id)) return false

        // Filtro por tipo de salida (solo en tab Salidas)
        if (tipoSalidaFilter && (m.tipo_movimiento || '').toUpperCase() !== tipoSalidaFilter) return false
      }
      if (directionTab === 'recepcion') {
        // IMPORTANTE: En Recepciones, solo mostrar TRANSFERENCIAS
        // Ventas y Mermas son unidireccionales (no tienen recepción)
        if ((m.tipo_movimiento || '').toUpperCase() !== 'TRANSFERENCIA') return false

        // Para Recepciones: el destino DEBE ser una sede del usuario (si tiene restricción)
        if (hasLocationRestriction && !userUbicacionIds.includes(m.destino_id)) return false
      }

      // Sede filter: applies to the CORRECT field per direction
      if (effectiveSedeFilter) {
        if (directionTab === 'salida' && m.origen_id !== effectiveSedeFilter) return false
        if (directionTab === 'recepcion' && m.destino_id !== effectiveSedeFilter) return false
      }

      // Search filter
      if (searchTerm) {
        const s = searchTerm.toLowerCase()
        const matchSearch = (m.codigo_legible || '').toLowerCase().includes(s) ||
          (m.origen_nombre || '').toLowerCase().includes(s) ||
          (m.destino_nombre || '').toLowerCase().includes(s) ||
          (m.observaciones_creacion || '').toLowerCase().includes(s)
        if (!matchSearch) return false
      }

      return true
    })
  }, [movimientos, directionTab, effectiveSedeFilter, searchTerm, esAdmin, userUbicacionIds, tipoSalidaFilter])

  // Step 2: Apply status filter
  const movimientosFiltrados = useMemo(() => {
    return movimientosFiltradosPorDireccion.filter(m => {
      if (statusTab === 'todos') return true
      const estado = normalizeEstado(m.estado)
      const tabs = getStatusTabs()
      const activeTab = tabs.find(t => t.id === statusTab)
      if (activeTab?.matchEstado) return estado === activeTab.matchEstado
      if (activeTab?.matchEstados) return activeTab.matchEstados.includes(estado)
      return true
    })
  }, [movimientosFiltradosPorDireccion, statusTab, directionTab])

  // Compute counts for status tabs
  const statusTabsWithCounts = useMemo(() => {
    const tabs = getStatusTabs()
    return tabs.map(tab => ({
      ...tab,
      count: tab.id === 'todos'
        ? movimientosFiltradosPorDireccion.length
        : tab.matchEstado
          ? movimientosFiltradosPorDireccion.filter(m => normalizeEstado(m.estado) === tab.matchEstado).length
          : tab.matchEstados
            ? movimientosFiltradosPorDireccion.filter(m => tab.matchEstados.includes(normalizeEstado(m.estado))).length
            : 0
    }))
  }, [movimientosFiltradosPorDireccion, directionTab])

  // --- COLUMNS ---
  const columns = [
    {
      header: 'Código',
      accessor: 'codigo_legible',
      sortKey: 'codigo_legible',
      render: (value, row) => (
        <span className="font-mono text-sm font-semibold text-primary-600">{value || formatDisplayId(row, 'MV')}</span>
      )
    },
    {
      header: 'Fecha',
      accessor: 'fecha_creacion',
      sortKey: 'fecha_creacion',
      render: (value) => safeFormatDate(value, "d MMM yyyy")
    },
    {
      header: 'Tipo',
      accessor: 'tipo_movimiento',
      render: (value) => {
        const tipos = {
          TRANSFERENCIA: { color: 'bg-blue-100 text-blue-800', icon: ArrowRightLeft, label: 'Transferencia' },
          VENTA: { color: 'bg-emerald-100 text-emerald-800', icon: ShoppingCart, label: 'Venta' },
          MERMA: { color: 'bg-orange-100 text-orange-800', icon: TrendingDown, label: 'Merma' }
        }
        const cfg = tipos[value] || tipos.TRANSFERENCIA
        const Icon = cfg.icon
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
            <Icon size={12} />
            {cfg.label}
          </span>
        )
      }
    },
    {
      header: 'Bodega Origen',
      accessor: 'origen_nombre',
      sortKey: 'origen_nombre',
      render: (value) => <span className="text-sm font-medium">{value}</span>
    },
    {
      header: 'Bodega Destino',
      accessor: 'destino_nombre',
      sortKey: 'destino_nombre',
      render: (value, row) => {
        if (row.tipo_movimiento === 'VENTA') return <span className="text-sm font-medium">{row.beneficiario_nombre || value}</span>
        if (row.tipo_movimiento === 'MERMA') return <span className="text-sm font-medium">{row.causa_merma_nombre || '—'}</span>
        return <span className="text-sm font-medium">{value}</span>
      }
    },
    {
      header: 'Creado por',
      accessor: 'usuario_creacion_nombre',
      sortKey: 'usuario_creacion_nombre',
      render: (value) => <span className="text-sm font-medium">{value || '-'}</span>
    },
    {
      header: 'Estado',
      accessor: 'estado',
      sortKey: 'estado',
      render: (value) => getEstadoBadge(value, directionTab)
    },
    {
      header: 'Acciones',
      accessor: 'id',
      render: (value, row) => {
        const estado = normalizeEstado(row.estado)
        const recv = isReceiver(row)
        // Only receivers can confirm, only on PENDIENTE transfers in recepcion view
        const canConfirmar = estado === 'PENDIENTE' && recv && row.tipo_movimiento === 'TRANSFERENCIA' && canWriteMovimientos
        // SUPER-PRIVILEGIO: Solo Admin Global puede eliminar permanentemente movimientos
        const canDeleteRow = esAdmin && estado !== 'COMPLETADO'
        return (
          <div className="flex gap-2">
            {canConfirmar && directionTab === 'recepcion' && (
              <Button
                size="sm"
                variant="success"
                onClick={() => handleConfirmarDesdeTabla(row)}
              >
                Confirmar Recepción
              </Button>
            )}
            <button
              onClick={() => handleVer(row)}
              className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              title="Ver detalle"
            >
              <Eye size={18} />
            </button>
            {canDeleteRow && (
              <button
                onClick={() => handleEliminar(row)}
                className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Eliminar movimiento"
                disabled={isEliminando || isReadOnlyMovimientos}
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        )
      }
    }
  ]

  // --- HANDLERS ---
  const handleNuevoMovimiento = () => {
    setShowForm(true)
    setSelectedMovimiento(null)
  }

  const handleSaveMovimiento = async (movimientoData) => {
    const tipo = movimientoData.tipo_movimiento || 'TRANSFERENCIA'
    const dataToSave = {
      ...movimientoData,
      usuario_creacion_id: user?.id || 'USR001',
      tipo_movimiento: tipo
    }

    const onSuccessClose = { onSuccess: () => setShowForm(false) }

    if (tipo === 'VENTA') {
      crearVenta(dataToSave, onSuccessClose)
    } else if (tipo === 'MERMA') {
      crearMerma(dataToSave, onSuccessClose)
    } else {
      crearMovimiento(dataToSave, onSuccessClose)
    }
  }

  const handleConfirmar = async (movimiento, productosRecibidos = null, observacionesRecepcion = '') => {
    const data = {
      movimiento_id: movimiento.id,
      usuario_confirmacion_id: user?.id || 'USR001',
      observaciones: observacionesRecepcion || ''
    }
    if (productosRecibidos) {
      data.productos_recibidos = productosRecibidos
    }
    confirmarMovimiento(data, {
      onSuccess: () => {
        setShowDetail(false)
        setSelectedMovimiento(null)
      }
    })
  }

  const handleEliminar = async (movimiento) => {
    if (!window.confirm('¿Estás seguro de eliminar este movimiento? Esta acción no se puede deshacer.')) return
    eliminarMovimiento(movimiento.id)
  }

  const handleVer = (movimiento) => {
    // Validar que el movimiento tenga los datos necesarios
    if (!movimiento || !movimiento.id) {
      console.error('handleVer: movimiento inválido', movimiento)
      return
    }
    
    setSelectedMovimiento(movimiento)
    setShowDetail(true)
  }

  const handleConfirmarDesdeTabla = (movimiento) => {
    // Validar que el movimiento tenga los datos necesarios antes de abrir el modal
    if (!movimiento || !movimiento.id) {
      console.error('handleConfirmarDesdeTabla: movimiento inválido', movimiento)
      return
    }

    // Abrir el modal de detalle para confirmar desde ahí
    setSelectedMovimiento(movimiento)
    setShowDetail(true)
  }

  const handleCloseForm = () => { setShowForm(false); setSelectedMovimiento(null) }
  const handleCloseDetail = () => { setShowDetail(false); setSelectedMovimiento(null) }

  // Handler para cancelar movimiento
  const handleCancelarMovimiento = async (motivo) => {
    if (!selectedMovimiento) return
    const data = {
      movimiento_id: selectedMovimiento.id,
      usuario_cancelacion_id: user?.id || 'USR001',
      motivo: motivo
    }
    await cancelarMovimiento(data, {
      onSuccess: () => {
        setShowDetail(false)
        setSelectedMovimiento(null)
        toast.success('Movimiento Cancelado', 'El movimiento ha sido cancelado y no afectará el inventario')
      }
    })
  }

  const handleExportar = () => {
    try {
      exportMovimientosToCSV(movimientosFiltrados)
      toast.success('Exportación Exitosa', 'Los movimientos se han exportado a CSV')
    } catch (err) {
      toast.error('Error al Exportar', err.message || 'No se pudo exportar los movimientos')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertTriangle className="text-red-500" size={48} />
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Error al cargar movimientos</h2>
        <p className="text-slate-600 dark:text-slate-400 text-center max-w-md">
          {error.message || 'No se pudieron cargar los movimientos.'}
        </p>
        <Button variant="primary" onClick={() => refetch()}>
          <RefreshCw size={18} className="mr-2" />
          Reintentar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-light-blue p-6 shadow-card">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <ArrowRightLeft className="text-white" size={28} />
                <h1 className="text-3xl font-bold text-white">Movimientos de Inventario</h1>
              </div>
              <p className="text-white/90">Gestión de transferencias, ventas y mermas</p>
            </div>
            <div className="flex gap-3">
              <Button variant="white" onClick={handleExportar} disabled={movimientosFiltrados.length === 0 || isReadOnlyMovimientos}>
                <Download size={20} className="mr-2" />
                Exportar
              </Button>
              {canWriteMovimientos && (
                <Button variant="white" onClick={handleNuevoMovimiento}>
                  <Plus size={20} className="mr-2" />
                  Nuevo Movimiento
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tarjetas de Estadísticas - Solo Pendientes */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        {/* Salidas Pendientes */}
        <div
          onClick={() => handleCardClick('salida', 'pendientes')}
          className={`bg-gradient-to-br from-yellow-50 to-white dark:from-yellow-900/20 dark:to-slate-800 border border-yellow-100 dark:border-yellow-900/30 rounded-xl p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] relative overflow-hidden ${
            selectedCard === 'salida-pendientes' ? 'ring-2 ring-offset-2 ring-yellow-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-2">
                <ArrowUpRight size={16} />
                Salidas Pendientes
              </p>
              <p className="text-3xl font-bold text-yellow-600">{allStats.salidasPendientes}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
              <Clock className="text-yellow-600" size={24} />
            </div>
          </div>
          {allStats.salidasPendientes > 0 && (
            <div className="absolute top-2 right-2">
              <span className="flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
              </span>
            </div>
          )}
        </div>
        {/* Entradas Pendientes */}
        <div
          onClick={() => handleCardClick('recepcion', 'recibiendo')}
          className={`bg-gradient-to-br from-orange-50 to-white dark:from-orange-900/20 dark:to-slate-800 border border-orange-100 dark:border-orange-900/30 rounded-xl p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] relative overflow-hidden ${
            selectedCard === 'recepcion-recibiendo' ? 'ring-2 ring-offset-2 ring-orange-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-2">
                <ArrowDownLeft size={16} />
                Entradas Pendientes
              </p>
              <p className="text-3xl font-bold text-orange-600">{allStats.recepcionesPorRecibir}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
              <Clock className="text-orange-600" size={24} />
            </div>
          </div>
          {allStats.recepcionesPorRecibir > 0 && (
            <div className="absolute top-2 right-2">
              <span className="flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Search, Sede Filter and Type Filter */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card p-4 border border-slate-100 dark:border-slate-700">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por código, origen, destino u observaciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 text-sm"
            />
          </div>
          <div className="w-full md:w-64">
            <select
              value={effectiveSedeFilter}
              onChange={(e) => setSedeFilter(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 text-sm"
              disabled={userUbicacionIds.length === 1}
            >
              <option value="">Todas las ubicaciones</option>
              {ubicacionesFilter.map(ub => (
                <option key={ub.id} value={ub.id}>{ub.nombre}</option>
              ))}
            </select>
          </div>
          {/* Filtro de tipo - solo visible en tab Salidas */}
          {directionTab === 'salida' && (
            <div className="w-full md:w-48">
              <select
                value={tipoSalidaFilter}
                onChange={(e) => setTipoSalidaFilter(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="">Todos los tipos</option>
                <option value="TRANSFERENCIA">Transferencias</option>
                <option value="VENTA">Ventas</option>
                <option value="MERMA">Mermas</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Direction Tabs: Salida / Recepción */}
      <div className="flex gap-2">
        {[
          { id: 'salida', label: 'Salidas', icon: ArrowUpRight },
          { id: 'recepcion', label: 'Entradas', icon: ArrowDownLeft }
        ].map(tab => {
          const Icon = tab.icon
          const isActive = directionTab === tab.id
          const activeColor = tab.id === 'salida'
            ? 'bg-red-600 text-white shadow-md'
            : 'bg-green-600 text-white shadow-md'
          const inactiveColor = 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
          return (
            <button
              key={tab.id}
              onClick={() => setDirectionTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${isActive ? activeColor : inactiveColor}`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Status Tabs + Table */}
      <Card>
        <div className="border-b border-slate-200 dark:border-slate-700">
          <nav className="flex gap-4 md:gap-8 px-6 overflow-x-auto">
            {statusTabsWithCounts.map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  statusTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300'
                }`}
              >
                {tab.label}
                <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-xs">
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {movimientosFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <ArrowRightLeft className="mx-auto text-slate-300 mb-4" size={48} />
              <p className="text-slate-600 dark:text-slate-400 font-medium">
                No hay movimientos de {directionTab === 'recepcion' ? 'recepción' : 'salida'}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {directionTab === 'recepcion'
                  ? 'No tienes transferencias pendientes de recepción'
                  : 'Crea un nuevo movimiento para comenzar'}
              </p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={movimientosFiltrados}
              defaultSortKey="fecha_creacion"
              defaultSortDir="desc"
              rowClassName={(row) => {
                const estado = normalizeEstado(row.estado)
                if (estado === 'CANCELADA') {
                  return 'bg-slate-100 dark:bg-slate-900/50 opacity-60'
                }
                return ''
              }}
            />
          )}
        </div>
      </Card>

      {/* Modal Formulario */}
      {showForm && (
        <TransferenciaForm
          onSave={handleSaveMovimiento}
          onClose={handleCloseForm}
          isLoading={isCreando || isCreandoVenta || isCreandoMerma}
        />
      )}

      {/* Modal Detalle */}
      {showDetail && selectedMovimiento && (
        <TransferenciaDetail
          transferencia={selectedMovimiento}
          onClose={handleCloseDetail}
          onConfirmar={
            normalizeEstado(selectedMovimiento.estado) === 'PENDIENTE' &&
            isReceiver(selectedMovimiento) &&
            selectedMovimiento.tipo_movimiento === 'TRANSFERENCIA' &&
            canWriteMovimientos
              ? (productosRecibidos, observaciones) => handleConfirmar(selectedMovimiento, productosRecibidos, observaciones)
              : null
          }
          onConfirmarParcial={
            normalizeEstado(selectedMovimiento.estado) === 'PENDIENTE' &&
            isReceiver(selectedMovimiento) &&
            selectedMovimiento.tipo_movimiento === 'TRANSFERENCIA' &&
            canWriteMovimientos
              ? (productosRecibidos, observaciones) => handleConfirmar(selectedMovimiento, productosRecibidos, observaciones)
              : null
          }
          isConfirmando={isConfirmando}
          canCancel={canWriteMovimientos && normalizeEstado(selectedMovimiento.estado) === 'PENDIENTE'}
          onCancelar={handleCancelarMovimiento}
        />
      )}
    </div>
  )
}
