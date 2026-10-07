import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'
import { Skeleton } from '@/components/ui/Spinner'

export interface StatCardProps {
  icon: LucideIcon
  label: string
  value: React.ReactNode
  caption?: string
  trend?: { label: string; tone: 'neutral' | 'teal' | 'medical' }
  loading?: boolean
  tone?: 'medical' | 'teal' | 'neutral'
  delay?: number
  onClick?: () => void
  footer?: React.ReactNode
}

const TONES = {
  medical: {
    icon: 'bg-medical-50 text-medical-500 ring-medical-100',
    value: 'text-ink',
  },
  teal: {
    icon: 'bg-teal-50 text-teal-600 ring-teal-100',
    value: 'text-ink',
  },
  neutral: {
    icon: 'bg-surface-muted text-ink-soft ring-hairline',
    value: 'text-ink',
  },
} as const

/**
 * Primary dashboard metric tile. The value is always the strongest element on the
 * card; supporting copy is deliberately quieter.
 */
export function StatCard({
  icon: Icon,
  label,
  value,
  caption,
  trend,
  loading,
  tone = 'medical',
  delay = 0,
  onClick,
  footer,
}: StatCardProps) {
  const palette = TONES[tone]
  const Wrapper = onClick ? 'button' : 'div'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <Wrapper
        type={onClick ? 'button' : undefined}
        onClick={onClick}
        className={cn(
          'group relative w-full overflow-hidden rounded-card border border-hairline bg-surface p-5 text-left shadow-card',
          onClick && 'card-hover',
        )}
      >
        <span
          className="pointer-events-none absolute inset-x-0 -top-16 h-32 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: 'radial-gradient(closest-side, rgba(11,92,173,0.07), transparent)' }}
          aria-hidden
        />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-2xs font-semibold uppercase tracking-[0.1em] text-ink-muted">
              {label}
            </p>
            {loading ? (
              <Skeleton className="mt-2.5 h-8 w-20" />
            ) : (
              <p
                className={cn(
                  'mt-2 font-display text-[1.9rem] font-bold leading-none tabular',
                  palette.value,
                )}
              >
                {value}
              </p>
            )}
          </div>
          <span
            className={cn(
              'grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 ring-inset',
              palette.icon,
            )}
          >
            <Icon className="h-[18px] w-[18px]" aria-hidden />
          </span>
        </div>

        {caption ? (
          <p className="mt-3 text-2xs leading-relaxed text-ink-muted">{caption}</p>
        ) : null}

        {trend ? (
          <p
            className={cn(
              'mt-3 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-2xs font-semibold',
              trend.tone === 'teal'
                ? 'bg-teal-50 text-teal-600'
                : trend.tone === 'medical'
                  ? 'bg-medical-50 text-medical-600'
                  : 'bg-surface-muted text-ink-soft',
            )}
          >
            {trend.label}
          </p>
        ) : null}

        {footer}
      </Wrapper>
    </motion.div>
  )
}
