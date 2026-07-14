import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dashboard admin autonome — aucun proxy : l'URL de l'API vient de VITE_API_URL
export default defineConfig({
  plugins: [react()],
  server: { port: 5174 },
})
