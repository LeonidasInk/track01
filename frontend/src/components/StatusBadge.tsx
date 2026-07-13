import type { ReactNode } from 'react'

interface StatusBadgeProps {
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'
  children: ReactNode
  className?: string
}

export function StatusBadge({ tone = 'neutral', children, className = '' }: StatusBadgeProps) {
  return <span className={`status-badge status-badge--${tone} ${className}`.trim()}>{children}</span>
}
