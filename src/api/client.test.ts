import { describe, it, expect, beforeEach, vi } from 'vitest'
import { api } from './client'
import { useSessionStore } from '../store/useSessionStore'
import { server } from '../../tests/setup'
import { http, HttpResponse } from 'msw'

describe('Ky Client', () => {
  const BASE_URL = 'http://localhost:3000'

  beforeEach(() => {
    vi.stubGlobal('location', {
      origin: BASE_URL,
    })

    useSessionStore.getState().clearTokens()
    useSessionStore.setState({ proxyUrl: `${BASE_URL}/api` })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should capture tokens from /session response headers', async () => {
    const response = await api.post(`${BASE_URL}/api/session`, { 
      json: { identifier: 'user', password: 'pass' },
      prefix: '' 
    })
    expect(response.status).toBe(200)
    
    const state = useSessionStore.getState()
    expect(state.cst).toBe('mock-cst-token')
    expect(state.securityToken).toBe('mock-security-token')
  })

  it('should inject tokens into headers for subsequent requests', async () => {
    useSessionStore.getState().setTokens('mock-cst', 'mock-security-token')
    
    const response = await api.get(`${BASE_URL}/api/ping`, { prefix: '' })
    expect(response.status).toBe(200)
  })

  it('should inject CF Access headers when using remote proxy', async () => {
    const REMOTE_PROXY = 'https://proxy.trading-terminal.dev'
    const CF_ID = 'test-client-id'
    const CF_SECRET = 'test-client-secret'

    useSessionStore.setState({ 
      proxyUrl: REMOTE_PROXY,
      cfClientId: CF_ID,
      cfClientSecret: CF_SECRET
    })

    let capturedHeaders: Headers | null = null;

    server.use(
      http.get('*/ping', ({ request }) => {
        capturedHeaders = request.headers;
        return new HttpResponse(null, { status: 200 })
      })
    )

    await api.get(`${BASE_URL}/api/ping`, { prefix: '' })

    expect(capturedHeaders?.get('CF-Access-Client-Id')).toBe(CF_ID)
    expect(capturedHeaders?.get('CF-Access-Client-Secret')).toBe(CF_SECRET)
  })
})
