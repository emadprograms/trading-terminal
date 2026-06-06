import ky from 'ky'
import { useSessionStore } from '../store/useSessionStore'

const DEFAULT_PROXY_URL = 'https://proxy.scanner-backend.uk'

/**
 * Get the current base URL from the store.
 */
const getBaseUrl = () => {
  const { proxyUrl } = useSessionStore.getState()
  return proxyUrl || DEFAULT_PROXY_URL
}

/**
 * API client with manual proxy URL resolution in hooks.
 */
export const api = ky.create({
  prefix: DEFAULT_PROXY_URL,
  hooks: {
    beforeRequest: [
      (requestWrapper: any) => {
        // Ky v2 hooks receive a wrapper object { request, options, retryCount }
        const request = requestWrapper.request || requestWrapper;
        
        // STRICT GUARD: Prevent "undefined" paths from reaching the proxy or network
        if (!request.url || request.url === 'undefined' || request.url.includes('/undefined')) {
          console.error('[StabilityTrace] FATAL: Blocked request to undefined path!');
          throw new Error(`Blocked malformed API request to: ${request.url}`);
        }

        const proxyBase = getBaseUrl()
        const targetBase = new URL(proxyBase.endsWith('/') ? proxyBase : `${proxyBase}/`)
        const currentUrl = new URL(request.url)
        
        // We handle requests that are either:
        // 1. Relative (which Ky has now made absolute using prefixUrl)
        // 2. Already pointing to a known scanner-backend proxy
        const isProxyTarget = currentUrl.hostname.includes('scanner-backend') || 
                             currentUrl.origin === new URL(DEFAULT_PROXY_URL).origin ||
                             currentUrl.origin === targetBase.origin;

        if (isProxyTarget) {
          // Construct the final proxy URL. 
          // We take the pathname (stripping leading slash) + search and append it to targetBase
          const cleanPath = currentUrl.pathname.replace(/^\/+/, '');
          
          if (cleanPath === 'undefined') {
            throw new Error('Detected malformed "undefined" path in rewrite logic');
          }

          const finalUrl = new URL(cleanPath + currentUrl.search, targetBase).toString();
          
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

          console.log(`[StabilityTrace] Proxy Routing: ${currentUrl.pathname} -> ${finalUrl}`);

          const isMutation = ['POST', 'PUT', 'PATCH'].includes(request.method);
          const requestOptions: RequestInit = {
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
          };

          // Fix for "duplex" TypeError in Chrome for requests with body
          if (isMutation && request.body) {
            // @ts-ignore - duplex is not in standard RequestInit yet
            requestOptions.duplex = 'half';
          }

          return new Request(finalUrl, requestOptions);
        }
      }
    ],
    afterResponse: [
      async (requestOrWrapper: any, optionsOrUndefined?: any, responseOrUndefined?: any) => {
        try {
          // Handle potential wrapper object in ky v2
          const response = responseOrUndefined || requestOrWrapper.response;
          const options = optionsOrUndefined || requestOrWrapper.options || {};
          
          if (!response) return;

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
