import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { ProvenanceChip } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Spinner'
import { formatInt, formatMetric } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { ConfusionMatrix as Matrix, Provenance } from '@/types'

function Cell({
  value,
  tone,
  label,
  caption,
  loading,
}: {
  value: number | undefined
  tone: 'correct' | 'incorrect'
  label: string
  caption: string
  loading?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-card border p-4',
        tone === 'correct'
          ? 'border-success/25 bg-success/[0.06]'
          : 'border-warning/25 bg-warning/[0.06]',
      )}
    >
      <p
        className={cn(
          'text-2xs font-semibold uppercase tracking-wide',
          tone === 'correct' ? 'text-success-ink' : 'text-warning-ink',
        )}
      >
        {label}
      </p>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-14" />
      ) : (
        <p className="mt-1.5 font-display text-2xl font-bold leading-none text-ink tabular">
          {formatInt(value ?? null)}
        </p>
      )}
      <p className="mt-1.5 text-[0.68rem] leading-relaxed text-ink-muted">{caption}</p>
    </div>
  )
}

/**
 * Confusion matrix with axis labels, expressed in counts plus the derived
 * proportions shown underneath.
 */
export function ConfusionMatrixPanel({
  matrix,
  metrics,
  provenance,
  title = 'Confusion Matrix',
  description = 'Confusion matrix shows the distribution of correct and incorrect model predictions.',
  loading = false,
}: {
  matrix: Matrix | null
  metrics: { accuracy: number | null; precision: number | null; recall: number | null } | null
  provenance: Provenance
  title?: string
  description?: string
  loading?: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <ProvenanceChip provenance={provenance} compact />
      </CardHeader>
      <CardContent>
        {!matrix && !loading ? (
          <div className="rounded-card border border-dashed border-medical-200 bg-surface-subtle p-6 text-center">
            <p className="text-[0.85rem] font-semibold text-ink">Awaiting trained model results</p>
            <p className="mx-auto mt-1.5 max-w-md text-2xs leading-relaxed text-ink-muted">
              This confusion matrix will be populated from the evaluation run once the model
              artifacts are trained and served. No values are estimated in the meantime.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center">
              <span className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-muted">
                Predicted
              </span>
            </div>
            <div className="grid grid-cols-[auto_1fr_1fr] items-center gap-2 sm:gap-3">
              <span className="w-16 text-center text-2xs font-bold uppercase tracking-[0.1em] text-ink-muted [writing-mode:vertical-rl] sm:w-20 sm:rotate-180">
                Actual
              </span>
              <div className="space-y-2 sm:space-y-3">
                <Cell
                  loading={loading}
                  value={matrix?.trueNegative}
                  tone="correct"
                  label="True negative"
                  caption="Negative cases correctly identified as negative"
                />
                <Cell
                  loading={loading}
                  value={matrix?.falseNegative}
                  tone="incorrect"
                  label="False negative"
                  caption="Positive cases missed by the model"
                />
              </div>
              <div className="space-y-2 sm:space-y-3">
                <Cell
                  loading={loading}
                  value={matrix?.falsePositive}
                  tone="incorrect"
                  label="False positive"
                  caption="Negative cases incorrectly flagged as positive"
                />
                <Cell
                  loading={loading}
                  value={matrix?.truePositive}
                  tone="correct"
                  label="True positive"
                  caption="Positive cases correctly identified as positive"
                />
              </div>
            </div>
            <div className="flex justify-center gap-3 border-t border-hairline pt-3">
              <span className="text-2xs text-ink-muted">
                Column 1 · <span className="font-semibold text-ink-soft">Predicted negative</span>
              </span>
              <span className="text-2xs text-ink-muted">
                Column 2 · <span className="font-semibold text-ink-soft">Predicted positive</span>
              </span>
            </div>

            {metrics ? (
              <dl className="grid grid-cols-3 gap-3 border-t border-hairline pt-4">
                {[
                  { label: 'Accuracy', value: metrics.accuracy },
                  { label: 'Precision', value: metrics.precision },
                  { label: 'Recall', value: metrics.recall },
                ].map((item) => (
                  <div key={item.label} className="rounded-input bg-surface-subtle px-3 py-2">
                    <dt className="text-2xs uppercase tracking-wide text-ink-muted">{item.label}</dt>
                    <dd className="text-[0.9rem] font-bold text-ink tabular">
                      {formatMetric(item.value)}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
