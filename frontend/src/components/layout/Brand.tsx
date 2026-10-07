import { cn } from '@/lib/cn'
import { APP } from '@/lib/clinical'

/** LungCare AI mark — a clinical pulse inside a rounded medical-blue tile. */
export function Logo({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-9 w-9',
    lg: 'h-12 w-12',
  } as const

  return (
    <span
      className={cn(
        'relative grid shrink-0 place-items-center rounded-[11px] text-white shadow-[0_6px_16px_rgba(11,92,173,0.28)]',
        sizes[size],
        className,
      )}
      style={{ background: 'linear-gradient(145deg, #0B5CAD 0%, #0F8B8D 100%)' }}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="h-[58%] w-[58%]" fill="none">
        <path
          d="M2.5 12.5h3.2l1.7-4.2 2.6 8.4 2.1-5.6 1.3 2.6h3.1l1.5-2.2 1.3 2.2h1.9"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

export function BrandLockup({
  compact = false,
  className,
}: {
  compact?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Logo size={compact ? 'sm' : 'md'} />
      <div className="min-w-0">
        <p className="truncate font-display text-[0.95rem] font-bold leading-tight text-ink">
          {APP.name}
        </p>
        {!compact ? (
          <p className="truncate text-2xs font-medium text-ink-muted">{APP.shortSubtitle}</p>
        ) : null}
      </div>
    </div>
  )
}
