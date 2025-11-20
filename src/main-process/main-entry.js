/**
 * CommonJS entry point for Electron main process
 * This avoids TypeScript esModuleInterop issues with electron module loading
 */

// Import compiled TypeScript code
require('./main')
