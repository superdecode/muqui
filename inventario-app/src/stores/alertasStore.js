import { create } from 'zustand'

export const useAlertasStore = create((set, get) => ({
  // Estado
  alertas: [],
  alertasNoLeidas: 0,
  loading: false,
  error: null,

  // Acciones
  setAlertas: (alertas) => {
    const noLeidas = alertas.filter(a => a.estado === 'ACTIVA').length
    set({
      alertas,
      alertasNoLeidas: noLeidas
    })
  },

  addAlerta: (alerta) => {
    set((state) => ({
      alertas: [alerta, ...state.alertas],
      alertasNoLeidas: state.alertasNoLeidas + 1
    }))
  },

  marcarComoLeida: (alertaId) => {
    set((state) => ({
      alertas: state.alertas.map(a =>
        a.id === alertaId ? { ...a, estado: 'LEIDA' } : a
      ),
      alertasNoLeidas: Math.max(0, state.alertasNoLeidas - 1)
    }))
  },

  marcarComoResuelta: (alertaId) => {
    set((state) => ({
      alertas: state.alertas.map(a =>
        a.id === alertaId ? { ...a, estado: 'RESUELTA' } : a
      ),
      alertasNoLeidas: state.alertas.find(a => a.id === alertaId && a.estado === 'ACTIVA')
        ? Math.max(0, state.alertasNoLeidas - 1)
        : state.alertasNoLeidas
    }))
  },

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  // Obtener alertas por tipo
  getAlertasPorTipo: (tipo) => {
    const { alertas } = get()
    return alertas.filter(a => a.tipo === tipo)
  },

  // Obtener alertas por prioridad
  getAlertasPorPrioridad: (prioridad) => {
    const { alertas } = get()
    return alertas.filter(a => a.prioridad === prioridad)
  },

  // Obtener alertas activas
  getAlertasActivas: () => {
    const { alertas } = get()
    return alertas.filter(a => a.estado === 'ACTIVA')
  },

  // Limpiar estado
  reset: () => set({
    alertas: [],
    alertasNoLeidas: 0,
    loading: false,
    error: null
  })
}))
