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
  // The project contains the Python backend alongside the frontend. Without this list,
  // chokidar tries to watch backend/venv/ (~50k pandas/numpy/... files)
  // and crashes with ENOSPC on default Linux.
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
