import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface TicketBuyerUser {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string | null
}

interface TicketBuyerAuthState {
  user: TicketBuyerUser | null
  accessToken: string | null
  refreshToken: string | null
  setAuth: (user: TicketBuyerUser, accessToken: string, refreshToken: string) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  clearAuth: () => void
}

export const useTicketBuyerAuthStore = create<TicketBuyerAuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: (user, accessToken, refreshToken) => set({ user, accessToken, refreshToken }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      clearAuth: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    {
      name: 'iventia-ticket-buyer-auth',
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken, refreshToken: s.refreshToken }),
    }
  )
)
