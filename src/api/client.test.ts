import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { api } from './client'
import { useSessionStore } from '../store/useSessionStore'
import { server } from '../../tests/setup'
import { http, HttpResponse } from 'msw'

describe('Ky Client', () => {
  const BASE_URL = 'http://localhost:3000'
  let testApi: typeof api

  beforeEach(() => {
    vi.stubGlobal('location', {
      origin: BASE_URL,
    })

    useSessionStore.getState().clearTokens()
    
    // Correctly extend the api with an absolute URL for Node/Vitest
    testApi = api.extend({ prefix: `${BASE_URL}/api` })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should capture tokens from /session response headers', async () => {
    server.use(
      http.post('*/api/session', () => {
        return new HttpResponse(JSON.stringify({ success: true }), {
          status: 200,
          headers: {
            'CST': 'mock-cst-token',
            'X-SECURITY-TOKEN': 'mock-security-token'
          }
        })
      })
    )

    const response = await testApi.post('session', { 
      json: { identifier: 'user', password: 'pass' }
    })
    expect(response.status).toBe(200)
    
    const state = useSessionStore.getState()
    expect(state.cst).toBe('mock-cst-token')
    expect(state.securityToken).toBe('mock-security-token')
  })

  it('should inject tokens into headers for subsequent requests', async () => {
    useSessionStore.getState().setTokens('mock-cst', 'mock-security-token')
    useSessionStore.getState().setEnvironment('LIVE')
    
    let capturedHeaders: any = null;

    server.use(
      http.get('*/api/ping', ({ request }) => {
        capturedHeaders = request.headers;
        return new HttpResponse(null, { status: 200 })
      })
    )

    const response = await testApi.get('ping')
    expect(response.status).toBe(200)

    expect(capturedHeaders?.get('CST')).toBe('mock-cst')
    expect(capturedHeaders?.get('X-SECURITY-TOKEN')).toBe('mock-security-token')
    expect(capturedHeaders?.get('X-Environment')).toBe('LIVE')
  })

  it('should NOT inject CF Access headers in the browser', async () => {
    let capturedHeaders: any = null;

    server.use(
      http.get('*/api/ping', ({ request }) => {
        capturedHeaders = request.headers;
        return new HttpResponse(null, { status: 200 })
      })
    )

    await testApi.get('ping')

    expect(capturedHeaders?.get('CF-Access-Client-Id')).toBeNull()
    expect(capturedHeaders?.get('CF-Access-Client-Secret')).toBeNull()
  })
})
