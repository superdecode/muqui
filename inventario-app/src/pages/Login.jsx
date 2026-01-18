import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import authService from '../services/authService'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import Alert from '../components/common/Alert'
import { Sparkles, Package, Lock } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await authService.login(formData.email, formData.password)

      if (result.success) {
        login(result.user, result.token)
        navigate('/')
      } else {
        setError(result.message || 'Error al iniciar sesión')
      }
    } catch (err) {
      setError('Error de conexión. Por favor intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-mesh flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary-400/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '-2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent-400/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '-4s' }}></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Card */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-card-hover p-8 border border-white/20">
          {/* Logo and title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-ocean rounded-2xl shadow-glow mb-4">
              <Package className="text-white" size={40} />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-ocean bg-clip-text text-transparent mb-2">
              Sistema de Inventario
            </h1>
            <p className="text-slate-600 flex items-center justify-center gap-2">
              <Sparkles size={16} className="text-primary-500" />
              Multi-tienda Muqui
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert type="error" className="mb-6">
              {error}
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Correo Electrónico"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="tu@email.com"
              required
              autoFocus
            />

            <div className="relative">
              <Input
                label="Contraseña"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              loading={loading}
            >
              <Lock size={20} className="mr-2" />
              Iniciar Sesión
            </Button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-8 p-4 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-2xl border border-primary-100">
            <p className="text-xs font-semibold text-primary-700 mb-3 flex items-center gap-2">
              <Sparkles size={14} />
              Credenciales de Prueba
            </p>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between items-center p-2 bg-white/50 rounded-lg">
                <span className="font-medium">Admin:</span>
                <code className="bg-primary-100 px-2 py-1 rounded text-primary-700">admin@muqui.com</code>
              </div>
              <div className="flex justify-between items-center p-2 bg-white/50 rounded-lg">
                <span className="font-medium">Gerente:</span>
                <code className="bg-secondary-100 px-2 py-1 rounded text-secondary-700">gerente@muqui.com</code>
              </div>
              <div className="flex justify-between items-center p-2 bg-white/50 rounded-lg">
                <span className="font-medium">Contraseña:</span>
                <code className="bg-accent-100 px-2 py-1 rounded text-accent-700">admin123</code>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-white/80 text-sm">
          © 2026 Sistema de Inventario Muqui
        </p>
      </div>
    </div>
  )
}
