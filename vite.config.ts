import { defineConfig } from 'vite'
import pages from '@hono/vite-cloudflare-pages'

export default defineConfig({
  plugins: [pages()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: './src/index.tsx',
      output: {
        entryFileNames: '_worker.js'
      }
    }
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})