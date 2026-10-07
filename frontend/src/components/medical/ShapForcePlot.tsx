import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'
import { FEATURES } from '@/lib/clinical'
import { formatDecimal, round } from '@/lib/format'
import type { ShapLocalPoint } from '@/types'

/**
 * SHAP-style force plot for a single prediction.
 *
 * Convention: the left edge of the scale is "higher predicted risk" and the right
 * edge is "lower predicted risk". Every feature moves the running model output
 * from the base value toward the final value.
 */
export function ShapForcePlot({
  baseValue,
  finalValue,
  points,
  className,
}: {
  baseValue: number
  finalValue: number
  points: ShapLocalPoint[]
  className?: string
}) {
  const ordered = useMemo(
    () => [...points].sort((a, b) => Math.abs(b.shapValue) - Math.abs(a.shapValue)),
    [points],
  )

  const { rows, min, max } = useMemo(() => {
    let running = baseValue
    const accumulated = [{ point: null as ShapLocalPoint | null, from: baseValue, to: baseValue }]
    for (const point of ordered) {
      const from = running
      running += point.shapValue
      accumulated.push({ point, from, to: running })
    }
    const values = [baseValue, running, ...accumulated.flatMap((row) => [row.from, row.to])]
    const lo = Math.min(...values)
    const hi = Math.max(...values)
    const padding = Math.max(0.12, (hi - lo) * 0.12)
    return {
      rows: accumulated.slice(1),
      min: lo - padding,
      max: hi + padding,
    }
  }, [ordered, baseValue])

  const toPercent = (value: number) => ((max - value) / (max - min)) * 100

  return (
    <div className={cn('w-full', className)}>
      {/* Scale header */}
      <div className="mb-1 flex items-center justify-between text-2xs font-medium text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-danger" aria-hidden />
          Higher predicted risk
        </span>
        <span className="flex items-center gap-1.5">
          Lower predicted risk
          <span className="h-1.5 w-1.5 rounded-full bg-teal-500" aria-hidden />
        </span>
      </div>

      <div className="relative rounded-input border border-hairline bg-surface-subtle px-3 py-3">
        {/* Base value marker */}
        <div
          className="pointer-events-none absolute inset-y-3 w-px bg-medical-300/60"
          style={{ left: `${toPercent(baseValue)}%` }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -top-px -translate-x-1/2 rounded-b bg-medical-500 px-1.5 py-0.5 text-[0.6rem] font-bold text-white"
          style={{ left: `${toPercent(baseValue)}%` }}
        >
          E[f(x)] = {formatDecimal(baseValue)}
        </div>
        <div
          className="pointer-events-none absolute -bottom-px -translate-x-1/2 rounded-t bg-ink px-1.5 py-0.5 text-[0.6rem] font-bold text-white"
          style={{ left: `${toPercent(finalValue)}%` }}
        >
          f(x) = {formatDecimal(finalValue)}
        </div>

        <ul className="mt-5 space-y-2.5">
          {rows.map((row, index) => {
            const point = row.point
            if (!point) return null
            const positive = point.shapValue > 0
            const fromPct = toPercent(row.from)
            const toPct = toPercent(row.to)
            const left = Math.min(fromPct, toPct)
            const width = Math.max(0.8, Math.abs(toPct - fromPct))

            return (
              <li key={point.feature} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-right text-2xs font-medium text-ink-soft sm:w-36">
                  {FEATURES[point.feature].label}
                </span>
                <span className="relative h-6 flex-1">
                  <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-hairline" aria-hidden />
                  <motion.span
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: 1 }}
                    transition={{ duration: 0.45, delay: 0.08 + index * 0.05, ease: 'easeOut' }}
                    style={{ left: `${left}%`, width: `${width}%`, transformOrigin: 'left' }}
                    className={cn(
                      'absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full',
                      positive ? 'bg-danger/70' : 'bg-teal-500/70',
                    )}
                    aria-hidden
                  />
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.12 + index * 0.05 }}
                    style={{ left: `${toPct}%` }}
                    className={cn(
                      'absolute top-1/2 h-[11px] w-[11px] -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white',
                      positive ? 'bg-danger' : 'bg-teal-500',
                    )}
                    aria-hidden
                  />
                </span>
                <span className="w-16 shrink-0 text-2xs font-semibold tabular text-ink-soft">
                  {positive ? '+' : ''}
                  {round(point.shapValue, 2)}
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      <p className="mt-3 text-2xs leading-relaxed text-ink-muted">
        Feature contribution indicates how individual input variables influenced this model
        prediction. It does not represent medical causation.
      </p>
    </div>
  )
}
