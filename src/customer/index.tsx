import React from 'react'
import { createRoot } from 'react-dom/client'
import CustomerDisplay from './CustomerDisplay'

function App() {
  return (
    <div className="h-screen w-screen">
      <CustomerDisplay />
    </div>
  )
}

const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<App />)
}
