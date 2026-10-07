import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Award,
  BrainCircuit,
  Info,
  Layers,
  ServerCog,
  TreePine,
} from 'lucide-react'
import { PageHeader, SectionTitle } from '@/components/medical/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, ProvenanceChip, StatusDot } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Spinner'
import { EmptyState, ErrorState } from '@/components/ui/StatusStates'
import { ChartFrame, ChartTooltip } from '@/components/charts/ChartFrame'
import { AXIS_PROPS, CHART, METRIC_SERIES, type MetricKey } from '@/components/charts/chartTheme'
import { ConfusionMatrixPanel } from '@/components/results/ConfusionMatrixPanel'
import { ResearchDisclaimer, InlineDisclaimer } from '@/components/medical/Disclaimer'
import { useApp } from '@/store/AppProvider'
import { useResource } from '@/store/useResource'
import { ml } from '@/services'
import { cn } from '@/lib/cn'
import { formatMetric } from '@/lib/format'
import type { ModelInfo } from '@/types'

const MODEL_ICONS: Record<string, typeof BrainCircuit> = {
  'logistic-regression': Info,
  'decision-tree': TreePine,
  'random-forest': BrainCircuit,
  'gradient-boosting': Layers,
  'voting-ensemble': Layers,
  'stacking-ensemble': Layers,
}

function ModelCard({ model, delay }: { model: ModelInfo; delay: number }) {
  const Icon = MODEL_ICONS[model.id] ?? BrainCircuit
  const awaiting = model.metrics === null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, delay, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex h-full flex-col rounded-card border border-hairline bg-surface p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
    >
      {model.isPrimary ? (
        <span className="absolute -top-2.5 left-5 inline-flex items-center gap-1 rounded-full bg-teal-500 px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-white shadow-[0_4px_10px_rgba(15,139,141,0.3)]">
          <Award className="h-3 w-3" aria-hidden />
          Primary model
        </span>
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-medical-50 text-medical-500 ring-1 ring-inset ring-medical-100">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className="truncate font-display text-[0.9rem] font-semibold text-ink">
              {model.name}
            </h3>
            <p className="truncate text-2xs text-ink-muted">{model.family}</p>
          </div>
        </div>
        <ProvenanceChip provenance={model.provenance} compact />
      </div>

      <p className="mt-3 text-2xs leading-relaxed text-ink-soft">{model.purpose}</p>

      <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2.5 border-t border-hairline pt-3.5">
        {METRIC_SERIES.map((metric) => (
          <div key={metric.key}>
            <p className="text-[0.65rem] font-medium uppercase tracking-wide text-ink-muted">
              {metric.label}
            </p>
            <p
              className={cn(
                'text-[0.95rem] font-bold tabular',
                awaiting ? 'text-ink-muted' : 'text-ink',
              )}
            >
              {awaiting ? 'Not available' : formatMetric(model.metrics?.[metric.key] ?? null)}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-3.5 flex items-center gap-1.5 text-[0.68rem] text-ink-muted">
        <StatusDot tone={model.status === 'trained' ? 'success' : 'warning'} />
        {model.status === 'trained'
          ? `Trained on ${model.trainedOn ?? 'the project dataset'}`
          : 'Awaiting trained model results'}
      </p>
    </motion.div>
  )
}

export function ModelsPage() {
  const { mode } = useApp()
  const models = useResource(() => ml().getModels(), [mode])
  const [metric, setMetric] = useState<MetricKey | 'all'>('accuracy')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const list = useMemo(() => models.data ?? [], [models.data])

  const comparisonData = useMemo(
    () =>
      list.map((model) => ({
        name: model.name.replace(' Ensemble', ''),
        accuracy: model.metrics?.accuracy ?? 0,
        precision: model.metrics?.precision ?? 0,
        recall: model.metrics?.recall ?? 0,
        f1: model.metrics?.f1 ?? 0,
        awaiting: model.metrics === null,
      })),
    [list],
  )

  const selected = useMemo(
    () => list.find((model) => model.id === selectedId) ?? list.find((model) => model.isPrimary) ?? list[0] ?? null,
    [list, selectedId],
  )

  const allAwaiting = list.length > 0 && list.every((model) => model.metrics === null)

  if (models.error) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Model intelligence"
          title="AI Model Intelligence"
          subtitle="Compare trained machine-learning models used for lung cancer risk prediction."
        />
        <ErrorState error={models.error} onRetry={models.reload} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Model intelligence"
        title="AI Model Intelligence"
        subtitle="Compare trained machine-learning models used for lung cancer risk prediction."
        actions={
          <Button variant="secondary" onClick={models.reload} icon={ServerCog}>
            Refresh
          </Button>
        }
      />

      {/* ---------------------------------------------------- status banner */}
      <div className="flex flex-col gap-3 rounded-card border border-teal-100 bg-tint-teal px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <ServerCog className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden />
          <div>
            <p className="text-[0.82rem] font-semibold text-teal-700 dark:text-teal-300">
              Model evaluation served by the ML service
            </p>
            <p className="mt-0.5 text-2xs leading-relaxed text-teal-700 dark:text-teal-300">
              Metrics are computed on the held-out evaluation split of the project dataset.
            </p>
          </div>
        </div>
        <ProvenanceChip provenance="trained-model" />
      </div>

      {/* -------------------------------------------------- comparison chart */}
      <ChartFrame
        title="Model comparison"
        description="Select a metric, or compare all four side by side."
        provenance={'trained-model'}
        right={
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-2xs font-semibold uppercase tracking-wide text-ink-muted">
              Metric
            </span>
            <div className="flex flex-wrap gap-1">
              {(['all', ...METRIC_SERIES.map((item) => item.key)] as const).map((option) => {
                const label =
                  option === 'all'
                    ? 'All'
                    : METRIC_SERIES.find((item) => item.key === option)?.label
                const active = metric === option
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setMetric(option as MetricKey | 'all')}
                    aria-pressed={active}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-2xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-medical-500/15',
                      active
                        ? 'bg-medical-500 text-white shadow-[0_4px_12px_rgba(11,92,173,0.22)]'
                        : 'bg-surface text-ink-soft ring-1 ring-inset ring-hairline hover:bg-medical-50 hover:text-medical-600',
                    )}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        }
        descriptionText="Grouped bar chart comparing screening models. Select a single metric or all four."
      >
        {models.isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : list.length === 0 ? (
          <EmptyState
            icon={BrainCircuit}
            title="No models registered"
            description="The service did not return any model artifacts. Connect the FastAPI service to list the trained models."
            className="border-0 bg-transparent"
          />
        ) : (
          <>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} margin={{ top: 8, right: 8, bottom: 4, left: -12 }}>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="name" {...AXIS_PROPS} interval={0} angle={-18} textAnchor="end" height={54} />
                  <YAxis
                    {...AXIS_PROPS}
                    width={52}
                    domain={[0, 1]}
                    tickFormatter={(value: number) => `${(value * 100).toFixed(0)}%`}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(11,92,173,0.05)' }}
                    content={({ active, payload, label }) =>
                      active && payload?.length ? (
                        <ChartTooltip
                          label={String(label)}
                          rows={payload.map((entry) => ({
                            key: String(entry.dataKey),
                            label: METRIC_SERIES.find((item) => item.key === entry.dataKey)?.label ?? '',
                            value: formatMetric(entry.value as number),
                            color: entry.color as string,
                          }))}
                        />
                      ) : null
                    }
                  />
                  {metric === 'all' ? (
                    <Legend
                      wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
                      iconType="circle"
                      iconSize={8}
                    />
                  ) : null}
                  {METRIC_SERIES.filter((item) => metric === 'all' || item.key === metric).map(
                    (series) => (
                      <Bar
                        key={series.key}
                        dataKey={series.key}
                        fill={series.color}
                        radius={[5, 5, 0, 0]}
                        maxBarSize={metric === 'all' ? 18 : 44}
                        animationDuration={650}
                      />
                    ),
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
            {allAwaiting ? (
              <p className="mt-3 rounded-input border border-dashed border-medical-200 bg-surface-subtle p-3 text-center text-2xs text-ink-muted">
                No evaluation values are available yet. Connect trained artifacts to populate this
                comparison — nothing is estimated in the meantime.
              </p>
            ) : null}
          </>
        )}
      </ChartFrame>

      {/* ----------------------------------------------------- model cards */}
      <section className="space-y-4">
        <SectionTitle
          title="Model catalogue"
          description="Baseline, tree-based and ensemble models evaluated for the screening task."
          right={<Badge tone="outline">{list.length} models</Badge>}
        />
        {models.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <Skeleton key={index} className="h-56 w-full rounded-card" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((model, index) => (
              <button
                key={model.id}
                type="button"
                onClick={() => setSelectedId(model.id)}
                className="text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-medical-500/15 rounded-card"
                aria-label={`Show evaluation detail for ${model.name}`}
              >
                <ModelCard model={model} delay={index * 0.05} />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* -------------------------------------------------- confusion matrix */}
      {selected ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <ConfusionMatrixPanel
            matrix={selected.confusionMatrix}
            metrics={selected.metrics}
            provenance={selected.provenance}
            title={`Confusion Matrix — ${selected.name}`}
            loading={models.isLoading}
          />
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Model notes</CardTitle>
                <CardDescription>{selected.purpose}</CardDescription>
              </div>
              <ProvenanceChip provenance={selected.provenance} compact />
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-[0.82rem] leading-relaxed text-ink-soft">{selected.notes}</p>
              <dl className="grid grid-cols-2 gap-4 border-t border-hairline pt-4">
                <div>
                  <dt className="text-2xs uppercase tracking-wide text-ink-muted">Family</dt>
                  <dd className="text-[0.84rem] font-semibold text-ink">{selected.family}</dd>
                </div>
                <div>
                  <dt className="text-2xs uppercase tracking-wide text-ink-muted">Features</dt>
                  <dd className="text-[0.84rem] font-semibold text-ink">
                    {selected.featureCount ?? 'Not available'}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-2xs uppercase tracking-wide text-ink-muted">Training data</dt>
                  <dd className="text-[0.84rem] font-semibold text-ink">
                    {selected.trainedOn ?? 'Not available'}
                  </dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-2 border-t border-hairline pt-4">
                {list.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => setSelectedId(model.id)}
                    aria-pressed={model.id === selected.id}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-2xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-medical-500/15',
                      model.id === selected.id
                        ? 'bg-medical-500 text-white'
                        : 'bg-surface text-ink-soft ring-1 ring-inset ring-hairline hover:bg-medical-50',
                    )}
                  >
                    {model.name}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <ResearchDisclaimer />
      <InlineDisclaimer />
    </div>
  )
}
