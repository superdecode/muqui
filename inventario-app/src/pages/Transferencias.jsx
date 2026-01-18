import { useState } from 'react'
import Card from '../components/common/Card'
import Table from '../components/common/Table'
import Button from '../components/common/Button'
import TransferenciaForm from '../components/transferencias/TransferenciaForm'
import TransferenciaDetail from '../components/transferencias/TransferenciaDetail'
import { Plus } from 'lucide-react'
import { formatDate, getEstadoColor } from '../utils/formatters'

export default function Transferencias() {
  const [activeTab, setActiveTab] = useState('pendientes')
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [selectedTransferencia, setSelectedTransferencia] = useState(null)
  const [transferencias, setTransferencias] = useState([
    {
      id: 1,
      fecha: new Date(),
      origen: 'Bodega Principal',
      destino: 'Punto de Venta 1',
      total_productos: 5,
      productos: [
        { nombre: 'Laptop Dell XPS', cantidad: 2 },
        { nombre: 'Mouse Logitech', cantidad: 3 }
      ],
      estado: 'PENDIENTE',
      observaciones: 'Transferencia urgente'
    },
    {
      id: 2,
      fecha: new Date(Date.now() - 86400000),
      origen: 'Bodega Principal',
      destino: 'Punto de Venta 2',
      total_productos: 3,
      productos: [
        { nombre: 'Teclado Mecánico', cantidad: 3 }
      ],
      estado: 'CONFIRMADA',
      observaciones: ''
    }
  ])

  const columns = [
    {
      header: 'Fecha',
      accessor: 'fecha',
      render: (value) => formatDate(value)
    },
    {
      header: 'Origen',
      accessor: 'origen'
    },
    {
      header: 'Destino',
      accessor: 'destino'
    },
    {
      header: 'Productos',
      accessor: 'total_productos',
      render: (value) => `${value} items`
    },
    {
      header: 'Estado',
      accessor: 'estado',
      render: (value) => (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(value)}`}>
          {value}
        </span>
      )
    },
    {
      header: 'Acciones',
      accessor: 'id',
      render: (value, row) => (
        <div className="flex gap-2">
          {row.estado === 'PENDIENTE' && (
            <Button size="sm" variant="success" onClick={() => handleConfirmar(row.id)}>
              Confirmar
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => handleVer(row)}>
            Ver
          </Button>
        </div>
      )
    }
  ]

  const handleSaveTransferencia = (nuevaTransferencia) => {
    const newTransfer = {
      ...nuevaTransferencia,
      id: transferencias.length + 1,
      total_productos: nuevaTransferencia.productos.reduce((sum, p) => sum + p.cantidad, 0)
    }
    setTransferencias([newTransfer, ...transferencias])
  }

  const handleCloseForm = () => {
    setShowForm(false)
  }

  const handleConfirmar = (id) => {
    if (window.confirm('¿Confirmar esta transferencia? Esta acción actualizará el inventario.')) {
      setTransferencias(transferencias.map(t => 
        t.id === id ? { ...t, estado: 'CONFIRMADA' } : t
      ))
    }
  }

  const handleVer = (transferencia) => {
    setSelectedTransferencia(transferencia)
    setShowDetail(true)
  }

  const handleCloseDetail = () => {
    setShowDetail(false)
    setSelectedTransferencia(null)
  }

  const filteredTransferencias = transferencias.filter(t => {
    if (activeTab === 'pendientes') return t.estado === 'PENDIENTE'
    if (activeTab === 'confirmadas') return t.estado === 'CONFIRMADA'
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Transferencias</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={16} className="mr-2" />
          Nueva Transferencia
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('pendientes')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'pendientes'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Pendientes
          </button>
          <button
            onClick={() => setActiveTab('confirmadas')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'confirmadas'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Confirmadas
          </button>
          <button
            onClick={() => setActiveTab('todas')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'todas'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Todas
          </button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <Table columns={columns} data={filteredTransferencias} />
      </Card>

      {/* Transfer Form Modal */}
      {showForm && (
        <TransferenciaForm
          onClose={handleCloseForm}
          onSave={handleSaveTransferencia}
        />
      )}

      {/* Transfer Detail Modal */}
      {showDetail && selectedTransferencia && (
        <TransferenciaDetail
          transferencia={selectedTransferencia}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  )
}
