import type { ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

/** Builds the aria-describedby value for a field so helpers/errors are announced. */
export function fieldDescribedBy(
  id: string | undefined,
  options: { hasError: boolean; hasHelper: boolean },
): string | undefined {
  if (!id) return undefined
  const ids = [options.hasError ? `${id}-error` : null, options.hasHelper ? `${id}-helper` : null].filter(
    Boolean,
  )
  return ids.length > 0 ? ids.join(' ') : undefined
}

export interface FieldProps {
  label: string
  htmlFor?: string
  helper?: string
  error?: string | null
  required?: boolean
  className?: string
  children: ReactNode
  /** Small right-aligned content, e.g. a unit label. */
  trailing?: ReactNode
}

export function Field({
  label,
  htmlFor,
  helper,
  error,
  required,
  className,
  children,
  trailing,
}: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-[0.8rem] font-semibold text-ink-soft">
          {label}
          {required ? <span className="ml-1 text-danger">*</span> : null}
        </label>
        {trailing}
      </div>
      {children}
      {error ? (
        <p
          id={htmlFor ? `${htmlFor}-error` : undefined}
          role="alert"
          className="flex items-center gap-1.5 text-2xs font-medium text-danger-ink"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : helper ? (
        <p
          id={htmlFor ? `${htmlFor}-helper` : undefined}
          className="text-2xs leading-relaxed text-ink-muted"
        >
          {helper}
        </p>
      ) : null}
    </div>
  )
}
