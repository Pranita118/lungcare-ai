import { Check, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'
import { ANALYSIS_STAGES, stageIndex } from '@/lib/analysis'
import type { PredictStage } from '@/services/contract'

/**
 * Clinical progress indicator shown while an AI operation runs.
 * Deliberately calm: no flashing, no dramatic motion.
 */
export function ProcessSteps({
  stage,
  title = 'Analyzing patient data',
  className,
}: {
  stage: PredictStage | null
  title?: string
  className?: string
}) {
  const steps = ANALYSIS_STAGES
  const current = stageIndex(stage)

  return (
    <div className={cn('rounded-panel border border-hairline bg-surface p-6 shadow-panel', className)}>
      <div className="flex items-center gap-3">
        <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-medical-50 text-medical-500">
          <span
            className="absolute inset-0 rounded-xl bg-tint-medical"
            style={{ animation: 'breathe 2.6s ease-in-out infinite' }}
            aria-hidden
          />
          <Loader2 className="relative h-4 w-4 animate-spin" aria-hidden />
        </span>
        <div>
          <p className="font-display text-sm font-semibold text-ink">{title}</p>
          <p className="text-2xs text-ink-muted">Screening model · trained artifacts</p>
        </div>
      </div>

      <ol className="mt-5 space-y-1" aria-live="polite">
        {steps.map((step, index) => {
          const done = current > index
          const active = current === index
          return (
            <li key={step.key} className="flex items-start gap-3 py-1.5">
              <span
                className={cn(
                  'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors duration-200',
                  done && 'border-success bg-success text-white',
                  active && 'border-medical-500 bg-medical-50 text-medical-500',
                  !done && !active && 'border-hairline bg-surface text-transparent',
                )}
              >
                {done ? (
                  <Check className="h-3 w-3" aria-hidden />
                ) : active ? (
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-hairline" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block text-[0.82rem] font-semibold transition-colors',
                    done && 'text-ink-soft',
                    active && 'text-ink',
                    !done && !active && 'text-ink-muted/70',
                  )}
                >
                  {step.label}
                </span>
                <span className="block text-2xs leading-relaxed text-ink-muted">
                  {step.detail}
                </span>
              </span>
              <span className="sr-only">
                {done ? 'completed' : active ? 'in progress' : 'pending'}
              </span>
            </li>
          )
        })}
      </ol>

      <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-track">
        <motion.div
          className="h-full rounded-full bg-medical-500"
          initial={{ width: '8%' }}
          animate={{ width: `${Math.max(8, ((current + 1) / steps.length) * 100)}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}
