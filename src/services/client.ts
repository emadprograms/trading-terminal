import ky from 'ky'
import { useSessionStore } from '../store/useSessionStore'

const DEFAULT_PREFIX = '/api'

/**
 * API client configured to use the Vercel serverless proxy.
 * Secrets (X-CAP-API-KEY) are injected server-side by the proxy.
 * The client only sends session tokens (CST, X-SECURITY-TOKEN) and environment selection.
 */
const isTestEnv = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

export const api = ky.create({
  prefix: isTestEnv ? 'http://localhost/api' : DEFAULT_PREFIX,
  retry: 0,
  hooks: {
    beforeRequest: [
      (requestWrapper: any) => {
        const request = requestWrapper.request || requestWrapper;

        if (!request.url || request.url === 'undefined' || request.url.includes('/undefined')) {
          console.error('[API] Blocked request to undefined path:', request.url);
          throw new Error(`Blocked malformed API request to: ${request.url}`);
        }

        const { cst, securityToken, environment } = useSessionStore.getState()
        
        // Pass through session tokens (obtained via /session login)
        if (cst) request.headers.set('CST', cst)
        if (securityToken) request.headers.set('X-SECURITY-TOKEN', securityToken)
        
        // Pass through environment selection (LIVE vs DEMO)
        if (environment) request.headers.set('X-Environment', environment)
      }
    ],
    afterResponse: [
      async (requestOrWrapper: any, _optionsOrUndefined?: any, responseOrUndefined?: any) => {
        let response = responseOrUndefined || requestOrWrapper.response;
        try {
          if (!response) return;

          const url = response.url || ''
          const isSession = url.includes('/session')
          
          if (response.status === 401 && !isSession) {
            console.warn('[API] Token expired (401). Clearing session to trigger re-login.');
            useSessionStore.getState().clearTokens();
          }

          if (isSession && response.ok) {
            const cst = response.headers.get('CST')
            const securityToken = response.headers.get('X-SECURITY-TOKEN')
            
            if (cst && securityToken) {
              useSessionStore.getState().setTokens(cst, securityToken)
            }
          }
        } catch (e) {
          console.error('[API] Token capture failed:', e)
        }
        return response;
      }
    ]
  }
})
