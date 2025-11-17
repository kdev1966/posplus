import React from 'react'

interface BadgeProps {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  children: React.ReactNode
  className?: string
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'primary',
  children,
  className = '',
}) => {
  const variantClasses = {
    primary: 'badge-primary',
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    info: 'badge-info',
  }

  return (
    <span className={`${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  )
}
