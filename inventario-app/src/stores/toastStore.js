import { create } from 'zustand'

let toastCounter = 0

export const useToastStore = create((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = ++toastCounter
    const duration = toast.duration ?? (toast.type === 'error' ? 5000 : toast.type === 'warning' ? 4000 : 3000)

    const newToast = {
      id,
      type: toast.type || 'info',
      title: toast.title,
      message: toast.message,
      duration,
      isClosing: false
    }

    set((state) => ({ toasts: [...state.toasts, newToast] }))

    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.map((t) => t.id === id ? { ...t, isClosing: true } : t)
        }))
        setTimeout(() => {
          set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
        }, 300)
      }, duration)
    }

    return id
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.map((t) => t.id === id ? { ...t, isClosing: true } : t)
    }))
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, 300)
  },

  success: (title, message, duration) => {
    const store = useToastStore.getState()
    return store.addToast({ type: 'success', title, message, duration })
  },

  error: (title, message, duration) => {
    const store = useToastStore.getState()
    return store.addToast({ type: 'error', title, message, duration })
  },

  warning: (title, message, duration) => {
    const store = useToastStore.getState()
    return store.addToast({ type: 'warning', title, message, duration })
  },

  info: (title, message, duration) => {
    const store = useToastStore.getState()
    return store.addToast({ type: 'info', title, message, duration })
  },

  clearAll: () => set({ toasts: [] })
}))

export default useToastStore
