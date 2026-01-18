import { useState, useRef } from 'react'
import { Bell } from 'lucide-react'
import { useAlertasStore } from '../../stores/alertasStore'
import { useAuthStore } from '../../stores/authStore'
import AlertsPanel from '../common/AlertsPanel'
import UserMenu from '../common/UserMenu'

export default function Header() {
  const [showAlertsPanel, setShowAlertsPanel] = useState(false)
  const bellRef = useRef(null)
  const { alertasNoLeidas } = useAlertasStore()
  const { user } = useAuthStore()

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {getGreeting()}
          </h2>
          {user && (
            <p className="text-sm text-slate-600">
              {user.ubicacion_nombre || 'Sistema de Control Inventario'}
            </p>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Alerts Button */}
          <div className="relative">
            <button
              ref={bellRef}
              onClick={() => setShowAlertsPanel(!showAlertsPanel)}
              className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
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
              isOpen={showAlertsPanel}
              onClose={() => setShowAlertsPanel(false)}
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

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 18) return 'Buenas tardes'
  return 'Buenas noches'
}
