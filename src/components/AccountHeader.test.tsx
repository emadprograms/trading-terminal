import { render, screen } from '@testing-library/react'
import { AccountHeader } from './AccountHeader'
import { useSessionStore } from '../store/useSessionStore'
import { describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

const Wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('AccountHeader', () => {
  beforeEach(() => {
    useSessionStore.getState().clearTokens()
  })

  it('should show offline state when not authenticated', () => {
    render(<AccountHeader />, { wrapper: Wrapper })

    expect(screen.getByText('DISCONNECTED')).toBeInTheDocument()
    expect(screen.getByTestId('online-indicator')).not.toHaveClass('status-online')
    })

    it('should show online state and account data when authenticated', async () => {
    useSessionStore.getState().setTokens('test-cst', 'test-token')
    useSessionStore.setState({ isWsConnected: true })

    render(<AccountHeader />, { wrapper: Wrapper })

    expect(screen.getByText('ONLINE')).toBeInTheDocument()
    expect(screen.getByTestId('online-indicator')).toHaveClass('status-online')

    
    // Wait for query to resolve (MSW handles the response)
    const balanceValues = await screen.findAllByText(/\$10,000\.00/i)
    expect(balanceValues.length).toBeGreaterThan(0)
  })
})
