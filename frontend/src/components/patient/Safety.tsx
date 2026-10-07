import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ShieldQuestion } from 'lucide-react'
import { cn } from '@/lib/cn'
import { EDUCATION_DISCLAIMER } from '@/lib/education'

/** Small, always-present safety reminder. Calm, never alarming. */
export function SafetyNote({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-card border border-hairline bg-surface/80 px-4 py-3.5',
        className,
      )}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-medical-50 text-medical-500">
        <ShieldQuestion className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 text-xs leading-relaxed text-ink-soft">
        <p className="font-semibold text-ink">Need Medical Help?</p>
        <p className="mt-0.5">
          For any medical concerns, contact your healthcare professional. For severe or rapidly
          worsening symptoms, seek urgent medical attention or contact local emergency services.
        </p>
      </div>
    </div>
  )
}

/** Compact footer-level notice used across the patient pages. */
export function PatientDisclaimer({ className }: { className?: string }) {
  return (
    <p className={cn('text-2xs leading-relaxed text-ink-muted', className)}>
      This application is an educational and research prototype and does not provide a medical
      diagnosis. AI results should not replace evaluation by a qualified healthcare professional.
    </p>
  )
}

/** Larger, prominent notice for result and report surfaces. */
export function ResultDisclaimer({ className }: { className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        'rounded-card border border-warning/25 bg-warning/[0.06] px-4 py-4',
        className,
      )}
    >
      <p className="text-[0.82rem] font-semibold text-warning-ink">Important</p>
      <p className="mt-1 text-xs leading-relaxed text-warning-ink">
        This application is an educational and research prototype and does not provide a medical
        diagnosis. AI results should not replace evaluation by a qualified healthcare professional.
        Please discuss this result with your healthcare professional.
      </p>
    </div>
  )
}

export function EducationDisclaimer({ className }: { className?: string }) {
  return (
    <p className={cn('text-2xs leading-relaxed text-ink-muted', className)}>
      {EDUCATION_DISCLAIMER}
    </p>
  )
}

/* ------------------------------------------------------------ page heading */

export function PatientPageHeader({
  title,
  subtitle,
  actions,
  children,
  className,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className={cn('flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between', className)}
    >
      <div className="min-w-0">
        <h1 className="font-display text-[1.45rem] font-bold leading-tight text-ink sm:text-[1.55rem]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1.5 max-w-2xl text-[0.88rem] leading-relaxed text-ink-soft text-pretty">
            {subtitle}
          </p>
        ) : null}
        {children}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </motion.header>
  )
}

export function SectionHeading({
  title,
  description,
  action,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-3', className)}>
      <div>
        <h2 className="font-display text-[1.05rem] font-semibold text-ink">{title}</h2>
        {description ? (
          <p className="mt-1 max-w-2xl text-[0.84rem] leading-relaxed text-ink-soft">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}
