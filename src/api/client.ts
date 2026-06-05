import ky from 'ky'
import { useSessionStore } from '../store/useSessionStore'

/**
 * Get the base URL for the API requests.
 * Called dynamically to always reflect the current proxy URL.
 */
const getBaseUrl = () => {
  const { proxyUrl } = useSessionStore.getState()
  if (proxyUrl) {
    return proxyUrl.startsWith('http') ? proxyUrl : `https://${proxyUrl}`
  }
  if (typeof window !== 'undefined' && window.location.origin !== 'null') {
    return window.location.origin
  }
  return 'http://localhost:3000'
}

/**
 * API client with dynamic proxy URL resolution.
 */
export const api = ky.create({
  prefix: getBaseUrl(), // Use prefix, not prefixUrl for ky v2
  hooks: {
    beforeRequest: [
      ({ request }) => {
        const currentBase = getBaseUrl()
        let currentUrl;
        try {
          currentUrl = new URL(request.url)
        } catch(e) {
          currentUrl = new URL(request.url, currentBase)
        }
        const currentBaseUrl = new URL(currentBase)

        // Determine final URL (in case we need to rewrite to proxy)
        let finalUrl = currentUrl.toString()
        if (currentUrl.origin !== currentBaseUrl.origin) {
          finalUrl = `${currentBaseUrl.origin}${currentUrl.pathname}${currentUrl.search}`
        }

        const newHeaders = new Headers(request.headers)
        const { cst, securityToken } = useSessionStore.getState()
        if (cst) newHeaders.set('CST', cst)
        if (securityToken) newHeaders.set('X-SECURITY-TOKEN', securityToken)

        // Return a fresh Request object to guarantee header insertion is respected in all runtimes
        return new Request(finalUrl, {
          method: request.method,
          headers: newHeaders,
          body: ['POST', 'PUT', 'PATCH'].includes(request.method) ? request.body : undefined,
          mode: request.mode,
          credentials: request.credentials,
          cache: request.cache,
          redirect: request.redirect,
          referrer: request.referrer,
          integrity: request.integrity,
          signal: request.signal,
          duplex: 'half' as any,
        })
      }
    ],
    afterResponse: [
      async ({ request, options, response }) => {
        try {
          const url = response.url || ''
          const isSession = url.includes('/session') || (options.url && String(options.url).includes('/session'))
          
          if (isSession) {
            const cst = response.headers.get('CST')
            const securityToken = response.headers.get('X-SECURITY-TOKEN')
            
            if (response.ok && cst && securityToken) {
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
