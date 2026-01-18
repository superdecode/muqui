import { useState } from 'react'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { Download, FileBarChart, TrendingUp, Package } from 'lucide-react'

export default function Reportes() {
  const [selectedReport, setSelectedReport] = useState(null)

  const reports = [
    {
      id: 'stock',
      name: 'Reporte de Stock Actual',
      description: 'Estado actual del inventario por ubicación',
      icon: Package,
      color: 'blue'
    },
    {
      id: 'consumo',
      name: 'Reporte de Consumo',
      description: 'Análisis de consumo por periodo',
      icon: TrendingUp,
      color: 'green'
    },
    {
      id: 'rotacion',
      name: 'Rotación de Inventario',
      description: 'Productos más y menos rotados',
      icon: FileBarChart,
      color: 'purple'
    },
    {
      id: 'transferencias',
      name: 'Reporte de Transferencias',
      description: 'Historial de movimientos entre ubicaciones',
      icon: FileBarChart,
      color: 'orange'
    }
  ]

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Reportes</h1>
        <p className="text-slate-600 mt-1">
          Genera y exporta reportes del sistema
        </p>
      </div>

      {/* Report selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => {
          const Icon = report.icon
          return (
            <Card key={report.id}>
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${colorClasses[report.color]}`}>
                  <Icon size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">{report.name}</h3>
                  <p className="text-sm text-slate-600 mt-1">{report.description}</p>
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      onClick={() => setSelectedReport(report.id)}
                    >
                      Ver Reporte
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download size={14} className="mr-1" />
                      Exportar
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Filters */}
      {selectedReport && (
        <Card title="Configurar Reporte">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Fecha Inicio
              </label>
              <input
                type="date"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Fecha Fin
              </label>
              <input
                type="date"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Ubicación
              </label>
              <select className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">Todas</option>
                <option value="1">Bodega Principal</option>
                <option value="2">Punto de Venta 1</option>
                <option value="3">Punto de Venta 2</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button>Generar Reporte</Button>
            <Button variant="outline">Limpiar</Button>
          </div>
        </Card>
      )}

      {/* Results placeholder */}
      {selectedReport && (
        <Card title="Resultados">
          <div className="text-center py-12 text-slate-500">
            <FileBarChart size={48} className="mx-auto mb-4 opacity-50" />
            <p>Configura los filtros y genera el reporte</p>
          </div>
        </Card>
      )}
    </div>
  )
}
