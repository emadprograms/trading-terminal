import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

const commitHash = execSync('git rev-parse HEAD').toString().trim()
process.env.VITE_COMMIT_HASH = commitHash

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    plugins: [react()],
    server: {
      port: 3001,
      // Local development now relies on Vercel dev or direct /api handlers
    }
  }
})
