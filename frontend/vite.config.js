import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// BACKEND_URL is set by docker-compose to http://backend:8000.
// Locally it falls back to http://localhost:8000.
const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',   // needed to accept connections from outside the container
    port: 5173,
    watch: {
      usePolling: true, // required for file-watching inside Docker on Windows/Mac
    },
    proxy: {
      '/api': backendUrl,
    },
  },
})
