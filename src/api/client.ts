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
 * We do not use prefix/baseUrl in the config to avoid Ky-internal resolution bugs
 * when we are already manually rewriting URLs.
 */
export const api = ky.create({
  hooks: {
    beforeRequest: [
      (request) => {
        const proxyBase = getBaseUrl()
        const targetBase = new URL(proxyBase)
        
        // request.url is the final URL Ky wants to fetch.
        // If it's relative, it will be resolved against the current origin by Ky.
        let url: URL;
        try {
          url = new URL(request.url);
        } catch (e) {
          const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
          url = new URL(request.url, origin);
        }

        // Detect if the pathname is literally "/undefined" or ends with it
        if (url.pathname === '/undefined' || url.pathname.endsWith('/undefined')) {
          console.error('[StabilityTrace] CRITICAL: Pathname is /undefined. Originating URL:', request.url);
          // If it's a favicon or similar, just let it fail.
          // If it's a real API call, we need to know where it came from.
        }

        const isLocal = url.origin === (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000') || url.origin === 'null';
        const isProxy = url.origin === targetBase.origin;

        if (isLocal || isProxy) {
          // Construct the final proxy URL
          // We take the pathname + search and append it to targetBase
          const finalUrl = new URL(url.pathname.substring(1) + url.search, targetBase).toString();
          
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
