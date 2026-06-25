import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Split delle dipendenze pesanti in chunk vendor separati:
        // migliora il caching (cambiano di rado) e alleggerisce i chunk di pagina.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('recharts') || id.includes('/d3-')) return 'vendor-charts'
          if (id.includes('reactflow') || id.includes('@reactflow')) return 'vendor-flow'
          if (id.includes('@tanstack') || id.includes('zustand')) return 'vendor-data'
          if (id.includes('react-router') || id.includes('react-dom') || id.includes('/react/')) return 'vendor-react'
        },
      },
    },
  },
})
