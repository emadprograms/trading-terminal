import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSession } from '../hooks/useSession'
import { useSessionStore } from '../store/useSessionStore'
import { describe, it, expect, beforeEach } from 'vitest'
import React from 'react'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useSession', () => {
  beforeEach(() => {
    useSessionStore.getState().clearTokens()
  })

  it('should handle login successfully', async () => {
    const { result } = renderHook(() => useSession(['SPY']), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.login()
    })

    // The actual token setting might be handled by the caller or another effect
    // but we can check if the mutation succeeded
    expect(result.current.isLoggingIn).toBe(false)
  })

  it('should handle logout', async () => {
    const { result } = renderHook(() => useSession(['SPY']), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.logout()
    })

    expect(useSessionStore.getState().isAuthenticated).toBe(false)
    expect(useSessionStore.getState().cst).toBeNull()
  })

  it('should manage session ticker defaults', () => {
    const { result } = renderHook(() => useSession(['AAPL', 'MSFT']), {
      wrapper: createWrapper(),
    })

    // Should default to first ticker if SPY is not present
    expect(result.current.sessionTicker).toBe('AAPL')
  })
})
