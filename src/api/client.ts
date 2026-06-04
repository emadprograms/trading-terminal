import ky from 'ky'
import { useSessionStore } from '../store/useSessionStore'

export const api = ky.create({
  hooks: {
    beforeRequest: [
      (request, options) => {
        const { cst, securityToken, proxyUrl } = useSessionStore.getState()

        if (proxyUrl) {
          try {
            const base = proxyUrl.startsWith('http') ? proxyUrl : `https://${proxyUrl}`
            const proxyBase = new URL(base)
            
            // If the request is relative to the current origin, rewrite it to use the proxyUrl
            if (request.url.startsWith(window.location.origin)) {
              const currentUrl = new URL(request.url)
              const finalUrl = new URL(currentUrl.pathname + currentUrl.search, proxyBase)
              request.url = finalUrl.toString()
            }
          } catch (e) {
            console.error('[StabilityTrace] Proxy URL rewrite failed:', e)
          }
        }

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
        if (request.url.includes('/session') && response.ok) {
          const cst = response.headers.get('CST')
          const securityToken = response.headers.get('X-SECURITY-TOKEN')
          
          if (cst && securityToken) {
            useSessionStore.getState().setTokens(cst, securityToken)
          }
        }
      }
    ]
  }
})
