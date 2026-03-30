import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3500', changeOrigin: true },
      '/collab': { target: 'ws://localhost:3501', ws: true, changeOrigin: true },
    }
  }
})
