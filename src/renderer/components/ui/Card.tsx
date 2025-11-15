import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hover = false,
  onClick,
}) => {
  return (
    <div
      className={`${hover ? 'card-hover' : 'card'} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
