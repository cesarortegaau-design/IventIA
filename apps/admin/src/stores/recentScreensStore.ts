import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const MAX = 10

export interface RecentScreen {
  path: string
  label: string
  section: string
  visitedAt: number
}

interface RecentScreensStore {
  screens: RecentScreen[]
  push: (screen: Omit<RecentScreen, 'visitedAt'>) => void
  clear: () => void
}

export const useRecentScreensStore = create<RecentScreensStore>()(
  persist(
    (set) => ({
      screens: [],
      push: ({ path, label, section }) => {
        if (!label) return
        set((state) => {
          const filtered = state.screens.filter((s) => s.path !== path)
          return {
            screens: [{ path, label, section, visitedAt: Date.now() }, ...filtered].slice(0, MAX),
          }
        })
      },
      clear: () => set({ screens: [] }),
    }),
    { name: 'iventia-recent-screens' }
  )
)
