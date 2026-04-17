import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'ADMIN' | 'NORMAL' | 'READ_ONLY'
  profileId: string | null
  profileName: string | null
  departments: Array<{ id: string; name: string }>
  privileges: string[]
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  setAuth: (user: User, accessToken: string, refreshToken: string) => void
  clearAuth: () => void
  hasPrivilege: (key: string) => boolean
  isAdmin: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken }),
      clearAuth: () => set({ user: null, accessToken: null, refreshToken: null }),
      hasPrivilege: (key: string) => {
        const { user } = get()
        if (!user) return false
        if (user.role === 'ADMIN') return true
        return user.privileges.includes(key)
      },
      isAdmin: () => get().user?.role === 'ADMIN',
    }),
    { name: 'iventia-auth', partialize: (s) => ({ user: s.user, accessToken: s.accessToken, refreshToken: s.refreshToken }) }
  )
)
