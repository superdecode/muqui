export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  loading = false,
  onClick,
  className = '',
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95'

  const variants = {
    primary: 'bg-gradient-ocean text-white hover:shadow-glow focus:ring-primary-500 shadow-soft',
    secondary: 'bg-gradient-purple text-slate-800 hover:shadow-card-hover focus:ring-secondary-500 shadow-soft',
    success: 'bg-gradient-success text-white hover:shadow-card-hover focus:ring-success-500 shadow-soft',
    danger: 'bg-gradient-danger text-white hover:shadow-card-hover focus:ring-danger-500 shadow-soft',
    warning: 'bg-gradient-warning text-white hover:shadow-card-hover focus:ring-warning-500 shadow-soft',
    outline: 'border-2 border-primary-500 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 focus:ring-primary-500 hover:border-primary-600',
    ghost: 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 focus:ring-slate-500 hover:shadow-soft',
    gradient: 'bg-gradient-rainbow text-white hover:shadow-glow-lg focus:ring-secondary-500 shadow-card animate-gradient bg-[length:200%_200%]'
  }

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Cargando...
        </>
      ) : (
        children
      )}
    </button>
  )
}
