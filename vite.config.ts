import { defineConfig } from 'vite'
import pages from '@hono/vite-cloudflare-pages'

export default defineConfig({
  plugins: [pages()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      external: ['pg', 'postgres']
    }
  },
  resolve: {
    alias: {
      'pg': 'pg',
      'postgres': 'postgres'
    }
  }
})