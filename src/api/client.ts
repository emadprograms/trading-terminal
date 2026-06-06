import ky from 'ky'
import { useSessionStore } from '../store/useSessionStore'

/**
 * Get the current base URL from the store.
 * Ensures it ends with a slash for standard URL resolution.
 */
const getBaseUrl = () => {
  const { proxyUrl } = useSessionStore.getState()
  const base = proxyUrl || 'https://proxy.scanner-backend.uk'
  return base.endsWith('/') ? base : `${base}/`
}

/**
 * API client with dynamic proxy URL resolution.
 * Uses baseUrl (Ky v2) for robust relative path resolution.
 */
export const api = ky.create({
  // Use baseUrl as recommended by Ky error message for better resolution
  prefix: getBaseUrl(), 
  hooks: {
    beforeRequest: [
      (request) => {
        const proxyUrl = getBaseUrl()
        const targetBase = new URL(proxyUrl)
        
        console.log(`[StabilityTrace] Request intercepted: ${request.url}`);

        let url: URL;
        try {
          url = new URL(request.url);
        } catch (e) {
          // Fallback for relative URLs if Ky didn't resolve them yet
          const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
          url = new URL(request.url, origin);
        }

        // Only handle requests meant for our proxy or local origin
        const isProxy = url.origin === targetBase.origin;
        const isLocal = url.origin === (typeof window !== 'undefined' ? window.location.origin : '');

        if (isProxy || isLocal) {
          // Construct the final URL on the proxy. 
          // We strip any leading slash from pathname to avoid double slashes or 'undefined' issues.
          const cleanPath = url.pathname.replace(/^\/+/, '');
          
          // CRITICAL: If cleanPath is empty and we are just hitting the root, or if it somehow became 'undefined'
          if (cleanPath === 'undefined') {
            console.error('[StabilityTrace] Detected malformed "undefined" path! URL was:', request.url);
          }

          const finalUrl = new URL(cleanPath + url.search, targetBase).toString();
          console.log(`[StabilityTrace] Routing to: ${finalUrl}`);
          
          const { cst, securityToken, environment } = useSessionStore.getState()
          const newHeaders = new Headers(request.headers)
          
          // Inject Capital.com tokens
          if (cst) newHeaders.set('CST', cst)
          if (securityToken) newHeaders.set('X-SECURITY-TOKEN', securityToken)
          if (environment) newHeaders.set('X-Environment', environment)

          // Inject Cloudflare Access Service Tokens
          const cfClientId = import.meta.env.VITE_CF_ACCESS_CLIENT_ID
          const cfClientSecret = import.meta.env.VITE_CF_ACCESS_CLIENT_SECRET
          if (cfClientId) newHeaders.set('CF-Access-Client-Id', cfClientId)
          if (cfClientSecret) newHeaders.set('CF-Access-Client-Secret', cfClientSecret)

          // Return a fresh Request object
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
              console.log('[StabilityTrace] Session tokens captured successfully.');
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
