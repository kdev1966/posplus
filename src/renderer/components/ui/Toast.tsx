import React, { useEffect, useState } from 'react'
import { Toast as ToastType, useToastStore } from '../../store/toastStore'

const icons = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
}

const styles = {
  success: {
    icon: 'bg-green-500/20 text-green-300 border-green-500/30',
    border: 'border-green-500/30',
    glow: 'shadow-[0_0_20px_rgba(34,197,94,0.5)]',
  },
  error: {
    icon: 'bg-red-500/20 text-red-300 border-red-500/30',
    border: 'border-red-500/30',
    glow: 'shadow-[0_0_20px_rgba(239,68,68,0.5)]',
  },
  warning: {
    icon: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    border: 'border-yellow-500/30',
    glow: 'shadow-[0_0_20px_rgba(234,179,8,0.5)]',
  },
  info: {
    icon: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    border: 'border-blue-500/30',
    glow: 'shadow-neon-blue',
  },
}

interface ToastProps {
  toast: ToastType
}

export const Toast: React.FC<ToastProps> = ({ toast }) => {
  const removeToast = useToastStore((state) => state.removeToast)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    // Start exit animation 300ms before removal
    if (toast.duration && toast.duration > 0) {
      const exitTimer = setTimeout(() => {
        setIsExiting(true)
      }, toast.duration - 300)

      return () => clearTimeout(exitTimer)
    }
  }, [toast.duration])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => {
      removeToast(toast.id)
    }, 300)
  }

  const style = styles[toast.type]

  return (
    <div
      className={`
        glass rounded-xl p-4 border ${style.border} ${style.glow}
        flex items-start gap-3 min-w-[320px] max-w-md
        transition-all duration-300
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0 slide-up'}
      `}
    >
      {/* Icon */}
      <div
        className={`
          flex items-center justify-center w-8 h-8 rounded-lg border
          ${style.icon} flex-shrink-0 font-bold text-lg
        `}
      >
        {icons[toast.type]}
      </div>

      {/* Message */}
      <div className="flex-1 text-white text-sm leading-relaxed pt-1">
        {toast.message}
      </div>

      {/* Close Button */}
      <button
        onClick={handleClose}
        className="flex-shrink-0 text-gray-400 hover:text-white transition-colors p-1"
        aria-label="Close"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  )
}
