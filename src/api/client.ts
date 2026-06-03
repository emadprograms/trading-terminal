import ky from 'ky'
import { useSessionStore } from '../store/useSessionStore'

export const api = ky.create({
  hooks: {
    beforeRequest: [
      ({ request }) => {
        const { cst, securityToken, proxyUrl } = useSessionStore.getState()
        
        // Dynamically set prefixUrl from store if it's a relative URL
        if (proxyUrl && !request.url.startsWith('http')) {
          // This is tricky because request.url is already resolved by the browser/node
          // In tests, 'session' becomes 'http://localhost:3000/session' if window.location is set
          // But here it seems it's failing earlier.
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
      async ({ request, response }) => {
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
