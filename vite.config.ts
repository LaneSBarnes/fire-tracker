import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['localhost', '127.0.0.1', '0.0.0.0', 'maps.moosen.dev'],
    proxy: {
      '/api/fire': {
        target: 'https://incidents.fire.ca.gov/umbraco/api/IncidentApi',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/fire/, ''),
      },
      '/api/aircraft': {
        target: 'https://rdipowerplatformfd-e5hhgqaahef7fbdr.a02.azurefd.net/aircraft/firehoseagol.json',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/aircraft/, ''),
      }
    }
  },
})
