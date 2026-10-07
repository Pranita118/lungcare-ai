import { cn } from '@/lib/cn'

/** Calm, clinical spinner used for every AI operation. */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block h-5 w-5 animate-spin rounded-full border-2 border-medical-100 border-t-medical-500',
        className,
      )}
    />
  )
}

/** Three-dot indicator for inline progress messages. */
export function Dots({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)} aria-hidden>
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="h-1.5 w-1.5 rounded-full bg-medical-400"
          style={{ animation: `pulse-dot 1.3s ease-in-out ${index * 0.16}s infinite` }}
        />
      ))}
    </span>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
      'animate-pulse rounded-lg bg-gradient-to-r from-shimmer via-surface-subtle to-shimmer',
      className,
    )}
      aria-hidden
    />
  )
}

export function ProgressBar({
  value,
  tone = 'medical',
  className,
  label,
}: {
  value: number
  tone?: 'medical' | 'teal' | 'success' | 'warning' | 'danger'
  className?: string
  label?: string
}) {
  const tones = {
    medical: 'bg-medical-500',
    teal: 'bg-teal-500',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
  }
  const width = Math.max(0, Math.min(100, value))
  return (
    <div
      className={cn('h-2 w-full overflow-hidden rounded-full bg-track', className)}
      role="progressbar"
      aria-valuenow={Math.round(width)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-700 ease-out', tones[tone])}
        style={{ width: `${width}%` }}
      />
    </div>
  )
}
