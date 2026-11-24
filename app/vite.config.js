import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const atRoot = mode === 'root'
  return {
    plugins: [react()],
    base: atRoot ? '/hunarlink/' : '/hunarlink/react/',
    build: {
      outDir: atRoot ? '../dist' : '../react',
      emptyOutDir: true,
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          /* React and the router change far less often than the app, so they
             get their own long-lived chunks. A deploy that only touches page
             code then leaves the vendor chunks cached in the browser. */
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react-router')) return 'vendor-router'
              if (id.includes('react')) return 'vendor-react'
              return 'vendor'
            }
            return undefined
          }
        }
      }
    },
    server: { host: '0.0.0.0', port: 5173, allowedHosts: true }
  }
})
