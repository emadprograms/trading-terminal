import ky from 'ky'
import { useSessionStore } from '../store/useSessionStore'

export const api = ky.create({
  hooks: {
    beforeRequest: [
      (request, options) => {
        const { cst, securityToken, proxyUrl } = useSessionStore.getState()

        // 1. DYNAMIC PROXY ROUTING
        // Instead of manual rewriting, we use prefixUrl. 
        // Ky handles the joining of base + path automatically and safely.
        if (proxyUrl) {
          options.prefixUrl = proxyUrl.startsWith('http') ? proxyUrl : `https://${proxyUrl}`
        }

        // 2. AUTH HEADERS
        // We use request.headers.set as it is standard and safe on the Request object.
        if (cst) {
          request.headers.set('CST', cst)
        }
        if (securityToken) {
          request.headers.set('X-SECURITY-TOKEN', securityToken)
        }
      }
    ],
    afterResponse: [
      async (request, options, response) => {
        try {
          // 3. SECURE TOKEN CAPTURE
          // We check the response.url which is always defined and reliable.
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
