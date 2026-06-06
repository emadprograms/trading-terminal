import { create } from 'zustand'

const DEFAULT_PROXY_URL = '/api'

interface SessionState {
  cst: string | null
  securityToken: string | null
  proxyUrl: string
  environment: 'DEMO' | 'LIVE'
  selectedAccountId: string | null
  isAuthenticated: boolean
  setTokens: (cst: string, securityToken: string) => void
  clearTokens: () => void
  setEnvironment: (env: 'DEMO' | 'LIVE') => void
  setSelectedAccountId: (id: string | null) => void
  setProxyUrl: (url: string) => void
  resetProxyUrl: () => void
}

const sanitizeUrl = (url: string | null): string => {
  if (!url || url === 'undefined' || url === 'null' || url.trim() === '') {
    return DEFAULT_PROXY_URL;
  }
  return url.trim();
}

export const useSessionStore = create<SessionState>((set) => ({
  cst: null,
  securityToken: null,
  proxyUrl: sanitizeUrl(localStorage.getItem('proxyUrl')),
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

  setProxyUrl: (url) => {
    const sanitized = sanitizeUrl(url);
    localStorage.setItem('proxyUrl', sanitized);
    set({ proxyUrl: sanitized });
  },

  resetProxyUrl: () => {
    localStorage.removeItem('proxyUrl');
    set({ proxyUrl: DEFAULT_PROXY_URL });
  },
}))
