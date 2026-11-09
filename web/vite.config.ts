import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Strip all console.* calls and debugger statements from production builds.
    // This prevents auth tokens, error messages, and internal state from being
    // visible in browser DevTools → Console during production use.
    esbuild: {
      drop: ['console', 'debugger'],
    },
  },
})
