import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// Long-lived vendor chunks: app deploys don't force phones to re-download React or Radix.
// recharts and the form libraries are left out on purpose: they are already split with the pages
// that use them, and grouping them here drags shared helpers in, so every page would load them.
const vendorChunk = (id) => {
  if (!id.includes('node_modules')) return undefined
  if (id.includes('@radix-ui')) return 'radix'
  if (/[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) return 'react'
  return undefined
}

export default defineConfig(({ mode }) => {
  // BACKEND_URL (frontend/.env) is where /api is proxied in dev and preview.
  const env = loadEnv(mode, __dirname, '')
  const proxy = {
    '/api': {
      target: env.BACKEND_URL || 'http://localhost:5000',
      changeOrigin: true,
    },
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      rollupOptions: {
        output: { manualChunks: vendorChunk },
      },
    },
    server: {
      port: 3000,
      // Reachable from a phone on the same Wi-Fi: http://<this-computer's-IP>:3000
      host: true,
      proxy,
    },
    preview: {
      port: 4173,
      host: true,
      proxy,
    },
  }
})
