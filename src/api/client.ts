import ky from 'ky'
import { useSessionStore } from '../store/useSessionStore'

export const api = ky.create({
  hooks: {
    beforeRequest: [
      ({ request }) => {
        const { cst, securityToken, proxyUrl } = useSessionStore.getState()

        // 1. Prepare the base for rewriting
        let finalRequest = request

        if (proxyUrl) {
          try {
            const base = proxyUrl.startsWith('http') ? proxyUrl : `https://${proxyUrl}`
            const url = new URL(request.url)
            // Combine proxy base + the intended path (e.g. /session)
            const finalUrl = new URL(url.pathname + url.search, base)
            
            // 2. CREATE A NEW REQUEST
            // This bypasses the read-only 'options' object by creating a fresh Request
            // that inherits from the original.
            finalRequest = new Request(finalUrl.toString(), request)
          } catch (e) {
            console.error('[StabilityTrace] Request cloning failed:', e)
          }
        }

        // 3. APPLY AUTH HEADERS
        if (cst) {
          finalRequest.headers.set('CST', cst)
        }
        if (securityToken) {
          finalRequest.headers.set('X-SECURITY-TOKEN', securityToken)
        }

        return finalRequest
      }
    ],
    afterResponse: [
      async ({ response }) => {
        try {
          // 4. SECURE TOKEN CAPTURE
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
