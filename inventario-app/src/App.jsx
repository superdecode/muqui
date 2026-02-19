import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { useAuthStore } from './stores/authStore'
import { useThemeStore } from './stores/themeStore'
import { useRealtimeAuth } from './hooks/useRealtimeAuth'
import { useRealtimeAlerts } from './hooks/useRealtimeAlerts'
import ToastContainer from './components/common/ToastContainer'
import NotificationPopups from './components/common/NotificationPopups'
import dataService from './services/dataService'
import './utils/seedRazonesMerma' // Import seeder to make window.seedRazonesMerma available

// Pages
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Inventario from './pages/Inventario'
import Productos from './pages/Productos'
import Movimientos from './pages/Movimientos'
import Solicitudes from './pages/Solicitudes'
import Salidas from './pages/Salidas'
import Recepciones from './pages/Recepciones'
import Conteos from './pages/Conteos'
import Reportes from './pages/Reportes'
import MiPerfil from './pages/MiPerfil'
import Configuraciones from './pages/Configuraciones'
import Administracion from './pages/Administracion'

// Layout
import Layout from './components/layout/Layout'

// Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000 // 5 minutos
    }
  }
})

// Protected Route Component - checks auth + ANY permission at all
function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const hasAnyPermission = useAuthStore((state) => state.hasAnyPermission)
  const logout = useAuthStore((state) => state.logout)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // User authenticated but has NO permissions at all - show blocked screen
  if (!hasAnyPermission()) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">Sin Permisos Asignados</h1>
          <p className="text-slate-600 mb-6">
            No tienes permisos asignados para acceder a ningún módulo del sistema.
            Por favor, contacta al administrador para solicitar acceso.
          </p>
          <button
            onClick={() => {
              logout()
              window.location.href = '/login'
            }}
            className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    )
  }

  return children
}

// Permission-based Route Component - redirects to first allowed route
function PermissionRoute({ module, children }) {
  const { canView, getFirstAllowedRoute } = useAuthStore()

  if (!canView(module)) {
    // Redirect to first allowed module instead of just "/"
    const firstRoute = getFirstAllowedRoute()
    return <Navigate to={firstRoute || '/'} replace />
  }
  return children
}

function AppContent() {
  // Real-time auth: auto-logout on deactivation, live permission updates
  useRealtimeAuth()

  // Fetch ubicaciones and empresas for real-time alerts
  const { data: ubicaciones = [] } = useQuery({
    queryKey: ['ubicaciones-alerts'],
    queryFn: () => dataService.getUbicaciones(),
    staleTime: 10 * 60 * 1000 // 10 minutes
  })
  const { data: empresas = [] } = useQuery({
    queryKey: ['empresas-alerts'],
    queryFn: () => dataService.getEmpresas(),
    staleTime: 10 * 60 * 1000
  })

  // Real-time alerts: incoming transfers and conteo reminders
  useRealtimeAlerts(ubicaciones, empresas)

  return null
}

function App() {
  const initTheme = useThemeStore((s) => s.initTheme)
  const initializeAuth = useAuthStore((s) => s.initializeAuth)

  useEffect(() => {
    // Initialize authentication state first
    initializeAuth()
    initTheme()
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [initTheme, initializeAuth])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}>
        <AppContent />
        <ToastContainer />
        <NotificationPopups />
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="inventario" element={<Inventario />} />
            <Route path="productos" element={<PermissionRoute module="productos"><Productos /></PermissionRoute>} />
            <Route path="movimientos" element={<PermissionRoute module="movimientos"><Movimientos /></PermissionRoute>} />
            <Route path="movimientos/solicitudes" element={<PermissionRoute module="movimientos"><Solicitudes /></PermissionRoute>} />
            <Route path="movimientos/salidas" element={<PermissionRoute module="movimientos"><Salidas /></PermissionRoute>} />
            <Route path="movimientos/recepciones" element={<PermissionRoute module="movimientos"><Recepciones /></PermissionRoute>} />
            <Route path="transferencias" element={<Navigate to="/movimientos/salidas" replace />} />
            <Route path="conteos" element={<PermissionRoute module="conteos"><Conteos /></PermissionRoute>} />
            <Route path="reportes" element={<PermissionRoute module="reportes"><Reportes /></PermissionRoute>} />
            <Route path="perfil" element={<MiPerfil />} />
            <Route path="configuraciones" element={<PermissionRoute module="configuracion"><Configuraciones /></PermissionRoute>} />
            <Route path="admin" element={<PermissionRoute module="administracion"><Administracion /></PermissionRoute>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
