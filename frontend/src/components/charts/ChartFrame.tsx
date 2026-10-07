import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'
import { ProvenanceChip } from '@/components/ui/Badge'
import type { Provenance } from '@/types'

/**
 * Consistent chart container: title, supporting copy, provenance chip and an
 * accessible text description for screen readers.
 */
export function ChartFrame({
  title,
  description,
  provenance,
  right,
  children,
  descriptionText,
  className,
  bodyClassName,
  delay = 0,
}: {
  title: string
  description?: string
  provenance?: Provenance
  right?: ReactNode
  children: ReactNode
  /** Plain-language summary announced to assistive technology. */
  descriptionText?: string
  className?: string
  bodyClassName?: string
  delay?: number
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn('rounded-card border border-hairline bg-surface shadow-card', className)}
      aria-label={title}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline px-5 py-4">
        <div className="min-w-0">
          <h3 className="font-display text-[0.95rem] font-semibold text-ink">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{description}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {right}
          {provenance ? <ProvenanceChip provenance={provenance} /> : null}
        </div>
      </header>
      <div className={cn('px-5 py-5', bodyClassName)}>
        {descriptionText ? <p className="sr-only">{descriptionText}</p> : null}
        {children}
      </div>
    </motion.section>
  )
}

export function ChartTooltip({
  label,
  rows,
}: {
  label?: ReactNode
  rows: { key: string; label: string; value: string; color?: string }[]
}) {
  return (
    <div className="rounded-input border border-hairline bg-surface/97 px-3 py-2 shadow-panel backdrop-blur-sm">
      {label ? (
        <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      ) : null}
      <ul className="space-y-1">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-ink-soft">
              {row.color ? (
                <span
                  className="h-2 w-2 rounded-[2px]"
                  style={{ backgroundColor: row.color }}
                  aria-hidden
                />
              ) : null}
              {row.label}
            </span>
            <span className="font-semibold tabular text-ink">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
