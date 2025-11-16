import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './styles/index.css'
import './api' // Initialize API (mock for web, real for Electron)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
