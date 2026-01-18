import { create } from 'zustand'

export const useInventarioStore = create((set, get) => ({
  // Estado
  productos: [],
  inventario: [],
  loading: false,
  error: null,
  selectedUbicacion: null,
  filtros: {
    categoria: '',
    busqueda: '',
    soloAlertas: false,
    soloImportantes: false
  },

  // Acciones
  setProductos: (productos) => set({ productos }),

  setInventario: (inventario) => set({ inventario }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  setSelectedUbicacion: (ubicacion) => set({ selectedUbicacion: ubicacion }),

  setFiltros: (filtros) => set((state) => ({
    filtros: { ...state.filtros, ...filtros }
  })),

  // Filtrar inventario
  getInventarioFiltrado: () => {
    const { inventario, filtros } = get()

    return inventario.filter(item => {
      // Filtro por búsqueda
      if (filtros.busqueda) {
        const busqueda = filtros.busqueda.toLowerCase()
        const matchNombre = item.producto?.toLowerCase().includes(busqueda)
        if (!matchNombre) return false
      }

      // Filtro por categoría
      if (filtros.categoria && item.categoria !== filtros.categoria) {
        return false
      }

      // Filtro solo alertas (stock bajo)
      if (filtros.soloAlertas && item.stock_actual > item.stock_minimo) {
        return false
      }

      // Filtro solo importantes
      if (filtros.soloImportantes && !item.es_importante) {
        return false
      }

      return true
    })
  },

  // Obtener productos con alertas
  getProductosConAlertas: () => {
    const { inventario } = get()
    return inventario.filter(item => item.stock_actual <= item.stock_minimo)
  },

  // Limpiar estado
  reset: () => set({
    productos: [],
    inventario: [],
    loading: false,
    error: null,
    selectedUbicacion: null,
    filtros: {
      categoria: '',
      busqueda: '',
      soloAlertas: false,
      soloImportantes: false
    }
  })
}))
