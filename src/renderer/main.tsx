import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './styles/index.css'
import './api' // Initialize API (mock for web, real for Electron)

console.log('[RENDERER] Starting React application...')
console.log('[RENDERER] Root element:', document.getElementById('root'))

try {
  const rootElement = document.getElementById('root')

  if (!rootElement) {
    console.error('[RENDERER] ERROR: Root element not found!')
    throw new Error('Root element #root not found in DOM')
  }

  console.log('[RENDERER] Creating React root...')
  const root = ReactDOM.createRoot(rootElement)

  console.log('[RENDERER] Rendering App component...')
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )

  console.log('[RENDERER] React app rendered successfully!')
} catch (error) {
  console.error('[RENDERER] FATAL ERROR during React initialization:', error)

  // Display error in DOM for debugging
  const rootElement = document.getElementById('root')
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="color: white; background: #dc2626; padding: 20px; margin: 20px; border-radius: 8px;">
        <h1>Application Error</h1>
        <p><strong>Failed to initialize React application</strong></p>
        <pre style="background: #991b1b; padding: 10px; border-radius: 4px; overflow: auto;">
${error instanceof Error ? error.message : String(error)}

${error instanceof Error && error.stack ? error.stack : ''}
        </pre>
        <p>Check the console (Ctrl+Shift+I) for more details.</p>
      </div>
    `
  }
}
