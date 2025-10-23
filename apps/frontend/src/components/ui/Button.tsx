import type { PropsWithChildren, ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: PropsWithChildren<ButtonProps>) {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

  const variantClasses = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 hover:shadow-soft focus:ring-brand-500',
    secondary: 'bg-ocean-600 text-white hover:bg-ocean-700 hover:shadow-soft focus:ring-ocean-500',
    outline: 'bg-white border-2 border-brand-600 text-brand-700 hover:bg-brand-50 hover:shadow-soft focus:ring-brand-500',
    ghost: 'bg-transparent text-clay-700 hover:bg-clay-100 focus:ring-clay-500',
  }

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  }

  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  )
}
