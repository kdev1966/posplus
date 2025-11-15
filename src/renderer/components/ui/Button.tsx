import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'success' | 'danger' | 'ghost'
  isLoading?: boolean
  children: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  isLoading = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const variantClasses = {
    primary: 'btn-primary',
    success: 'btn-success',
    danger: 'btn-danger',
    ghost: 'btn-ghost',
  }

  return (
    <button
      className={`${variantClasses[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <span className="spinner" />
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  )
}
