import { useState } from 'react'
import Card from '../components/common/Card'
import Table from '../components/common/Table'
import Button from '../components/common/Button'
import ConteoForm from '../components/conteos/ConteoForm'
import ConteoExecute from '../components/conteos/ConteoExecute'
import ConteoDetail from '../components/conteos/ConteoDetail'
import { Plus, Play } from 'lucide-react'
import { formatDate, getEstadoColor } from '../utils/formatters'

export default function Conteos() {
  const [showForm, setShowForm] = useState(false)
  const [showExecute, setShowExecute] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [selectedConteo, setSelectedConteo] = useState(null)
  const [conteos, setConteos] = useState([
    {
      id: 1,
      fecha_programada: new Date(),
      ubicacion: 'Punto de Venta 1',
      tipo_conteo: 'DIARIO',
      responsable: 'Juan Pérez',
      estado: 'PENDIENTE',
      productos: [
        { nombre: 'Laptop Dell XPS', stock_sistema: 10, stock_fisico: null },
        { nombre: 'Mouse Logitech', stock_sistema: 25, stock_fisico: null }
      ]
    },
    {
      id: 2,
      fecha_programada: new Date(Date.now() - 86400000),
      ubicacion: 'Bodega Principal',
      tipo_conteo: 'SEMANAL',
      responsable: 'María García',
      estado: 'COMPLETADO',
      productos: [
        { nombre: 'Teclado Mecánico', stock_sistema: 15, stock_fisico: 15 }
      ]
    }
  ])
  const columns = [
    {
      header: 'Fecha Programada',
      accessor: 'fecha_programada',
      render: (value) => formatDate(value)
    },
    {
      header: 'Ubicación',
      accessor: 'ubicacion'
    },
    {
      header: 'Tipo',
      accessor: 'tipo_conteo'
    },
    {
      header: 'Responsable',
      accessor: 'responsable'
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
            <Button size="sm" variant="success" onClick={() => handleEjecutar(row)}>
              <Play size={14} className="mr-1" />
              Ejecutar
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => handleVer(row)}>
            Ver
          </Button>
        </div>
      )
    }
  ]

  const handleEjecutar = (conteo) => {
    setSelectedConteo(conteo)
    setShowExecute(true)
  }

  const handleVer = (conteo) => {
    setSelectedConteo(conteo)
    setShowDetail(true)
  }

  const handleSaveConteo = (nuevoConteo) => {
    const newConteo = {
      ...nuevoConteo,
      id: conteos.length + 1,
      estado: 'PENDIENTE'
    }
    setConteos([newConteo, ...conteos])
  }

  const handleCompleteConteo = (conteoId, productos) => {
    setConteos(conteos.map(c => 
      c.id === conteoId ? { ...c, estado: 'COMPLETADO', productos } : c
    ))
    setShowExecute(false)
    setSelectedConteo(null)
  }

  const stats = {
    pendientes: conteos.filter(c => c.estado === 'PENDIENTE').length,
    enProceso: conteos.filter(c => c.estado === 'EN_PROCESO').length,
    completados: conteos.filter(c => c.estado === 'COMPLETADO').length,
    vencidos: 0
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Conteos de Inventario</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={16} className="mr-2" />
          Programar Conteo
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-center">
            <p className="text-sm text-slate-600">Pendientes Hoy</p>
            <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.pendientes}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-slate-600">En Proceso</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{stats.enProceso}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-slate-600">Completados</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{stats.completados}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-slate-600">Vencidos</p>
            <p className="text-3xl font-bold text-red-600 mt-2">{stats.vencidos}</p>
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card title="Historial de Conteos">
        <Table columns={columns} data={conteos} />
      </Card>

      {/* Conteo Form Modal */}
      {showForm && (
        <ConteoForm
          onClose={() => setShowForm(false)}
          onSave={handleSaveConteo}
        />
      )}

      {/* Execute Conteo Modal */}
      {showExecute && selectedConteo && (
        <ConteoExecute
          conteo={selectedConteo}
          onClose={() => {
            setShowExecute(false)
            setSelectedConteo(null)
          }}
          onComplete={handleCompleteConteo}
        />
      )}

      {/* Conteo Detail Modal */}
      {showDetail && selectedConteo && (
        <ConteoDetail
          conteo={selectedConteo}
          onClose={() => {
            setShowDetail(false)
            setSelectedConteo(null)
          }}
        />
      )}
    </div>
  )
}
