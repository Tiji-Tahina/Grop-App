import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'build',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('three') || id.includes('@react-three')) {
              return 'vendor-three';
            }
            if (id.includes('d3')) {
              return 'vendor-d3';
            }
            if (id.includes('framer-motion')) {
              return 'vendor-framer';
            }
            if (id.includes('globe.gl') || id.includes('react-globe.gl')) {
              return 'vendor-globe';
            }
            return 'vendor'; // Reste des dépendances
          }
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react-globe.gl', 'globe.gl', 'three'],
  },
})
