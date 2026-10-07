import { useMemo, useState } from 'react'
import { FEATURES } from '@/lib/clinical'
import { cn } from '@/lib/cn'
import { round } from '@/lib/format'
import type { BeeswarmRow } from '@/types'

const LOW = '#D99A2B'
const HIGH = '#0B5CAD'

/** Interpolate the low→high feature-value colour ramp. */
function valueColor(value: number, min: number, max: number): string {
  if (max === min) return HIGH
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)))
  const parse = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  const [r1, g1, b1] = parse(LOW)
  const [r2, g2, b2] = parse(HIGH)
  const mix = (a: number, b: number) => Math.round(a + (b - a) * t)
  return `rgb(${mix(r1, r2)}, ${mix(g1, g2)}, ${mix(b1, b2)})`
}

const ROW_HEIGHT = 26
const CHART_HEIGHT = 210
const LEFT = 148
const RIGHT = 28
const WIDTH = 720
const TOP = 12

/**
 * SHAP summary (beeswarm) plot drawn as SVG so the jittered attribution
 * distribution is faithful rather than approximated by a bar chart.
 */
export function ShapBeeswarm({
  rows,
  className,
}: {
  rows: BeeswarmRow[]
  className?: string
}) {
  const [active, setActive] = useState<string | null>(null)

  const prepared = useMemo(() => {
    const usable = rows.slice(0, 7)
    const allShap = usable.flatMap((row) => row.points.map((point) => point.shap))
    const min = Math.min(...allShap)
    const max = Math.max(...allShap)
    const span = max - min || 1

    return usable.map((row, rowIndex) => {
      const values = row.points.map((point) => point.value)
      const valueMin = Math.min(...values)
      const valueMax = Math.max(...values)
      const sorted = [...row.points].sort((a, b) => a.shap - b.shap)
      const lanes = 9
      return {
        feature: row.feature,
        dots: sorted.map((point, index) => {
          const x = LEFT + ((point.shap - min) / span) * (WIDTH - LEFT - RIGHT)
          const lane = index % lanes
          const jitter = ((Math.floor(index / lanes) % 2) * 0.45 + lane / (lanes - 1)) * (ROW_HEIGHT - 8)
          const y = TOP + rowIndex * ROW_HEIGHT + 4 + jitter
          return {
            x,
            y,
            color: valueColor(point.value, valueMin, valueMax),
            shap: point.shap,
            value: point.value,
          }
        }),
      }
    })
  }, [rows])

  const allShap = prepared.flatMap((row) => row.dots.map((dot) => dot.shap))
  const min = Math.min(...allShap)
  const max = Math.max(...allShap)
  const ticks = useMemo(() => {
    const count = 5
    return Array.from({ length: count }, (_, index) => min + ((max - min) * index) / (count - 1))
  }, [min, max])

  return (
    <div className={cn('w-full', className)}>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${WIDTH} ${CHART_HEIGHT}`}
          className="h-auto w-full min-w-[560px]"
          role="img"
          aria-label="SHAP summary plot showing how each feature value is distributed across model attributions"
        >
          {ticks.map((tick) => {
            const x = LEFT + ((tick - min) / (max - min || 1)) * (WIDTH - LEFT - RIGHT)
            return (
              <g key={tick}>
                <line
                  x1={x}
                  x2={x}
                  y1={TOP}
                  y2={TOP + prepared.length * ROW_HEIGHT}
                  stroke="#EAF1F6"
                  strokeWidth={1}
                />
                <text
                  x={x}
                  y={CHART_HEIGHT - 2}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#8AA1B2"
                >
                  {round(tick, 1)}
                </text>
              </g>
            )
          })}

          {prepared.map((row, rowIndex) => (
            <g
              key={row.feature}
              onMouseEnter={() => setActive(row.feature)}
              onMouseLeave={() => setActive(null)}
            >
              <rect
                x={0}
                y={TOP + rowIndex * ROW_HEIGHT}
                width={WIDTH}
                height={ROW_HEIGHT}
                fill={active === row.feature ? 'rgba(11,92,173,0.045)' : 'transparent'}
                rx={6}
              />
              <text
                x={LEFT - 12}
                y={TOP + rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2 + 4}
                textAnchor="end"
                fontSize={11}
                fill={active === row.feature ? '#12304A' : '#4A6377'}
                fontWeight={600}
              >
                {FEATURES[row.feature].label}
              </text>
              {row.dots.map((dot, index) => (
                <circle
                  key={index}
                  cx={dot.x}
                  cy={dot.y}
                  r={3.1}
                  fill={dot.color}
                  opacity={active && active !== row.feature ? 0.28 : 0.85}
                />
              ))}
            </g>
          ))}

          <text
            x={LEFT + (WIDTH - LEFT - RIGHT) / 2}
            y={CHART_HEIGHT - 14}
            textAnchor="middle"
            fontSize={10}
            fill="#8AA1B2"
          >
            SHAP value (model contribution)
          </text>
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-2xs text-ink-muted">Feature value</span>
          <span className="h-2 w-24 rounded-full" style={{ background: `linear-gradient(90deg, ${LOW}, ${HIGH})` }} />
          <span className="flex items-center gap-3 text-2xs text-ink-muted">
            <span>Low</span>
            <span>High</span>
          </span>
        </div>
        <p className="text-2xs text-ink-muted">
          Each dot is one reference record. Horizontal position is the attribution for that record.
        </p>
      </div>
    </div>
  )
}
