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
