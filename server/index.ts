import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import dotenv from 'dotenv'

// Load environment variables from .env.local or .env
dotenv.config({ path: '.env.local' })
dotenv.config()
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
  allowHeaders: ['Content-Type', 'CST', 'X-SECURITY-TOKEN', 'X-Environment', 'CF-Access-Client-Id', 'CF-Access-Client-Secret'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}))

const getApiTarget = (envHeader?: string) => {
  const env = envHeader || process.env.ENV || 'DEMO';
  
  if (process.env.ENV === 'DEMO' && env === 'LIVE') {
    throw new Error('LIVE_MODE_DISABLED');
  }

  return env === 'LIVE' 
    ? { target: 'https://api-capital.backend-capital.com', key: process.env.CAPITAL_API_KEY_LIVE || process.env.CAPITAL_API_KEY }
    : { target: 'https://demo-api-capital.backend-capital.com', key: process.env.CAPITAL_API_KEY_DEMO || process.env.CAPITAL_API_KEY }
}

app.get('/ping', (c) => c.json({ status: 'OK', env: process.env.ENV || 'DEMO' }))

app.post('/session', async (c) => {
  console.log(`[StabilityTrace] Handling /session request...`)
  
  const { target, key } = getApiTarget(c.req.header('X-Environment'))
  console.log(`[StabilityTrace] Routing /session to: ${target}`)
  
  if (process.env.NODE_ENV === 'test') {
    return c.json({ accountType: 'CFD' }, 200, {
      'CST': 'mock-cst',
      'X-SECURITY-TOKEN': 'mock-token',
      'Access-Control-Expose-Headers': 'CST, X-SECURITY-TOKEN'
    })
  }

  try {
    let body = await c.req.json()
    
    // SMART FALLBACK: If frontend doesn't send credentials, use the ones from GHA Secrets
    if (!body.identifier || !body.password) {
      console.log(`[StabilityTrace] Frontend sent partial credentials. Injecting secrets from environment...`)
      body = {
        ...body,
        identifier: body.identifier || process.env.CAPITAL_USER,
        password: body.password || process.env.CAPITAL_PASSWORD
      }
    }

    const response = await fetch(`${target}/api/v1/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CAP-API-KEY': key || '',
      },
      body: JSON.stringify(body),
    })

    console.log(`[StabilityTrace] Capital.com responded with status: ${response.status}`)
    
    // Log all received headers for debugging in GHA logs
    const upstreamHeaders = Object.fromEntries(response.headers.entries())
    console.log(`[StabilityTrace] Upstream headers:`, JSON.stringify(upstreamHeaders))

    const cst = response.headers.get('CST')
    const securityToken = response.headers.get('X-SECURITY-TOKEN')
    console.log(`[StabilityTrace] Tokens in upstream - CST: ${cst ? 'YES' : 'NO'}, X-SECURITY-TOKEN: ${securityToken ? 'YES' : 'NO'}`)

    // Create fresh headers for the client
    const clientHeaders = new Headers()
    
    // Copy all upstream headers except for problematic ones
    response.headers.forEach((value, key) => {
      if (!['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
        clientHeaders.set(key, value)
      }
    })

    // FORCE CORS EXPOSURE
    clientHeaders.set('Access-Control-Allow-Origin', '*')
    clientHeaders.set('Access-Control-Expose-Headers', 'CST, X-SECURITY-TOKEN, Content-Type, Set-Cookie')
    clientHeaders.set('Access-Control-Allow-Headers', 'Content-Type, CST, X-SECURITY-TOKEN, X-CAP-API-KEY')
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: clientHeaders,
    })
  } catch (error) {
    console.error(`[StabilityTrace] Session error:`, error)
    return c.json({ error: 'Internal Server Error' }, 500)
  }
})

app.all('*', async (c) => {
  const { target: targetBase, key } = getApiTarget(c.req.header('X-Environment'))
  
  // Rewrite path to include /api/v1 if it's missing
  let path = c.req.path
  if (!path.startsWith('/api/v1')) {
    path = `/api/v1${path}`
  }
  
  const url = new URL(c.req.url)
  const targetUrl = `${targetBase}${path}${url.search}`
  
  console.log(`[StabilityTrace] Proxying ${c.req.method} ${c.req.url} -> ${targetUrl}`)

  if (process.env.NODE_ENV === 'test') {
    return c.json({ success: true })
  }

  const requestHeaders = new Headers()
  
  // Headers to IGNORE (let fetch/undici handle these)
  const skipHeaders = ['host', 'connection', 'content-length', 'expect']
  
  // Forward almost all headers from client
  for (const [key, value] of Object.entries(c.req.header())) {
    if (!skipHeaders.includes(key.toLowerCase())) {
      // Force common tokens to uppercase for Capital.com compatibility
      if (key.toLowerCase() === 'cst') {
        requestHeaders.set('CST', value)
      } else if (key.toLowerCase() === 'x-security-token') {
        requestHeaders.set('X-SECURITY-TOKEN', value)
      } else {
        requestHeaders.set(key, value)
      }
    }
  }
  
  // Inject API Key
  if (key) {
    requestHeaders.set('X-CAP-API-KEY', key)
  } else {
    console.warn(`[StabilityTrace] WARNING: API Key is missing for target ${targetBase}`)
  }

  // DEBUG: Log sent headers (redacted)
  const logHeaders: Record<string, string> = {}
  requestHeaders.forEach((v, k) => {
    logHeaders[k] = (k === 'CST' || k === 'X-SECURITY-TOKEN' || k === 'X-CAP-API-KEY') ? '[REDACTED]' : v
  })
  console.log(`[StabilityTrace] Upstream Headers:`, JSON.stringify(logHeaders))

  try {
    const response = await fetch(targetUrl, {
      method: c.req.method,
      headers: requestHeaders,
      body: ['POST', 'PUT', 'PATCH'].includes(c.req.method) ? await c.req.blob() : undefined,
    })

    console.log(`[StabilityTrace] Upstream ${targetUrl} responded with status: ${response.status}`)

    const clientHeaders = new Headers()
    response.headers.forEach((value, key) => {
      // Strip encoding headers to prevent compression issues
      if (!['content-encoding', 'transfer-encoding', 'content-length'].includes(key.toLowerCase())) {
        clientHeaders.set(key, value)
      }
    })

    clientHeaders.set('Access-Control-Allow-Origin', '*')
    clientHeaders.set('Access-Control-Expose-Headers', 'CST, X-SECURITY-TOKEN, Content-Type')
    
    // Log response headers for auth debugging
    if (path.includes('session')) {
      console.log(`[StabilityTrace] Session Response Headers:`, JSON.stringify(Object.fromEntries(response.headers.entries())))
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: clientHeaders,
    })
  } catch (error) {
    console.error(`[StabilityTrace] Proxy error for ${targetUrl}:`, error)
    return c.json({ error: 'Proxy Error' }, 502)
  }
})

const port = Number(process.env.PORT) || 3000
console.log(`[StabilityTrace] Proxy starting on port ${port}. Target determined dynamically via X-Environment header.`)
serve({ fetch: app.fetch, port })

export default app
