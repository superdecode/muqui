import React from 'react'
import { X, AlertTriangle, Info, HelpCircle, Trash2, Copy, AlertCircle } from 'lucide-react'
import Button from './Button'

/**
 * Reusable Confirmation Modal with premium design.
 * 
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {function} onClose - Function to call when closing without confirming
 * @param {function} onConfirm - Function to call when user confirms
 * @param {string} title - Title of the modal
 * @param {string} message - Description message
 * @param {string} confirmText - Text for the confirm button
 * @param {string} cancelText - Text for the cancel button
 * @param {string} variant - 'danger' | 'warning' | 'info' | 'success'
 * @param {React.ReactNode} icon - Optional icon to override the default for the variant
 * @param {boolean} loading - Whether the confirm button should show a loading state
 */
const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Confirmar', 
  cancelText = 'Cancelar', 
  variant = 'danger',
  icon: customIcon,
  loading = false
}) => {
  if (!isOpen) return null

  const variants = {
    danger: {
      bg: 'bg-red-50 dark:bg-red-900/10',
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      iconColor: 'text-red-600 dark:text-red-400',
      button: 'bg-red-600 hover:bg-red-700 text-white',
      border: 'border-red-200 dark:border-red-800/30',
      defaultIcon: Trash2
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/10',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      button: 'bg-amber-600 hover:bg-amber-700 text-white',
      border: 'border-amber-200 dark:border-amber-800/30',
      defaultIcon: AlertTriangle
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/10',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
      border: 'border-blue-200 dark:border-blue-800/30',
      defaultIcon: Info
    },
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/10',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      button: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      border: 'border-emerald-200 dark:border-emerald-800/30',
      defaultIcon: AlertCircle
    }
  }

  const v = variants[variant] || variants.danger
  const Icon = customIcon || v.defaultIcon

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div 
        className={`bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden max-w-md w-full border ${v.border} animate-in zoom-in-95 duration-200`}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`shrink-0 p-3 rounded-2xl ${v.iconBg} ${v.iconColor}`}>
              <Icon size={24} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h3>
                <button 
                  onClick={onClose} 
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                {message}
              </p>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors disabled:opacity-50"
            >
              {cancelText}
            </button>
            <Button
              onClick={onConfirm}
              loading={loading}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-current/10 ${v.button}`}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
