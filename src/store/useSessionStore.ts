import { create } from 'zustand'

interface SessionState {
  cst: string | null
  securityToken: string | null
  proxyUrl: string | null
  environment: 'DEMO' | 'LIVE'
  isAuthenticated: boolean
  setTokens: (cst: string, securityToken: string) => void
  clearTokens: () => void
  setEnvironment: (env: 'DEMO' | 'LIVE') => void
  setProxyUrl: (url: string) => void
}

export const useSessionStore = create<SessionState>((set) => ({
  cst: null,
  securityToken: null,
  proxyUrl: null,
  environment: 'DEMO',
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
      isAuthenticated: false 
    }),

  setEnvironment: (environment) => set({ environment }),

  setProxyUrl: (proxyUrl) => set({ proxyUrl }),
}))
