import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    plugins: [react()],
    server: {
      port: 3001,
      // Local development now relies on Vercel dev or direct /api handlers
    },
    optimizeDeps: {
      exclude: ['sql.js']
    }
  }
})
