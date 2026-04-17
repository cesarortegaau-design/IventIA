import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SupplierPortalUser {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string | null
}

interface AuthState {
  user: SupplierPortalUser | null
  accessToken: string | null
  refreshToken: string | null
  setAuth: (user: SupplierPortalUser, accessToken: string, refreshToken: string) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
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
      name: 'iventia-supplier-portal-auth',
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken, refreshToken: s.refreshToken }),
    }
  )
)
