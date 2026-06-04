import { render, screen, fireEvent } from '@testing-library/react'
import { EnvToggle } from './EnvToggle'
import { useSessionStore } from '../store/useSessionStore'
import { useSession } from '../hooks/useSession'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

vi.mock('../hooks/useSession', () => ({
  useSession: vi.fn(),
}))

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
    (useSession as any).mockReturnValue({
      login: mockLogin,
      isLoggingIn: false,
    })
    useSessionStore.getState().setEnvironment('DEMO')
  })

  it('should display current environment as active', () => {
    render(<EnvToggle />, { wrapper: Wrapper })
    
    const demoBtn = screen.getByText('DEMO')
    const liveBtn = screen.getByText('LIVE')
    
    expect(demoBtn).toHaveAttribute('data-active', 'true')
    expect(liveBtn).toHaveAttribute('data-active', 'false')
  })

  it('should call login when toggling environment', () => {
    render(<EnvToggle />, { wrapper: Wrapper })
    
    const liveBtn = screen.getByText('LIVE')
    fireEvent.click(liveBtn)
    
    expect(mockLogin).toHaveBeenCalledWith({ environment: 'LIVE' })
  })

  it('should show loading spinner when isLoggingIn is true', () => {
    (useSession as any).mockReturnValue({
      login: mockLogin,
      isLoggingIn: true,
    })
    
    render(<EnvToggle />, { wrapper: Wrapper })
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('should disable buttons when isLoggingIn is true', () => {
    (useSession as any).mockReturnValue({
      login: mockLogin,
      isLoggingIn: true,
    })
    
    render(<EnvToggle />, { wrapper: Wrapper })
    
    expect(screen.getByText('DEMO')).toBeDisabled()
    expect(screen.getByText('LIVE')).toBeDisabled()
  })
})
