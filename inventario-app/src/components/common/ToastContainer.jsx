import { useToastStore } from '../../stores/toastStore'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

const Toast = ({ toast, onClose }) => {
  const icons = {
    success: <CheckCircle className="text-green-600" size={20} />,
    error: <XCircle className="text-red-600" size={20} />,
    warning: <AlertTriangle className="text-yellow-600" size={20} />,
    info: <Info className="text-blue-600" size={20} />
  }

  const colors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200'
  }

  return (
    <div
      className={`${colors[toast.type]} border rounded-lg shadow-lg p-4 mb-3 min-w-[320px] max-w-md animate-slide-in-right`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>

        <div className="flex-1 min-w-0">
          {toast.title && (
            <p className="font-semibold text-slate-900 mb-0.5">{toast.title}</p>
          )}
          {toast.message && (
            <p className="text-sm text-slate-700">{toast.message}</p>
          )}
        </div>

        <button
          onClick={() => onClose(toast.id)}
          className="flex-shrink-0 text-slate-500 hover:text-slate-700 transition-colors"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )
}

const ToastContainer = () => {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[9999] pointer-events-none">
      <div className="pointer-events-auto">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>
    </div>
  )
}

export default ToastContainer
