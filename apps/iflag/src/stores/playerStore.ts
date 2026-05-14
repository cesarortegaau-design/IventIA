import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PlayerUser {
  id: string
  email: string
  firstName: string
  lastName: string
}

interface PlayerState {
  user: PlayerUser | null
  accessToken: string | null
  refreshToken: string | null
  setAuth: (user: PlayerUser, accessToken: string, refreshToken: string) => void
  clearAuth: () => void
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: (user, accessToken, refreshToken) => set({ user, accessToken, refreshToken }),
      clearAuth: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    {
      name: 'iventia-player-auth',
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken, refreshToken: s.refreshToken }),
    },
  ),
)
