import { useNavigate } from 'react-router-dom'
import { ArrowRight, CalendarHeart, ClipboardList, FileText, HelpCircle, ScanLine, Stethoscope } from 'lucide-react'
import { PatientPageHeader, ResultDisclaimer, SafetyNote } from '@/components/patient/Safety'
import { RiskCard, riskToneFor } from '@/components/patient/HealthCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/StatusStates'
import { useApp } from '@/store/AppProvider'
import { useHealth } from '@/store/HealthProvider'
import { describeRisk, personalFactors, NEXT_STEPS } from '@/lib/guidance'
import { formatDateTime } from '@/lib/format'

export function MyRiskPage() {
  const navigate = useNavigate()
  const { prediction } = useApp()
  const { profile, onboarded } = useHealth()

  if (!prediction) {
    return (
      <div className="space-y-6">
        <PatientPageHeader
          title="My Risk"
          subtitle="Your AI-assisted screening result, based on the health information you have entered."
        />
        <EmptyState
          icon={Stethoscope}
          title="You do not have a screening result yet"
          description="Complete a short health assessment and we will show you an AI-assisted screening result, explained in plain language, along with suggestions for healthy next steps."
          action={
            <Button icon={Stethoscope} onClick={() => navigate('/assessment')}>
              Start My Assessment
            </Button>
          }
          className="border-0 bg-transparent bg-surface/60"
        />
        <SafetyNote />
      </div>
    )
  }

  const risk = describeRisk(prediction)
  const factors = personalFactors(prediction, profile)

  return (
    <div className="space-y-6">
      <PatientPageHeader
        title="My Risk"
        subtitle="Your assessment has been completed. Here is the result and what contributed to it."
        actions={
          <Button variant="secondary" icon={Stethoscope} onClick={() => navigate('/assessment')}>
            Update my information
          </Button>
        }
      />

      <RiskCard
        tone={riskToneFor(prediction.riskLevel)}
        headline={risk.headline}
        meaning={risk.meaning}
        scoreNote={`Completed on ${formatDateTime(prediction.createdAt)}.`}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Why did the AI give this result?</CardTitle>
              <CardDescription>
                These are the factors from your own answers that contributed most.
              </CardDescription>
            </div>
            <Badge tone='success'>
              'Screening service'
            </Badge>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {factors.map((factor) => (
                <li
                  key={factor.key}
                  className="flex items-start gap-3 rounded-card border border-hairline bg-surface-subtle p-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.85rem] font-semibold text-ink">{factor.title}</p>
                    <p className="mt-0.5 text-2xs leading-relaxed text-ink-muted">{factor.message}</p>
                  </div>
                  <Badge
                    tone={
                      factor.direction === 'raised'
                        ? 'warning'
                        : factor.direction === 'lowered'
                          ? 'teal'
                          : 'neutral'
                    }
                  >
                    {factor.direction === 'raised'
                      ? 'Raised risk'
                      : factor.direction === 'lowered'
                        ? 'Lowered risk'
                        : 'Neutral'}
                  </Badge>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-2xs leading-relaxed text-ink-muted">
              These show how your answers influenced the result. They are not medical findings, and
              they do not tell you what is happening inside your body.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>What should I do next?</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5">
                {NEXT_STEPS.map((step) => (
                  <li key={step.title} className="flex gap-2.5">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" aria-hidden />
                    <span>
                      <span className="block text-[0.85rem] font-semibold text-ink">{step.title}</span>
                      <span className="block text-2xs leading-relaxed text-ink-muted">{step.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {onboarded ? null : (
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs leading-relaxed text-ink-soft">
                  Your screening result is based on the information entered on{' '}
                  {formatDateTime(prediction.createdAt)}. You can update your answers at any time.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-[1.05rem] font-semibold text-ink">Where to go next</h2>
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { to: '/understand-my-result', label: 'Understand my result', icon: HelpCircle },
            { to: '/my-healthy-steps', label: 'My Healthy Steps', icon: ClipboardList },
            { to: '/my-care', label: 'My Care', icon: CalendarHeart },
            { to: '/my-health-report', label: 'My Health Report', icon: FileText },
          ].map((item) => (
            <button
              key={item.to}
              type="button"
              onClick={() => navigate(item.to)}
              className="flex items-center gap-2.5 rounded-button border border-hairline bg-surface px-4 py-3 text-left text-[0.84rem] font-semibold text-ink shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-medical-200 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-medical-500/15"
            >
              <item.icon className="h-[18px] w-[18px] text-medical-500" aria-hidden />
              {item.label}
            </button>
          ))}
        </div>
        <Button variant="ghost" icon={ScanLine} iconRight={ArrowRight} onClick={() => navigate('/ct-scan')}>
          Analyse a CT image as well
        </Button>
      </section>

      <ResultDisclaimer />
      <SafetyNote />
    </div>
  )
}
