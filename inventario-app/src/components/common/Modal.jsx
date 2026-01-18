import { X } from 'lucide-react'
import { useEffect } from 'react'

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true
}) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    // Si isOpen no está definido (undefined), asumimos que el modal debe estar abierto
    // ya que el componente padre lo está montando
    const shouldBeOpen = isOpen === undefined ? true : isOpen

    if (shouldBeOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Solo retornar null si isOpen está explícitamente en false
  if (isOpen === false) return null

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className={`relative bg-white rounded-lg shadow-xl w-full ${sizes[size]} transform transition-all`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={24} />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="p-6">{children}</div>
        </div>
      </div>
    </div>
  )
}
