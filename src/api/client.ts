import ky from 'ky'
import { useSessionStore } from '../store/useSessionStore'

/**
 * Get the current base URL from the store.
 */
const getBaseUrl = () => {
  const { proxyUrl } = useSessionStore.getState()
  if (proxyUrl) {
    return proxyUrl.startsWith('http') ? proxyUrl : `https://${proxyUrl}`
  }
  return 'https://proxy.scanner-backend.uk'
}

/**
 * API client with dynamic proxy URL resolution.
 */
export const api = ky.create({
  // Use prefixUrl for stable resolution of relative paths
  prefixUrl: getBaseUrl(),
  hooks: {
    beforeRequest: [
      (request) => {
        const proxyUrl = getBaseUrl()
        const targetBase = new URL(proxyUrl)
        
        // Ensure we are hitting the proxy. If not (e.g. relative path resolved to local origin), rewrite.
        let url: URL;
        try {
          url = new URL(request.url);
        } catch (e) {
          url = new URL(request.url, window.location.origin);
        }

        const isProxy = url.origin === targetBase.origin;
        const isLocal = url.origin === window.location.origin || url.origin === 'null';

        if (isProxy || isLocal) {
          // Re-construct the URL to ensure it's on the proxy and properly formatted
          const finalUrl = new URL(url.pathname + url.search, targetBase).toString();
          
          const { cst, securityToken, environment } = useSessionStore.getState()
          const newHeaders = new Headers(request.headers)
          
          // Authentication Headers
          if (cst) newHeaders.set('CST', cst)
          if (securityToken) newHeaders.set('X-SECURITY-TOKEN', securityToken)
          if (environment) newHeaders.set('X-Environment', environment)

          // Cloudflare Access Service Tokens
          const cfClientId = import.meta.env.VITE_CF_ACCESS_CLIENT_ID
          const cfClientSecret = import.meta.env.VITE_CF_ACCESS_CLIENT_SECRET
          if (cfClientId) newHeaders.set('CF-Access-Client-Id', cfClientId)
          if (cfClientSecret) newHeaders.set('CF-Access-Client-Secret', cfClientSecret)

          // Return new request with injected headers and proxy URL
          // We only pass the body for mutation methods to avoid "body already consumed" errors
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
              console.log('[StabilityTrace] Session tokens captured.');
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
