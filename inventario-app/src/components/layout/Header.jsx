import { useRef, useMemo } from 'react'
import { Bell } from 'lucide-react'
import { useAlertasStore } from '../../stores/alertasStore'
import { useAuthStore } from '../../stores/authStore'
import { useThemeStore } from '../../stores/themeStore'
import { useAlertas } from '../../hooks/useAlertas'
import AlertsPanel from '../common/AlertsPanel'
import UserMenu from '../common/UserMenu'

export default function Header() {
  const bellRef = useRef(null)
  const { alertasNoLeidas, showPanel, setShowPanel } = useAlertasStore()
  const { user } = useAuthStore()
  const { timezone } = useThemeStore()

  const alertUserIds = useMemo(() => {
    if (!user?.id) return null
    if (user.firestoreId) return [user.id, user.firestoreId]
    return user.id
  }, [user?.id, user?.firestoreId])

  // Initialize alerts subscription for real-time notifications
  useAlertas(alertUserIds)

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {getGreeting(timezone)}
          </h2>
          {user && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {user.ubicacion_nombre || 'Sistema de Control Inventario'}
            </p>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Alerts Button */}
          <div className="relative">
            <button
              ref={bellRef}
              onClick={() => setShowPanel(!showPanel)}
              className="relative p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Bell size={24} />
              {alertasNoLeidas > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                  {alertasNoLeidas > 9 ? '9+' : alertasNoLeidas}
                </span>
              )}
            </button>

            {/* Alerts Panel */}
            <AlertsPanel
              isOpen={showPanel}
              onClose={() => setShowPanel(false)}
              anchorRef={bellRef}
            />
          </div>

          {/* User Menu */}
          {user && <UserMenu user={user} />}
        </div>
      </div>
    </header>
  )
}

function getGreeting(timezone = 'America/Lima') {
  // Obtener la hora en la zona horaria del usuario
  const now = new Date()
  const hour = parseInt(now.toLocaleString('en-US', { 
    timeZone: timezone, 
    hour: 'numeric', 
    hour12: false 
  }))
  
  if (hour >= 6 && hour < 12) return 'Buenos días'
  if (hour >= 12 && hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}
