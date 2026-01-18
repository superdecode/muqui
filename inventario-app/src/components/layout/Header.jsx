import { Bell } from 'lucide-react'
import { useAlertasStore } from '../../stores/alertasStore'
import { useAuthStore } from '../../stores/authStore'

export default function Header() {
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
              {user.ubicacion_nombre || 'Sistema de Inventario'}
            </p>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Alertas */}
          <button className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
            <Bell size={24} />
            {alertasNoLeidas > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {alertasNoLeidas > 9 ? '9+' : alertasNoLeidas}
              </span>
            )}
          </button>

          {/* User avatar */}
          {user && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold">
                {user.nombre_completo?.charAt(0).toUpperCase()}
              </div>
            </div>
          )}
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
