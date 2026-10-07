import type { ReactNode } from 'react'
import { AlertTriangle, RefreshCw, type LucideIcon } from 'lucide-react'
import { Button } from './Button'
import { Dots } from './Spinner'
import { cn } from '@/lib/cn'
import type { AppError } from '@/types'

/* ------------------------------------------------------------------ loading */

export function LoadingState({
  title,
  description,
  className,
  compact = false,
}: {
  title: string
  description?: string
  className?: string
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-panel border border-hairline bg-surface text-center',
        compact ? 'gap-2 px-6 py-8' : 'gap-3 px-6 py-14',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="relative grid h-11 w-11 place-items-center">
        <span className="absolute inset-0 rounded-full bg-medical-50" />
        <Dots className="relative" />
      </div>
      <p className="font-display text-sm font-semibold text-ink">{title}</p>
      {description ? <p className="max-w-sm text-xs text-ink-muted">{description}</p> : null}
    </div>
  )
}

/* ------------------------------------------------------------------- errors */

export function ErrorState({
  error,
  onRetry,
  className,
  compact = false,
}: {
  error: AppError | { userMessage: string; hint?: string; retryable?: boolean }
  onRetry?: () => void
  className?: string
  compact?: boolean
}) {
  return (
    <div
      role="alert"
      className={cn(
        'rounded-panel border border-danger/20 bg-tint-danger shadow-card',
        compact ? 'px-4 py-4' : 'px-6 py-8',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-danger/10 text-danger">
          <AlertTriangle className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-danger-ink">{error.userMessage}</p>
          {'hint' in error && error.hint ? (
            <p className="mt-1 text-xs leading-relaxed text-danger-ink">{error.hint}</p>
          ) : null}
          {onRetry ? (
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={onRetry}
              icon={RefreshCw}
            >
              Retry
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- empty states */

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-panel border border-dashed border-medical-200 bg-surface/70 px-6 py-14 text-center',
        className,
      )}
    >
      <span className="relative grid h-14 w-14 place-items-center rounded-2xl bg-medical-50 text-medical-500">
        <span className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-medical-100" />
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <p className="mt-4 font-display text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-ink-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
