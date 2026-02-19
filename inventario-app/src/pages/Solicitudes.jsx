import { useState, useMemo, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  FileQuestion,
  Plus,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Search,
  Send,
  Inbox,
  Eye,
  Edit,
  ArrowRight,
  Package
} from 'lucide-react'
import Card from '../components/common/Card'
import DataTable from '../components/common/DataTable'
import Button from '../components/common/Button'
import LoadingSpinner from '../components/common/LoadingSpinner'
import SolicitudForm from '../components/solicitudes/SolicitudForm'
import SolicitudDetail from '../components/solicitudes/SolicitudDetail'
import ProcesarSolicitudModal from '../components/solicitudes/ProcesarSolicitudModal'
import useSolicitudes from '../hooks/useSolicitudes'
import { useAuthStore } from '../stores/authStore'
import { usePermissions } from '../hooks/usePermissions'
import { useToastStore } from '../stores/toastStore'
import { safeFormatDate, formatDisplayId } from '../utils/formatters'
import dataService from '../services/dataService'

export default function Solicitudes() {
  const location = useLocation()
  const [mainTab, setMainTab] = useState('mis_solicitudes') // 'mis_solicitudes' | 'recibidas'
  const [statusTab, setStatusTab] = useState('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [showProcesar, setShowProcesar] = useState(false)
  const [selectedSolicitud, setSelectedSolicitud] = useState(null)
  const [editMode, setEditMode] = useState(false)

  const { user } = useAuthStore()
  const { canEdit, isReadOnly, isAdmin } = usePermissions()
  const toast = useToastStore()

  // Permission checks
  const canWriteSolicitudes = canEdit('solicitudes') || canEdit('movimientos')
  const isReadOnlySolicitudes = isReadOnly('solicitudes') && isReadOnly('movimientos')
  const esAdmin = isAdmin()

  // Read URL params on mount (e.g., from notifications)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const tab = params.get('tab')
    if (tab === 'recibidas') {
      setMainTab('recibidas')
    }
  }, [location.search])

  const { data: empresas = [] } = useQuery({
    queryKey: ['empresas'],
    queryFn: () => dataService.getEmpresas()
  })

  const {
    solicitudes,
    ubicaciones,
    usuarios,
    productos,
    isLoading,
    error,
    refetch,
    crearSolicitud,
    isCreando,
    actualizarSolicitud,
    isActualizando,
    enviarSolicitud,
    isEnviando,
    procesarSolicitud,
    isProcesando,
    cancelarSolicitud,
    isCancelando,
    eliminarSolicitud,
    isEliminando,
    normalizeEstado,
    getEstadisticasMisSolicitudes,
    getEstadisticasRecibidas,
    getEstadisticasGlobales
  } = useSolicitudes()

  // Get user's assigned locations
  const userUbicacionesAsignadas = useMemo(() => {
    if (!user) return []
    let asignadas = []
    if (Array.isArray(user.ubicaciones_asignadas)) {
      asignadas = user.ubicaciones_asignadas
    } else if (typeof user.ubicaciones_asignadas === 'string') {
      try {
        asignadas = JSON.parse(user.ubicaciones_asignadas)
      } catch {
        asignadas = []
      }
    }
    return asignadas
  }, [user])

  // Statistics for cards
  const stats = useMemo(() => {
    return getEstadisticasGlobales(user?.id || user?.codigo, userUbicacionesAsignadas)
  }, [user, userUbicacionesAsignadas, solicitudes])

  // State for selected card visual feedback
  const [selectedCard, setSelectedCard] = useState(null)

  // Handler for interactive card clicks
  const handleCardClick = (tab, status) => {
    setMainTab(tab)
    setStatusTab(status)
    setSelectedCard(`${tab}-${status}`)
  }

  // Status badge
  const getEstadoBadge = (estado) => {
    const norm = normalizeEstado(estado)
    const map = {
      iniciada: { color: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200', icon: Edit, label: 'Borrador' },
      enviada: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', icon: Send, label: 'Enviada' },
      recibida: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', icon: Inbox, label: 'Recibida' },
      procesada: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: CheckCircle, label: 'Procesada' },
      cancelada: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', icon: XCircle, label: 'Cancelada' }
    }
    const cfg = map[norm] || map.iniciada
    const Icon = cfg.icon
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
        <Icon size={14} />
        {cfg.label}
      </span>
    )
  }

  // Status tabs based on main tab
  const getStatusTabs = () => {
    if (mainTab === 'recibidas') {
      return [
        { id: 'todos', label: 'Todas' },
        { id: 'recibidas', label: 'Por Procesar', matchEstados: ['enviada', 'recibida'] },
        { id: 'procesadas', label: 'Procesadas', matchEstado: 'procesada' },
        { id: 'canceladas', label: 'Canceladas', matchEstado: 'cancelada' }
      ]
    }
    // mis_solicitudes
    return [
      { id: 'todos', label: 'Todas' },
      { id: 'iniciadas', label: 'Borradores', matchEstado: 'iniciada' },
      { id: 'enviadas', label: 'Enviadas', matchEstado: 'enviada' },
      { id: 'procesadas', label: 'Procesadas', matchEstado: 'procesada' },
      { id: 'canceladas', label: 'Canceladas', matchEstado: 'cancelada' }
    ]
  }

  // Reset status tab when main tab changes
  useEffect(() => {
    setStatusTab('todos')
  }, [mainTab])

  // Filter solicitudes by main tab
  const solicitudesFiltradosPorTab = useMemo(() => {
    return (solicitudes || []).filter(s => {
      if (mainTab === 'mis_solicitudes') {
        // User's own requests
        return s.usuario_creacion_id === user?.id || s.usuario_creacion_id === user?.codigo
      }
      if (mainTab === 'recibidas') {
        // Requests sent to user's assigned locations (origin)
        // Don't show drafts
        const estadoNorm = normalizeEstado(s.estado)
        if (estadoNorm === 'iniciada') return false
        // User is assigned to origin location (they process it)
        if (esAdmin) return true
        if (userUbicacionesAsignadas.length === 0) return true
        return userUbicacionesAsignadas.includes(s.ubicacion_origen_id)
      }
      return false
    })
  }, [solicitudes, mainTab, user, esAdmin, userUbicacionesAsignadas])

  // Filter by search term
  const solicitudesFiltradosPorBusqueda = useMemo(() => {
    if (!searchTerm) return solicitudesFiltradosPorTab
    const s = searchTerm.toLowerCase()
    return solicitudesFiltradosPorTab.filter(sol =>
      (sol.codigo_legible || '').toLowerCase().includes(s) ||
      (sol.origen_nombre || '').toLowerCase().includes(s) ||
      (sol.destino_nombre || '').toLowerCase().includes(s) ||
      (sol.usuario_creacion_nombre || '').toLowerCase().includes(s) ||
      (sol.observaciones_creacion || '').toLowerCase().includes(s)
    )
  }, [solicitudesFiltradosPorTab, searchTerm])

  // Filter by status tab
  const solicitudesFiltrados = useMemo(() => {
    return solicitudesFiltradosPorBusqueda.filter(s => {
      if (statusTab === 'todos') return true
      const estado = normalizeEstado(s.estado)
      const tabs = getStatusTabs()
      const activeTab = tabs.find(t => t.id === statusTab)
      if (activeTab?.matchEstado) return estado === activeTab.matchEstado
      if (activeTab?.matchEstados) return activeTab.matchEstados.includes(estado)
      return true
    })
  }, [solicitudesFiltradosPorBusqueda, statusTab, mainTab])

  // Compute counts for status tabs
  const statusTabsWithCounts = useMemo(() => {
    const tabs = getStatusTabs()
    return tabs.map(tab => ({
      ...tab,
      count: tab.id === 'todos'
        ? solicitudesFiltradosPorBusqueda.length
        : tab.matchEstado
          ? solicitudesFiltradosPorBusqueda.filter(s => normalizeEstado(s.estado) === tab.matchEstado).length
          : tab.matchEstados
            ? solicitudesFiltradosPorBusqueda.filter(s => tab.matchEstados.includes(normalizeEstado(s.estado))).length
            : 0
    }))
  }, [solicitudesFiltradosPorBusqueda, mainTab])

  // Columns
  const columns = [
    {
      header: 'Código',
      accessor: 'codigo_legible',
      sortKey: 'codigo_legible',
      render: (value, row) => (
        <span className="font-mono text-sm font-semibold text-primary-600">{value || formatDisplayId(row, 'RM')}</span>
      )
    },
    {
      header: 'Fecha',
      accessor: 'fecha_creacion',
      sortKey: 'fecha_creacion',
      render: (value) => safeFormatDate(value, "d MMM yyyy")
    },
    {
      header: 'Origen',
      accessor: 'origen_nombre',
      sortKey: 'origen_nombre',
      render: (value) => <span className="text-sm font-medium">{value || '-'}</span>
    },
    {
      header: 'Destino',
      accessor: 'destino_nombre',
      sortKey: 'destino_nombre',
      render: (value) => <span className="text-sm font-medium">{value || '-'}</span>
    },
    {
      header: mainTab === 'recibidas' ? 'Solicitante' : 'Creado por',
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
        const isOwner = row.usuario_creacion_id === user?.id || row.usuario_creacion_id === user?.codigo
        const canProcess = esAdmin || userUbicacionesAsignadas.includes(row.ubicacion_origen_id)
        const canDelete = esAdmin && estado === 'iniciada'

        return (
          <div className="flex gap-2">
            {/* Process button - only for received pending requests */}
            {mainTab === 'recibidas' && (estado === 'enviada' || estado === 'recibida') && canProcess && canWriteSolicitudes && (
              <Button
                size="sm"
                variant="success"
                onClick={() => handleProcesar(row)}
              >
                Procesar
              </Button>
            )}
            {/* Send button - only for owner's drafts */}
            {mainTab === 'mis_solicitudes' && estado === 'iniciada' && isOwner && canWriteSolicitudes && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => handleEnviar(row)}
                disabled={isEnviando}
              >
                <Send size={14} className="mr-1" />
                Enviar
              </Button>
            )}
            {/* View button */}
            <button
              onClick={() => handleVer(row)}
              className="p-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
              title="Ver detalle"
            >
              <Eye size={18} />
            </button>
            {/* Edit button - only for owner's drafts */}
            {mainTab === 'mis_solicitudes' && estado === 'iniciada' && isOwner && canWriteSolicitudes && (
              <button
                onClick={() => handleEditar(row)}
                className="p-2 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                title="Editar solicitud"
              >
                <Edit size={18} />
              </button>
            )}
            {/* Delete button - admin only, drafts only */}
            {canDelete && (
              <button
                onClick={() => handleEliminar(row)}
                className="p-2 text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded-lg transition-colors disabled:opacity-50"
                title="Eliminar solicitud"
                disabled={isEliminando || isReadOnlySolicitudes}
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        )
      }
    }
  ]

  // Handlers
  const handleNuevaSolicitud = () => {
    setSelectedSolicitud(null)
    setEditMode(false)
    setShowForm(true)
  }

  const handleEditar = (solicitud) => {
    setSelectedSolicitud(solicitud)
    setEditMode(true)
    setShowForm(true)
  }

  const handleVer = (solicitud) => {
    setSelectedSolicitud(solicitud)
    setShowDetail(true)
  }

  const handleProcesar = (solicitud) => {
    setSelectedSolicitud(solicitud)
    setShowProcesar(true)
  }

  const handleEnviar = async (solicitud) => {
    if (!window.confirm('¿Estás seguro de enviar esta solicitud? Una vez enviada no podrás editarla.')) return
    enviarSolicitud({
      solicitudId: solicitud.id,
      usuarioId: user?.id || user?.codigo
    })
  }

  const handleEliminar = async (solicitud) => {
    if (!window.confirm('¿Estás seguro de eliminar esta solicitud? Esta acción no se puede deshacer.')) return
    eliminarSolicitud(solicitud.id)
  }

  const handleSaveSolicitud = async (data, enviar = false) => {
    console.log('📝 handleSaveSolicitud called with:', { data, enviar, editMode })
    
    if (editMode && selectedSolicitud) {
      console.log('📝 Updating existing solicitud:', selectedSolicitud.id)
      // Update existing
      actualizarSolicitud({
        solicitudId: selectedSolicitud.id,
        data
      }, {
        onSuccess: () => {
          console.log('📝 Solicitud updated successfully')
          if (enviar) {
            console.log('📝 Sending solicitud...')
            enviarSolicitud({
              solicitudId: selectedSolicitud.id,
              usuarioId: user?.id || user?.codigo
            }, {
              onSuccess: () => {
                console.log('📝 Solicitud sent successfully')
                setShowForm(false)
              }
            })
          } else {
            setShowForm(false)
          }
        }
      })
    } else {
      console.log('📝 Creating new solicitud')
      // Create new
      crearSolicitud({
        ...data,
        usuario_creacion_id: user?.id || user?.codigo
      }, {
        onSuccess: (response) => {
          console.log('📝 Solicitud created successfully:', response)
          if (enviar && response?.data?.id) {
            console.log('📝 Sending new solicitud...')
            enviarSolicitud({
              solicitudId: response.data.id,
              usuarioId: user?.id || user?.codigo
            }, {
              onSuccess: () => {
                console.log('📝 New solicitud sent successfully')
                setShowForm(false)
              }
            })
          } else {
            setShowForm(false)
          }
        }
      })
    }
  }

  const handleProcesarSolicitud = async (data) => {
    procesarSolicitud({
      ...data,
      usuario_confirmacion_id: user?.id || user?.codigo
    }, {
      onSuccess: () => {
        setShowProcesar(false)
        setSelectedSolicitud(null)
      }
    })
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setSelectedSolicitud(null)
    setEditMode(false)
  }

  const handleCloseDetail = () => {
    setShowDetail(false)
    setSelectedSolicitud(null)
  }

  const handleCloseProcesar = () => {
    setShowProcesar(false)
    setSelectedSolicitud(null)
  }

  // Detail actions
  const handleDetailEnviar = () => {
    if (!selectedSolicitud) return
    handleEnviar(selectedSolicitud)
    setShowDetail(false)
  }

  const handleDetailEditar = () => {
    if (!selectedSolicitud) return
    setShowDetail(false)
    handleEditar(selectedSolicitud)
  }

  const handleDetailProcesar = () => {
    if (!selectedSolicitud) return
    setShowDetail(false)
    handleProcesar(selectedSolicitud)
  }

  const handleDetailCancelar = async (motivo) => {
    if (!selectedSolicitud) return
    cancelarSolicitud({
      solicitudId: selectedSolicitud.id,
      usuarioId: user?.id || user?.codigo,
      motivo
    }, {
      onSuccess: () => {
        setShowDetail(false)
        setSelectedSolicitud(null)
      }
    })
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
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Error al cargar solicitudes</h2>
        <p className="text-slate-600 dark:text-slate-400 text-center max-w-md">
          {error.message || 'No se pudieron cargar las solicitudes.'}
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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 to-purple-600 p-6 shadow-card">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <FileQuestion className="text-white" size={28} />
                <h1 className="text-3xl font-bold text-white">Solicitudes de Transferencia</h1>
              </div>
              <p className="text-white/90">Solicita productos desde otras ubicaciones</p>
            </div>
            <div className="flex gap-3">
              {canWriteSolicitudes && (
                <Button variant="white" onClick={handleNuevaSolicitud}>
                  <Plus size={20} className="mr-2" />
                  Nueva Solicitud
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Pending to Send (own drafts) */}
        <div
          onClick={() => handleCardClick('mis_solicitudes', 'iniciadas')}
          className={`bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] relative overflow-hidden ${
            selectedCard === 'mis_solicitudes-iniciadas' ? 'ring-2 ring-offset-2 ring-violet-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-2">
                <Edit size={16} />
                Borradores Pendientes
              </p>
              <p className="text-3xl font-bold text-slate-700 dark:text-slate-200">{stats.pendientesEnvio}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <Clock className="text-slate-600 dark:text-slate-400" size={24} />
            </div>
          </div>
          {stats.pendientesEnvio > 0 && (
            <div className="absolute top-2 right-2">
              <span className="flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-500"></span>
              </span>
            </div>
          )}
        </div>

        {/* Pending to Process (received) */}
        <div
          onClick={() => handleCardClick('recibidas', 'recibidas')}
          className={`bg-gradient-to-br from-violet-50 to-white dark:from-violet-900/20 dark:to-slate-800 border border-violet-100 dark:border-violet-900/30 rounded-xl p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] relative overflow-hidden ${
            selectedCard === 'recibidas-recibidas' ? 'ring-2 ring-offset-2 ring-violet-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-2">
                <Inbox size={16} />
                Por Procesar
              </p>
              <p className="text-3xl font-bold text-violet-600 dark:text-violet-400">{stats.porProcesar}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <Package className="text-violet-600 dark:text-violet-400" size={24} />
            </div>
          </div>
          {stats.porProcesar > 0 && (
            <div className="absolute top-2 right-2">
              <span className="flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500"></span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card p-4 border border-slate-100 dark:border-slate-700">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por código, origen, destino o solicitante..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-primary-500 text-sm"
          />
        </div>
      </div>

      {/* Main Tabs: Mis Solicitudes / Recibidas */}
      <div className="flex gap-2">
        {[
          { id: 'mis_solicitudes', label: 'Mis Solicitudes', icon: Send },
          { id: 'recibidas', label: 'Recibidas', icon: Inbox }
        ].map(tab => {
          const Icon = tab.icon
          const isActive = mainTab === tab.id
          const activeColor = tab.id === 'mis_solicitudes'
            ? 'bg-violet-600 text-white shadow-md'
            : 'bg-emerald-600 text-white shadow-md'
          const inactiveColor = 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
          return (
            <button
              key={tab.id}
              onClick={() => setMainTab(tab.id)}
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
          {solicitudesFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <FileQuestion className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={48} />
              <p className="text-slate-600 dark:text-slate-400 font-medium">
                {mainTab === 'recibidas'
                  ? 'No tienes solicitudes recibidas'
                  : 'No tienes solicitudes creadas'}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                {mainTab === 'recibidas'
                  ? 'Las solicitudes enviadas a tu ubicación aparecerán aquí'
                  : 'Crea una nueva solicitud para comenzar'}
              </p>
              {mainTab === 'mis_solicitudes' && canWriteSolicitudes && (
                <Button
                  variant="primary"
                  onClick={handleNuevaSolicitud}
                  className="mt-4"
                >
                  <Plus size={18} className="mr-2" />
                  Nueva Solicitud
                </Button>
              )}
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={solicitudesFiltrados}
              defaultSortKey="fecha_creacion"
              defaultSortDir="desc"
              rowClassName={(row) => {
                const estado = normalizeEstado(row.estado)
                if (estado === 'cancelada') {
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
        <SolicitudForm
          editData={editMode ? selectedSolicitud : null}
          onSave={handleSaveSolicitud}
          onEnviar={handleSaveSolicitud}
          onClose={handleCloseForm}
          isLoading={isCreando || isActualizando || isEnviando}
        />
      )}

      {/* Detail Modal */}
      {showDetail && selectedSolicitud && (
        <SolicitudDetail
          solicitud={selectedSolicitud}
          onClose={handleCloseDetail}
          onEnviar={
            normalizeEstado(selectedSolicitud.estado) === 'iniciada' &&
            (selectedSolicitud.usuario_creacion_id === user?.id || selectedSolicitud.usuario_creacion_id === user?.codigo) &&
            canWriteSolicitudes
              ? handleDetailEnviar
              : null
          }
          onEditar={
            normalizeEstado(selectedSolicitud.estado) === 'iniciada' &&
            (selectedSolicitud.usuario_creacion_id === user?.id || selectedSolicitud.usuario_creacion_id === user?.codigo) &&
            canWriteSolicitudes
              ? handleDetailEditar
              : null
          }
          onProcesar={
            (normalizeEstado(selectedSolicitud.estado) === 'enviada' || normalizeEstado(selectedSolicitud.estado) === 'recibida') &&
            (esAdmin || userUbicacionesAsignadas.includes(selectedSolicitud.ubicacion_origen_id)) &&
            canWriteSolicitudes
              ? handleDetailProcesar
              : null
          }
          onCancelar={
            normalizeEstado(selectedSolicitud.estado) !== 'procesada' &&
            normalizeEstado(selectedSolicitud.estado) !== 'cancelada' &&
            canWriteSolicitudes
              ? handleDetailCancelar
              : null
          }
          isLoading={isEnviando || isCancelando}
        />
      )}

      {/* Process Modal */}
      {showProcesar && selectedSolicitud && (
        <ProcesarSolicitudModal
          solicitud={selectedSolicitud}
          onClose={handleCloseProcesar}
          onProcesar={handleProcesarSolicitud}
          isLoading={isProcesando}
        />
      )}
    </div>
  )
}
