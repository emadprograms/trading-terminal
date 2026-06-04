import ky from 'ky'
import { useSessionStore } from '../store/useSessionStore'

export const api = ky.create({
  hooks: {
    beforeRequest: [
      (request, options) => {
        const { cst, securityToken, proxyUrl } = useSessionStore.getState()

        if (proxyUrl) {
          const url = new URL(request.url)
          // If the request is relative to the current origin, rewrite it to use the proxyUrl
          if (url.origin === window.location.origin) {
            const base = proxyUrl.startsWith('http') ? proxyUrl : `https://${proxyUrl}`
            url.origin = new URL(base).origin
            // Ensure the path starts with /
            if (!url.pathname.startsWith('/')) {
              url.pathname = '/' + url.pathname
            }
            request.url = url.toString()
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
