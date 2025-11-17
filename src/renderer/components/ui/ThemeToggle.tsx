import React from 'react'
import { useThemeStore, Theme } from '../../store/themeStore'
import { useLanguageStore } from '../../store/languageStore'

interface ThemeToggleProps {
  className?: string
  showLabel?: boolean
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', showLabel = false }) => {
  const { theme, setTheme } = useThemeStore()
  const { t } = useLanguageStore()

  const themeOptions: { value: Theme; label: string; icon: string }[] = [
    { value: 'light', label: t('lightTheme') || 'Light', icon: '☀️' },
    { value: 'dark', label: t('darkTheme') || 'Dark', icon: '🌙' },
    { value: 'system', label: t('systemTheme') || 'System', icon: '💻' },
  ]

  const currentTheme = themeOptions.find((opt) => opt.value === theme)

  return (
    <div className={`relative ${className}`}>
      {showLabel && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('theme') || 'Theme'}
        </label>
      )}

      <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700">
        {themeOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setTheme(option.value)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200
              ${
                theme === option.value
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }
            `}
            title={option.label}
          >
            <span className="text-base">{option.icon}</span>
            {showLabel && <span className="hidden sm:inline">{option.label}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}

// Simple toggle button for header
export const ThemeToggleButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, toggleTheme, resolvedTheme } = useThemeStore()

  const getIcon = () => {
    if (theme === 'system') return '💻'
    return resolvedTheme === 'dark' ? '🌙' : '☀️'
  }

  const getTooltip = () => {
    if (theme === 'light') return 'Switch to system theme'
    if (theme === 'dark') return 'Switch to light theme'
    return 'Switch to dark theme'
  }

  return (
    <button
      onClick={toggleTheme}
      className={`
        p-2 rounded-lg transition-all duration-200
        bg-gray-200 dark:bg-gray-800
        hover:bg-gray-300 dark:hover:bg-gray-700
        text-gray-700 dark:text-gray-300
        border border-gray-300 dark:border-gray-700
        ${className}
      `}
      title={getTooltip()}
    >
      <span className="text-lg">{getIcon()}</span>
    </button>
  )
}
