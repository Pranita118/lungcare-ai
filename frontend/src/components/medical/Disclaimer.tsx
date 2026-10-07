import { ShieldAlert, Info } from 'lucide-react'
import { cn } from '@/lib/cn'
import { APP } from '@/lib/clinical'

/** Subtle, always-visible footer-level notice. */
export function InlineDisclaimer({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        'flex items-start gap-2 text-2xs leading-relaxed text-ink-muted',
        className,
      )}
    >
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-muted/80" aria-hidden />
      <span>{APP.disclaimer}</span>
    </p>
  )
}

/** Prominent notice used on result and report surfaces. */
export function ResearchDisclaimer({
  className,
  title = 'Research prototype — not a medical diagnosis',
  text = APP.disclaimerStrong,
}: {
  className?: string
  title?: string
  text?: string
}) {
  return (
    <div
      role="note"
      className={cn(
        'rounded-card border border-warning/25 bg-warning/[0.06] px-4 py-3.5',
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning-ink" aria-hidden />
        <div>
          <p className="text-[0.8rem] font-semibold text-warning-ink">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-warning-ink">{text}</p>
        </div>
      </div>
    </div>
  )
}

/** Clarifies that segmentation ≠ detection. */
export function SegmentationNotice({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-input border border-teal-100 bg-tint-teal px-3.5 py-3',
        className,
      )}
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden />
      <p className="text-2xs leading-relaxed text-teal-700 dark:text-teal-300">{APP.segmentationDisclaimer}</p>
    </div>
  )
}
