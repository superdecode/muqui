import { useState } from 'react'
import { ClipboardCheck, Plus, Play, Download, CheckCircle, Clock, AlertCircle, Trash2 } from 'lucide-react'
import Card from '../components/common/Card'
import Table from '../components/common/Table'
import Button from '../components/common/Button'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ConteoForm from '../components/conteos/ConteoForm'
import ConteoExecute from '../components/conteos/ConteoExecute'
import ConteoDetail from '../components/conteos/ConteoDetail'
import useConteos from '../hooks/useConteos'
import { useAuthStore } from '../stores/authStore'
import { useToastStore } from '../stores/toastStore'
import { exportConteosToCSV } from '../utils/exportUtils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function Conteos() {
  const [activeTab, setActiveTab] = useState('todos')
  const [showForm, setShowForm] = useState(false)
  const [showExecute, setShowExecute] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [selectedConteo, setSelectedConteo] = useState(null)

  const { user, canDelete } = useAuthStore()
  const toast = useToastStore()
  const {
    conteos,
    isLoading,
    crearConteo,
    isCreando,
    ejecutarConteo,
    isEjecutando,
    eliminarConteo,
    isEliminando,
    estadisticas
  } = useConteos()

  // Filtrar conteos según el tab activo
  const conteosFiltrados = conteos.filter(c => {
    if (activeTab === 'todos') return true
    if (activeTab === 'pendientes') return c.estado === 'PENDIENTE'
    if (activeTab === 'enProgreso') return c.estado === 'EN_PROGRESO'
    if (activeTab === 'completados') return c.estado === 'COMPLETADO'
    return true
  })

  const columns = [
    {
      header: 'ID',
      accessor: 'id',
      render: (value) => (
        <span className="font-mono text-sm font-semibold text-primary-600">{value}</span>
      )
    },
    {
      header: 'Fecha Programada',
      accessor: 'fecha_programada',
      render: (value) => value ? format(new Date(value), "d MMM yyyy", { locale: es }) : '-'
    },
    {
      header: 'Ubicación',
      accessor: 'ubicacion_nombre',
      render: (value) => (
        <span className="text-sm font-medium">{value}</span>
      )
    },
    {
      header: 'Tipo',
      accessor: 'tipo_conteo',
      render: (value) => (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
          <ClipboardCheck size={12} />
          {value}
        </span>
      )
    },
    {
      header: 'Responsable',
      accessor: 'usuario_responsable_id'
    },
    {
      header: 'Estado',
      accessor: 'estado',
      render: (value) => {
        const estados = {
          PENDIENTE: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
          EN_PROGRESO: { color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
          COMPLETADO: { color: 'bg-green-100 text-green-800', icon: CheckCircle }
        }
        const estado = estados[value] || estados.PENDIENTE
        const Icon = estado.icon
        return (
          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${estado.color}`}>
            <Icon size={14} />
            {value}
          </span>
        )
      }
    },
    {
      header: 'Acciones',
      accessor: 'id',
      render: (value, row) => (
        <div className="flex gap-2">
          {row.estado === 'PENDIENTE' && (
            <Button
              size="sm"
              variant="success"
              onClick={() => handleEjecutar(row)}
              disabled={isEjecutando}
            >
              <Play size={14} className="mr-1" />
              {isEjecutando ? 'Ejecutando...' : 'Ejecutar'}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleVer(row)}
          >
            Ver Detalle
          </Button>
          {canDelete() && (
            <button
              onClick={() => handleEliminar(row)}
              className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
              title="Eliminar conteo"
              disabled={isEliminando}
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      )
    }
  ]

  const handleNuevoConteo = () => {
    setShowForm(true)
  }

  const handleSaveConteo = async (conteoData) => {
    const dataToSave = {
      ...conteoData,
      usuario_responsable_id: user?.id || 'USR001'
    }

    crearConteo(dataToSave, {
      onSuccess: () => {
        setShowForm(false)
      }
    })
  }

  const handleEjecutar = (conteo) => {
    setSelectedConteo(conteo)
    setShowExecute(true)
  }

  const handleEliminar = async (conteo) => {
    if (!window.confirm('¿Estás seguro de eliminar este conteo? Esta acción no se puede deshacer.')) {
      return
    }

    eliminarConteo(conteo.id)
  }

  const handleSaveEjecucion = async (datosConteo) => {
    const dataToSave = {
      ...datosConteo,
      conteo_id: selectedConteo.id,
      usuario_ejecutor_id: user?.id || 'USR001'
    }

    ejecutarConteo(dataToSave, {
      onSuccess: () => {
        setShowExecute(false)
        setSelectedConteo(null)
      }
    })
  }

  const handleVer = (conteo) => {
    setSelectedConteo(conteo)
    setShowDetail(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
  }

  const handleCloseExecute = () => {
    setShowExecute(false)
    setSelectedConteo(null)
  }

  const handleCloseDetail = () => {
    setShowDetail(false)
    setSelectedConteo(null)
  }

  const handleExportar = () => {
    try {
      exportConteosToCSV(conteosFiltrados)
      toast.success('Exportación Exitosa', 'Los conteos se han exportado a CSV')
    } catch (error) {
      toast.error('Error al Exportar', error.message || 'No se pudo exportar los conteos')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
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
                <ClipboardCheck className="text-white" size={28} />
                <h1 className="text-3xl font-bold text-white">Conteos de Inventario</h1>
              </div>
              <p className="text-white/90">Programa y ejecuta conteos físicos de inventario</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="white"
                onClick={handleExportar}
                disabled={conteosFiltrados.length === 0}
              >
                <Download size={20} className="mr-2" />
                Exportar
              </Button>
              <Button variant="white" onClick={handleNuevoConteo}>
                <Plus size={20} className="mr-2" />
                Empezar Conteo
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Total Conteos</p>
              <p className="text-3xl font-bold text-purple-600">{estadisticas.total}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
              <ClipboardCheck className="text-purple-600" size={24} />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-white border-yellow-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Pendientes</p>
              <p className="text-3xl font-bold text-yellow-600">{estadisticas.pendientes}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
              <Clock className="text-yellow-600" size={24} />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">En Progreso</p>
              <p className="text-3xl font-bold text-blue-600">{estadisticas.enProgreso}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <AlertCircle className="text-blue-600" size={24} />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Completados</p>
              <p className="text-3xl font-bold text-green-600">{estadisticas.completados}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="text-green-600" size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Card>
        <div className="border-b border-slate-200">
          <nav className="flex gap-8 px-6">
            {[
              { id: 'todos', label: 'Todos', count: estadisticas.total },
              { id: 'pendientes', label: 'Pendientes', count: estadisticas.pendientes },
              { id: 'enProgreso', label: 'En Progreso', count: estadisticas.enProgreso },
              { id: 'completados', label: 'Completados', count: estadisticas.completados }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {tab.label}
                <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-100 text-xs">
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tabla de Conteos */}
        <div className="p-6">
          {conteosFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardCheck className="mx-auto text-slate-300 mb-4" size={48} />
              <p className="text-slate-600 font-medium">No hay conteos {activeTab !== 'todos' ? activeTab : ''}</p>
              <p className="text-sm text-slate-500 mt-1">
                {activeTab === 'pendientes'
                  ? 'Todos los conteos han sido completados'
                  : 'Programa un nuevo conteo para comenzar'}
              </p>
            </div>
          ) : (
            <Table
              columns={columns}
              data={conteosFiltrados}
            />
          )}
        </div>
      </Card>

      {/* Modal Formulario */}
      {showForm && (
        <ConteoForm
          onSave={handleSaveConteo}
          onClose={handleCloseForm}
          isLoading={isCreando}
        />
      )}

      {/* Modal Ejecutar */}
      {showExecute && selectedConteo && (
        <ConteoExecute
          conteo={selectedConteo}
          onSave={handleSaveEjecucion}
          onClose={handleCloseExecute}
          isLoading={isEjecutando}
        />
      )}

      {/* Modal Detalle */}
      {showDetail && selectedConteo && (
        <ConteoDetail
          conteo={selectedConteo}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  )
}
