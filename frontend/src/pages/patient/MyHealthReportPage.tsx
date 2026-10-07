import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, FileText, Printer } from 'lucide-react'
import { PatientPageHeader, SafetyNote } from '@/components/patient/Safety'
import { RiskBadgePill, riskToneFor } from '@/components/patient/HealthCard'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/StatusStates'
import { Logo } from '@/components/layout/Brand'
import { useApp } from '@/store/AppProvider'
import { useHealth } from '@/store/HealthProvider'
import { useToast } from '@/components/ui/Toast'
import { careAreas, describeRisk, extraSteps, healthySteps, personalFactors, SEVERITY_LABELS, SYMPTOM_LABELS } from '@/lib/guidance'
import type { SymptomKey } from '@/types/health'
import { formatDate, formatDateTime } from '@/lib/format'
import { APP } from '@/lib/clinical'

const REPORT_TITLE = 'My Health Report'

export function MyHealthReportPage() {
  const navigate = useNavigate()
  const { notify } = useToast()
  const { prediction, ctResult } = useApp()
  const { profile, onboarded, symptoms, stepsDoneToday, careItems, allQuestions } = useHealth()

  const risk = describeRisk(prediction)
  const factors = useMemo(() => personalFactors(prediction, profile), [prediction, profile])
  const areas = useMemo(() => careAreas(profile, prediction), [profile, prediction])
  const steps = useMemo(() => healthySteps(profile), [profile])
  const extras = useMemo(() => extraSteps(profile, prediction), [profile, prediction])

  const hasContent = onboarded || Boolean(prediction) || symptoms.length > 0 || ctResult !== null

  const upcoming = careItems
    .filter((item) => !item.completed)
    .sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'))
    .slice(0, 6)

  if (!hasContent) {
    return (
      <div className="space-y-6">
        <PatientPageHeader
          title={REPORT_TITLE}
          subtitle="A summary of your information that you can take to your appointment."
        />
        <EmptyState
          icon={FileText}
          title="Your report is not ready yet"
          description="Once you have completed your assessment, recorded how you feel, or analysed a CT image, your health report will be available here."
          action={
            <Button onClick={() => navigate('/my-risk')}>Start my assessment</Button>
          }
          className="border-0 bg-transparent bg-surface/60"
        />
        <SafetyNote />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PatientPageHeader
        title={REPORT_TITLE}
        subtitle="A summary of the information you have entered. You can print it or save it as a PDF to take to your appointment."
        actions={
          <>
            <Button variant="secondary" icon={Printer} onClick={() => window.print()}>
              Print
            </Button>
            <Button
              icon={Download}
              onClick={() => {
                window.print()
                notify({
                  tone: 'info',
                  title: 'Choose “Save as PDF” as the destination',
                  description: 'Your browser will open the print dialog.',
                })
              }}
            >
              Download My Health Report
            </Button>
          </>
        }
      />

      <article className="overflow-hidden rounded-panel border border-hairline bg-surface shadow-panel print-plain">
        {/* ---------------------------------------------------- letterhead */}
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-hairline bg-gradient-to-r from-sheen-from to-sheen-to px-6 py-6 print-plain">
          <div className="flex items-start gap-3">
            <Logo size="lg" />
            <div>
              <p className="font-display text-lg font-bold leading-tight text-ink">{APP.name}</p>
              <p className="text-xs font-medium text-medical-600">{REPORT_TITLE}</p>
              <p className="mt-1 max-w-sm text-2xs leading-relaxed text-ink-muted">
                Prepared from the information you entered in this application.
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xs text-ink-muted">Prepared</p>
            <p className="text-[0.82rem] font-semibold text-ink">
              {formatDateTime(new Date().toISOString())}
            </p>
            {profile.displayName ? (
              <p className="mt-1 text-2xs text-ink-muted">For: {profile.displayName}</p>
            ) : null}
          </div>
        </header>

        {/* ------------------------------------------------ my information */}
        <ReportSection title="My Information">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 sm:grid-cols-4">
            <Row label="Age" value={profile.age ? `${profile.age} years` : 'Not provided'} />
            <Row label="Gender" value={profile.gender || 'Not provided'} />
            <Row
              label="Smoking"
              value={SMOKING_WORD[profile.smokingStatus] ?? 'Not provided'}
            />
            <Row
              label="Pack-years"
              value={
                profile.packYears !== null
                  ? String(profile.packYears)
                  : profile.smokingStatus === 'never'
                    ? 'Not applicable'
                    : 'Not provided'
              }
            />
            <Row label="Secondhand smoke" value={profile.secondhandSmokeExposure || 'Not provided'} />
            <Row label="Radon exposure" value={profile.radonExposure || 'Not provided'} />
            <Row label="Asbestos exposure" value={profile.asbestosExposure || 'Not provided'} />
            <Row label="COPD history" value={profile.copdDiagnosis || 'Not provided'} />
            <Row label="Family history" value={profile.familyHistory || 'Not provided'} />
            <Row label="Alcohol use" value={profile.alcoholConsumption || 'Not provided'} />
          </dl>
        </ReportSection>

        {/* --------------------------------------------- screening result */}
        <ReportSection
          title="My AI Screening Result"
          subtitle="An AI-assisted screening estimate based only on the information above."
        >
          {prediction ? (
            <div className="space-y-4">
              <RiskBadgePill
                tone={riskToneFor(prediction.riskLevel)}
                label={risk.headline}
                size="lg"
              />
              <p className="text-[0.88rem] leading-relaxed text-ink-soft">{risk.meaning}</p>
              <p className="text-2xs text-ink-muted">
                Assessed on {formatDate(prediction.createdAt)}.
              </p>

              {factors.length > 0 ? (
                <div>
                  <p className="text-2xs font-semibold uppercase tracking-wide text-ink-muted">
                    Reported factors
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {factors.map((factor) => (
                      <li key={factor.key} className="text-xs text-ink-soft">
                        <span className="font-semibold text-ink">{factor.title}:</span>{' '}
                        {factor.message}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-ink-muted">No screening result has been generated yet.</p>
          )}
        </ReportSection>

        {/* ----------------------------------------------- symptom record */}
        <ReportSection title="Symptoms I Have Recorded" subtitle="Your own check-ins, newest first.">
          {symptoms.length === 0 ? (
            <p className="text-xs text-ink-muted">You have not recorded any symptom check-ins yet.</p>
          ) : (
            <ul className="space-y-3">
              {symptoms.slice(0, 5).map((entry) => (
                <li key={entry.id} className="rounded-input border border-hairline bg-surface-subtle p-3">
                  <p className="text-2xs font-semibold text-ink">{formatDateTime(entry.recordedAt)}</p>
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {(Object.keys(entry.values) as SymptomKey[])
                      .filter((key) => entry.values[key] !== 'none')
                      .map((key) => (
                        <li
                          key={key}
                          className="rounded-full border border-hairline bg-surface px-2 py-0.5 text-[0.68rem] font-medium text-ink-soft"
                        >
                          {SYMPTOM_LABELS[key].label}: {SEVERITY_LABELS[entry.values[key]]}
                        </li>
                      ))}
                    {(Object.keys(entry.values) as SymptomKey[]).every(
                      (key) => entry.values[key] === 'none',
                    ) ? (
                      <li className="text-[0.68rem] text-ink-muted">Nothing recorded — all “None”.</li>
                    ) : null}
                  </ul>
                  {entry.notes ? (
                    <p className="mt-1.5 text-2xs italic text-ink-soft">“{entry.notes}”</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </ReportSection>

        {/* ---------------------------------------------- CT image summary */}
        {ctResult ? (
          <ReportSection title="CT Image Analysis Summary">
            <div className="flex flex-wrap items-start gap-5">
              <img
                src={ctResult.images.overlay}
                alt="Your CT image with the analysed regions highlighted"
                className="h-32 w-32 rounded-card border border-hairline object-cover"
              />
              <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3">
                <Row label="Image file" value={ctResult.fileName} />
                <Row label="Image size" value={`${ctResult.width} × ${ctResult.height} px`} />
                <Row label="Analysed on" value={formatDate(ctResult.createdAt)} />
                <Row label="Areas highlighted" value={String(ctResult.regions.length)} />
              </dl>
            </div>
            <p className="mt-3 text-2xs leading-relaxed text-ink-muted">
              The highlighted area represents a region identified during image processing. This does
              not confirm cancer or another medical condition. Only a qualified healthcare
              professional can interpret imaging.
            </p>
          </ReportSection>
        ) : null}

        {/* ---------------------------------------------- healthy guidance */}
        <ReportSection
          title="My Personalised Healthy Steps"
          subtitle="Supportive suggestions based on your own answers. Not medical instructions."
        >
          <p className="text-2xs text-ink-muted">
            Progress today: {stepsDoneToday} of {steps.length} daily steps completed.
          </p>
          {areas.length > 0 ? (
            <ul className="mt-3 space-y-2.5">
              {areas.map((area, index) => (
                <li key={`${area.id}-${index}`}>
                  <p className="text-xs font-semibold text-ink">{area.title}</p>
                  <p className="text-2xs leading-relaxed text-ink-soft">{area.guidance}</p>
                </li>
              ))}
            </ul>
          ) : null}
          {extras.length > 0 ? (
            <div className="mt-4">
              <p className="text-2xs font-semibold uppercase tracking-wide text-ink-muted">
                Suggested this week
              </p>
              <ul className="mt-1.5 space-y-1.5">
                {extras.map((step) => (
                  <li key={step.id} className="text-2xs text-ink-soft">
                    <span className="font-semibold text-ink">{step.title}</span> — {step.detail}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </ReportSection>

        {/* ------------------------------------------------- my questions */}
        {allQuestions.length > 0 ? (
          <ReportSection title="Questions I Want to Ask" subtitle="Tick off anything you have already discussed.">
            <ul className="space-y-1.5">
              {allQuestions.slice(0, 8).map((question) => (
                <li key={question.id} className="flex gap-2 text-xs text-ink-soft">
                    <span aria-hidden>{question.discussed ? '☒' : '☐'}</span>
                  <span>
                    {question.text}
                    <span className="block text-[0.68rem] text-ink-muted">{question.reason}</span>
                  </span>
                </li>
              ))}
            </ul>
          </ReportSection>
        ) : null}

        {/* ------------------------------------------------------ my care */}
        {upcoming.length > 0 ? (
          <ReportSection title="My Upcoming Care Items">
            <ul className="space-y-1.5">
              {upcoming.map((item) => (
                <li key={item.id} className="text-xs text-ink-soft">
                  <span className="font-semibold text-ink">{item.title}</span>
                  {item.date ? ` — ${formatDate(`${item.date}T00:00:00`)}` : ''}
                  {item.time ? ` at ${item.time}` : ''}
                  {item.provider ? ` · ${item.provider}` : ''}
                </li>
              ))}
            </ul>
          </ReportSection>
        ) : null}

        {/* ---------------------------------------------------- disclaimer */}
        <footer className="border-t border-warning/25 bg-warning/[0.06] px-6 py-5">
          <p className="text-2xs font-semibold uppercase tracking-wide text-warning-ink">Important notes</p>
          <ul className="mt-2 space-y-1.5">
            {[
              'This application is an educational and research prototype and does not provide a medical diagnosis.',
              'AI results should not replace evaluation by a qualified healthcare professional.',
              'The screening result is an estimate based only on the information you entered. It is not an examination.',
              'Highlighted CT regions are the result of image processing only, and do not identify a condition.',
              'The healthy steps in this report are supportive suggestions, not medical treatment instructions.',
              'Discuss anything in this report with your healthcare professional.',
            ].map((note) => (
              <li key={note} className="flex gap-2 text-2xs leading-relaxed text-warning-ink">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-warning/60" aria-hidden />
                {note}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-2xs text-ink-muted">{APP.footer}</p>
        </footer>
      </article>

      <p className="text-center text-2xs text-ink-muted no-print">
        To save this report, choose “Download My Health Report” and select “Save as PDF” in the print
        dialog.
      </p>

      <SafetyNote />
    </div>
  )
}

const SMOKING_WORD: Record<string, string> = {
  never: 'I have never smoked',
  former: 'I used to smoke',
  current: 'I currently smoke',
  'prefer-not-to-say': 'Prefer not to say',
}

function ReportSection({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section className="print-break border-t border-hairline px-6 py-5">
      <h2 className="font-display text-[0.95rem] font-semibold text-ink">{title}</h2>
      {subtitle ? <p className="mt-0.5 text-2xs text-ink-muted">{subtitle}</p> : null}
      <div className="mt-3.5">{children}</div>
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-2xs font-medium uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="truncate text-[0.82rem] font-semibold capitalize text-ink">{value}</dd>
    </div>
  )
}
