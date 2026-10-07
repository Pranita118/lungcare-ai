import { motion } from 'framer-motion'
import {
  Activity,
  ArrowRight,
  FileText,
  Lightbulb,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { ProvenanceChip, RiskBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { KeyValue } from '@/components/medical/PageHeader'
import { ContributionBars, ContributionLegend } from '@/components/medical/ContributionBars'
import { ScoreReadout } from './RiskScale'
import { ResearchDisclaimer } from '@/components/medical/Disclaimer'
import { FEATURES } from '@/lib/clinical'
import { formatDecimal, formatInt, formatPercent } from '@/lib/format'
import type { PatientInput, PredictionResult } from '@/types'
import { engineLabel } from '@/services/labels'

/** Compact, clinically formatted patient summary used on result and report surfaces. */
export function PatientSummaryStrip({ patient }: { patient: PatientInput }) {
  const items: { label: string; value: string }[] = [
    { label: 'Patient ID', value: patient.patientId || 'Unassigned' },
    { label: 'Age', value: patient.age ? `${patient.age} yrs` : '—' },
    { label: 'Gender', value: patient.gender ? patient.gender : '—' },
    { label: 'Pack years', value: formatInt(patient.packYears) },
    {
      label: 'Family history',
      value: patient.familyHistory ? patient.familyHistory : '—',
    },
  ]
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-card border border-hairline bg-surface-subtle p-4 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <KeyView key={item.label} label={item.label} value={item.value} />
      ))}
    </dl>
  )
}

function KeyView({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-2xs font-medium uppercase tracking-wide text-ink-muted">
        {label}
      </dt>
      <dd className="truncate text-[0.82rem] font-semibold capitalize text-ink">{value}</dd>
    </div>
  )
}

/**
 * The primary result surface: risk category, score, confidence, model attribution
 * and the factors that drove the prediction.
 */
export function ScreeningResultPanel({
  prediction,
  onViewExplanation,
  onGenerateReport,
  onOpenCt,
}: {
  prediction: PredictionResult
  onViewExplanation?: () => void
  onGenerateReport?: () => void
  onOpenCt?: () => void
}) {
  const topFactors = prediction.contributions.slice(0, 3)

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-hidden rounded-panel border border-hairline bg-surface shadow-panel"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-gradient-to-r from-sheen-from to-sheen-to px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-surface text-medical-500 shadow-card ring-1 ring-inset ring-hairline">
              <Sparkles className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h2 className="font-display text-base font-semibold text-ink">AI Screening Result</h2>
              <p className="text-2xs text-ink-muted">
                Model prediction · not a medical diagnosis
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ProvenanceChip provenance={prediction.provenance} />
            <RiskBadge level={prediction.riskLevel} size="md" />
          </div>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
          <div className="space-y-4">
            <ScoreReadout score={prediction.riskScore} level={prediction.riskLevel} />
            <p className="text-[0.82rem] leading-relaxed text-ink-soft">{prediction.summary}</p>
          </div>

          <dl className="grid grid-cols-2 gap-4 self-start rounded-card border border-hairline bg-surface p-4">
            <KeyValue
              label="Risk category"
              value={<span className="capitalize">{prediction.riskLevel === 'high' ? 'Elevated' : prediction.riskLevel}</span>}
            />
            <KeyValue label="Model confidence" value={formatPercent(prediction.confidence)} />
            <KeyValue label="Decision threshold" value={formatPercent(prediction.threshold, 0)} />
            <KeyValue label="Complementary score" value={formatPercent(prediction.complementaryScore)} />
            <div className="col-span-2 border-t border-hairline pt-3">
              <KeyValue label="Model used" value={prediction.model.name} hint={prediction.model.family} />
            </div>
            <div className="col-span-2 border-t border-hairline pt-3">
              <KeyValue
                label="Prediction engine"
                value={<span className="text-[0.78rem] font-medium normal-case">{engineLabel(prediction.engine)}</span>}
              />
            </div>
          </dl>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-hairline bg-surface-subtle px-5 py-3.5">
          {onViewExplanation ? (
            <Button size="sm" icon={Activity} onClick={onViewExplanation}>
              View explanation
            </Button>
          ) : null}
          {onOpenCt ? (
            <Button size="sm" variant="secondary" icon={ArrowRight} onClick={onOpenCt}>
              Analyze CT image
            </Button>
          ) : null}
          {onGenerateReport ? (
            <Button size="sm" variant="secondary" icon={FileText} onClick={onGenerateReport}>
              Generate report
            </Button>
          ) : null}
          <span className="ml-auto text-2xs text-ink-muted">
            {prediction.id} ·{' '}
            {prediction.processingMs > 0 ? `${prediction.processingMs} ms` : 'processing time unavailable'}
          </span>
        </div>
      </motion.div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Key contributing factors</CardTitle>
              <CardDescription>
                Signed contribution of each input feature to the model output, in model units.
              </CardDescription>
            </div>
            <ProvenanceChip provenance={prediction.provenance} compact />
          </CardHeader>
          <CardContent>
            <ContributionLegend className="mb-4" />
            <ContributionBars contributions={prediction.contributions} limit={6} />
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-warning" aria-hidden />
                <CardTitle>Top signals for this case</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {topFactors.map((item, index) => (
                <div key={item.feature} className="flex items-start gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-medical-50 text-2xs font-bold text-medical-600">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[0.82rem] font-semibold text-ink">
                      {FEATURES[item.feature].label}{' '}
                      <span className="font-normal text-ink-muted">({item.displayValue})</span>
                    </p>
                    <p className="text-2xs leading-relaxed text-ink-muted">
                      {item.direction === 'decreases-risk'
                        ? 'Reduced the predicted risk score.'
                        : 'Increased the predicted risk score.'}{' '}
                      Effect {item.contribution > 0 ? '+' : ''}
                      {formatDecimal(item.contribution)}.
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-teal-600" aria-hidden />
                <CardTitle>Suggested follow-up</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {prediction.nextSteps.map((step) => (
                  <li key={step} className="flex gap-2 text-[0.8rem] leading-relaxed text-ink-soft">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" aria-hidden />
                    {step}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <ResearchDisclaimer />
    </div>
  )
}
