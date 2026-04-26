import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AdminUser {
  userId: string
  tenantId: string
  email: string
  firstName: string
  lastName: string
  role: string
}

interface AuthState {
  user: AdminUser | null
  accessToken: string | null
  setAuth: (user: AdminUser, accessToken: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      setAuth: (user, accessToken) => set({ user, accessToken }),
      clearAuth: () => set({ user: null, accessToken: null }),
    }),
    {
      name: 'iventia-iflag-auth',
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken }),
    }
  )
)
