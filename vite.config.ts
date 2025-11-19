import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Custom plugin to remove type="module" and move scripts to end of body for Electron compatibility
function removeModuleType(): Plugin {
  return {
    name: 'remove-module-type',
    transformIndexHtml(html) {
      // Remove type="module" from script tags
      html = html.replace(/<script type="module"/g, '<script')

      // Move script tags from head to end of body (before </body>)
      // This ensures DOM is ready when scripts execute
      const scriptRegex = /<script[^>]*src="[^"]*"[^>]*><\/script>/g
      const scripts = html.match(scriptRegex) || []

      // Remove scripts from head
      html = html.replace(scriptRegex, '')

      // Add scripts before </body>
      if (scripts.length > 0) {
        html = html.replace('</body>', `${scripts.join('\n    ')}\n  </body>`)
      }

      return html
    },
  }
}

export default defineConfig({
  plugins: [react(), removeModuleType()],
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
