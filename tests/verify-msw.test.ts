import { describe, it, expect } from 'vitest'

describe('MSW Scaffolding', () => {
  it('intercepts /session', async () => {
    const response = await fetch('/session', { method: 'POST' })
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.clientId).toBe('mock-client-id')
    expect(response.headers.get('CST')).toBe('mock-cst-token')
  })

  it('intercepts /accounts', async () => {
    const response = await fetch('/accounts')
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.accounts[0].accountName).toBe('Demo Account')
  })

  it('intercepts /ping', async () => {
    const response = await fetch('/ping')
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.status).toBe('OK')
  })
})
