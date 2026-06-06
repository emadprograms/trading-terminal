import ky from 'ky'
import { useSessionStore } from '../store/useSessionStore'

/**
 * Get the current base URL from the store.
 */
const getBaseUrl = () => {
  const { proxyUrl } = useSessionStore.getState()
  const base = proxyUrl || 'https://proxy.scanner-backend.uk'
  return base.endsWith('/') ? base : `${base}/`
}

/**
 * API client with manual proxy URL resolution in hooks.
 */
export const api = ky.create({
  hooks: {
    beforeRequest: [
      (request) => {
        const proxyBase = getBaseUrl()
        const targetBase = new URL(proxyBase)
        
        let url: URL;
        try {
          url = new URL(request.url);
        } catch (e) {
          const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
          url = new URL(request.url, origin);
        }

        // BLOCK MALFORMED REQUESTS
        if (url.pathname.includes('undefined')) {
          console.error('[StabilityTrace] CRITICAL: Pathname contains "undefined". URL:', request.url);
          // Throwing here will be caught by the calling mutation/query
          throw new Error(`Malformed API path: ${url.pathname}`);
        }

        const isLocal = url.origin === (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000') || url.origin === 'null';
        const isProxy = url.origin === targetBase.origin;

        if (isLocal || isProxy) {
          // Construct the final proxy URL
          const cleanPath = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
          const finalUrl = new URL(cleanPath + url.search, targetBase).toString();
          
          const { cst, securityToken, environment } = useSessionStore.getState()
          const newHeaders = new Headers(request.headers)
          
          if (cst) newHeaders.set('CST', cst)
          if (securityToken) newHeaders.set('X-SECURITY-TOKEN', securityToken)
          if (environment) newHeaders.set('X-Environment', environment)

          const cfClientId = import.meta.env.VITE_CF_ACCESS_CLIENT_ID
          const cfClientSecret = import.meta.env.VITE_CF_ACCESS_CLIENT_SECRET
          if (cfClientId) newHeaders.set('CF-Access-Client-Id', cfClientId)
          if (cfClientSecret) newHeaders.set('CF-Access-Client-Secret', cfClientSecret)

          console.log(`[StabilityTrace] Proxy Routing: ${url.pathname} -> ${finalUrl}`);

          const isMutation = ['POST', 'PUT', 'PATCH'].includes(request.method);
          return new Request(finalUrl, {
            method: request.method,
            headers: newHeaders,
            body: isMutation ? request.body : undefined,
            mode: request.mode,
            credentials: request.credentials,
            cache: request.cache,
            redirect: request.redirect,
            referrer: request.referrer,
            integrity: request.integrity,
            signal: request.signal,
          })
        }
      }
    ],
    afterResponse: [
      async (_request, options, response) => {
        try {
          const url = response.url || ''
          const optUrl = options.url ? String(options.url) : ''
          const isSession = url.includes('/session') || optUrl.includes('/session')
          
          if (isSession && response.ok) {
            const cst = response.headers.get('CST')
            const securityToken = response.headers.get('X-SECURITY-TOKEN')
            
            if (cst && securityToken) {
              console.log('[StabilityTrace] Tokens captured.');
              useSessionStore.getState().setTokens(cst, securityToken)
            }
          }
        } catch (e) {
          console.error('[StabilityTrace] Token capture failed:', e)
        }
      }
    ]
  }
})
