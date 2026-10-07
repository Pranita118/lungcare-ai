import { motion } from 'framer-motion'
import { KeyValue } from './PageHeader'
import { formatDecimal, formatPercent } from '@/lib/format'
import { cn } from '@/lib/cn'

function sigmoid(x: number) {
  return 1 / (1 + Math.exp(-x))
}

const DOMAIN = 6

/**
 * Shows how the additive model output maps onto the reported screening score,
 * and where this case sits relative to the population baseline.
 */
export function SigmoidExplainer({
  baseValue,
  predictionValue,
  riskScore,
  className,
}: {
  baseValue: number
  predictionValue: number
  riskScore: number
  className?: string
}) {
  const width = 260
  const height = 110
  const padX = 8
  const padY = 10

  const toX = (value: number) =>
    padX + ((Math.max(-DOMAIN, Math.min(DOMAIN, value)) + DOMAIN) / (DOMAIN * 2)) * (width - padX * 2)
  const toY = (probability: number) => height - padY - probability * (height - padY * 2)

  const path = Array.from({ length: 80 }, (_, index) => {
    const value = -DOMAIN + (index / 79) * DOMAIN * 2
    return `${index === 0 ? 'M' : 'L'}${toX(value).toFixed(1)},${toY(sigmoid(value)).toFixed(1)}`
  }).join(' ')

  return (
    <div
      className={cn(
        'rounded-card border border-hairline bg-surface p-5 shadow-card',
        className,
      )}
    >
      <h3 className="font-display text-[0.95rem] font-semibold text-ink">
        From model output to screening score
      </h3>
      <p className="mt-1 text-2xs leading-relaxed text-ink-muted">
        The model works in log-odds. The reported score is the value after passing through the
        logistic function.
      </p>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-3 h-28 w-full"
        role="img"
        aria-label={`Logistic curve showing a base output of ${formatDecimal(baseValue)} and a case output of ${formatDecimal(predictionValue)}, which maps to a screening score of ${formatPercent(riskScore)}.`}
      >
        <line
          x1={padX}
          x2={width - padX}
          y1={height - padY}
          y2={height - padY}
          stroke="#E5EEF5"
          strokeWidth={1}
        />
        <path d={path} fill="none" stroke="#0B5CAD" strokeWidth={2} strokeLinecap="round" />
        <line
          x1={toX(0)}
          x2={toX(0)}
          y1={padY}
          y2={height - padY}
          stroke="var(--hairline-strong)"
          strokeDasharray="3 3"
        />
        <motion.circle
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          cx={toX(baseValue)}
          cy={toY(sigmoid(baseValue))}
          r={4}
          fill="#0F8B8D"
        />
        <motion.circle
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          cx={toX(predictionValue)}
          cy={toY(sigmoid(predictionValue))}
          r={5.5}
          fill="#0B5CAD"
          stroke="#FFFFFF"
          strokeWidth={2}
        />
      </svg>

      <dl className="mt-2 grid grid-cols-3 gap-3 border-t border-hairline pt-3">
        <KeyValue
          label="Population average"
          value={formatDecimal(baseValue)}
          hint={formatPercent(sigmoid(baseValue))}
        />
        <KeyValue
          label="This case"
          value={formatDecimal(predictionValue)}
          hint="after feature effects"
        />
        <KeyValue label="Screening score" value={formatPercent(riskScore)} hint="reported output" />
      </dl>
    </div>
  )
}
