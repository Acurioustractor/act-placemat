import type { ReactNode, ButtonHTMLAttributes } from 'react'

/**
 * Button Component with Research-Backed Micro-interactions
 *
 * Based on research:
 * - Hover: scale 1.02, lift shadow
 * - Press: scale 0.98
 * - Spring physics via CSS cubic-bezier (approximates spring feel)
 * - Reduced motion support
 * - <100ms perceived response
 */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
  children: ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-violet-600 text-white border-transparent
    hover:bg-violet-700
    active:bg-violet-800
    focus-visible:ring-violet-500
  `,
  secondary: `
    bg-white text-slate-700 border-slate-200
    hover:bg-slate-50 hover:border-slate-300
    active:bg-slate-100
    focus-visible:ring-slate-400
  `,
  ghost: `
    bg-transparent text-slate-600 border-transparent
    hover:bg-slate-100
    active:bg-slate-200
    focus-visible:ring-slate-400
  `,
  danger: `
    bg-red-600 text-white border-transparent
    hover:bg-red-700
    active:bg-red-800
    focus-visible:ring-red-500
  `,
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2.5',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <button
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center font-medium rounded-xl border
        transition-all duration-150
        /* Spring-like cubic-bezier for natural feel */
        [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)]
        /* Micro-interactions */
        hover:scale-[1.02] hover:-translate-y-px hover:shadow-md
        active:scale-[0.98] active:translate-y-0 active:shadow-sm
        /* Focus */
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        /* Disabled */
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:translate-y-0
        /* Reduced motion */
        motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {/* Loading spinner */}
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}

      {/* Left icon */}
      {icon && iconPosition === 'left' && !loading && (
        <span className="flex-shrink-0">{icon}</span>
      )}

      {/* Label */}
      <span>{children}</span>

      {/* Right icon */}
      {icon && iconPosition === 'right' && !loading && (
        <span className="flex-shrink-0">{icon}</span>
      )}
    </button>
  )
}

// Icon-only button variant
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  label: string // Required for accessibility
  variant?: ButtonVariant
  size?: ButtonSize
}

export function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  className = '',
  ...props
}: IconButtonProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  }

  return (
    <button
      aria-label={label}
      title={label}
      className={`
        inline-flex items-center justify-center rounded-xl border
        transition-all duration-150
        [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)]
        hover:scale-[1.05] active:scale-[0.95]
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100
        ${variantStyles[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      {...props}
    >
      {icon}
    </button>
  )
}

// Link styled as button
interface LinkButtonProps {
  href: string
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
  className?: string
  external?: boolean
}

export function LinkButton({
  href,
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  external = false,
}: LinkButtonProps) {
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className={`
        inline-flex items-center justify-center font-medium rounded-xl border
        transition-all duration-150
        [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)]
        hover:scale-[1.02] hover:-translate-y-px hover:shadow-md
        active:scale-[0.98] active:translate-y-0 active:shadow-sm
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:hover:translate-y-0
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {children}
      {external && (
        <svg
          className="ml-1.5 w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      )}
    </a>
  )
}
