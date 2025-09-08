import { defineConfig } from 'vite'
import pages from '@hono/vite-cloudflare-pages'

export default defineConfig({
  plugins: [pages()],
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: false,
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