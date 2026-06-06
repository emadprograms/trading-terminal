import { describe, it, expect, beforeEach } from 'vitest'
import { useSessionStore } from '../store/useSessionStore'

describe('useSessionStore', () => {
  beforeEach(() => {
    useSessionStore.getState().clearTokens()
    useSessionStore.getState().setEnvironment('DEMO')
  })

  it('should have correct initial state', () => {
    const state = useSessionStore.getState()
    expect(state.cst).toBeNull()
    expect(state.securityToken).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.environment).toBe('DEMO')
  })

  it('should set tokens and update isAuthenticated', () => {
    const { setTokens } = useSessionStore.getState()
    setTokens('mock-cst', 'mock-security')

    const state = useSessionStore.getState()
    expect(state.cst).toBe('mock-cst')
    expect(state.securityToken).toBe('mock-security')
    expect(state.isAuthenticated).toBe(true)
  })

  it('should clear tokens and update isAuthenticated', () => {
    const { setTokens, clearTokens } = useSessionStore.getState()
    setTokens('mock-cst', 'mock-security')
    clearTokens()

    const state = useSessionStore.getState()
    expect(state.cst).toBeNull()
    expect(state.securityToken).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })

  it('should switch environment', () => {
    const { setEnvironment } = useSessionStore.getState()
    setEnvironment('LIVE')

    expect(useSessionStore.getState().environment).toBe('LIVE')
    
    setEnvironment('DEMO')
    expect(useSessionStore.getState().environment).toBe('DEMO')
  })
})
