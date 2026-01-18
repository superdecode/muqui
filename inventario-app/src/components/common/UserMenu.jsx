import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Settings, HelpCircle, LogOut, ChevronDown, Building2, MapPin } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

const UserMenu = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef(null)
  const navigate = useNavigate()
  const logout = useAuthStore(state => state.logout)

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getRoleLabel = (rol) => {
    const roles = {
      'ADMIN_GLOBAL': 'Administrador Global',
      'ADMIN_EMPRESA': 'Administrador de Empresa',
      'GERENTE_OPERATIVO': 'Gerente Operativo',
      'JEFE_PUNTO': 'Jefe de Punto',
      'OPERADOR': 'Operador'
    }
    return roles[rol] || rol
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* User Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 hover:bg-slate-100 rounded-lg p-2 transition-colors"
      >
        <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold">
          {user?.nombre?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-slate-900">{user?.nombre}</p>
          <p className="text-xs text-slate-600">{getRoleLabel(user?.rol)}</p>
        </div>
        <ChevronDown
          size={16}
          className={`hidden md:block text-slate-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-14 w-72 bg-white rounded-lg shadow-xl border border-slate-200 z-50">
          {/* User Info */}
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-lg">
                {user?.nombre?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 truncate">{user?.nombre}</p>
                <p className="text-sm text-slate-600">{user?.email}</p>
              </div>
            </div>

            {/* User Details */}
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Building2 size={14} className="flex-shrink-0" />
                <span className="truncate">Empresa: {user?.empresa_id || 'No asignado'}</span>
              </div>
              {user?.ubicaciones_asignadas && user.ubicaciones_asignadas.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <MapPin size={14} className="flex-shrink-0" />
                  <span className="truncate">
                    {user.ubicaciones_asignadas.length} ubicación(es) asignada(s)
                  </span>
                </div>
              )}
              <div className="inline-block">
                <span className="text-xs px-2 py-1 rounded-full bg-primary-100 text-primary-800 font-medium">
                  {getRoleLabel(user?.rol)}
                </span>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <button
              onClick={() => {
                setIsOpen(false)
                navigate('/perfil')
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <User size={18} className="text-slate-600" />
              <span>Mi Perfil</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false)
                navigate('/configuracion')
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Settings size={18} className="text-slate-600" />
              <span>Configuración</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false)
                navigate('/ayuda')
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <HelpCircle size={18} className="text-slate-600" />
              <span>Ayuda y Soporte</span>
            </button>
          </div>

          {/* Logout */}
          <div className="border-t border-slate-200 py-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={18} />
              <span className="font-medium">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserMenu
