import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import authService from '../services/authService'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import Alert from '../components/common/Alert'
import { Sparkles, Package, Lock, Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
      console.log('Intentando login con:', formData.email)
      const result = await authService.login(formData.email, formData.password)

      console.log('Resultado del login:', { success: result.success, message: result.message })

      if (result.success) {
        login(result.user, result.token, result.role || null)
        navigate('/')
      } else {
        console.log('Login fallido, mostrando error:', result.message)
        setError(result.message || 'Error al iniciar sesión')
      }
    } catch (err) {
      console.error('Error inesperado en login:', err)
      setError('Error de conexión. Por favor intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-mesh flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-red-400/50 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-400/50 rounded-full blur-3xl animate-float" style={{ animationDelay: '-2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/50 rounded-full blur-3xl animate-float" style={{ animationDelay: '-4s' }}></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Card */}
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl shadow-card-hover p-8 border border-white/20 dark:border-slate-700/50">
          {/* Logo and title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-ocean rounded-2xl shadow-glow mb-4">
              <Package className="text-white" size={40} />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-ocean bg-clip-text text-transparent mb-2">
              Sistema de Control Inventario
            </h1>
            <p className="text-slate-600 dark:text-slate-400 flex items-center justify-center gap-2">
              <Sparkles size={16} className="text-blue-300" />
              Multi-tienda Muqui
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert type="error" className="mb-6" autoClose={false}>
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
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[38px] p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
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

        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-white/80 text-sm">
          © 2026 Sistema de Control Inventario Muqui
        </p>
      </div>
    </div>
  )
}
