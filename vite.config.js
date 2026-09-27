import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// Long-lived vendor chunks: app deploys don't force phones to re-download React, Radix or charts.
const vendorChunk = (id) => {
  if (!id.includes('node_modules')) return undefined
  if (/recharts|d3-|victory-vendor|decimal\.js/.test(id)) return 'charts'
  if (id.includes('@radix-ui')) return 'radix'
  if (/react-hook-form|@hookform|[\\/]zod[\\/]/.test(id)) return 'forms'
  if (/[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) return 'react'
  return undefined
}

export default defineConfig({
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
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
