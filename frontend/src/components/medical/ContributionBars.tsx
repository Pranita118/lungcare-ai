import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowDown, ArrowUp, Info } from 'lucide-react'
import { cn } from '@/lib/cn'
import { FEATURES } from '@/lib/clinical'
import { formatDecimal } from '@/lib/format'
import type { FactorContribution } from '@/types'

/**
 * Horizontal contribution bars for the individual prediction.
 * Bars are labelled with the signed model effect, and the wording never implies
 * medical causation.
 */
export function ContributionBars({
  contributions,
  className,
  showSentences = true,
  limit,
}: {
  contributions: FactorContribution[]
  className?: string
  showSentences?: boolean
  limit?: number
}) {
  const [hovered, setHovered] = useState<string | null>(null)
  const rows = useMemo(
    () => (limit ? contributions.slice(0, limit) : contributions),
    [contributions, limit],
  )

  return (
    <ul className={cn('space-y-3.5', className)}>
      {rows.map((item, index) => {
        const meta = FEATURES[item.feature]
        const positive = item.contribution > 0
        const active = hovered === item.feature
        return (
          <motion.li
            key={item.feature}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05, ease: 'easeOut' }}
            onMouseEnter={() => setHovered(item.feature)}
            onMouseLeave={() => setHovered(null)}
            className="group"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-[0.8rem] font-semibold text-ink">{meta.label}</span>
                <span className="shrink-0 text-2xs text-ink-muted">({item.displayValue})</span>
              </span>
              <span
                className={cn(
                  'flex shrink-0 items-center gap-1 text-2xs font-bold tabular',
                  positive ? 'text-danger-ink' : 'text-success-ink',
                )}
              >
                {positive ? (
                  <ArrowUp className="h-3 w-3" aria-hidden />
                ) : (
                  <ArrowDown className="h-3 w-3" aria-hidden />
                )}
                {positive ? '+' : ''}
                {formatDecimal(item.contribution)}
              </span>
            </div>

            <div
              className="mt-1.5 flex h-2.5 items-center overflow-hidden rounded-full bg-track"
              role="img"
              aria-label={`${meta.label}: ${item.sentence}`}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(2, item.magnitude)}%` }}
                transition={{ duration: 0.6, delay: 0.1 + index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  'h-full rounded-full',
                  positive ? 'bg-danger/80' : 'bg-teal-500/85',
                  active && 'shadow-[0_0_0_2px_rgba(255,255,255,0.9)]',
                )}
              />
            </div>

            {showSentences ? (
              <p
                className={cn(
                  'mt-1.5 text-2xs leading-relaxed transition-colors',
                  active ? 'text-ink-soft' : 'text-ink-muted',
                )}
              >
                {item.sentence}
              </p>
            ) : null}
          </motion.li>
        )
      })}
    </ul>
  )
}

/** Explains the direction of the attribution scale. */
export function ContributionLegend({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-5 gap-y-2 rounded-input border border-hairline bg-surface-subtle px-3.5 py-2.5',
        className,
      )}
    >
      <span className="flex items-center gap-1.5 text-2xs font-medium text-ink-soft">
        <span className="h-2 w-4 rounded-full bg-danger/80" aria-hidden />
        Increases predicted risk
      </span>
      <span className="flex items-center gap-1.5 text-2xs font-medium text-ink-soft">
        <span className="h-2 w-4 rounded-full bg-teal-500/85" aria-hidden />
        Decreases predicted risk
      </span>
      <span className="flex items-center gap-1.5 text-2xs text-ink-muted">
        <Info className="h-3 w-3" aria-hidden />
        Feature contribution indicates how individual input variables influenced this model
        prediction. It does not represent medical causation.
      </span>
    </div>
  )
}
