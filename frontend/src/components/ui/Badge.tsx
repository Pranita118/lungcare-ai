import type { HTMLAttributes, ReactNode } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  ServerCog,
  Info,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import type { Provenance, RiskLevel } from '@/types'
import { RISK_META } from '@/lib/clinical'

type BadgeTone = 'neutral' | 'medical' | 'teal' | 'success' | 'warning' | 'danger' | 'outline'

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-muted text-ink-soft ring-1 ring-inset ring-hairline',
  medical: 'bg-medical-50 text-medical-600 ring-1 ring-inset ring-medical-100',
  teal: 'bg-teal-50 text-teal-600 ring-1 ring-inset ring-teal-100',
  success: 'bg-success/10 text-success-ink ring-1 ring-inset ring-success/20',
  warning: 'bg-warning/12 text-warning-ink ring-1 ring-inset ring-warning/25',
  danger: 'bg-danger/10 text-danger-ink ring-1 ring-inset ring-danger/20',
  outline: 'bg-surface text-ink-soft ring-1 ring-inset ring-hairline',
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
  /** Icon component, rendered at badge scale. */
  icon?: LucideIcon
  children: ReactNode
}

export function Badge({ tone = 'neutral', icon: Icon, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-2xs font-semibold tracking-wide',
        TONES[tone],
        className,
      )}
      {...props}
    >
      {Icon ? <Icon className="h-3 w-3" aria-hidden /> : null}
      {children}
    </span>
  )
}

/**
 * Data provenance indicator. Every metric on screen is either from a trained
 * model or unavailable — never silently invented.
 */
export function ProvenanceChip({
  provenance,
  className,
  compact = false,
}: {
  provenance: Provenance
  className?: string
  compact?: boolean
}) {
  if (provenance === 'trained-model') {
    return (
      <Badge tone="success" className={className} icon={ServerCog}>
        {compact ? 'Trained' : 'Trained model'}
      </Badge>
    )
  }
  return (
    <Badge tone="neutral" className={className} icon={AlertCircle}>
      Not available
    </Badge>
  )
}

/**
 * Risk is never communicated by colour alone: every badge carries an icon and a
 * written label.
 */
export function RiskBadge({
  level,
  size = 'md',
  showLabel = true,
  className,
}: {
  level: RiskLevel
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}) {
  const meta = RISK_META[level]
  const Icon =
    level === 'low' ? CheckCircle2 : level === 'moderate' ? Info : AlertCircle

  const sizes = {
    sm: 'px-2.5 py-1 text-2xs gap-1.5',
    md: 'px-3 py-1.5 text-[0.8rem] gap-2',
    lg: 'px-4 py-2.5 text-sm gap-2.5',
  } as const

  return (
    <span
      role="status"
      className={cn(
        'inline-flex items-center rounded-full font-semibold ring-1 ring-inset',
        sizes[size],
        meta.softBg,
        meta.softText,
        meta.ring,
        className,
      )}
    >
      <Icon className={size === 'lg' ? 'h-[18px] w-[18px]' : 'h-4 w-4'} aria-hidden />
      {showLabel ? meta.label : meta.short}
    </span>
  )
}

export function StatusDot({
  tone = 'success',
  pulse = false,
  className,
}: {
  tone?: 'success' | 'warning' | 'danger' | 'neutral'
  pulse?: boolean
  className?: string
}) {
  const colors = {
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    neutral: 'bg-ink-muted',
  }
  return (
    <span className={cn('relative flex h-2 w-2', className)} aria-hidden>
      {pulse ? (
        <span
          className={cn('absolute inline-flex h-full w-full rounded-full opacity-60', colors[tone])}
          style={{ animation: 'breathe 3.2s ease-in-out infinite' }}
        />
      ) : null}
      <span className={cn('relative inline-flex h-2 w-2 rounded-full', colors[tone])} />
    </span>
  )
}
