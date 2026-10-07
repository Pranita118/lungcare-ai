import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { RiskLevel } from '@/types'

/* ----------------------------------------------------------------- cards */

export function HealthCard({
  icon: Icon,
  title,
  value,
  caption,
  tone = 'medical',
  to,
  action,
  className,
  delay = 0,
}: {
  icon: LucideIcon
  title: string
  value: ReactNode
  caption?: string
  tone?: 'medical' | 'teal' | 'neutral'
  to?: string
  action?: ReactNode
  className?: string
  delay?: number
}) {
  const tones = {
    medical: 'bg-medical-50 text-medical-500 ring-medical-100',
    teal: 'bg-teal-50 text-teal-600 ring-teal-100',
    neutral: 'bg-surface-muted text-ink-soft ring-hairline',
  } as const

  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-2xs font-semibold uppercase tracking-[0.1em] text-ink-muted">{title}</p>
        <span
          className={cn(
            'grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 ring-inset',
            tones[tone],
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <div className="mt-3">
        <p className="font-display text-[1.45rem] font-bold leading-tight text-ink">{value}</p>
        {caption ? (
          <p className="mt-1.5 text-2xs leading-relaxed text-ink-muted">{caption}</p>
        ) : null}
      </div>
      {action ? <div className="mt-3.5">{action}</div> : null}
    </>
  )

  const shell = cn(
    'block w-full rounded-card border border-hairline bg-surface p-5 text-left shadow-card',
    to && 'card-hover',
    className,
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {to ? (
        <Link to={to} className={shell}>
          {inner}
        </Link>
      ) : (
        <div className={shell}>{inner}</div>
      )}
    </motion.div>
  )
}

/* ------------------------------------------------------------- risk card */

const RISK_STYLES = {
  lower: {
    chip: 'bg-success/10 text-success-ink ring-success/25',
    dot: 'bg-success',
    bar: 'bg-success',
    ring: 'ring-success/25',
  },
  moderate: {
    chip: 'bg-warning/12 text-warning-ink ring-warning/30',
    dot: 'bg-warning',
    bar: 'bg-warning',
    ring: 'ring-warning/30',
  },
  elevated: {
    chip: 'bg-danger/10 text-danger-ink ring-danger/25',
    dot: 'bg-danger',
    bar: 'bg-danger',
    ring: 'ring-danger/25',
  },
} as const

export type RiskTone = keyof typeof RISK_STYLES

export function riskToneFor(level: RiskLevel | null): RiskTone {
  if (level === 'low') return 'lower'
  if (level === 'high') return 'elevated'
  if (level === 'moderate') return 'moderate'
  return 'moderate'
}

export function RiskBadgePill({
  tone,
  label,
  size = 'md',
}: {
  tone: RiskTone
  label: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const style = RISK_STYLES[tone]
  const Icon = tone === 'lower' ? 'check' : tone === 'elevated' ? 'alert' : 'info'
  return (
    <span
      role="status"
      className={cn(
        'inline-flex items-center gap-2 rounded-full font-semibold ring-1 ring-inset',
        style.chip,
        size === 'sm' ? 'px-2.5 py-1 text-2xs' : size === 'lg' ? 'px-4 py-2.5 text-sm' : 'px-3 py-1.5 text-[0.82rem]',
      )}
    >
      {Icon === 'check' ? (
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M5 10.5l3.2 3.2L15 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : Icon === 'alert' ? (
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M10 6.5v4.2M10 13.6h.01" strokeLinecap="round" />
          <circle cx="10" cy="10" r="7" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="10" cy="10" r="7" />
          <path d="M10 9v4M10 6.6h.01" strokeLinecap="round" />
        </svg>
      )}
      {label}
    </span>
  )
}

/** Large, calm result surface. The single most important element on a page. */
export function RiskCard({
  tone,
  headline,
  meaning,
  scoreNote,
  children,
  className,
}: {
  tone: RiskTone
  headline: string
  meaning: string
  scoreNote?: string
  children?: ReactNode
  className?: string
}) {
  const style = RISK_STYLES[tone]
  return (
    <div
      className={cn(
        'overflow-hidden rounded-panel border border-hairline bg-surface shadow-panel',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-3 border-b border-hairline bg-gradient-to-r from-sheen-from to-sheen-to px-5 py-4">
        <span className={cn('text-2xs font-bold uppercase tracking-[0.14em]', style.chip.split(' ')[1])}>
          AI Screening Result
        </span>
        <RiskBadgePill tone={tone} label={headline} />
      </div>
      <div className="px-5 py-5">
        <p className="text-[0.92rem] leading-relaxed text-ink-soft text-pretty">{meaning}</p>
        {scoreNote ? <p className="mt-2 text-2xs text-ink-muted">{scoreNote}</p> : null}
        {children}
      </div>
    </div>
  )
}

/* --------------------------------------------------------- progress ring */

export function ProgressRing({
  done,
  total,
  label,
  size = 96,
}: {
  done: number
  total: number
  label?: string
  size?: number
}) {
  const pct = total > 0 ? Math.min(1, done / total) : 0
  const stroke = 9
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E8F0F6"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#0F8B8D"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - pct) }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="font-display text-lg font-bold leading-none text-ink tabular">
            {done}
            <span className="text-sm font-semibold text-ink-muted">/{total}</span>
          </p>
          {label ? <p className="mt-0.5 text-[0.6rem] uppercase tracking-wide text-ink-muted">{label}</p> : null}
        </div>
      </div>
    </div>
  )
}
