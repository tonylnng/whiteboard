import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  accessToken: string | null
  user: { id: string; email: string; name: string } | null
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
        set({ accessToken: null, user: null })
      },
    }),
    { name: 'auth-storage' }
  )
)
