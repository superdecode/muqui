import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { User, Settings, LogOut, ChevronDown, Building2, MapPin, Info } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useToastStore } from '../../stores/toastStore'
import dataService from '../../services/dataService'
import { getUserAllowedUbicacionIds, getUserAllowedEmpresaIds } from '../../utils/userFilters'
import UserProfileModal from './UserProfileModal'

const UserMenu = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const menuRef = useRef(null)
  const navigate = useNavigate()
  const logout = useAuthStore(state => state.logout)
  const { cachedRole, getPermissionLevel } = useAuthStore()

  // Load empresas and ubicaciones for counting
  const { data: empresas = [] } = useQuery({
    queryKey: ['empresas'],
    queryFn: () => dataService.getEmpresas()
  })

  const { data: ubicaciones = [] } = useQuery({
    queryKey: ['ubicaciones'],
    queryFn: () => dataService.getUbicaciones()
  })

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
    // Priority: cached role name from Firestore > user.roleData > legacy constant map
    if (cachedRole?.nombre) return cachedRole.nombre
    if (user?.roleData?.nombre) return user.roleData.nombre
    const legacyMap = {
      'ADMIN_GLOBAL': 'Administrador Global',
      'ADMIN_EMPRESA': 'Administrador de Empresa',
      'GERENTE_OPERATIVO': 'Gerente Operativo',
      'JEFE_PUNTO': 'Jefe de Punto',
      'OPERADOR': 'Operador'
    }
    return legacyMap[rol] || rol || '-'
  }

  // Use permission level instead of hardcoded role constants for admin access checks
  const isAdminGlobal = getPermissionLevel('administracion') === 'total'

  const handleViewProfile = () => {
    setIsOpen(false)
    setShowProfileModal(true)
  }

  // Obtener número de empresas asignadas usando utilidad
  const getEmpresasCount = () => {
    if (isAdminGlobal) return empresas.length
    const empresaIds = getUserAllowedEmpresaIds(user)
    return empresaIds.length
  }

  // Obtener número de ubicaciones asignadas usando utilidad
  const getUbicacionesCount = () => {
    if (isAdminGlobal) return ubicaciones.length
    const ubicacionIds = getUserAllowedUbicacionIds(user, ubicaciones, empresas)
    return ubicacionIds.length
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* User Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg p-2 transition-colors"
      >
        <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold">
          {user?.nombre?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{user?.nombre}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">{getRoleLabel(user?.rol)}</p>
        </div>
        <ChevronDown
          size={16}
          className={`hidden md:block text-slate-600 dark:text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-14 w-72 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50">
          {/* User Info */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-lg">
                {user?.nombre?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{user?.nombre}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{user?.email}</p>
              </div>
            </div>

            {/* User Details */}
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <Building2 size={14} className="flex-shrink-0" />
                <span className="truncate">
                  {isAdminGlobal
                    ? `${getEmpresasCount()} empresa(s) — Acceso total`
                    : getEmpresasCount() > 0 
                    ? `${getEmpresasCount()} empresa(s) asignada(s)` 
                    : 'No asignado'}
                </span>
              </div>
              {getUbicacionesCount() > 0 && (
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <MapPin size={14} className="flex-shrink-0" />
                  <span className="truncate">
                    {isAdminGlobal
                      ? `${getUbicacionesCount()} ubicación(es) — Acceso total`
                      : `${getUbicacionesCount()} ubicación(es) asignada(s)`}
                  </span>
                </div>
              )}
              <div className="inline-block">
                <span className="text-xs px-2 py-1 rounded-full bg-primary-100 text-primary-800 font-medium">
                  {getRoleLabel(user?.rol)}
                </span>
              </div>
            </div>

            {/* View Details Button */}
            <button
              onClick={handleViewProfile}
              className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50 rounded-lg transition-colors"
            >
              <Info size={14} />
              Ver Información Completa
            </button>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <button
              onClick={() => {
                setIsOpen(false)
                navigate('/perfil')
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <User size={18} className="text-slate-600 dark:text-slate-400" />
              <span>Mi Perfil</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false)
                navigate('/configuraciones')
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Settings size={18} className="text-slate-600 dark:text-slate-400" />
              <span>Configuración</span>
            </button>
          </div>

          {/* Logout */}
          <div className="border-t border-slate-200 dark:border-slate-700 py-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut size={18} />
              <span className="font-medium">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      <UserProfileModal 
        user={user}
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </div>
  )
}

export default UserMenu
