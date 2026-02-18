import { create } from 'zustand'

// Helper: check if notification is expired (24h)
function isExpired(alerta) {
  if (!alerta.expiraEn) return false
  const expiry = alerta.expiraEn.toDate
    ? alerta.expiraEn.toDate()
    : new Date(alerta.expiraEn.seconds * 1000)
  return expiry < new Date()
}

export const useAlertasStore = create((set, get) => ({
  // Estado
  alertas: [],
  alertasNoLeidas: 0,
  loading: false,
  error: null,
  userId: null,
  unsubscribe: null,

  // NEW: Popup notifications state
  popupNotifications: [],
  panelTab: 'no_leidas', // 'no_leidas' | 'todas'
  showPanel: false, // Control panel visibility

  // Set current user ID for read tracking
  setUserId: (userId) => set({ userId }),

  // Set notifications from Firebase (real-time)
  setAlertas: (alertas) => {
    const { userId } = get()
    // Filter out expired notifications
    const activeAlertas = alertas.filter(a => !isExpired(a))
    const noLeidas = activeAlertas.filter(a => {
      if (!a.activa) return false
      const leidoPor = Array.isArray(a.leido_por) ? a.leido_por : []
      return !leidoPor.includes(userId)
    }).length
    set({ alertas: activeAlertas, alertasNoLeidas: noLeidas })
  },

  addAlerta: (alerta) => {
    set((state) => ({
      alertas: [alerta, ...state.alertas],
      alertasNoLeidas: state.alertasNoLeidas + 1
    }))
  },

  marcarComoLeida: (alertaId) => {
    const { userId } = get()
    set((state) => ({
      alertas: state.alertas.map(a => {
        if (a.id !== alertaId) return a
        const leidoPor = Array.isArray(a.leido_por) ? [...a.leido_por] : []
        if (!leidoPor.includes(userId)) leidoPor.push(userId)
        return { ...a, leido_por: leidoPor }
      }),
      alertasNoLeidas: Math.max(0, state.alertasNoLeidas - 1)
    }))
  },

  // NEW: Mark as opened (clicked/viewed detail)
  marcarComoAbierta: (alertaId) => {
    const { userId } = get()
    set((state) => ({
      alertas: state.alertas.map(a => {
        if (a.id !== alertaId) return a
        const abiertaPor = Array.isArray(a.abierta_por) ? [...a.abierta_por] : []
        if (!abiertaPor.includes(userId)) abiertaPor.push(userId)
        return { ...a, abierta_por: abiertaPor }
      })
    }))
  },

  marcarComoResuelta: (alertaId) => {
    set((state) => {
      const alerta = state.alertas.find(a => a.id === alertaId)
      const wasUnread = alerta && alerta.activa && !(Array.isArray(alerta.leido_por) && alerta.leido_por.includes(state.userId))
      return {
        alertas: state.alertas.map(a =>
          a.id === alertaId ? { ...a, activa: false } : a
        ),
        alertasNoLeidas: wasUnread ? Math.max(0, state.alertasNoLeidas - 1) : state.alertasNoLeidas
      }
    })
  },

  // NEW: Delete notification from local state
  eliminarAlerta: (alertaId) => {
    set((state) => {
      const alerta = state.alertas.find(a => a.id === alertaId)
      const wasUnread = alerta && alerta.activa && !(Array.isArray(alerta.leido_por) && alerta.leido_por.includes(state.userId))
      return {
        alertas: state.alertas.filter(a => a.id !== alertaId),
        alertasNoLeidas: wasUnread ? Math.max(0, state.alertasNoLeidas - 1) : state.alertasNoLeidas
      }
    })
  },

  // NEW: Popup notifications management
  setPopupNotifications: (notifs) => set({ popupNotifications: notifs }),
  clearPopupNotifications: () => set({ popupNotifications: [] }),

  // NEW: Panel tab management
  setPanelTab: (tab) => set({ panelTab: tab }),
  setShowPanel: (show) => set({ showPanel: show }),
  togglePanel: () => set((state) => ({ showPanel: !state.showPanel })),

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setUnsubscribe: (fn) => set({ unsubscribe: fn }),

  getAlertasPorTipo: (tipo) => {
    const { alertas } = get()
    return alertas.filter(a => a.tipo === tipo && a.activa && !isExpired(a))
  },

  getAlertasPorPrioridad: (prioridad) => {
    const { alertas } = get()
    return alertas.filter(a => a.prioridad === prioridad && a.activa && !isExpired(a))
  },

  getAlertasActivas: () => {
    const { alertas } = get()
    return alertas.filter(a => a.activa && !isExpired(a))
  },

  // NEW: Get alerts filtered by current panel tab
  getAlertasFiltradas: () => {
    const { alertas, panelTab, userId } = get()
    const activas = alertas.filter(a => a.activa && !isExpired(a))
    if (panelTab === 'no_leidas') {
      return activas.filter(a => !a.leido_por?.includes(userId))
    }
    return activas
  },

  reset: () => {
    const { unsubscribe } = get()
    if (unsubscribe) unsubscribe()
    set({
      alertas: [],
      alertasNoLeidas: 0,
      loading: false,
      error: null,
      userId: null,
      unsubscribe: null,
      popupNotifications: [],
      panelTab: 'no_leidas',
      showPanel: false
    })
  }
}))
