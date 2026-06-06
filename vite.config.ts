import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      port: 3001,
      proxy: {
        '/api': {
          target: 'https://proxy.scanner-backend.uk',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              const clientId = env.VITE_CF_ACCESS_CLIENT_ID
              const clientSecret = env.VITE_CF_ACCESS_CLIENT_SECRET

              if (clientId) {
                proxyReq.setHeader('CF-Access-Client-Id', clientId)
              }
              if (clientSecret) {
                proxyReq.setHeader('CF-Access-Client-Secret', clientSecret)
              }
              console.log(`[ViteProxy] Forwarding ${req.url} with CF-Access tokens`)
            })
          },
        },
      },
    },
    optimizeDeps: {
      exclude: ['sql.js']
    }
  }
})
