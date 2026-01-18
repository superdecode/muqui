import { create } from 'zustand'

/**
 * Store para manejar notificaciones toast
 */
export const useToastStore = create((set, get) => ({
  toasts: [],

  // Agregar un toast
  addToast: (toast) => {
    const id = Date.now() + Math.random()
    const newToast = {
      id,
      type: toast.type || 'info', // success, error, warning, info
      title: toast.title,
      message: toast.message,
      duration: toast.duration || 5000,
      ...toast
    }

    set((state) => ({
      toasts: [...state.toasts, newToast]
    }))

    // Auto-remove después del duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        get().removeToast(id)
      }, newToast.duration)
    }

    return id
  },

  // Remover un toast
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id)
    }))
  },

  // Atajos para tipos comunes
  success: (title, message, duration) => {
    return get().addToast({ type: 'success', title, message, duration })
  },

  error: (title, message, duration) => {
    return get().addToast({ type: 'error', title, message, duration })
  },

  warning: (title, message, duration) => {
    return get().addToast({ type: 'warning', title, message, duration })
  },

  info: (title, message, duration) => {
    return get().addToast({ type: 'info', title, message, duration })
  },

  // Limpiar todos
  clearAll: () => {
    set({ toasts: [] })
  }
}))

export default useToastStore
