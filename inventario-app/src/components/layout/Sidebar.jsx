import { NavLink } from 'react-router-dom'
import {
  Home,
  Package,
  ArrowRightLeft,
  ClipboardCheck,
  FileBarChart,
  LogOut,
  Menu,
  X
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useState } from 'react'

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)

  const menuItems = [
    { to: '/', icon: Home, label: 'Dashboard' },
    { to: '/inventario', icon: Package, label: 'Inventario', permission: 'inventario.ver' },
    { to: '/movimientos', icon: ArrowRightLeft, label: 'Movimientos', permission: 'transferencias.confirmar' },
    { to: '/conteos', icon: ClipboardCheck, label: 'Conteos', permission: 'conteos.ejecutar' },
    { to: '/reportes', icon: FileBarChart, label: 'Reportes', permission: 'reportes.ver' }
  ]

  const handleLogout = () => {
    logout()
  }

  const toggleSidebar = () => {
    setIsOpen(!isOpen)
  }

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-primary-600 text-white"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-gradient-to-b from-[#004AFF] to-[#002980] text-white
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-white/20">
            <h1 className="text-xl font-bold">Sistema Inventario</h1>
            {user && (
              <p className="text-sm text-white/60 mt-1">{user.nombre_completo}</p>
            )}
          </div>

          {/* Menu items */}
          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* User info and logout */}
          <div className="p-4 border-t border-white/20">
            {user && (
              <div className="mb-3 px-4">
                <p className="text-xs text-white/60">Rol</p>
                <p className="text-sm font-medium">{user.rol}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full text-white/80 hover:bg-white/10 hover:text-white rounded-lg transition-colors"
            >
              <LogOut size={20} />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
