import ky from 'ky'
import { useSessionStore } from '../store/useSessionStore'

const DEFAULT_PREFIX = '/api'

/**
 * API client configured to use the granular Vercel proxy.
 * Secrets are injected server-side to prevent leaking to the browser.
 */
export const api = ky.create({
  prefixUrl: DEFAULT_PREFIX,
  hooks: {
    beforeRequest: [
      (requestWrapper: any) => {
        const request = requestWrapper.request || requestWrapper;

        if (!request.url || request.url === 'undefined' || request.url.includes('/undefined')) {
          console.error('[StabilityTrace] FATAL: Blocked request to undefined path!');
          throw new Error(`Blocked malformed API request to: ${request.url}`);
        }

        const { cst, securityToken, environment } = useSessionStore.getState()
        const newHeaders = new Headers(request.headers)
        
        // Pass through essential trading tokens
        if (cst) newHeaders.set('CST', cst)
        if (securityToken) newHeaders.set('X-SECURITY-TOKEN', securityToken)
        
        // Pass through environment selection (LIVE vs DEMO)
        // Proxy expects 'x-env' as per Task 4 behavior
        if (environment) newHeaders.set('x-env', environment)

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
    ],
    afterResponse: [
      async (requestOrWrapper: any, _optionsOrUndefined?: any, responseOrUndefined?: any) => {
        try {
          const response = responseOrUndefined || requestOrWrapper.response;
          
          if (!response) return;

          const url = response.url || ''
          const isSession = url.includes('/session')
          
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
