import { ReportRecord, type GenerateReportPayload } from '@/types'
import { Logo } from '@/components/layout/Brand'
import { RiskBadge, ProvenanceChip } from '@/components/ui/Badge'
import { ContributionBars } from '@/components/medical/ContributionBars'
import { APP, FEATURES } from '@/lib/clinical'
import { formatBytes, formatDateTime, formatDecimal, formatInt, formatPercent } from '@/lib/format'
import { engineLabel } from '@/services/labels'

function Section({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section className="print-break border-t border-hairline px-6 py-5 first:border-t-0 sm:px-8">
      <h2 className="font-display text-[0.95rem] font-semibold text-ink">{title}</h2>
      {subtitle ? <p className="mt-0.5 text-2xs text-ink-muted">{subtitle}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-dashed border-hairline py-2 last:border-b-0">
      <dt className="text-2xs font-medium uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="text-right text-[0.82rem] font-semibold text-ink">{value}</dd>
    </div>
  )
}

const NOTES = [
  'This document is an AI-generated screening analysis produced by a research prototype.',
  'The screening score is a model output. It is not a diagnosis and does not confirm or exclude disease.',
  'Feature contributions describe how model inputs shifted the output. They do not establish medical causation.',
  'Region-of-interest extraction is image segmentation only and is not a validated tumour detection.',
  'All findings require review and confirmation by a qualified healthcare professional.',
]

/**
 * Printable report document. Styling is print-aware: navigation and actions are
 * hidden and the sheet fills the page when printed or saved as PDF.
 */
export function ReportDocumentView({
  record,
  payload,
}: {
  record: ReportRecord
  payload: GenerateReportPayload
}) {
  const { patient, prediction, explanation, ct } = payload
  const scorePercent = prediction ? formatPercent(prediction.riskScore) : 'Not available'

  return (
    <article className="overflow-hidden rounded-panel border border-hairline bg-surface shadow-panel print-plain">
      {/* ------------------------------------------------------ letterhead */}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-hairline bg-gradient-to-r from-sheen-from to-sheen-to px-6 py-6 sm:px-8 print-plain">
        <div className="flex items-start gap-3">
          <Logo size="lg" />
          <div>
            <p className="font-display text-lg font-bold leading-tight text-ink">{APP.name}</p>
            <p className="text-xs font-medium text-medical-600">
              AI Healthcare Analysis Report
            </p>
            <p className="mt-1 max-w-md text-2xs leading-relaxed text-ink-muted">
              {APP.subtitle}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-2xs font-semibold text-medical-600">{record.id}</p>
          <p className="mt-1 text-2xs text-ink-muted">{formatDateTime(record.createdAt)}</p>
          <p className="text-2xs text-ink-muted">{record.analysisType}</p>
          <div className="mt-2 flex justify-end">
            <ProvenanceChip provenance={record.provenance} compact />
          </div>
        </div>
      </header>

      {/* ------------------------------------------------ patient information */}
      <Section title="Patient Information" subtitle="Demographic and exposure inputs recorded for this case.">
        <div className="grid gap-x-8 gap-y-0 sm:grid-cols-2">
          <dl>
            <Row label="Patient ID" value={patient.patientId || 'Unassigned'} />
            <Row label="Age" value={patient.age ? `${patient.age} years` : 'Not available'} />
            <Row
              label="Gender"
              value={patient.gender ? patient.gender : 'Not available'}
            />
            <Row label="Pack years" value={formatInt(patient.packYears)} />
          </dl>
          <dl>
            <Row label="Radon exposure" value={patient.radonExposure || 'Not available'} />
            <Row label="Asbestos exposure" value={patient.asbestosExposure || 'Not available'} />
            <Row
              label="Secondhand smoke"
              value={patient.secondhandSmokeExposure || 'Not available'}
            />
            <Row label="COPD diagnosis" value={patient.copdDiagnosis || 'Not available'} />
            <Row label="Alcohol consumption" value={patient.alcoholConsumption || 'Not available'} />
            <Row label="Family history" value={patient.familyHistory || 'Not available'} />
          </dl>
        </div>
      </Section>

      {/* ------------------------------------------------- screening result */}
      <Section
        title="AI Screening Result"
        subtitle="Model prediction with the risk band and confidence reported by the classifier."
      >
        {prediction ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <RiskBadge level={prediction.riskLevel} size="lg" />
              <span className="text-2xs text-ink-muted">
                Reported {formatDateTime(prediction.createdAt)}
              </span>
            </div>
            <div className="grid gap-x-8 sm:grid-cols-2">
              <dl>
                <Row label="Risk score" value={scorePercent} />
                <Row label="Risk category" value={prediction.riskCategoryLabel} />
                <Row label="Model confidence" value={formatPercent(prediction.confidence)} />
              </dl>
              <dl>
                <Row label="Decision threshold" value={formatPercent(prediction.threshold, 0)} />
                <Row label="Complementary score" value={formatPercent(prediction.complementaryScore)} />
                <Row
                  label="Result identifier"
                  value={<span className="font-mono text-2xs">{prediction.id}</span>}
                />
              </dl>
            </div>
            <p className="rounded-input bg-surface-subtle p-3 text-2xs leading-relaxed text-ink-soft">
              {prediction.summary}
            </p>
          </div>
        ) : (
          <p className="text-2xs text-ink-muted">No screening prediction is included in this report.</p>
        )}
      </Section>

      {/* ------------------------------------------- contributing factors */}
      {prediction ? (
        <Section
          title="Key Contributing Factors"
          subtitle="Signed contribution of each input feature to the model output, in model units."
        >
          <ContributionBars contributions={prediction.contributions} limit={6} showSentences />
        </Section>
      ) : null}

      {/* ------------------------------------------------ explainable AI */}
      {explanation ? (
        <Section
          title="Explainable AI Summary"
          subtitle={`Attribution method: ${explanation.method}`}
        >
          <div className="space-y-3">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-input border border-hairline bg-surface-subtle p-3">
                <p className="text-2xs uppercase tracking-wide text-ink-muted">Base value E[f(x)]</p>
                <p className="text-[0.95rem] font-bold text-ink tabular">
                  {formatDecimal(explanation.baseValue)}
                </p>
              </div>
              <div className="rounded-input border border-hairline bg-surface-subtle p-3">
                <p className="text-2xs uppercase tracking-wide text-ink-muted">Model output f(x)</p>
                <p className="text-[0.95rem] font-bold text-ink tabular">
                  {formatDecimal(explanation.predictionValue)}
                </p>
              </div>
              <div className="rounded-input border border-hairline bg-surface-subtle p-3">
                <p className="text-2xs uppercase tracking-wide text-ink-muted">Leading global factor</p>
                <p className="text-[0.95rem] font-bold text-ink">
                  {explanation.global[0] ? FEATURES[explanation.global[0].feature].label : '—'}
                </p>
              </div>
            </div>
            <ul className="space-y-2">
              {explanation.local.slice(0, 5).map((point) => (
                <li key={point.feature} className="flex gap-2 text-2xs leading-relaxed text-ink-soft">
                  <span
                    className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                      point.direction === 'decreases-risk' ? 'bg-teal-500' : 'bg-danger/70'
                    }`}
                    aria-hidden
                  />
                  {point.sentence}
                </li>
              ))}
            </ul>
            <p className="text-2xs leading-relaxed text-ink-muted">
              Feature contribution indicates how individual input variables influenced this model
              prediction. It does not represent medical causation.
            </p>
          </div>
        </Section>
      ) : null}

      {/* ------------------------------------------------ CT image analysis */}
      {ct ? (
        <Section
          title="CT Image Analysis"
          subtitle="Image processing output. Segmentation only — not a validated tumour detection."
        >
          <div className="grid gap-x-8 sm:grid-cols-2">
            <dl>
              <Row label="File name" value={ct.fileName} />
              <Row label="File size" value={formatBytes(ct.fileSizeBytes)} />
              <Row label="Image dimensions" value={`${ct.width} × ${ct.height} px`} />
              <Row label="Processing method" value={ct.processingMethod} />
            </dl>
            <dl>
              <Row label="Segmentation method" value={ct.segmentationMethod} />
              <Row label="Otsu threshold" value={ct.otsuThreshold} />
              <Row label="Regions detected" value={formatInt(ct.regions.length)} />
              <Row label="Processing time" value={`${formatInt(ct.processingMs)} ms`} />
            </dl>
          </div>
          {ct.regions.length > 0 ? (
            <table className="mt-4 w-full text-left text-2xs">
              <thead>
                <tr className="border-b border-hairline text-ink-muted">
                  <th className="py-1.5 pr-4 font-semibold">Region</th>
                  <th className="py-1.5 pr-4 font-semibold">Bounding box</th>
                  <th className="py-1.5 pr-4 text-right font-semibold">Area</th>
                  <th className="py-1.5 text-right font-semibold">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline text-ink-soft">
                {ct.regions.slice(0, 6).map((region) => (
                  <tr key={region.id}>
                    <td className="py-1.5 pr-4 font-semibold text-ink">ROI {region.id}</td>
                    <td className="py-1.5 pr-4 tabular">
                      {region.x}, {region.y}, {region.width}, {region.height}
                    </td>
                    <td className="py-1.5 pr-4 text-right tabular">{formatInt(region.areaPx)} px</td>
                    <td className="py-1.5 text-right font-semibold tabular text-ink">
                      {formatDecimal(region.areaPct)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-3 text-2xs text-ink-muted">
              No regions exceeded the automatic threshold in this slice.
            </p>
          )}
        </Section>
      ) : null}

      {/* ------------------------------------------------ model information */}
      <Section
        title="Model Information"
        subtitle="Which engine produced the values in this report."
      >
        <dl className="grid gap-x-8 sm:grid-cols-2">
          <div>
            <Row
              label="Model used"
              value={prediction ? prediction.model.name : 'Image processing pipeline'}
            />
            <Row
              label="Model family"
              value={prediction ? prediction.model.family : 'Deterministic CV pipeline'}
            />
            <Row
              label="Data provenance"
              value={
                <ProvenanceChip provenance={prediction?.provenance ?? ct?.provenance ?? 'unavailable'} compact />
              }
            />
          </div>
          <div>
            <Row
              label="Prediction engine"
              value={
                <span className="text-[0.78rem] font-medium">
                  {engineLabel(prediction?.engine ?? ct?.engine ?? 'unknown')}
                </span>
              }
            />
            <Row
              label="Report status"
              value={record.status === 'generated' ? 'Generated' : 'Draft'}
            />
            <Row
              label="Includes CT analysis"
              value={record.includesCt ? 'Yes' : 'No'}
            />
          </div>
        </dl>
      </Section>

      {/* --------------------------------------------------- important notes */}
      <Section title="Important Notes">
        <ul className="space-y-2">
          {NOTES.map((note) => (
            <li key={note} className="flex gap-2 text-2xs leading-relaxed text-ink-soft">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-medical-300" aria-hidden />
              {note}
            </li>
          ))}
        </ul>
      </Section>

      <footer className="border-t border-warning/25 bg-warning/[0.06] px-6 py-4 sm:px-8">
        <p className="text-2xs font-semibold uppercase tracking-wide text-warning-ink">Disclaimer</p>
        <p className="mt-1.5 text-2xs leading-relaxed text-warning-ink">{APP.disclaimerStrong}</p>
        <p className="mt-2 text-2xs text-ink-muted">{APP.footer}</p>
      </footer>
    </article>
  )
}
