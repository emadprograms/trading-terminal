import { render, screen, fireEvent } from '@testing-library/react'
import { EnvToggle } from './EnvToggle'
import { useSessionStore } from '../store/useSessionStore'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

const Wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('EnvToggle', () => {
  const mockLogin = vi.fn()
  
  beforeEach(() => {
    vi.clearAllMocks()
    useSessionStore.getState().setEnvironment('DEMO')
  })

  it('should display current environment as active', () => {
    render(<EnvToggle login={mockLogin} isLoggingIn={false} />, { wrapper: Wrapper })
    
    const demoBtn = screen.getByRole('button', { name: /DEMO/i })
    const liveBtn = screen.getByRole('button', { name: /LIVE/i })
    
    expect(demoBtn).toHaveAttribute('data-active', 'true')
    expect(liveBtn).toHaveAttribute('data-active', 'false')
  })

  it('should call login when toggling environment', () => {
    render(<EnvToggle login={mockLogin} isLoggingIn={false} />, { wrapper: Wrapper })
    
    const liveBtn = screen.getByRole('button', { name: /LIVE/i })
    fireEvent.click(liveBtn)
    
    expect(mockLogin).toHaveBeenCalledWith({ environment: 'LIVE' })
  })

  it('should show loading spinner when isLoggingIn is true', () => {
    render(<EnvToggle login={mockLogin} isLoggingIn={true} />, { wrapper: Wrapper })
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('should disable buttons when isLoggingIn is true', () => {
    render(<EnvToggle login={mockLogin} isLoggingIn={true} />, { wrapper: Wrapper })
    
    expect(screen.getByRole('button', { name: /DEMO/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /LIVE/i })).toBeDisabled()
  })
})
