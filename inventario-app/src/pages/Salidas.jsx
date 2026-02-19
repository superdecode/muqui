import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Package,
  Plus,
  ArrowUpRight,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Search,
  Eye,
  ArrowRightLeft,
  ShoppingCart,
  TrendingDown
} from 'lucide-react'
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

export default function Salidas() {
  const [statusTab, setStatusTab] = useState('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [sedeFilter, setSedeFilter] = useState('')
  const [tipoSalidaFilter, setTipoSalidaFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [selectedMovimiento, setSelectedMovimiento] = useState(null)

  const { user } = useAuthStore()
  const { canEdit, isReadOnly, isAdmin } = usePermissions()
  const toast = useToastStore()

  const canWriteMovimientos = canEdit('movimientos')
  const isReadOnlyMovimientos = isReadOnly('movimientos')
  const esAdmin = isAdmin()

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

  const userUbicacionIds = useMemo(() => {
    return getUserAllowedUbicacionIds(user, ubicaciones, empresas)
  }, [user, ubicaciones, empresas])

  // Stats for salidas only
  const stats = useMemo(() => {
    const allStats = getAllDirectionStats(userUbicacionIds)
    return {
      pendientes: allStats.salidasPendientes,
      completadas: allStats.salidasCompletadas
    }
  }, [userUbicacionIds, movimientos])

  const [selectedCard, setSelectedCard] = useState(null)

  const handleCardClick = (status) => {
    setStatusTab(status)
    setSelectedCard(status)
  }

  const effectiveSedeFilter = (userUbicacionIds.length === 1 && !sedeFilter) ? userUbicacionIds[0] : sedeFilter

  const ubicacionesFilter = useMemo(() => {
    if (esAdmin) return ubicaciones || []
    if (userUbicacionIds.length > 0) {
      return (ubicaciones || []).filter(u => userUbicacionIds.includes(u.id))
    }
    const ids = new Set()
    ;(movimientos || []).forEach(m => { if (m.origen_id) ids.add(m.origen_id) })
    return (ubicaciones || []).filter(u => ids.has(u.id))
  }, [movimientos, ubicaciones, userUbicacionIds, esAdmin])

  const getEstadoBadge = (estado) => {
    const norm = normalizeEstado(estado)
    const map = {
      PENDIENTE: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', icon: Clock, label: 'Pendiente' },
      PARCIAL: { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300', icon: Package, label: 'Parcial' },
      COMPLETADO: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: CheckCircle, label: 'Completado' },
      CANCELADA: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', icon: XCircle, label: 'Cancelada' }
    }
    const cfg = map[norm] || map.PENDIENTE
    const Icon = cfg.icon
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
        <Icon size={14} />
        {cfg.label}
      </span>
    )
  }

  const getTipoBadge = (tipo) => {
    const tipos = {
      TRANSFERENCIA: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', icon: ArrowRightLeft, label: 'Transferencia' },
      VENTA: { color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300', icon: ShoppingCart, label: 'Venta' },
      MERMA: { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300', icon: TrendingDown, label: 'Merma' }
    }
    const cfg = tipos[tipo] || tipos.TRANSFERENCIA
    const Icon = cfg.icon
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
        <Icon size={12} />
        {cfg.label}
      </span>
    )
  }

  const statusTabs = [
    { id: 'todos', label: 'Todos' },
    { id: 'pendientes', label: 'Pendientes', matchEstado: 'PENDIENTE' },
    { id: 'completados', label: 'Completados', matchEstado: 'COMPLETADO' }
  ]

  // Filter salidas
  const movimientosFiltrados = useMemo(() => {
    return (movimientos || []).filter(m => {
      const hasLocationRestriction = !esAdmin && userUbicacionIds.length > 0
      if (hasLocationRestriction && !userUbicacionIds.includes(m.origen_id)) return false

      if (tipoSalidaFilter && (m.tipo_movimiento || '').toUpperCase() !== tipoSalidaFilter) return false

      if (effectiveSedeFilter && m.origen_id !== effectiveSedeFilter) return false

      if (searchTerm) {
        const s = searchTerm.toLowerCase()
        const matchSearch = (m.codigo_legible || '').toLowerCase().includes(s) ||
          (m.origen_nombre || '').toLowerCase().includes(s) ||
          (m.destino_nombre || '').toLowerCase().includes(s) ||
          (m.observaciones_creacion || '').toLowerCase().includes(s)
        if (!matchSearch) return false
      }

      if (statusTab !== 'todos') {
        const estado = normalizeEstado(m.estado)
        const activeTab = statusTabs.find(t => t.id === statusTab)
        if (activeTab?.matchEstado && estado !== activeTab.matchEstado) return false
      }

      return true
    })
  }, [movimientos, esAdmin, userUbicacionIds, tipoSalidaFilter, effectiveSedeFilter, searchTerm, statusTab])

  const statusTabsWithCounts = useMemo(() => {
    const filtered = (movimientos || []).filter(m => {
      const hasLocationRestriction = !esAdmin && userUbicacionIds.length > 0
      if (hasLocationRestriction && !userUbicacionIds.includes(m.origen_id)) return false
      if (tipoSalidaFilter && (m.tipo_movimiento || '').toUpperCase() !== tipoSalidaFilter) return false
      if (effectiveSedeFilter && m.origen_id !== effectiveSedeFilter) return false
      if (searchTerm) {
        const s = searchTerm.toLowerCase()
        return (m.codigo_legible || '').toLowerCase().includes(s) ||
          (m.origen_nombre || '').toLowerCase().includes(s) ||
          (m.destino_nombre || '').toLowerCase().includes(s) ||
          (m.observaciones_creacion || '').toLowerCase().includes(s)
      }
      return true
    })

    return statusTabs.map(tab => ({
      ...tab,
      count: tab.id === 'todos'
        ? filtered.length
        : filtered.filter(m => normalizeEstado(m.estado) === tab.matchEstado).length
    }))
  }, [movimientos, esAdmin, userUbicacionIds, tipoSalidaFilter, effectiveSedeFilter, searchTerm])

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
      render: (value) => getTipoBadge(value)
    },
    {
      header: 'Origen',
      accessor: 'origen_nombre',
      sortKey: 'origen_nombre',
      render: (value) => <span className="text-sm font-medium">{value}</span>
    },
    {
      header: 'Destino',
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
      render: (value) => getEstadoBadge(value)
    },
    {
      header: 'Acciones',
      accessor: 'id',
      render: (value, row) => {
        const estado = normalizeEstado(row.estado)
        const canDeleteRow = esAdmin && estado !== 'COMPLETADO'
        return (
          <div className="flex gap-2">
            <button
              onClick={() => handleVer(row)}
              className="p-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
              title="Ver detalle"
            >
              <Eye size={18} />
            </button>
            {canDeleteRow && (
              <button
                onClick={() => handleEliminar(row)}
                className="p-2 text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded-lg transition-colors disabled:opacity-50"
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

  const handleEliminar = async (movimiento) => {
    if (!window.confirm('¿Estás seguro de eliminar este movimiento? Esta acción no se puede deshacer.')) return
    eliminarMovimiento(movimiento.id)
  }

  const handleVer = (movimiento) => {
    if (!movimiento || !movimiento.id) return
    setSelectedMovimiento(movimiento)
    setShowDetail(true)
  }

  const handleCloseForm = () => { setShowForm(false); setSelectedMovimiento(null) }
  const handleCloseDetail = () => { setShowDetail(false); setSelectedMovimiento(null) }

  const handleCancelarMovimiento = async (motivo) => {
    if (!selectedMovimiento) return
    cancelarMovimiento({
      movimiento_id: selectedMovimiento.id,
      usuario_cancelacion_id: user?.id || 'USR001',
      motivo: motivo
    }, {
      onSuccess: () => {
        setShowDetail(false)
        setSelectedMovimiento(null)
        toast.success('Movimiento Cancelado', 'El movimiento ha sido cancelado')
      }
    })
  }

  const handleExportar = () => {
    try {
      exportMovimientosToCSV(movimientosFiltrados)
      toast.success('Exportación Exitosa', 'Las salidas se han exportado a CSV')
    } catch (err) {
      toast.error('Error al Exportar', err.message || 'No se pudo exportar')
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
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Error al cargar salidas</h2>
        <p className="text-slate-600 dark:text-slate-400 text-center max-w-md">
          {error.message || 'No se pudieron cargar las salidas.'}
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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-600 to-rose-600 p-6 shadow-card">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <ArrowUpRight className="text-white" size={28} />
                <h1 className="text-3xl font-bold text-white">Salidas</h1>
              </div>
              <p className="text-white/90">Transferencias, ventas y mermas de inventario</p>
            </div>
            <div className="flex gap-3">
              <Button variant="white" onClick={handleExportar} disabled={movimientosFiltrados.length === 0 || isReadOnlyMovimientos}>
                <Download size={20} className="mr-2" />
                Exportar
              </Button>
              {canWriteMovimientos && (
                <Button variant="white" onClick={handleNuevoMovimiento}>
                  <Plus size={20} className="mr-2" />
                  Nueva Salida
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div
          onClick={() => handleCardClick('pendientes')}
          className={`bg-gradient-to-br from-yellow-50 to-white dark:from-yellow-900/20 dark:to-slate-800 border border-yellow-100 dark:border-yellow-900/30 rounded-xl p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] relative overflow-hidden ${
            selectedCard === 'pendientes' ? 'ring-2 ring-offset-2 ring-yellow-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-2">
                <Clock size={16} />
                Pendientes
              </p>
              <p className="text-3xl font-bold text-yellow-600">{stats.pendientes}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <Clock className="text-yellow-600" size={24} />
            </div>
          </div>
          {stats.pendientes > 0 && (
            <div className="absolute top-2 right-2">
              <span className="flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
              </span>
            </div>
          )}
        </div>

        <div
          onClick={() => handleCardClick('completados')}
          className={`bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-slate-800 border border-green-100 dark:border-green-900/30 rounded-xl p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${
            selectedCard === 'completados' ? 'ring-2 ring-offset-2 ring-green-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-2">
                <CheckCircle size={16} />
                Completados
              </p>
              <p className="text-3xl font-bold text-green-600">{stats.completadas}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="text-green-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
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
        </div>
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
              <ArrowUpRight className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={48} />
              <p className="text-slate-600 dark:text-slate-400 font-medium">
                No hay salidas registradas
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                Crea una nueva salida para comenzar
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

      {/* Form Modal */}
      {showForm && (
        <TransferenciaForm
          onSave={handleSaveMovimiento}
          onClose={handleCloseForm}
          isLoading={isCreando || isCreandoVenta || isCreandoMerma}
        />
      )}

      {/* Detail Modal */}
      {showDetail && selectedMovimiento && (
        <TransferenciaDetail
          transferencia={selectedMovimiento}
          onClose={handleCloseDetail}
          canCancel={canWriteMovimientos && normalizeEstado(selectedMovimiento.estado) === 'PENDIENTE'}
          onCancelar={handleCancelarMovimiento}
        />
      )}
    </div>
  )
}
