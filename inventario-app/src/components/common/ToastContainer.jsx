import { useToastStore } from '../../stores/toastStore'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

const ICONS = {
  success: <CheckCircle className="text-green-600" size={20} />,
  error: <XCircle className="text-red-600" size={20} />,
  warning: <AlertTriangle className="text-yellow-600" size={20} />,
  info: <Info className="text-blue-600" size={20} />
}

const COLORS = {
  success: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800',
  error: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800',
  warning: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800',
  info: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800'
}

const BAR_COLORS = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  warning: 'bg-yellow-500',
  info: 'bg-blue-500'
}

const Toast = ({ toast, onClose }) => {
  return (
    <div
      className={`${COLORS[toast.type] || COLORS.info} border rounded-lg shadow-lg p-4 mb-3 min-w-[320px] max-w-md transition-all duration-300 overflow-hidden relative ${
        toast.isClosing
          ? 'opacity-0 translate-x-full scale-95'
          : 'opacity-100 translate-x-0 scale-100 animate-slide-in-right'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{ICONS[toast.type] || ICONS.info}</div>
        <div className="flex-1 min-w-0">
          {toast.title && <p className="font-semibold text-slate-900 dark:text-slate-100 mb-0.5">{toast.title}</p>}
          {toast.message && <p className="text-sm text-slate-700 dark:text-slate-300">{toast.message}</p>}
        </div>
        <button onClick={() => onClose(toast.id)} className="flex-shrink-0 text-slate-400 hover:text-slate-700 transition-colors p-0.5">
          <X size={16} />
        </button>
      </div>
      {toast.duration > 0 && !toast.isClosing && (
        <div className="absolute bottom-0 left-0 right-0 h-1">
          <div
            className={`h-full ${BAR_COLORS[toast.type] || BAR_COLORS.info} opacity-40`}
            style={{ animation: `shrink-bar ${toast.duration}ms linear forwards` }}
          />
        </div>
      )}
    </div>
  )
}

const ToastContainer = () => {
  const toasts = useToastStore((s) => s.toasts)
  const removeToast = useToastStore((s) => s.removeToast)

  if (toasts.length === 0) return null

  return (
    <>
      <style>{`@keyframes shrink-bar { from { width: 100%; } to { width: 0%; } }`}</style>
      <div className="fixed top-4 right-4 z-[9999]" style={{ pointerEvents: 'none' }}>
        <div style={{ pointerEvents: 'auto' }}>
          {toasts.map((toast) => (
            <Toast key={toast.id} toast={toast} onClose={removeToast} />
          ))}
        </div>
      </div>
    </>
  )
}

export default ToastContainer
