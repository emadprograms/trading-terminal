import ky from 'ky'
import { useSessionStore } from '../store/useSessionStore'

export const api = ky.create({
  hooks: {
    beforeRequest: [
      ({ request, options }) => {
        const { cst, securityToken, proxyUrl } = useSessionStore.getState()

        // 1. DYNAMIC PROXY ROUTING (Ky v2.x pattern)
        // In Ky v2.x, prefixUrl was renamed to prefix.
        if (proxyUrl) {
          options.prefix = proxyUrl.startsWith('http') ? proxyUrl : `https://${proxyUrl}`
        }

        // 2. AUTH HEADERS
        if (cst) {
          request.headers.set('CST', cst)
        }
        if (securityToken) {
          request.headers.set('X-SECURITY-TOKEN', securityToken)
        }
      }
    ],
    afterResponse: [
      async ({ response }) => {
        try {
          // 3. SECURE TOKEN CAPTURE
          if (response.url.includes('/session') && response.ok) {
            const cst = response.headers.get('CST')
            const securityToken = response.headers.get('X-SECURITY-TOKEN')
            
            if (cst && securityToken) {
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
