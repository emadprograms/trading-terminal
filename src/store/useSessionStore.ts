import { create } from 'zustand'

// Legacy cleanup: remove old proxyUrl from localStorage to prevent interference with new /api gateway
if (typeof window !== 'undefined') {
  localStorage.removeItem('proxyUrl');
}

interface SessionState {
  cst: string | null
  securityToken: string | null
  environment: 'DEMO' | 'LIVE'
  selectedAccountId: string | null
  isAuthenticated: boolean
  isWsConnected: boolean
  setTokens: (cst: string, securityToken: string) => void
  clearTokens: () => void
  setEnvironment: (env: 'DEMO' | 'LIVE') => void
  setSelectedAccountId: (id: string | null) => void
  setIsWsConnected: (status: boolean) => void
}

export const useSessionStore = create<SessionState>((set) => ({
  cst: null,
  securityToken: null,
  environment: 'DEMO',
  selectedAccountId: null,
  isAuthenticated: false,
  isWsConnected: false,

  setTokens: (cst, securityToken) => {
    set({ 
      cst, 
      securityToken, 
      isAuthenticated: true 
    });
  },

  clearTokens: () => {
    set({ 
      cst: null, 
      securityToken: null, 
      isAuthenticated: false,
      selectedAccountId: null
    });
  },

  setEnvironment: (environment) => set({ environment, selectedAccountId: null }),

  setSelectedAccountId: (selectedAccountId) => set({ selectedAccountId }),
  
  setIsWsConnected: (status) => set({ isWsConnected: status }),
}))

// Expose store to window for E2E tests to extract tokens for cleanup utilities
if (typeof window !== 'undefined') {
  (window as any).__sessionStore = useSessionStore;
}
