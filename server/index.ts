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
  allowHeaders: ['Content-Type', 'CST', 'X-SECURITY-TOKEN', 'X-Environment'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}))

const getApiTarget = (envHeader?: string) => {
  const env = envHeader || process.env.ENV || 'DEMO'
  return env === 'LIVE' 
    ? 'https://api-capital.backend-capital.com' 
    : 'https://demo-api-capital.backend-capital.com'
}

app.get('/ping', (c) => c.json({ status: 'OK' }))

app.post('/session', async (c) => {
  console.log(`[StabilityTrace] Handling /session request...`)
  
  const target = getApiTarget(c.req.header('X-Environment'))
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
        'X-CAP-API-KEY': process.env.CAPITAL_API_KEY || '',
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
  const targetBase = getApiTarget(c.req.header('X-Environment'))
  const targetUrl = `${targetBase}${c.req.path}`
  console.log(`[StabilityTrace] Proxying ${c.req.method} ${c.req.path} to ${targetUrl}`)

  if (process.env.NODE_ENV === 'test') {
    return c.json({ success: true })
  }

  const requestHeaders = new Headers(c.req.header())
  requestHeaders.delete('host')
  
  try {
    const response = await fetch(targetUrl, {
      method: c.req.method,
      headers: requestHeaders,
      body: ['POST', 'PUT', 'PATCH'].includes(c.req.method) ? await c.req.blob() : undefined,
    })

    const clientHeaders = new Headers()
    response.headers.forEach((value, key) => {
      if (!['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
        clientHeaders.set(key, value)
      }
    })

    clientHeaders.set('Access-Control-Allow-Origin', '*')
    clientHeaders.set('Access-Control-Expose-Headers', 'CST, X-SECURITY-TOKEN, Content-Type')
    
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
