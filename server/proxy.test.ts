import { describe, it, expect } from 'vitest'
import app from './index'

describe('Proxy Server', () => {
  it('should handle /ping request', async () => {
    const res = await app.request('/ping')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('OK')
  })

  it('should mock /session in test mode', async () => {
    process.env.NODE_ENV = 'test'
    const res = await app.request('/session', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'test', password: 'test' }),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.accountType).toBe('CFD')
    expect(res.headers.get('CST')).toBe('mock-cst')
  })

  it('should proxy other requests in test mode', async () => {
    process.env.NODE_ENV = 'test'
    const res = await app.request('/some/random/path')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})
