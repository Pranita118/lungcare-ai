import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------ text input */

export interface TextInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  invalid?: boolean
  prefix?: ReactNode
  suffix?: ReactNode
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { invalid, prefix, suffix, className, ...props },
  ref,
) {
  return (
    <div className="relative">
      {prefix ? (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted">
          {prefix}
        </span>
      ) : null}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          'h-10 w-full rounded-input border bg-surface px-3.5 text-sm text-ink shadow-inset transition-all duration-150',
          'placeholder:text-ink-muted/70',
          'focus:outline-none focus:ring-4 focus:ring-medical-500/12 focus:border-medical-400',
          'disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-ink-muted',
          prefix && 'pl-9',
          suffix && 'pr-14',
          invalid
            ? 'border-danger/60 focus:border-danger focus:ring-danger/12'
            : 'border-hairline hover:border-medical-200',
          className,
        )}
        {...props}
      />
      {suffix ? (
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-2xs font-medium text-ink-muted">
          {suffix}
        </span>
      ) : null}
    </div>
  )
})

/* --------------------------------------------------------------- number input */

export interface NumberInputProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'type' | 'onChange' | 'value' | 'id'
  > {
  id?: string
  value: number | null
  onValueChange: (value: number | null) => void
  min?: number
  max?: number
  step?: number
  unit?: string
  invalid?: boolean
}

/** Number field with clinical steppers and hard range clamping. */
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  { value, onValueChange, min = 0, max = 999, step = 1, unit, invalid, className, id, ...props },
  ref,
) {
  const generatedId = useId()
  const fieldId = id ?? generatedId

  const clampValue = (next: number) => Math.min(max, Math.max(min, next))
  const bump = (delta: number) => {
    const current = value ?? min
    onValueChange(clampValue(Math.round((current + delta) * 100) / 100))
  }

  return (
    <div className="flex items-stretch gap-2">
      <div className="relative flex-1">
        <input
          ref={ref}
          id={fieldId}
          type="number"
          inputMode="numeric"
          value={value ?? ''}
          min={min}
          max={max}
          step={step}
          aria-invalid={invalid || undefined}
          onChange={(event) => {
            const raw = event.target.value
            if (raw === '') {
              onValueChange(null)
              return
            }
            const parsed = Number(raw)
            if (Number.isNaN(parsed)) return
            onValueChange(clampValue(parsed))
          }}
          className={cn(
            'h-10 w-full rounded-input border bg-surface px-3.5 text-sm font-medium tabular text-ink shadow-inset transition-all duration-150',
            'focus:outline-none focus:ring-4 focus:ring-medical-500/12 focus:border-medical-400',
            '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
            invalid
              ? 'border-danger/60 focus:border-danger focus:ring-danger/12'
              : 'border-hairline hover:border-medical-200',
            unit && 'pr-16',
            className,
          )}
          {...props}
        />
        {unit ? (
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-2xs font-medium text-ink-muted">
            {unit}
          </span>
        ) : null}
      </div>
      <div className="flex overflow-hidden rounded-input border border-hairline bg-surface shadow-inset">
        <button
          type="button"
          aria-label="Decrease value"
          onClick={() => bump(-step)}
          disabled={value !== null && value <= min}
          className="grid h-10 w-9 place-items-center text-ink-soft transition-colors hover:bg-medical-50 hover:text-medical-600 focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-medical-500/15 disabled:opacity-40"
        >
          <Minus className="h-3.5 w-3.5" aria-hidden />
        </button>
        <span className="w-px bg-hairline" aria-hidden />
        <button
          type="button"
          aria-label="Increase value"
          onClick={() => bump(step)}
          disabled={value !== null && value >= max}
          className="grid h-10 w-9 place-items-center text-ink-soft transition-colors hover:bg-medical-50 hover:text-medical-600 focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-medical-500/15 disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </div>
  )
})

/* --------------------------------------------------------------- segmented */

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  description?: string
}

export interface SegmentedProps<T extends string> {
  name: string
  value: T | ''
  options: SegmentedOption<T>[]
  onChange: (value: T) => void
  columns?: 2 | 3 | 4
  size?: 'sm' | 'md'
  describedBy?: string
  invalid?: boolean
}

/**
 * Segmented radio group styled as clinical option cards. Keyboard accessible via
 * native radio inputs.
 */
export function Segmented<T extends string>({
  name,
  value,
  options,
  onChange,
  columns = 4,
  size = 'md',
  describedBy,
  invalid,
}: SegmentedProps<T>) {
  const gridClass =
    columns === 2
      ? 'grid-cols-2'
      : columns === 3
        ? 'grid-cols-3'
        : 'grid-cols-2 sm:grid-cols-4'

  return (
    <div
      role="radiogroup"
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      className={cn('grid gap-2', gridClass)}
    >
      {options.map((option) => {
        const selected = value === option.value
        return (
          <label
            key={option.value}
            className={cn(
              'group relative flex cursor-pointer flex-col justify-center rounded-input border text-center transition-all duration-150',
              size === 'sm' ? 'h-9 px-2' : 'h-11 px-3',
              selected
                ? 'border-medical-400 bg-medical-50 text-medical-700 shadow-[0_0_0_1px_rgba(11,92,173,0.35)]'
                : 'border-hairline bg-surface text-ink-soft hover:border-medical-200 hover:bg-surface-subtle',
              'focus-within:ring-4 focus-within:ring-medical-500/15',
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={selected}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span
              className={cn(
                'font-semibold',
                size === 'sm' ? 'text-xs' : 'text-[0.82rem]',
                selected ? 'text-medical-700' : 'text-ink-soft',
              )}
            >
              {option.label}
            </span>
            {option.description ? (
              <span className="text-2xs text-ink-muted">{option.description}</span>
            ) : null}
          </label>
        )
      })}
    </div>
  )
}

/* -------------------------------------------------------------------- toggle */

export function Toggle({
  checked,
  onChange,
  label,
  description,
  id,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  description?: string
  id?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-input border border-hairline bg-surface px-3.5 py-3 shadow-inset transition-colors hover:border-medical-200">
      <span className="min-w-0">
        <span className="block text-[0.82rem] font-semibold text-ink-soft">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-2xs leading-relaxed text-ink-muted">{description}</span>
        ) : null}
      </span>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-medical-500/15',
          checked ? 'bg-medical-500' : 'bg-hairline-strong',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow-sm transition-all duration-200',
            checked ? 'left-[22px]' : 'left-0.5',
          )}
        />
      </button>
    </div>
  )
}

/* --------------------------------------------------------------------- select */

export interface SelectProps extends Omit<InputHTMLAttributes<HTMLSelectElement>, 'size'> {
  options: { value: string; label: string }[]
  invalid?: boolean
  selectSize?: 'sm' | 'md'
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, invalid, className, selectSize = 'md', ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          'w-full appearance-none rounded-input border bg-surface pl-3.5 pr-9 text-sm text-ink shadow-inset transition-all duration-150',
          'focus:outline-none focus:ring-4 focus:ring-medical-500/12 focus:border-medical-400',
          selectSize === 'sm' ? 'h-9' : 'h-10',
          invalid
            ? 'border-danger/60 focus:border-danger focus:ring-danger/12'
            : 'border-hairline hover:border-medical-200',
          className,
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden
      >
        <path
          d="M6 8l4 4 4-4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
})
