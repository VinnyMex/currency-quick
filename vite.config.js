import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,zip}']
      }
    })
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // Landing page como raiz
        main: resolve(__dirname, 'currency-quick-landing.html'),
        // App PWA em /app
        app: resolve(__dirname, 'index.html')
      }
    }
  },
  server: {
    proxy: {
      '/api/rates': {
        target: 'https://api.frankfurter.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/rates/, '/latest')
      }
    }
  }
});
