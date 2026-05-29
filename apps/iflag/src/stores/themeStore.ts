import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ThemeState {
  isDark: boolean
  toggleTheme: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      isDark: true,
      toggleTheme: () => {
        const next = !get().isDark
        set({ isDark: next })
        document.documentElement.classList.toggle('light', !next)
      },
    }),
    { name: 'iflag-theme' }
  )
)

// Aplica la clase al <html> inmediatamente al cargar, antes de que React renderice
try {
  const stored = localStorage.getItem('iflag-theme')
  if (stored) {
    const { state } = JSON.parse(stored)
    if (state?.isDark === false) {
      document.documentElement.classList.add('light')
    }
  }
} catch {}
