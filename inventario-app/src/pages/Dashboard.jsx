import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import useInventario from '../hooks/useInventario'
import useAlertas from '../hooks/useAlertas'
import useTransferencias from '../hooks/useTransferencias'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { Package, AlertTriangle, ArrowRightLeft, ClipboardCheck, TrendingUp, Sparkles } from 'lucide-react'
import { formatTimeAgo } from '../utils/formatters'

export default function Dashboard() {
  const { user } = useAuthStore()

  const { inventario, isLoading: loadingInventario } = useInventario()
  const { alertas, isLoading: loadingAlertas } = useAlertas(user?.id)
  const { transferencias, isLoading: loadingTransferencias } = useTransferencias()

  const stats = {
    totalProductos: inventario?.length || 0,
    productosAlertas: alertas?.filter(a => a.tipo === 'STOCK_MINIMO').length || 0,
    transferenciasPendientes: transferencias?.filter(t => t.estado === 'PENDIENTE').length || 0,
    conteosPendientes: alertas?.filter(a => a.tipo === 'CONTEO_PENDIENTE').length || 0
  }

  const isLoading = loadingInventario || loadingAlertas || loadingTransferencias

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-ocean p-4 shadow-card">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl -ml-24 -mb-24"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-1">
            <Sparkles className="text-white" size={24} />
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          </div>
          <p className="text-white/90">
            Bienvenido de vuelta, <span className="font-semibold">{user?.nombre_completo}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="group relative overflow-hidden bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 p-6 border border-slate-100">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-100 to-primary-50 rounded-full blur-2xl opacity-50 -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-ocean rounded-xl shadow-soft">
                <Package className="text-white" size={24} />
              </div>
              <TrendingUp className="text-primary-400" size={20} />
            </div>
            <p className="text-sm font-medium text-slate-600 mb-1">Total Productos</p>
            <p className="text-3xl font-bold bg-gradient-ocean bg-clip-text text-transparent">{stats.totalProductos}</p>
          </div>
        </div>

        <div className="group relative overflow-hidden bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 p-6 border border-slate-100">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-danger-100 to-danger-50 rounded-full blur-2xl opacity-50 -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-danger rounded-xl shadow-soft">
                <AlertTriangle className="text-white" size={24} />
              </div>
              {stats.productosAlertas > 0 && (
                <span className="px-2 py-1 bg-danger-100 text-danger-700 rounded-full text-xs font-semibold animate-pulse-slow">¡Alerta!</span>
              )}
            </div>
            <p className="text-sm font-medium text-slate-600 mb-1">Stock Bajo</p>
            <p className="text-3xl font-bold text-danger-600">{stats.productosAlertas}</p>
          </div>
        </div>

        <div className="group relative overflow-hidden bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 p-6 border border-slate-100">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-warning-100 to-warning-50 rounded-full blur-2xl opacity-50 -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-warning rounded-xl shadow-soft">
                <ArrowRightLeft className="text-white" size={24} />
              </div>
              {stats.transferenciasPendientes > 0 && <div className="w-3 h-3 bg-warning-500 rounded-full animate-pulse"></div>}
            </div>
            <p className="text-sm font-medium text-slate-600 mb-1">Transferencias Pendientes</p>
            <p className="text-3xl font-bold text-warning-600">{stats.transferenciasPendientes}</p>
          </div>
        </div>

        <div className="group relative overflow-hidden bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 p-6 border border-slate-100">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-secondary-100 to-secondary-50 rounded-full blur-2xl opacity-50 -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-purple rounded-xl shadow-soft">
                <ClipboardCheck className="text-slate-700" size={24} />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-600 mb-1">Conteos Pendientes</p>
            <p className="text-3xl font-bold text-secondary-600">{stats.conteosPendientes}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-card p-6 border border-slate-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-warning rounded-lg">
            <AlertTriangle className="text-white" size={20} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Alertas Recientes</h2>
        </div>

        {isLoading ? (
          <LoadingSpinner text="Cargando alertas..." />
        ) : !alertas || alertas.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex p-4 bg-success-50 rounded-full mb-4">
              <AlertTriangle size={48} className="text-success-400" />
            </div>
            <p className="text-slate-600 text-lg">No hay alertas activas</p>
            <p className="text-slate-400 text-sm mt-1">¡Todo está bajo control!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alertas.slice(0, 5).map((alerta) => (
              <div key={alerta.id} className="group flex items-start gap-4 p-4 bg-gradient-to-r from-slate-50 to-transparent rounded-xl hover:from-slate-100 transition-all duration-300 border border-slate-100 hover:border-slate-200">
                <div className={`p-2 rounded-lg ${alerta.prioridad === 'CRITICA' ? 'bg-danger-100' : alerta.prioridad === 'ALTA' ? 'bg-warning-100' : alerta.prioridad === 'MEDIA' ? 'bg-accent-100' : 'bg-slate-100'}`}>
                  <AlertTriangle size={20} className={alerta.prioridad === 'CRITICA' ? 'text-danger-600' : alerta.prioridad === 'ALTA' ? 'text-warning-600' : alerta.prioridad === 'MEDIA' ? 'text-accent-600' : 'text-slate-600'} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{alerta.mensaje}</p>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                    <span>{formatTimeAgo(alerta.fecha_creacion)}</span>
                    <span>•</span>
                    <span>{alerta.ubicacion_nombre}</span>
                  </p>
                </div>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${alerta.prioridad === 'CRITICA' ? 'bg-red-500 text-white' : alerta.prioridad === 'ALTA' ? 'bg-yellow-500 text-white' : alerta.prioridad === 'MEDIA' ? 'bg-blue-500 text-white' : 'bg-gray-500 text-white'}`}>
                  {alerta.prioridad}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-card p-6 border border-slate-100">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Acciones Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/productos" className="group relative overflow-hidden p-6 rounded-2xl bg-gradient-ocean text-white shadow-soft hover:shadow-glow transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative z-10">
              <Package className="mb-3" size={32} />
              <p className="text-lg font-semibold">Ver Inventario</p>
              <p className="text-sm text-white/80 mt-1">Gestiona tus productos</p>
            </div>
          </Link>

          <Link to="/transferencias" className="group relative overflow-hidden p-6 rounded-2xl bg-gradient-sunset text-white shadow-soft hover:shadow-glow transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative z-10">
              <ArrowRightLeft className="mb-3" size={32} />
              <p className="text-lg font-semibold">Nueva Transferencia</p>
              <p className="text-sm text-white/80 mt-1">Mueve productos entre ubicaciones</p>
            </div>
          </Link>

          <Link to="/conteos" className="group relative overflow-hidden p-6 rounded-2xl bg-gradient-purple text-slate-800 shadow-soft hover:shadow-glow transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/20 rounded-full blur-2xl -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative z-10">
              <ClipboardCheck className="mb-3" size={32} />
              <p className="text-lg font-semibold">Ejecutar Conteo</p>
              <p className="text-sm text-slate-700 mt-1">Verifica tu inventario</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
