import React from 'react'
import { Link, useLocation } from 'react-router-dom'

const menuItems = [
  { path: '/dashboard', icon: '📊', label: 'Dashboard' },
  { path: '/pos', icon: '🛒', label: 'Point of Sale' },
  { path: '/products', icon: '📦', label: 'Products' },
  { path: '/categories', icon: '🏷️', label: 'Categories' },
  { path: '/stock', icon: '📈', label: 'Stock' },
  { path: '/history', icon: '📜', label: 'History' },
  { path: '/users', icon: '👥', label: 'Users' },
  { path: '/settings', icon: '⚙️', label: 'Settings' },
]

export const Sidebar: React.FC = () => {
  const location = useLocation()

  return (
    <aside className="w-64 glass border-r border-white/10 flex flex-col">
      <div className="p-6">
        <h1 className="text-3xl font-bold text-gradient glow-text">
          POSPlus
        </h1>
        <p className="text-xs text-gray-400 mt-1">Point of Sale System</p>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30 shadow-neon-blue'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="text-xs text-gray-500 text-center">
          v1.0.0 · POSPlus © 2025
        </div>
      </div>
    </aside>
  )
}
