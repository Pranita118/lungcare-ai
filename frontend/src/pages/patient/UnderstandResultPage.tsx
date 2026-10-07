import { useNavigate } from 'react-router-dom'
import { Brain, HelpCircle, ListChecks, ShieldQuestion, XCircle } from 'lucide-react'
import { PatientPageHeader, SafetyNote, ResultDisclaimer } from '@/components/patient/Safety'
import { RiskBadgePill, riskToneFor } from '@/components/patient/HealthCard'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/StatusStates'
import { useApp } from '@/store/AppProvider'
import { useHealth } from '@/store/HealthProvider'
import { describeRisk, personalFactors } from '@/lib/guidance'

export function UnderstandResultPage() {
  const navigate = useNavigate()
  const { prediction } = useApp()
  const { profile } = useHealth()

  if (!prediction) {
    return (
      <div className="space-y-6">
        <PatientPageHeader
          title="Understand My Result"
          subtitle="A plain-language explanation of what your AI screening result means."
        />
        <EmptyState
          icon={Brain}
          title="You do not have a result yet"
          description="Complete your health assessment and this page will explain what your result means, what it does not tell you, and why speaking with a healthcare professional matters."
          action={
            <Button onClick={() => navigate('/my-risk')}>Complete my assessment</Button>
          }
          className="border-0 bg-transparent bg-surface/60"
        />
        <SafetyNote />
      </div>
    )
  }

  const risk = describeRisk(prediction)
  const factors = personalFactors(prediction, profile)
  const raised = factors.filter((factor) => factor.direction === 'raised')
  const lowered = factors.filter((factor) => factor.direction === 'lowered')

  return (
    <div className="space-y-6">
      <PatientPageHeader
        title="Understand My Result"
        subtitle="What your result means, in everyday language."
        actions={
          <Button variant="secondary" onClick={() => navigate('/my-risk')}>
            Back to my result
          </Button>
        }
      />

      <div className="rounded-panel border border-hairline bg-surface p-5 shadow-panel sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <RiskBadgePill tone={riskToneFor(prediction.riskLevel)} label={risk.headline} size="lg" />
          <p className="text-2xs text-ink-muted">
            Based on the answers you gave on{' '}
            {new Date(prediction.createdAt).toLocaleDateString()}
          </p>
        </div>
        <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-soft text-pretty">{risk.meaning}</p>
      </div>

      <ExplainSection
        icon={ListChecks}
        title="What does my result mean?"
        paragraphs={[
          `The tool looked at the answers you gave and compared them with patterns it learned from data. Based on that, it placed you in the "${risk.headline.toLowerCase()}" range.`,
          'Think of it as a summary of the information you provided, not an assessment of your body. A person in a lower range can still have symptoms worth investigating, and a person in a higher range may be entirely well.',
        ]}
      />

      <ExplainSection
        icon={Brain}
        title="Why did the AI give this result?"
        paragraphs={[
          raised.length > 0
            ? 'Some of the answers you gave pushed your result towards a higher predicted risk:'
            : 'None of the answers you gave pushed your result towards a higher predicted risk on their own. The result mostly reflects the baseline the model starts from.',
        ]}
        list={raised.map((factor) => `${factor.title} — ${factor.message}`)}
        listTitle={raised.length > 0 ? undefined : undefined}
      />

      {lowered.length > 0 ? (
        <ExplainSection
          icon={ListChecks}
          title="Did anything lower my result?"
          list={lowered.map((factor) => `${factor.title} — ${factor.message}`)}
        />
      ) : null}

      <ExplainSection
        icon={XCircle}
        title="What does the AI NOT tell me?"
        paragraphs={[
          'It does not tell you whether you have lung cancer, or any other condition. It cannot.',
          'It does not examine you. It has not taken your blood pressure, listened to your chest, or seen a real scan of your lungs.',
          'It does not replace screening programmes, imaging, laboratory tests, or a consultation.',
          'It cannot see changes that have not developed yet, and it does not account for everything a clinician would consider.',
        ]}
      />

      <ExplainSection
        icon={ShieldQuestion}
        title="Why should I speak with a healthcare professional?"
        paragraphs={[
          'A clinician can do the things this tool cannot: take a full history, examine you, arrange any tests they consider appropriate, and put your result in the context of everything else they know about you.',
          'If a result concerns you, the right response is to book an appointment and bring the report with you. If you have symptoms that are new, worsening, or worrying you, contact a healthcare professional rather than relying on any screening tool.',
        ]}
      />

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => navigate('/questions-for-my-doctor')}>
          Questions for my doctor
        </Button>
        <Button variant="secondary" onClick={() => navigate('/my-health-report')}>
          Download my health report
        </Button>
        <Button variant="ghost" onClick={() => navigate('/lung-health-information')} icon={HelpCircle}>
          Learn more about lung health
        </Button>
      </div>

      <ResultDisclaimer />
      <SafetyNote />
    </div>
  )
}

function ExplainSection({
  icon: Icon,
  title,
  paragraphs,
  list,
  listTitle,
}: {
  icon: typeof ListChecks
  title: string
  paragraphs?: string[]
  list?: string[]
  listTitle?: string
}) {
  return (
    <section className="rounded-panel border border-hairline bg-surface p-5 shadow-card sm:p-6">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-medical-50 text-medical-500 ring-1 ring-inset ring-medical-100">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <h2 className="font-display text-[1.05rem] font-semibold text-ink">{title}</h2>
      </div>

      {paragraphs?.map((paragraph) => (
        <p key={paragraph.slice(0, 32)} className="mt-3.5 text-[0.88rem] leading-relaxed text-ink-soft text-pretty">
          {paragraph}
        </p>
      ))}

      {list && list.length > 0 ? (
        <>
          {listTitle ? <p className="mt-3.5 text-[0.88rem] text-ink-soft">{listTitle}</p> : null}
          <ul className="mt-3 space-y-2.5">
            {list.map((item) => (
              <li key={item} className="flex gap-2.5">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-medical-400" aria-hidden />
                <span className="text-[0.86rem] leading-relaxed text-ink-soft">{item}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  )
}
