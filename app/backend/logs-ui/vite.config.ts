import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  build: {
    emptyOutDir: true,
    outDir: resolve(import.meta.dirname, '..', 'resources', 'logs_viewer'),
    sourcemap: false,
    cssCodeSplit: false,
    rollupOptions: {
      input: resolve(import.meta.dirname, 'src', 'main.ts'),
      output: {
        entryFileNames: 'app.js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'app.css'
          return 'assets/[name]-[hash][extname]'
        },
      },
    },
  },
})
