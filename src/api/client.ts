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
  // Use prefix for stable resolution
  prefix: getBaseUrl(),
  hooks: {
    beforeRequest: [
      (request) => {
        const proxyBase = getBaseUrl()
        const targetBase = new URL(proxyBase)
        
        let url: URL;
        try {
          // If request.url is literally "undefined", this might fail or resolve to origin/undefined
          url = new URL(request.url);
        } catch (e) {
          const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
          url = new URL(request.url, origin);
        }

        // Detect if the path is literally "/undefined" or contains it
        if (url.pathname.includes('undefined')) {
          console.error('[StabilityTrace] BLOCKING malformed request to:', request.url);
          // Instead of throwing, we can try to fix it if it's just the path,
          // but if the URL is literally "undefined", we must throw.
          if (request.url === 'undefined' || request.url.endsWith('/undefined')) {
             throw new Error(`Invalid API request URL: ${request.url}`);
          }
        }

        const isLocal = url.origin === (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000') || url.origin === 'null';
        const isProxy = url.origin === targetBase.origin || url.hostname.includes('scanner-backend');

        if (isLocal || isProxy) {
          // Construct the final proxy URL. 
          // We take the pathname (stripping leading slash) + search and append it to targetBase
          const cleanPath = url.pathname.replace(/^\/+/, '');
          
          // Final check: if cleanPath is 'undefined', we stop it.
          if (cleanPath === 'undefined') {
            throw new Error('Detected malformed "undefined" path in rewrite logic');
          }

          const finalUrl = new URL(cleanPath + url.search, targetBase).toString();
          
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
              console.log('[StabilityTrace] Tokens captured successfully.');
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
