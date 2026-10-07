import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Badge, ProvenanceChip } from '@/components/ui/Badge'
import type { Provenance } from '@/types'
import { cn } from '@/lib/cn'

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  provenance,
  className,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  actions?: ReactNode
  provenance?: Provenance
  className?: string
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between no-print',
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1.5 text-2xs font-semibold uppercase tracking-[0.14em] text-medical-500">
            {eyebrow}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-[1.45rem] font-bold leading-tight text-ink sm:text-[1.6rem]">
            {title}
          </h1>
          {provenance ? <ProvenanceChip provenance={provenance} /> : null}
        </div>
        {subtitle ? (
          <p className="mt-1.5 max-w-2xl text-[0.86rem] leading-relaxed text-ink-soft text-pretty">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </motion.header>
  )
}

export function SectionTitle({
  title,
  description,
  right,
  className,
}: {
  title: string
  description?: string
  right?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-3', className)}>
      <div>
        <h2 className="font-display text-[1.05rem] font-semibold text-ink">{title}</h2>
        {description ? (
          <p className="mt-1 max-w-2xl text-[0.82rem] leading-relaxed text-ink-soft">{description}</p>
        ) : null}
      </div>
      {right}
    </div>
  )
}

export function KeyValue({
  label,
  value,
  hint,
  className,
}: {
  label: string
  value: ReactNode
  hint?: string
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <dt className="text-2xs font-medium uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="text-[0.86rem] font-semibold text-ink tabular">{value}</dd>
      {hint ? <p className="text-2xs text-ink-muted">{hint}</p> : null}
    </div>
  )
}

export function InfoPill({ children }: { children: ReactNode }) {
  return <Badge tone="outline">{children}</Badge>
}
