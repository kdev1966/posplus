import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

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
        // Use IIFE format instead of ES modules for better file:// protocol support
        format: 'iife',
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
