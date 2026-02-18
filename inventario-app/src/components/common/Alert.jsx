import { AlertCircle, CheckCircle, Info, XCircle, X } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function Alert({
  type = 'info',
  title,
  message,
  children,
  onClose,
  className = '',
  autoClose = true,
  autoCloseDuration = 3000
}) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        if (onClose) {
          onClose()
        } else {
          // Si no hay onClose, simplemente ocultar el componente
          setIsVisible(false)
        }
      }, autoCloseDuration)

      return () => clearTimeout(timer)
    }
  }, [autoClose, autoCloseDuration, onClose])

  if (!isVisible) return null
  const types = {
    success: {
      icon: CheckCircle,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      iconColor: 'text-green-600',
      titleColor: 'text-green-800',
      messageColor: 'text-green-700'
    },
    error: {
      icon: XCircle,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconColor: 'text-red-600',
      titleColor: 'text-red-800',
      messageColor: 'text-red-700'
    },
    warning: {
      icon: AlertCircle,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      iconColor: 'text-yellow-600',
      titleColor: 'text-yellow-800',
      messageColor: 'text-yellow-700'
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-600',
      titleColor: 'text-blue-800',
      messageColor: 'text-blue-700'
    }
  }

  const config = types[type]
  const Icon = config.icon

  return (
    <div
      className={`
        ${config.bgColor} ${config.borderColor}
        border rounded-lg p-4
        ${className}
      `}
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={config.iconColor} size={20} />
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={`text-sm font-medium ${config.titleColor}`}>
              {title}
            </h3>
          )}
          {(message || children) && (
            <div className={`text-sm ${title ? 'mt-1' : ''} ${config.messageColor}`}>
              {message || children}
            </div>
          )}
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <button
              onClick={onClose}
              className={`inline-flex rounded-md p-1.5 ${config.iconColor} hover:bg-opacity-20 focus:outline-none`}
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
