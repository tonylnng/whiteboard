import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  theme: 'light' | 'dark'
  aiPanelOpen: boolean
  toggleTheme: () => void
  toggleAIPanel: () => void
  setAIPanelOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'light',
      aiPanelOpen: false,
      toggleTheme: () => set((s) => {
        const next = s.theme === 'light' ? 'dark' : 'light'
        document.documentElement.classList.toggle('dark', next === 'dark')
        return { theme: next }
      }),
      toggleAIPanel: () => set((s) => ({ aiPanelOpen: !s.aiPanelOpen })),
      setAIPanelOpen: (open) => set({ aiPanelOpen: open }),
    }),
    { name: 'ui-settings' }
  )
)
