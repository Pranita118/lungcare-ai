import { useCallback, useRef, useState } from 'react'
import { Maximize2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { ReactNode } from 'react'

/**
 * Medical image viewer.
 *
 * Preserves the original aspect ratio, supports zoom, pan, reset and fit, and
 * always shows what the highlighted area actually is. No detection claims are
 * made here — the labelling belongs to the caller.
 */
export function CTViewer({
  src,
  alt,
  label,
  caption,
  className,
  children,
  initialZoom = 1,
}: {
  src: string
  alt: string
  label: string
  caption?: string
  className?: string
  children?: ReactNode
  initialZoom?: number
}) {
  const [zoom, setZoom] = useState(initialZoom)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const originStart = useRef({ x: 0, y: 0 })

  const clampZoom = (value: number) => Math.min(4, Math.max(0.5, Math.round(value * 10) / 10))

  const zoomBy = useCallback((delta: number) => {
    setZoom((current) => {
      const next = clampZoom(current + delta)
      if (next === 1) setOffset({ x: 0, y: 0 })
      return next
    })
  }, [])

  const reset = useCallback(() => {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }, [])

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (zoom <= 1) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragStart.current = { x: event.clientX, y: event.clientY }
    originStart.current = offset
    setIsPanning(true)
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return
    setOffset({
      x: originStart.current.x + (event.clientX - dragStart.current.x),
      y: originStart.current.y + (event.clientY - dragStart.current.y),
    })
  }

  const endPan = () => {
    dragStart.current = null
    setIsPanning(false)
  }

  return (
    <figure
      className={cn(
        'overflow-hidden rounded-card border border-hairline bg-surface shadow-card',
        className,
      )}
    >
      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-4 py-2.5">
        <span className="text-[0.8rem] font-semibold text-ink">{label}</span>
        <div className="flex items-center gap-1" role="group" aria-label={`${label} zoom controls`}>
          <ViewerButton label="Zoom out" onClick={() => zoomBy(-0.25)}>
            <ZoomOut className="h-4 w-4" aria-hidden />
          </ViewerButton>
          <span className="w-12 text-center text-2xs font-semibold tabular text-ink-soft" aria-live="polite">
            {Math.round(zoom * 100)}%
          </span>
          <ViewerButton label="Zoom in" onClick={() => zoomBy(0.25)}>
            <ZoomIn className="h-4 w-4" aria-hidden />
          </ViewerButton>
          <ViewerButton label="Fit image" onClick={reset}>
            <Maximize2 className="h-4 w-4" aria-hidden />
          </ViewerButton>
          <ViewerButton label="Reset zoom" onClick={reset}>
            <RotateCcw className="h-4 w-4" aria-hidden />
          </ViewerButton>
        </div>
      </figcaption>

      <div
        className={cn(
          'relative grid place-items-center overflow-hidden bg-viewer',
          zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default',
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        onPointerLeave={endPan}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="block max-h-[420px] w-auto max-w-full select-none object-contain"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            transition: isPanning ? 'none' : 'transform 180ms ease-out',
            transformOrigin: 'center center',
          }}
        />
        {zoom > 1 ? (
          <p className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-viewer/70 px-2 py-1 text-[0.65rem] font-medium text-white">
            Drag to move around the image
          </p>
        ) : null}
      </div>

      {caption ? (
        <p className="border-t border-hairline px-4 py-2.5 text-2xs leading-relaxed text-ink-muted">
          {caption}
        </p>
      ) : null}
      {children}
    </figure>
  )
}

function ViewerButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-medical-50 hover:text-medical-600 focus-visible:ring-4 focus-visible:ring-medical-500/15"
    >
      {children}
    </button>
  )
}

/** Side-by-side original vs analysed comparison, stacking on small screens. */
export function CTComparison({
  original,
  analysed,
}: {
  original: { src: string; alt: string; label: string; caption: string }
  analysed: { src: string; alt: string; label: string; caption: string }
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <CTViewer
        src={original.src}
        alt={original.alt}
        label={original.label}
        caption={original.caption}
      />
      <CTViewer
        src={analysed.src}
        alt={analysed.alt}
        label={analysed.label}
        caption={analysed.caption}
      />
    </div>
  )
}
