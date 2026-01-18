import { useState } from 'react'
import { Package, Plus, ArrowRightLeft, Download, Filter, CheckCircle, Clock, XCircle } from 'lucide-react'
import Card from '../components/common/Card'
import Table from '../components/common/Table'
import Button from '../components/common/Button'
import LoadingSpinner from '../components/common/LoadingSpinner'
import TransferenciaForm from '../components/transferencias/TransferenciaForm'
import TransferenciaDetail from '../components/transferencias/TransferenciaDetail'
import useMovimientos from '../hooks/useMovimientos'
import { useAuthStore } from '../stores/authStore'
import { useToastStore } from '../stores/toastStore'
import { exportMovimientosToCSV } from '../utils/exportUtils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function Movimientos() {
  const [activeTab, setActiveTab] = useState('todos')
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [selectedMovimiento, setSelectedMovimiento] = useState(null)

  const { user } = useAuthStore()
  const toast = useToastStore()
  const {
    movimientos,
    isLoading,
    crearMovimiento,
    isCreando,
    confirmarMovimiento,
    isConfirmando,
    estadisticas
  } = useMovimientos()

  // Filtrar movimientos según el tab activo
  const movimientosFiltrados = movimientos.filter(m => {
    if (activeTab === 'todos') return true
    if (activeTab === 'pendientes') return m.estado === 'PENDIENTE'
    if (activeTab === 'confirmadas') return m.estado === 'CONFIRMADA'
    if (activeTab === 'canceladas') return m.estado === 'CANCELADA'
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
      header: 'Fecha Creación',
      accessor: 'fecha_creacion',
      render: (value) => value ? format(new Date(value), "d MMM yyyy", { locale: es }) : '-'
    },
    {
      header: 'Tipo',
      accessor: 'tipo_movimiento',
      render: (value) => (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
          <ArrowRightLeft size={12} />
          {value || 'TRANSFERENCIA'}
        </span>
      )
    },
    {
      header: 'Origen',
      accessor: 'origen_id',
      render: (value) => (
        <span className="text-sm font-medium">{value}</span>
      )
    },
    {
      header: 'Destino',
      accessor: 'destino_id',
      render: (value) => (
        <span className="text-sm font-medium">{value}</span>
      )
    },
    {
      header: 'Estado',
      accessor: 'estado',
      render: (value) => {
        const estados = {
          PENDIENTE: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
          CONFIRMADA: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
          CANCELADA: { color: 'bg-red-100 text-red-800', icon: XCircle }
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
              onClick={() => handleConfirmar(row)}
              disabled={isConfirmando}
            >
              {isConfirmando ? 'Confirmando...' : 'Confirmar'}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleVer(row)}
          >
            Ver Detalle
          </Button>
        </div>
      )
    }
  ]

  const handleNuevoMovimiento = () => {
    setShowForm(true)
    setSelectedMovimiento(null)
  }

  const handleSaveMovimiento = async (movimientoData) => {
    // Agregar información del usuario
    const dataToSave = {
      ...movimientoData,
      usuario_creacion_id: user?.id || 'USR001',
      tipo_movimiento: movimientoData.tipo_movimiento || 'TRANSFERENCIA'
    }

    crearMovimiento(dataToSave, {
      onSuccess: () => {
        setShowForm(false)
      }
    })
  }

  const handleConfirmar = async (movimiento) => {
    if (!window.confirm('¿Confirmar la recepción de este movimiento?')) {
      return
    }

    const dataConfirmacion = {
      movimiento_id: movimiento.id,
      usuario_confirmacion_id: user?.id || 'USR001',
      observaciones: ''
    }

    confirmarMovimiento(dataConfirmacion)
  }

  const handleVer = (movimiento) => {
    setSelectedMovimiento(movimiento)
    setShowDetail(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setSelectedMovimiento(null)
  }

  const handleCloseDetail = () => {
    setShowDetail(false)
    setSelectedMovimiento(null)
  }

  const handleExportar = () => {
    try {
      exportMovimientosToCSV(movimientosFiltrados)
      toast.success('Exportación Exitosa', 'Los movimientos se han exportado a CSV')
    } catch (error) {
      toast.error('Error al Exportar', error.message || 'No se pudo exportar los movimientos')
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
                <ArrowRightLeft className="text-white" size={28} />
                <h1 className="text-3xl font-bold text-white">Movimientos de Inventario</h1>
              </div>
              <p className="text-white/90">Gestión de transferencias entre ubicaciones</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="white"
                onClick={handleExportar}
                disabled={movimientosFiltrados.length === 0}
              >
                <Download size={20} className="mr-2" />
                Exportar
              </Button>
              <Button variant="white" onClick={handleNuevoMovimiento}>
                <Plus size={20} className="mr-2" />
                Nuevo Movimiento
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Total Movimientos</p>
              <p className="text-3xl font-bold text-blue-600">{estadisticas.total}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Package className="text-blue-600" size={24} />
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

        <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Confirmadas</p>
              <p className="text-3xl font-bold text-green-600">{estadisticas.confirmadas}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="text-green-600" size={24} />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-white border-red-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Canceladas</p>
              <p className="text-3xl font-bold text-red-600">{estadisticas.canceladas}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="text-red-600" size={24} />
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
              { id: 'confirmadas', label: 'Confirmadas', count: estadisticas.confirmadas },
              { id: 'canceladas', label: 'Canceladas', count: estadisticas.canceladas }
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

        {/* Tabla de Movimientos */}
        <div className="p-6">
          {movimientosFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <ArrowRightLeft className="mx-auto text-slate-300 mb-4" size={48} />
              <p className="text-slate-600 font-medium">No hay movimientos {activeTab !== 'todos' ? activeTab : ''}</p>
              <p className="text-sm text-slate-500 mt-1">
                {activeTab === 'pendientes'
                  ? 'Todos los movimientos han sido confirmados'
                  : 'Crea un nuevo movimiento para comenzar'}
              </p>
            </div>
          ) : (
            <Table
              columns={columns}
              data={movimientosFiltrados}
            />
          )}
        </div>
      </Card>

      {/* Modal Formulario */}
      {showForm && (
        <TransferenciaForm
          onSave={handleSaveMovimiento}
          onClose={handleCloseForm}
          isLoading={isCreando}
        />
      )}

      {/* Modal Detalle */}
      {showDetail && selectedMovimiento && (
        <TransferenciaDetail
          transferencia={selectedMovimiento}
          onClose={handleCloseDetail}
          onConfirmar={selectedMovimiento.estado === 'PENDIENTE' ? () => handleConfirmar(selectedMovimiento) : null}
          isConfirmando={isConfirmando}
        />
      )}
    </div>
  )
}
