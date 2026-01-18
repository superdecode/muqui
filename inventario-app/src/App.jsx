import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from './stores/authStore'
import ToastContainer from './components/common/ToastContainer'

// Pages
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Inventario from './pages/Inventario'
import Productos from './pages/Productos'
import Movimientos from './pages/Movimientos'
import Conteos from './pages/Conteos'
import Reportes from './pages/Reportes'

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

// Protected Route Component
function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}>
        <ToastContainer />
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
            <Route path="productos" element={<Productos />} />
            <Route path="movimientos" element={<Movimientos />} />
            <Route path="transferencias" element={<Navigate to="/movimientos" replace />} />
            <Route path="conteos" element={<Conteos />} />
            <Route path="reportes" element={<Reportes />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
