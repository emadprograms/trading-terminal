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
            
            // In Ky, we modify options.url to change the target destination
            const currentUrlStr = typeof options.url === 'string' ? options.url : request.url
            if (currentUrlStr && currentUrlStr.startsWith('/') || currentUrlStr.startsWith(window.location.origin)) {
              const currentUrl = new URL(currentUrlStr, window.location.origin)
              const finalUrl = new URL(currentUrl.pathname + currentUrl.search, proxyBase)
              options.url = finalUrl.toString()
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
        try {
          const url = request.url || options.url || ''
          if (url.includes('/session') && response.ok) {
            const cst = response.headers.get('CST')
            const securityToken = response.headers.get('X-SECURITY-TOKEN')
            
            if (cst && securityToken) {
              useSessionStore.getState().setTokens(cst, securityToken)
            }
          }
        } catch (e) {
          console.error('[StabilityTrace] AfterResponse URL check failed:', e)
        }
      }
    ]
  }
})
