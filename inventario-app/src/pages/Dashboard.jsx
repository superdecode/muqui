import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import { useAlertasStore } from '../stores/alertasStore'
import useMovimientos from '../hooks/useMovimientos'
import useConteos from '../hooks/useConteos'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { Package, AlertTriangle, ArrowRightLeft, ClipboardCheck, TrendingUp, Sparkles } from 'lucide-react'
import { formatTimeAgo, safeParseDate } from '../utils/formatters'
import { getUserAllowedUbicacionIds } from '../utils/userFilters'
import dataService from '../services/dataService'

export default function Dashboard() {
  const { user } = useAuthStore()

  // Data queries (same as Stock and Reportes)
  const { data: inventario = [], isLoading: loadingInventario } = useQuery({ queryKey: ['inventario'], queryFn: () => dataService.getInventario() })
  const { data: productos = [] } = useQuery({ queryKey: ['productos'], queryFn: () => dataService.getProductos() })
  const { data: ubicaciones = [] } = useQuery({ queryKey: ['ubicaciones'], queryFn: () => dataService.getUbicaciones() })
  const { data: empresas = [] } = useQuery({ queryKey: ['empresas'], queryFn: () => dataService.getEmpresas() })
  const { data: movimientos = [], isLoading: loadingMovimientos } = useQuery({ queryKey: ['movimientos'], queryFn: () => dataService.getMovimientos() })
  const { data: conteos = [], isLoading: loadingConteos } = useQuery({ queryKey: ['conteos'], queryFn: () => dataService.getConteos() })
  const { data: detalleConteos = [] } = useQuery({ queryKey: ['detalle-conteos-all'], queryFn: () => dataService.getDetalleConteos() })
  const { data: detalleMovimientos = [] } = useQuery({ queryKey: ['detalle-movimientos-all'], queryFn: () => dataService.getDetalleMovimientos() })
  const { alertas, loading: loadingAlertas } = useAlertasStore()

  // User ubicaciones (same logic as Stock)
  const userUbicaciones = useMemo(() => {
    const asignadas = user?.ubicaciones_asignadas
    if (Array.isArray(asignadas) && asignadas.length > 0) {
      return ubicaciones.filter(u => asignadas.includes(u.id))
    }
    return ubicaciones
  }, [user, ubicaciones])

  const userUbicacionIds = userUbicaciones.map(u => u.id)

  // Same calculation logic as Stock
  const calcularStockActual = (productoId, ubicacionId) => {
    const estadosValidos = ['COMPLETADO', 'PARCIALMENTE_COMPLETADO']
    const estadosMovValidos = ['COMPLETADO', 'PARCIAL', 'EN_PROCESO']

    const conteosUbicacion = conteos.filter(c =>
      c.ubicacion_id === ubicacionId && estadosValidos.includes(c.estado?.toUpperCase())
    )

    const conteosConProducto = conteosUbicacion
      .map(c => {
        const det = detalleConteos.find(d => d.conteo_id === c.id && d.producto_id === productoId)
        if (!det) return null
        const fecha = safeParseDate(c.fecha_completado || c.fecha_programada)
        return { conteo: c, detalle: det, fecha }
      })
      .filter(Boolean)
      .sort((a, b) => (b.fecha || 0) - (a.fecha || 0))

    if (conteosConProducto.length === 0) {
      const invItem = inventario.find(i => i.producto_id === productoId && i.ubicacion_id === ubicacionId)
      return { stock_actual: invItem?.stock_actual ?? 0 }
    }

    const ultimo = conteosConProducto[0]
    const fechaConteo = ultimo.fecha
    const stockBase = ultimo.detalle.cantidad_fisica ?? ultimo.detalle.cantidad_sistema ?? 0
    const ahora = new Date()
    const msDesdeConteo = fechaConteo ? ahora - fechaConteo : null

    if (msDesdeConteo !== null && msDesdeConteo < 24 * 60 * 60 * 1000) {
      return { stock_actual: stockBase }
    }

    let entradas = 0
    let salidas = 0
    if (fechaConteo) {
      movimientos.forEach(mov => {
        const estadoMov = (mov.estado || '').toUpperCase()
        if (!estadosMovValidos.includes(estadoMov)) return
        const fechaMov = safeParseDate(mov.fecha_confirmacion || mov.fecha_creacion)
        if (!fechaMov || fechaMov <= fechaConteo) return
        const dets = detalleMovimientos.filter(d => d.movimiento_id === mov.id && d.producto_id === productoId)
        dets.forEach(det => {
          if (mov.destino_id === ubicacionId) entradas += det.cantidad_recibida ?? det.cantidad ?? 0
          if (mov.origen_id === ubicacionId) salidas += det.cantidad_enviada ?? det.cantidad ?? 0
        })
      })
    }

    return { stock_actual: stockBase + entradas - salidas }
  }

  // Calculate stock stats using same logic as Stock module
  const stockStats = useMemo(() => {
    let bajo = 0
    let agotado = 0
    
    userUbicacionIds.forEach(ubicacionId => {
      const invUbicacion = inventario.filter(i => i.ubicacion_id === ubicacionId)
      invUbicacion.forEach(item => {
        const producto = productos.find(p => p.id === item.producto_id)
        if (!producto) return
        const calc = calcularStockActual(item.producto_id, ubicacionId)
        const stockMin = parseInt(producto.stock_minimo) || 0
        
        if (calc.stock_actual <= 0) agotado++
        else if (calc.stock_actual <= stockMin) bajo++
      })
    })

    return { bajo, agotado }
  }, [inventario, productos, ubicaciones, conteos, detalleConteos, movimientos, detalleMovimientos, userUbicacionIds])

  const stats = {
    totalProductos: productos?.length || 0,
    productosAlertas: stockStats.bajo + stockStats.agotado,
    transferenciasPendientes: movimientos?.filter(m => m.estado === 'PENDIENTE').length || 0,
    conteosPendientes: conteos?.filter(c => c.estado === 'PENDIENTE').length || 0
  }

  const isLoading = loadingInventario || loadingAlertas || loadingMovimientos || loadingConteos

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
        <Link to="/productos" className="group relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 p-6 border border-slate-100 dark:border-slate-700 cursor-pointer">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-100 to-primary-50 dark:from-primary-900/30 dark:to-primary-800/20 rounded-full blur-2xl opacity-50 -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-ocean rounded-xl shadow-soft">
                <Package className="text-white" size={24} />
              </div>
              <TrendingUp className="text-primary-400" size={20} />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Total Productos</p>
            <p className="text-3xl font-bold bg-gradient-ocean bg-clip-text text-transparent">{stats.totalProductos}</p>
          </div>
        </Link>

        <Link to="/stock" className="group relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 p-6 border border-slate-100 dark:border-slate-700 cursor-pointer">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-danger-100 to-danger-50 dark:from-danger-900/30 dark:to-danger-800/20 rounded-full blur-2xl opacity-50 -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-danger rounded-xl shadow-soft">
                <AlertTriangle className="text-white" size={24} />
              </div>
              {stats.productosAlertas > 0 && (
                <span className="px-2 py-1 bg-danger-100 text-danger-700 rounded-full text-xs font-semibold animate-pulse-slow">¡Alerta!</span>
              )}
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Stock Bajo</p>
            <p className="text-3xl font-bold text-danger-600">{stats.productosAlertas}</p>
          </div>
        </Link>

        <Link to="/movimientos" className="group relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 p-6 border border-slate-100 dark:border-slate-700 cursor-pointer">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-warning-100 to-warning-50 dark:from-warning-900/30 dark:to-warning-800/20 rounded-full blur-2xl opacity-50 -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-warning rounded-xl shadow-soft">
                <ArrowRightLeft className="text-white" size={24} />
              </div>
              {stats.transferenciasPendientes > 0 && <div className="w-3 h-3 bg-warning-500 rounded-full animate-pulse"></div>}
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Movimientos Pendientes</p>
            <p className="text-3xl font-bold text-warning-600">{stats.transferenciasPendientes}</p>
          </div>
        </Link>

        <Link to="/conteos" className="group relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 p-6 border border-slate-100 dark:border-slate-700 cursor-pointer">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-secondary-100 to-secondary-50 dark:from-secondary-900/30 dark:to-secondary-800/20 rounded-full blur-2xl opacity-50 -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-purple rounded-xl shadow-soft">
                <ClipboardCheck className="text-slate-700 dark:text-slate-200" size={24} />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Conteos Pendientes</p>
            <p className="text-3xl font-bold text-secondary-600">{stats.conteosPendientes}</p>
          </div>
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card p-6 border border-slate-100 dark:border-slate-700">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">Acciones Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/productos" className="group relative overflow-hidden p-6 rounded-2xl bg-gradient-ocean text-white shadow-soft hover:shadow-glow transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative z-10">
              <Package className="mb-3" size={32} />
              <p className="text-lg font-semibold">Ver Productos</p>
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

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card p-6 border border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-warning rounded-lg">
            <AlertTriangle className="text-white" size={20} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Alertas Recientes</h2>
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
              <div key={alerta.id} className="group flex items-start gap-4 p-4 bg-gradient-to-r from-slate-50 dark:from-slate-700/50 to-transparent rounded-xl hover:from-slate-100 dark:hover:from-slate-700 transition-all duration-300 border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600">
                <div className={`p-2 rounded-lg ${alerta.prioridad === 'CRITICA' || alerta.prioridad === 'critica' ? 'bg-danger-100' : alerta.prioridad === 'ALTA' || alerta.prioridad === 'alta' ? 'bg-red-100' : alerta.prioridad === 'MEDIA' || alerta.prioridad === 'media' ? 'bg-accent-100' : 'bg-slate-100'}`}>
                  <AlertTriangle size={20} className={alerta.prioridad === 'CRITICA' || alerta.prioridad === 'critica' ? 'text-danger-600' : alerta.prioridad === 'ALTA' || alerta.prioridad === 'alta' ? 'text-red-600' : alerta.prioridad === 'MEDIA' || alerta.prioridad === 'media' ? 'text-accent-600' : 'text-slate-600'} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{alerta.mensaje}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                    <span>{formatTimeAgo(alerta.fecha_creacion)}</span>
                    <span>•</span>
                    <span>{alerta.ubicacion_nombre}</span>
                  </p>
                </div>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${alerta.prioridad === 'CRITICA' || alerta.prioridad === 'critica' ? 'bg-red-600 text-white' : alerta.prioridad === 'ALTA' || alerta.prioridad === 'alta' ? 'bg-red-500 text-white' : alerta.prioridad === 'MEDIA' || alerta.prioridad === 'media' ? 'bg-blue-500 text-white' : 'bg-gray-500 text-white'}`}>
                  {alerta.prioridad.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
