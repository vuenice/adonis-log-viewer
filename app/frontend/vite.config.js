import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'


// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(),tailwindcss(),],
  /**
   * Build output is served by Adonis at `/logs/assets/*`.
   * - HTML shell is served at `/logs`
   * - JS/CSS are served by `LogsViewerController.asset()`
   */
  base: '/logs/assets/',
  build: {
    emptyOutDir: true,
    outDir: resolve(import.meta.dirname, '..', '..', 'resources', 'logs_viewer'),
    sourcemap: false,
    cssCodeSplit: false,
    rollupOptions: {
      input: resolve(import.meta.dirname, 'src', 'main.js'),
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
