import { describe, it, expect, beforeEach } from 'vitest'
// @ts-ignore - store doesn't exist yet (TDD Red)
import { useSessionStore } from './useSessionStore'

describe('useSessionStore', () => {
  beforeEach(() => {
    if (useSessionStore.getState().logout) {
      useSessionStore.getState().logout()
    }
  })

  it('should have initial state with null tokens', () => {
    const state = useSessionStore.getState()
    expect(state.cst).toBeNull()
    expect(state.securityToken).toBeNull()
    expect(state.environment).toBe('DEMO')
    expect(state.isAuthenticated).toBe(false)
  })

  it('should set tokens correctly', () => {
    useSessionStore.getState().setTokens('test-cst', 'test-security')
    const state = useSessionStore.getState()
    expect(state.cst).toBe('test-cst')
    expect(state.securityToken).toBe('test-security')
    expect(state.isAuthenticated).toBe(true)
  })

  it('should switch environments', () => {
    useSessionStore.getState().setEnvironment('LIVE')
    expect(useSessionStore.getState().environment).toBe('LIVE')
    
    useSessionStore.getState().setEnvironment('DEMO')
    expect(useSessionStore.getState().environment).toBe('DEMO')
  })

  it('should clear state on logout', () => {
    useSessionStore.getState().setTokens('test-cst', 'test-security')
    useSessionStore.getState().logout()
    
    const state = useSessionStore.getState()
    expect(state.cst).toBeNull()
    expect(state.securityToken).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })
})
