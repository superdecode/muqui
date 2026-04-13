/**
 * StatusToggle — Componente reutilizable para activar/desactivar estado (ACTIVO/INACTIVO).
 *
 * Props:
 *  - value: 'ACTIVO' | 'INACTIVO'  (valor actual)
 *  - onChange: (newValue: string) => void
 *  - disabled?: boolean
 *  - size?: 'sm' | 'md' | 'lg'
 *  - showLabel?: boolean  (muestra etiqueta de texto a la derecha)
 *  - className?: string
 */
export default function StatusToggle({
  value = 'ACTIVO',
  onChange,
  disabled = false,
  size = 'md',
  showLabel = true,
  className = ''
}) {
  const isActive = value === 'ACTIVO'

  const handleToggle = () => {
    if (disabled) return
    onChange(isActive ? 'INACTIVO' : 'ACTIVO')
  }

  // Sizes
  const sizes = {
    sm: { track: 'h-5 w-9', thumb: 'h-3.5 w-3.5', translateOn: 'translate-x-4', translateOff: 'translate-x-0.5', text: 'text-xs' },
    md: { track: 'h-6 w-11', thumb: 'h-4 w-4', translateOn: 'translate-x-6', translateOff: 'translate-x-1', text: 'text-sm' },
    lg: { track: 'h-7 w-14', thumb: 'h-5 w-5', translateOn: 'translate-x-7', translateOff: 'translate-x-1', text: 'text-base' }
  }

  const s = sizes[size] || sizes.md

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <button
        type="button"
        role="switch"
        aria-checked={isActive}
        disabled={disabled}
        onClick={handleToggle}
        className={`
          relative inline-flex flex-shrink-0 ${s.track} items-center rounded-full
          transition-all duration-300 ease-in-out
          focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
          ${isActive
            ? 'bg-emerald-500 focus-visible:ring-emerald-500 shadow-[0_0_0_1px_rgba(16,185,129,0.3)]'
            : 'bg-slate-300 dark:bg-slate-600 focus-visible:ring-slate-400 shadow-[0_0_0_1px_rgba(148,163,184,0.3)]'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}
        `}
      >
        {/* Glow pulse cuando está activo */}
        {isActive && !disabled && (
          <span className="absolute inset-0 rounded-full animate-pulse bg-emerald-400/20 pointer-events-none" />
        )}
        {/* Thumb */}
        <span
          className={`
            inline-block ${s.thumb} rounded-full bg-white shadow-sm
            transition-transform duration-300 ease-in-out
            ${isActive ? s.translateOn : s.translateOff}
          `}
        />
      </button>

      {showLabel && (
        <span
          className={`
            font-semibold ${s.text} select-none transition-colors duration-200
            ${isActive
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-slate-500 dark:text-slate-400'
            }
          `}
        >
          {isActive ? 'Activo' : 'Inactivo'}
        </span>
      )}
    </div>
  )
}
