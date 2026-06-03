import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useSession } from './useSession'
import { useSessionStore } from '../store/useSessionStore'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
})

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
)

describe('useSession Auth Handshake', () => {
  it('should perform login handshake on start', async () => {
    useSessionStore.setState({ proxyUrl: 'http://localhost:3000' })
    const { result } = renderHook(() => useSession(['SPY']), { wrapper })
    
    await result.current.login({ identifier: 'user', password: 'pass' })

    await waitFor(() => {
      const state = useSessionStore.getState()
      expect(state.isAuthenticated).toBe(true)
      expect(state.cst).toBe('mock-cst-token')
    })
  })

  it('should clear session store on logout', async () => {
    useSessionStore.getState().setTokens('cst', 'sec')
    
    const { result } = renderHook(() => useSession(['SPY']), { wrapper })
    
    result.current.logout()

    expect(useSessionStore.getState().isAuthenticated).toBe(false)
  })
})
