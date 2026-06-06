import { create } from 'zustand'

interface SessionState {
  cst: string | null
  securityToken: string | null
  environment: 'DEMO' | 'LIVE'
  selectedAccountId: string | null
  isAuthenticated: boolean
  setTokens: (cst: string, securityToken: string) => void
  clearTokens: () => void
  setEnvironment: (env: 'DEMO' | 'LIVE') => void
  setSelectedAccountId: (id: string | null) => void
}

export const useSessionStore = create<SessionState>((set) => ({
  cst: null,
  securityToken: null,
  environment: 'DEMO',
  selectedAccountId: null,
  isAuthenticated: false,

  setTokens: (cst, securityToken) => 
    set({ 
      cst, 
      securityToken, 
      isAuthenticated: true 
    }),

  clearTokens: () => 
    set({ 
      cst: null, 
      securityToken: null, 
      isAuthenticated: false,
      selectedAccountId: null
    }),

  setEnvironment: (environment) => set({ environment, selectedAccountId: null }),

  setSelectedAccountId: (selectedAccountId) => set({ selectedAccountId }),
}))
