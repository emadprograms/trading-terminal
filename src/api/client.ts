import ky from 'ky'
import { useSessionStore } from '../store/useSessionStore'

export const api = ky.create({
  hooks: {
    beforeRequest: [
      ({ request }) => {
        console.log(`[StabilityTrace] Outgoing Request: ${request.url}`);
        const { cst, securityToken, proxyUrl, environment } = useSessionStore.getState()

        // 1. Determine the base URL for rewriting/absolutizing
        const base = proxyUrl 
          ? (proxyUrl.startsWith('http') ? proxyUrl : `https://${proxyUrl}`)
          : (typeof window !== 'undefined' && window.location.origin !== 'null' ? window.location.origin : 'http://localhost:3000');

        let finalRequest = request

        try {
          // Use base as the second argument to handle relative request.url
          const url = new URL(request.url, base)
          
          // Combine base + the intended path (e.g. /session)
          const finalUrl = new URL(url.pathname + url.search, base)
          
          // 2. CREATE A NEW REQUEST
          // This ensures we always have an absolute URL and allows header modification
          finalRequest = new Request(finalUrl.toString(), request)
        } catch (e) {
          console.error('[StabilityTrace] Request cloning failed:', e)
        }

        // 3. APPLY AUTH HEADERS
        if (cst) {
          finalRequest.headers.set('CST', cst)
        }
        if (securityToken) {
          finalRequest.headers.set('X-SECURITY-TOKEN', securityToken)
        }
        if (environment) {
          finalRequest.headers.set('X-Environment', environment)
        }

        return finalRequest
      }
    ],
    afterResponse: [
      async ({ request, options, response }) => {
        try {
          const url = response.url || ''
          const isSession = url.includes('/session') || (options.url && String(options.url).includes('/session'))
          
          if (isSession) {
            console.log(`[StabilityTrace] Capture check for ${url}: status=${response.status}`);
            const cst = response.headers.get('CST')
            const securityToken = response.headers.get('X-SECURITY-TOKEN')
            
            console.log(`[StabilityTrace] Headers - CST: ${cst ? 'Present' : 'MISSING'}, X-SECURITY-TOKEN: ${securityToken ? 'Present' : 'MISSING'}`);
            
            if (response.ok && cst && securityToken) {
              console.log('[StabilityTrace] Tokens captured successfully. Updating store.');
              useSessionStore.getState().setTokens(cst, securityToken)
            } else if (response.ok) {
              console.warn('[StabilityTrace] Login succeeded but tokens are missing from headers.');
            }
          }
        } catch (e) {
          console.error('[StabilityTrace] Token capture failed:', e)
        }
      }
    ]
  }
})
