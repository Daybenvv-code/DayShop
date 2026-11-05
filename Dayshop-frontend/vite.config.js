import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { apiHandler } from './server/app.js'

function apiPlugin() {
  return {
    name: 'dayshop-api',
    configureServer(server) {
      server.middlewares.use(apiHandler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(apiHandler)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), apiPlugin()],
})
