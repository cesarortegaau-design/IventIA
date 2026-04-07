import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  userRole: 'ARTIST' | 'COLLECTOR' | 'ADMIN'
  profileImage?: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  setAuth: (user: User, accessToken: string, refreshToken: string) => void
  clearAuth: () => void
  isArtist: () => boolean
  isCollector: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      setAuth: (user, accessToken, refreshToken) => {
        set({ user, accessToken, refreshToken })
      },

      clearAuth: () => {
        set({ user: null, accessToken: null, refreshToken: null })
      },

      isArtist: () => get().user?.userRole === 'ARTIST',
      isCollector: () => get().user?.userRole === 'COLLECTOR',
    }),
    {
      name: 'arte-capital-auth',
    }
  )
)
