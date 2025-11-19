import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// NOTE: We previously removed `type="module"` and forced IIFE output
// for Electron compatibility, but that caused ESM imports to be loaded
// as classic scripts ("Cannot use import statement outside a module").
// Modern Electron (Chromium) supports ESM modules when the script tag
// uses `type="module"`. We therefore emit standard ESM build and
// keep `type="module"` in the generated `index.html`.

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    // Ensure assets use relative paths for Electron
    assetsDir: 'assets',
    // Disable module preload for better Electron compatibility
    modulePreload: false,
    rollupOptions: {
      output: {
        // Use relative paths for all assets
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@renderer': path.resolve(__dirname, './src/renderer'),
      '@electron': path.resolve(__dirname, './src/electron'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
})
