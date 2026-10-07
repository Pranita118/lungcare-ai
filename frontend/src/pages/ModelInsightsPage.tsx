import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Cpu,
  GitBranch,
  Info,
  Layers,
  ScrollText,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { PageHeader, SectionTitle, KeyValue } from '@/components/medical/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, ProvenanceChip } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Spinner'
import { EmptyState, ErrorState } from '@/components/ui/StatusStates'
import { ConfusionMatrixPanel } from '@/components/results/ConfusionMatrixPanel'
import { ResearchDisclaimer, InlineDisclaimer } from '@/components/medical/Disclaimer'
import { METRIC_SERIES } from '@/components/charts/chartTheme'
import { useApp } from '@/store/AppProvider'
import { useResource } from '@/store/useResource'
import { ml } from '@/services'
import { cn } from '@/lib/cn'
import { formatInt, formatMetric } from '@/lib/format'

const PIPELINE = [
  { step: '01', title: 'Data collection', copy: 'Tabular lung cancer risk dataset with a binary screening target.' },
  { step: '02', title: 'Cleaning', copy: 'Missing-value handling, duplicate removal and outlier review.' },
  { step: '03', title: 'Feature engineering', copy: 'Categorical encoding, exposure banding and numeric scaling.' },
  { step: '04', title: 'Model training', copy: 'Baseline, tree-based and ensemble classifiers on the training split.' },
  { step: '05', title: 'Evaluation', copy: 'Accuracy, precision, recall, F1 and confusion matrix on the held-out split.' },
  { step: '06', title: 'Prediction', copy: 'Served through POST /api/predict for the web application.' },
  { step: '07', title: 'Explainable AI', copy: 'SHAP attributions computed per prediction.' },
  { step: '08', title: 'Report', copy: 'Structured AI analysis report generated for review.' },
]

const LIMITATIONS = [
  'The screening target reflects recorded clinical labels, not confirmed imaging findings.',
  'Self-reported exposure history introduces recall bias that the model cannot correct.',
  'Class imbalance in small tabular datasets inflates accuracy and can hide weak recall.',
  'The model has not been externally validated on an independent population.',
  'Outputs are research signals and must never be presented as a diagnosis.',
]

export function ModelInsightsPage() {
  const navigate = useNavigate()
  const { mode } = useApp()
  const models = useResource(() => ml().getModels(), [mode])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const list = useMemo(() => models.data ?? [], [models.data])
  const selected = useMemo(
    () => list.find((model) => model.id === selectedId) ?? list.find((model) => model.isPrimary) ?? list[0] ?? null,
    [list, selectedId],
  )

  if (models.error) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Evaluation detail"
          title="Model Insights"
          subtitle="Evaluation detail, confusion matrices and the reasoning behind model selection."
        />
        <ErrorState error={models.error} onRetry={models.reload} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Evaluation detail"
        title="Model Insights"
        subtitle="Evaluation detail, confusion matrices and the reasoning behind model selection."
        actions={
          <Button variant="secondary" icon={BarChart3} onClick={() => navigate('/models')}>
            Comparison view
          </Button>
        }
      />

      {/* -------------------------------------------------- metrics matrix */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Evaluation matrix</CardTitle>
            <CardDescription>
              All models against all metrics, exactly as reported by the evaluation run.
            </CardDescription>
          </div>
          <ProvenanceChip provenance="trained-model" />
        </CardHeader>
        <CardContent>
          {models.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : list.length === 0 ? (
            <EmptyState
              icon={Cpu}
              title="No models registered"
              description="Connect the ML service to populate the evaluation matrix."
              className="border-0 bg-transparent"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead>
                  <tr className="border-b border-hairline text-2xs uppercase tracking-wide text-ink-muted">
                    <th className="py-2.5 pr-4 font-semibold">Model</th>
                    {METRIC_SERIES.map((metric) => (
                      <th key={metric.key} className="py-2.5 pr-4 text-right font-semibold">
                        {metric.label}
                      </th>
                    ))}
                    <th className="py-2.5 text-right font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {list.map((model) => {
                    const best = Math.max(
                      ...list.map((item) => item.metrics?.[model.id === item.id ? 'accuracy' : 'accuracy'] ?? 0),
                    )
                    return (
                      <tr
                        key={model.id}
                        onClick={() => setSelectedId(model.id)}
                        className={cn(
                          'cursor-pointer transition-colors hover:bg-surface-subtle',
                          selected?.id === model.id && 'bg-tint-medical',
                        )}
                      >
                        <td className="py-3 pr-4">
                          <span className="font-semibold text-ink">{model.name}</span>
                          {model.isPrimary ? (
                            <Badge tone="teal" className="ml-2">
                              Primary
                            </Badge>
                          ) : null}
                          <span className="block text-2xs text-ink-muted">{model.family}</span>
                        </td>
                        {METRIC_SERIES.map((metric) => {
                          const value = model.metrics?.[metric.key] ?? null
                          const isBest = value !== null && value === best && list.length > 1
                          return (
                            <td
                              key={metric.key}
                              className="py-3 pr-4 text-right tabular"
                            >
                              {value === null ? (
                                <span className="text-ink-muted">Not available</span>
                              ) : (
                                <span
                                  className={cn(
                                    'font-semibold',
                                    isBest ? 'text-teal-600' : 'text-ink',
                                  )}
                                >
                                  {formatMetric(value)}
                                </span>
                              )}
                            </td>
                          )
                        })}
                        <td className="py-3 text-right">
                          <ProvenanceChip provenance={model.provenance} compact />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------- selected detail */}
      {selected ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <ConfusionMatrixPanel
            matrix={selected.confusionMatrix}
            metrics={selected.metrics}
            provenance={selected.provenance}
            title={`Confusion Matrix — ${selected.name}`}
            loading={models.isLoading}
          />

          <div className="space-y-5">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>{selected.name}</CardTitle>
                  <CardDescription>{selected.purpose}</CardDescription>
                </div>
                <Badge tone="outline">{selected.family}</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-[0.82rem] leading-relaxed text-ink-soft">{selected.notes}</p>
                <dl className="grid grid-cols-2 gap-4 border-t border-hairline pt-4">
                  <KeyValue label="Features used" value={formatInt(selected.featureCount)} />
                  <KeyValue label="Status" value={selected.status === 'trained' ? 'Trained' : 'Awaiting'} />
                  <KeyValue
                    label="Training data"
                    value={<span className="text-[0.78rem] font-medium">{selected.trainedOn ?? 'Not available'}</span>}
                    className="col-span-2"
                  />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-medical-500" aria-hidden />
                  <CardTitle>Ensemble composition</CardTitle>
                </div>
                <CardDescription>How the combined models are built</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5">
                  {[
                    { label: 'Soft voting ensemble', copy: 'Averages calibrated probabilities from the logistic regression, decision tree and gradient boosting models.' },
                    { label: 'Stacking ensemble', copy: 'Trains a meta-learner on out-of-fold predictions from the base models to combine them.' },
                    { label: 'Primary screening model', copy: 'The Random Forest is served for individual predictions because it supports TreeSHAP explanations.' },
                  ].map((item) => (
                    <li key={item.label} className="flex gap-2.5">
                      <GitBranch className="mt-0.5 h-3.5 w-3.5 shrink-0 text-medical-400" aria-hidden />
                      <span>
                        <span className="block text-[0.8rem] font-semibold text-ink">{item.label}</span>
                        <span className="block text-2xs leading-relaxed text-ink-muted">{item.copy}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {/* ------------------------------------------------- training pipeline */}
      <section className="space-y-4">
        <SectionTitle
          title="Project pipeline"
          description="The end-to-end path from raw data to a reported screening result."
        />
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PIPELINE.map((item) => (
            <li
              key={item.step}
              className="rounded-card border border-hairline bg-surface p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              <span className="text-2xs font-bold text-medical-300 tabular">{item.step}</span>
              <p className="mt-1.5 text-[0.85rem] font-semibold text-ink">{item.title}</p>
              <p className="mt-1 text-2xs leading-relaxed text-ink-muted">{item.copy}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ----------------------------------------------------- limitations */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-teal-600" aria-hidden />
              <CardTitle>Responsible use</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {[
                'Screening support only — never a substitute for clinical assessment.',
                'Explainability output describes model behaviour, not disease causation.',
                'Predictions should be reviewed alongside imaging and clinical history.',
                'Performance figures are only meaningful on the split they were measured on.',
              ].map((item) => (
                <li key={item} className="flex gap-2 text-2xs leading-relaxed text-ink-soft">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-teal-400" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-warning" aria-hidden />
              <CardTitle>Known limitations</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {LIMITATIONS.map((item) => (
                <li key={item} className="flex gap-2 text-2xs leading-relaxed text-ink-soft">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-warning/60" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" icon={Sparkles} onClick={() => navigate('/assessment')}>
          Run a screening case
        </Button>
        <Badge tone="outline" icon={Info}>
          Metrics provenance: trained artifacts
        </Badge>
      </div>

      <ResearchDisclaimer />
      <InlineDisclaimer />
    </div>
  )
}
