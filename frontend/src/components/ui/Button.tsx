import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-medical-500 text-white shadow-[0_6px_16px_rgba(11,92,173,0.22)] hover:bg-medical-600 hover:shadow-[0_10px_22px_rgba(11,92,173,0.28)] active:bg-medical-700',
  secondary:
    'bg-surface text-medical-600 border border-medical-200 hover:border-medical-300 hover:bg-medical-50 hover:text-medical-700',
  success:
    'bg-teal-500 text-white shadow-[0_6px_16px_rgba(15,139,141,0.22)] hover:bg-teal-600 active:bg-teal-700',
  danger: 'bg-danger text-white shadow-[0_6px_16px_rgba(217,92,92,0.22)] hover:bg-[#C45151]',
  ghost: 'bg-transparent text-ink-soft hover:bg-medical-50 hover:text-medical-600',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-[9px]',
  md: 'h-10 px-4 text-sm gap-2 rounded-button',
  lg: 'h-12 px-6 text-[0.95rem] gap-2.5 rounded-button',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  loadingLabel?: string
  icon?: LucideIcon
  iconRight?: LucideIcon
  fullWidth?: boolean
  children?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    loadingLabel,
    icon: Icon,
    iconRight: IconRight,
    fullWidth = false,
    className,
    disabled,
    children,
    type = 'button',
    ...props
  },
  ref,
) {
  const isDisabled = disabled || loading
  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex select-none items-center justify-center font-semibold transition-all duration-200 ease-out',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-medical-500/15',
        'disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none',
        SIZES[size],
        VARIANTS[variant],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : Icon ? (
        <Icon className={size === 'lg' ? 'h-[18px] w-[18px]' : 'h-4 w-4'} aria-hidden />
      ) : null}
      <span>{loading && loadingLabel ? loadingLabel : children}</span>
      {!loading && IconRight ? <IconRight className="h-4 w-4" aria-hidden /> : null}
    </button>
  )
})
