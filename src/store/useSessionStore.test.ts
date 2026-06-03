import { describe, it, expect, beforeEach } from 'vitest'
import { useSessionStore } from './useSessionStore'

describe('useSessionStore', () => {
  beforeEach(() => {
    useSessionStore.getState().clearTokens()
    useSessionStore.setState({ environment: 'DEMO', proxyUrl: null })
  })

  it('should have initial state', () => {
    const state = useSessionStore.getState()
    expect(state.cst).toBeNull()
    expect(state.securityToken).toBeNull()
    expect(state.proxyUrl).toBeNull()
    expect(state.environment).toBe('DEMO')
    expect(state.isAuthenticated).toBe(false)
  })

  it('should set tokens and update isAuthenticated', () => {
    useSessionStore.getState().setTokens('mock-cst', 'mock-security-token')
    const state = useSessionStore.getState()
    expect(state.cst).toBe('mock-cst')
    expect(state.securityToken).toBe('mock-security-token')
    expect(state.isAuthenticated).toBe(true)
  })

  it('should clear tokens and reset isAuthenticated', () => {
    useSessionStore.getState().setTokens('mock-cst', 'mock-security-token')
    useSessionStore.getState().clearTokens()
    const state = useSessionStore.getState()
    expect(state.cst).toBeNull()
    expect(state.securityToken).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })

  it('should toggle environment', () => {
    useSessionStore.setState({ environment: 'LIVE' })
    expect(useSessionStore.getState().environment).toBe('LIVE')
    useSessionStore.setState({ environment: 'DEMO' })
    expect(useSessionStore.getState().environment).toBe('DEMO')
  })

  it('should set proxyUrl', () => {
    useSessionStore.setState({ proxyUrl: 'https://proxy.com' })
    expect(useSessionStore.getState().proxyUrl).toBe('https://proxy.com')
  })
})
