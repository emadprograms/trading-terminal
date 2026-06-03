import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'

const app = new Hono()

// [StabilityTrace] logging
app.use('*', async (c, next) => {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  console.log(`[StabilityTrace] ${c.req.method} ${c.req.path} - ${c.res.status} (${ms}ms)`)
})

app.use('*', cors({
  origin: '*',
  exposeHeaders: ['CST', 'X-SECURITY-TOKEN'],
  allowHeaders: ['Content-Type', 'CST', 'X-SECURITY-TOKEN'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}))

const API_TARGET = process.env.ENV === 'LIVE' 
  ? 'https://api-capital.backend-capital.com' 
  : 'https://demo-api-capital.backend-capital.com'

app.get('/ping', (c) => c.json({ status: 'OK' }))

app.post('/session', async (c) => {
  // For testing purposes, if we are in test mode, mock the Capital.com response
  if (process.env.NODE_ENV === 'test') {
    return c.json({ accountType: 'CFD' }, 200, {
      'CST': 'mock-cst',
      'X-SECURITY-TOKEN': 'mock-token'
    })
  }

  try {
    const body = await c.req.json()
    const response = await fetch(`${API_TARGET}/api/v1/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CAP-API-KEY': process.env.CAPITAL_API_KEY || '',
      },
      body: JSON.stringify(body),
    })

    return new Response(response.body, response)
  } catch (error) {
    console.error(`[StabilityTrace] Session error:`, error)
    return c.json({ error: 'Internal Server Error' }, 500)
  }
})

app.all('*', async (c) => {
  if (process.env.NODE_ENV === 'test') {
    return c.json({ success: true })
  }

  const targetUrl = `${API_TARGET}${c.req.path}`
  const headers = new Headers(c.req.header())
  headers.delete('host')
  
  try {
    const response = await fetch(targetUrl, {
      method: c.req.method,
      headers,
      body: ['POST', 'PUT', 'PATCH'].includes(c.req.method) ? await c.req.blob() : undefined,
    })

    return new Response(response.body, response)
  } catch (error) {
    console.error(`[StabilityTrace] Proxy error for ${targetUrl}:`, error)
    return c.json({ error: 'Proxy Error' }, 502)
  }
})

// Only start the server if this file is run directly
if (typeof require !== 'undefined' && require.main === module) {
  const port = Number(process.env.PORT) || 3000
  console.log(`[StabilityTrace] Proxy starting on port ${port} targeting ${API_TARGET}`)
  serve({ fetch: app.fetch, port })
}

export default app
