import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds a gentle hover lift — use for interactive cards only. */
  interactive?: boolean
  padded?: boolean
  as?: 'div' | 'section' | 'article'
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { interactive = false, padded = false, className, children, as: Tag = 'div', ...props },
  ref,
) {
  return (
    <Tag
      ref={ref as never}
      className={cn(
        'rounded-card border border-hairline bg-surface shadow-card',
        interactive && 'card-hover cursor-pointer',
        padded && 'p-5',
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  )
})

export function CardHeader({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-start justify-between gap-4 px-5 pt-5 pb-4', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardTitle({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('font-display text-[0.98rem] font-semibold text-ink', className)}
      {...props}
    >
      {children}
    </h3>
  )
}

export function CardDescription({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('mt-1 text-[0.8rem] leading-relaxed text-ink-muted', className)} {...props}>
      {children}
    </p>
  )
}

export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-5 pb-5', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 border-t border-hairline bg-surface-subtle px-5 py-3.5 rounded-b-card',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/** Large clinical panel used for the primary result surfaces. */
export function Panel({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn('rounded-panel border border-hairline bg-surface shadow-panel', className)}
      {...props}
    >
      {children}
    </section>
  )
}
