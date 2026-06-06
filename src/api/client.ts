import ky from 'ky'
import { useSessionStore } from '../store/useSessionStore'

const DEFAULT_PROXY_URL = '/api'

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
        const request = requestWrapper.request || requestWrapper;

        if (!request.url || request.url === 'undefined' || request.url.includes('/undefined')) {
          console.error('[StabilityTrace] FATAL: Blocked request to undefined path!');
          throw new Error(`Blocked malformed API request to: ${request.url}`);
        }

        const proxyBase = getBaseUrl()
        
        if (proxyBase.startsWith('/api')) {
          const currentUrl = new URL(request.url, window.location.origin)
          
          if (currentUrl.pathname.includes('/api')) {
            const { cst, securityToken, environment } = useSessionStore.getState()
            const newHeaders = new Headers(request.headers)
            
            if (cst) newHeaders.set('CST', cst)
            if (securityToken) newHeaders.set('X-SECURITY-TOKEN', securityToken)
            if (environment) newHeaders.set('X-Environment', environment)

            const isMutation = ['POST', 'PUT', 'PATCH'].includes(request.method);
            const requestOptions: RequestInit = {
              method: request.method,
              headers: newHeaders,
              body: isMutation ? request.body : undefined,
              // @ts-ignore - duplex is not in standard RequestInit yet
              duplex: isMutation && request.body ? 'half' : undefined,
            };

            return new Request(request.url, requestOptions);
          }
        } else if (proxyBase.startsWith('http')) {
          const targetBase = new URL(proxyBase.endsWith('/') ? proxyBase : `${proxyBase}/`)
          const currentUrl = new URL(request.url)
          
          // HARDENING: If Ky has already prepended /api (our local default), 
          // we strip it before appending to the remote proxy target.
          const cleanPath = currentUrl.pathname
            .replace(/^\/api/, '')
            .replace(/^\/+/, '');
            
          const finalUrl = new URL(cleanPath + currentUrl.search, targetBase).toString();

          const { cst, securityToken, environment, cfClientId, cfClientSecret } = useSessionStore.getState()
          const newHeaders = new Headers(request.headers)
          
          if (cst) newHeaders.set('CST', cst)
          if (securityToken) newHeaders.set('X-SECURITY-TOKEN', securityToken)
          if (environment) newHeaders.set('X-Environment', environment)
          if (cfClientId) newHeaders.set('CF-Access-Client-Id', cfClientId)
          if (cfClientSecret) newHeaders.set('CF-Access-Client-Secret', cfClientSecret)

          const isMutation = ['POST', 'PUT', 'PATCH'].includes(request.method);
          const requestOptions: RequestInit = {
            method: request.method,
            headers: newHeaders,
            body: isMutation ? request.body : undefined,
            // @ts-ignore - duplex is not in standard RequestInit yet
            duplex: isMutation && request.body ? 'half' : undefined,
          };

          return new Request(finalUrl, requestOptions);
        }
      }
    ],
    afterResponse: [
      async (requestOrWrapper: any, optionsOrUndefined?: any, responseOrUndefined?: any) => {
        try {
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
