import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: true,
    emptyOutDir: true,
  },
  server: {
    port: 3999,
    proxy: {
      // Real data endpoints from stable backend
      '/api/real': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      // Main API endpoints (keeping old for compatibility)
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/metrics': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/business-dashboard': {
        target: 'http://localhost:4000/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/business-dashboard/, '/business-dashboard')
      }
    },
  },
})
