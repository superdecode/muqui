import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Theme & user preferences store
 * Persists locally and syncs to Firebase user profile
 */
export const useThemeStore = create(
  persist(
    (set, get) => ({
      // Theme: 'light' | 'dark' | 'system'
      theme: 'system',
      // Resolved theme (what's actually applied)
      resolvedTheme: 'light',

      // Date/time preferences
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Lima',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24',

      setTheme: (theme) => {
        const resolved = theme === 'system'
          ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
          : theme
        set({ theme, resolvedTheme: resolved })
        applyTheme(resolved)
      },

      setTimezone: (timezone) => set({ timezone }),
      setDateFormat: (dateFormat) => set({ dateFormat }),
      setTimeFormat: (timeFormat) => set({ timeFormat }),

      // Initialize theme on app load
      initTheme: () => {
        const { theme } = get()
        const resolved = theme === 'system'
          ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
          : theme
        set({ resolvedTheme: resolved })
        applyTheme(resolved)
      },

      // Load preferences from Firebase user profile
      loadFromFirebase: (prefs) => {
        if (!prefs) return
        const updates = {}
        if (prefs.theme) updates.theme = prefs.theme
        if (prefs.timezone) updates.timezone = prefs.timezone
        if (prefs.dateFormat) updates.dateFormat = prefs.dateFormat
        if (prefs.timeFormat) updates.timeFormat = prefs.timeFormat
        set(updates)
        // Re-resolve theme
        const theme = updates.theme || get().theme
        const resolved = theme === 'system'
          ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
          : theme
        set({ resolvedTheme: resolved })
        applyTheme(resolved)
      },

      // Get all prefs for saving to Firebase
      getPrefsForFirebase: () => {
        const { theme, timezone, dateFormat, timeFormat } = get()
        return { theme, timezone, dateFormat, timeFormat }
      }
    }),
    {
      name: 'theme-storage'
    }
  )
)

function applyTheme(resolved) {
  const root = document.documentElement
  if (resolved === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

// Listen for OS theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const store = useThemeStore.getState()
    if (store.theme === 'system') {
      const resolved = e.matches ? 'dark' : 'light'
      useThemeStore.setState({ resolvedTheme: resolved })
      applyTheme(resolved)
    }
  })
}
