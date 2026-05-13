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
  // Le projet contient le backend Python à coté du front. Sans cette liste,
  // chokidar tente de watcher backend/venv/ (~50k fichiers pandas/numpy/...)
  // et plante avec ENOSPC sur les linux par défaut.
  server: {
    watch: {
      ignored: [
        '**/backend/**',
        '**/graphify-out/**',
        '**/blender_scripts/**',
        '**/.venv/**',
        '**/venv/**',
        '**/__pycache__/**',
      ],
    },
  },
  build: {
    outDir: 'build',
    emptyOutDir: true,
    // No manualChunks: with React.lazy() page boundaries, Vite/Rollup auto-splits
    // each lazy route into its own chunk and hoists shared deps into a common
    // chunk without the circular-graph problems caused by hand-grouping
    // three / d3 / globe.gl. Each user only downloads what their current page needs.
    chunkSizeWarningLimit: 1500,
  },
  optimizeDeps: {
    include: ['react-globe.gl', 'globe.gl', 'three'],
  },
})
