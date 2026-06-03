import { describe, it, expect } from 'vitest'
// @ts-ignore - server/index doesn't exist yet in some environments
import app from './index'

describe('Hono Proxy Server', () => {
  it('should have a login endpoint', async () => {
    const res = await app.request('/session', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'test', password: 'test' }),
      headers: { 'Content-Type': 'application/json' }
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('CST')).toBeDefined()
  })

  it('should proxy account requests with tokens', async () => {
    const res = await app.request('/accounts', {
      headers: {
        'CST': 'test-cst',
        'X-SECURITY-TOKEN': 'test-sec'
      }
    })
    expect(res.status).toBe(200)
  })

  it('should handle ping requests', async () => {
    const res = await app.request('/ping')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('OK')
  })
})
