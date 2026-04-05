import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  accessToken: string | null
  user: { id: string; email?: string; name: string; isGuest?: boolean; role?: string; isAdmin?: boolean } | null
  setAuth: (token: string, user: any) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setAuth: (accessToken, user) => {
        localStorage.setItem('accessToken', accessToken)
        set({ accessToken, user })
      },
      logout: () => {
        localStorage.removeItem('accessToken')
        sessionStorage.removeItem('guestToken')
        sessionStorage.removeItem('guestUser')
        set({ accessToken: null, user: null })
      },
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        if (!state?.accessToken) {
          const guestToken = sessionStorage.getItem('guestToken')
          const guestUserStr = sessionStorage.getItem('guestUser')
          if (guestToken && guestUserStr) {
            try {
              const guestUser = JSON.parse(guestUserStr)
              state!.accessToken = guestToken
              state!.user = guestUser
            } catch {}
          }
        }
      }
    }
  )
)
