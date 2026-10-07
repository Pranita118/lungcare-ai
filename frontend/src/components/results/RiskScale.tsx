import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'
import { RISK_META } from '@/lib/clinical'
import { formatPercent } from '@/lib/format'
import type { RiskLevel } from '@/types'

/**
 * Screening score presented on a clinically banded scale.
 * The three risk bands are always labelled, so the score is never read by colour alone.
 */
export function RiskScale({
  score,
  level,
  thresholds = { low: 0.3, high: 0.6 },
  className,
}: {
  score: number
  level: RiskLevel
  thresholds?: { low: number; high: number }
  className?: string
}) {
  const { low, high } = thresholds
  const lowWidth = low * 100
  const midWidth = (high - low) * 100
  const highWidth = (1 - high) * 100
  const marker = Math.max(0, Math.min(100, score * 100))

  return (
    <div className={cn('w-full', className)}>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-track">
        <div className="absolute inset-0 flex">
          <div className="h-full bg-success/25" style={{ width: `${lowWidth}%` }} />
          <div className="h-full bg-warning/25" style={{ width: `${midWidth}%` }} />
          <div className="h-full bg-danger/22" style={{ width: `${highWidth}%` }} />
        </div>
        {low > 0 ? (
          <div
            className="absolute inset-y-0 w-px bg-ink/15"
            style={{ left: `${lowWidth}%` }}
            aria-hidden
          />
        ) : null}
        {high < 1 ? (
          <div
            className="absolute inset-y-0 w-px bg-ink/15"
            style={{ left: `${highWidth + lowWidth + midWidth}%` }}
            aria-hidden
          />
        ) : null}
        <motion.div
          initial={{ left: '0%' }}
          animate={{ left: `${marker}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="absolute top-1/2 h-5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white"
          style={{ backgroundColor: 'currentColor' }}
          aria-hidden
        >
          <span className={cn('block h-full w-full rounded-full', RISK_META[level].dot)} />
        </motion.div>
      </div>

      <div className="mt-2 flex items-center justify-between text-2xs">
        <span className="font-medium text-success">Low &lt; {formatPercent(low, 0)}</span>
        <span className="font-medium text-warning-ink">
          Moderate {formatPercent(low, 0)}–{formatPercent(high, 0)}
        </span>
        <span className="font-medium text-danger-ink">Elevated &gt; {formatPercent(high, 0)}</span>
      </div>
    </div>
  )
}

export function ScoreReadout({
  score,
  level,
  complementLabel = 'Screened negative score',
}: {
  score: number
  level: RiskLevel
  complementLabel?: string
}) {
  return (
    <div className="rounded-card border border-hairline bg-gradient-to-br from-sheen-from to-sheen-to p-5">
      <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
        AI Screening Result
      </p>
      <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
        <p className="font-display text-[2.6rem] font-bold leading-none text-ink tabular">
          {formatPercent(score)}
        </p>
        <p className="pb-1 text-xs text-ink-muted">
          predicted risk · {formatPercent(1 - score)} complementary
        </p>
      </div>
      <p className="mt-1.5 text-2xs text-ink-muted">{complementLabel}</p>
      <RiskScale score={score} level={level} className="mt-4" />
    </div>
  )
}
