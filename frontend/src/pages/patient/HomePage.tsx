import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CalendarHeart,
  ClipboardList,
  HeartPulse,
  ScanLine,
  Stethoscope,
  Sparkles,
} from 'lucide-react'
import { SectionHeading, SafetyNote } from '@/components/patient/Safety'
import { HealthCard, RiskBadgePill, ProgressRing, riskToneFor } from '@/components/patient/HealthCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/StatusStates'
import { useApp } from '@/store/AppProvider'
import { useHealth } from '@/store/HealthProvider'
import { describeRisk } from '@/lib/guidance'
import { healthySteps } from '@/lib/guidance'
import { formatClock, formatDate, formatDateTime } from '@/lib/format'

const ENTRY_CARDS = [
  {
    to: '/my-risk',
    icon: Stethoscope,
    title: 'Understand My Risk',
    copy: 'Complete a short health assessment and see your AI-assisted screening result.',
  },
  {
    to: '/ct-scan',
    icon: ScanLine,
    title: 'Analyze My CT Scan',
    copy: 'Upload a scan for AI-assisted image analysis and region highlighting.',
  },
  {
    to: '/my-healthy-steps',
    icon: ClipboardList,
    title: 'Improve My Lung Health',
    copy: 'Get personalised healthy-lifestyle guidance and a simple daily checklist.',
  },
]

const NEXT_STEPS = [
  {
    title: 'Review your AI assessment',
    copy: 'Read what your result means in plain language.',
    to: '/my-risk',
  },
  {
    title: "Complete today's healthy steps",
    copy: 'Small, repeatable habits that support your lung health.',
    to: '/my-healthy-steps',
  },
  {
    title: 'Track how you have been feeling',
    copy: 'A quick daily check-in helps you notice changes over time.',
    to: '/my-lung-health',
  },
]

export function HomePage() {
  const navigate = useNavigate()
  const { isOnline, prediction, stats } = useApp()
  const { profile, onboarded, latestSymptoms, stepsDoneToday, nextAppointment, symptoms } = useHealth()

  const name = profile.displayName.trim()
  const steps = healthySteps(profile)
  const risk = describeRisk(prediction)
  const tone = riskToneFor(prediction?.riskLevel ?? null)

  const symptomStatus = latestSymptoms
    ? `Updated ${formatDate(latestSymptoms.recordedAt)}`
    : 'Not started'

  return (
    <div className="space-y-8">
      {/* ----------------------------------------------------------- hero */}
      <section className="relative overflow-hidden rounded-panel border border-hairline bg-surface p-6 shadow-panel sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-hero-sheen" aria-hidden />
        <div className="pointer-events-none absolute inset-0 bg-grid-faint opacity-40" aria-hidden />
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full opacity-50 blur-3xl"
          style={{ background: 'radial-gradient(closest-side, rgba(15,139,141,0.18), transparent)' }}
          aria-hidden
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-medical-500">
              {formatClock(new Date())}
              {name ? `, ${name}` : ''}
            </p>
            <h1 className="mt-2 font-display text-[1.7rem] font-bold leading-tight text-ink sm:text-[2rem]">
              Understand Your Lung Health
            </h1>
            <p className="mt-2.5 text-[0.95rem] leading-relaxed text-ink-soft text-pretty">
              Get an AI-assisted health assessment, understand potential risk factors, and keep
              track of your lung health.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Button size="lg" icon={Sparkles} onClick={() => navigate('/my-risk')}>
                {onboarded ? 'Review My Assessment' : 'Start My Assessment'}
              </Button>
              <Button
                size="lg"
                variant="secondary"
                icon={HeartPulse}
                onClick={() => navigate('/lung-health-information')}
              >
                Learn About Lung Health
              </Button>
            </div>
            <p className="mt-4 text-2xs leading-relaxed text-ink-muted">
              {isOnline
                ? 'Screening results are produced by the trained screening service.'
                : 'The service is reconnecting. Screens will update automatically.'}
            </p>
          </div>

          <div className="shrink-0 rounded-card border border-hairline bg-surface/90 p-5 lg:w-80">
            <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
              My screening result
            </p>
            {prediction ? (
              <div className="mt-3 space-y-3">
                <RiskBadgePill tone={tone} label={risk.headline} size="lg" />
                <p className="text-xs leading-relaxed text-ink-soft">
                  {risk.meaning}
                </p>
                <Link
                  to="/my-risk"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-medical-600 hover:underline"
                >
                  See my full result <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <Badge tone="neutral">No assessment yet</Badge>
                <p className="text-xs leading-relaxed text-ink-soft">
                  Complete your health assessment to receive an AI-assisted screening result you
                  can discuss with your healthcare professional.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- entry cards */}
      <section className="space-y-4">
        <SectionHeading title="Where would you like to start " />
        <div className="grid gap-4 sm:grid-cols-3">
          {ENTRY_CARDS.map((card, index) => (
            <motion.div
              key={card.to}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.34, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link
                to={card.to}
                className="group flex h-full flex-col rounded-card border border-hairline bg-surface p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-medical-200 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-medical-500/15"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-medical-50 text-medical-500 ring-1 ring-inset ring-medical-100 transition-colors group-hover:bg-tint-medical">
                  <card.icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="mt-3.5 text-[0.95rem] font-semibold text-ink">{card.title}</span>
                <span className="mt-1.5 text-2xs leading-relaxed text-ink-muted">{card.copy}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* --------------------------------------------- health at a glance */}
      <section className="space-y-4">
        <SectionHeading
          title="Your Health at a Glance"
          description="A quick view of where things stand today."
        />
        {onboarded || prediction ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <HealthCard
              icon={Stethoscope}
              title="Risk Assessment"
              value={prediction ? 'Completed' : 'Not started'}
              caption={
                prediction
                  ? `Last completed ${formatDateTime(prediction.createdAt)}`
                  : 'Complete your assessment to see your result.'
              }
              to="/my-risk"
              delay={0}
            />
            <HealthCard
              icon={HeartPulse}
              title="Symptom Check"
              value={latestSymptoms ? 'Up to date' : 'Not started'}
              caption={symptomStatus}
              to="/my-lung-health"
              tone="teal"
              delay={0.05}
            />
            <HealthCard
              icon={CalendarHeart}
              title="Next Appointment"
              value={nextAppointment ? formatDate(nextAppointment.date ?? '') : 'None scheduled'}
              caption={nextAppointment ? nextAppointment.title : 'Add one in My Care to keep it here.'}
              to="/my-care"
              delay={0.1}
            />
            <HealthCard
              icon={ClipboardList}
              title="Healthy Steps"
              value={`${stepsDoneToday} of ${steps.length} completed`}
              caption={
                stepsDoneToday === steps.length
                  ? "All done for today. Well done."
                  : "Today's checklist progress."
              }
              to="/my-healthy-steps"
              tone="teal"
              delay={0.15}
              action={
                <ProgressRing done={stepsDoneToday} total={steps.length} size={62} label="steps" />
              }
            />
          </div>
        ) : (
          <EmptyState
            icon={Stethoscope}
            title="Complete your assessment to personalise your health dashboard"
            description="Once you have answered a few health questions, this page will show your screening status, symptom check-in, upcoming appointments and daily healthy steps."
            action={
              <Button icon={Sparkles} onClick={() => navigate('/my-risk')}>
                Start My Assessment
              </Button>
            }
            className="border-0 bg-transparent bg-surface/60"
          />
        )}
      </section>

      {/* --------------------------------------------------- your next steps */}
      {onboarded || prediction ? (
        <section className="space-y-4">
          <SectionHeading title="Your Next Steps" description="What is worth doing next." />
          <ol className="grid gap-3 sm:grid-cols-3">
            {NEXT_STEPS.map((step, index) => (
              <li key={step.title}>
                <Link
                  to={step.to}
                  className="group flex h-full flex-col rounded-card border border-hairline bg-surface p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-medical-500/15"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-teal-50 text-2xs font-bold text-teal-600 ring-1 ring-inset ring-teal-100">
                    {index + 1}
                  </span>
                  <span className="mt-2.5 text-[0.87rem] font-semibold text-ink">{step.title}</span>
                  <span className="mt-1 text-2xs leading-relaxed text-ink-muted">{step.copy}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {/* ------------------------------------------------- quick actions */}
      <section className="space-y-4">
        <SectionHeading title="Quick Actions" />
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { to: '/my-risk', label: 'Assess My Risk', icon: Stethoscope },
            { to: '/my-lung-health', label: 'Track Symptoms', icon: HeartPulse },
            { to: '/ct-scan', label: 'Analyze CT', icon: ScanLine },
            { to: '/my-health-report', label: 'My Health Report', icon: ClipboardList },
          ].map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="flex items-center gap-2.5 rounded-button border border-hairline bg-surface px-4 py-3 text-[0.84rem] font-semibold text-ink shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-medical-200 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-medical-500/15"
            >
              <action.icon className="h-[18px] w-[18px] text-medical-500" aria-hidden />
              {action.label}
            </Link>
          ))}
        </div>
      </section>

      {/* -------------------------------------------- recent activity */}
      {symptoms.length > 0 || stats.assessments > 0 ? (
        <section className="space-y-4">
          <SectionHeading title="Recent Activity" description="Only what you have recorded." />
          <div className="grid gap-3 sm:grid-cols-2">
            {latestSymptoms ? (
              <Link
                to="/my-lung-health"
                className="rounded-card border border-hairline bg-surface p-4 shadow-card transition-colors hover:border-medical-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-medical-500/15"
              >
                <p className="text-2xs font-semibold uppercase tracking-wide text-ink-muted">
                  Latest symptom check
                </p>
                <p className="mt-1.5 text-[0.85rem] font-semibold text-ink">
                  {formatDateTime(latestSymptoms.recordedAt)}
                </p>
                <p className="mt-1 text-2xs text-ink-muted">
                  {Object.values(latestSymptoms.values).filter((value) => value !== 'none').length}{' '}
                  symptom(s) recorded
                </p>
              </Link>
            ) : null}
            {prediction ? (
              <Link
                to="/my-risk"
                className="rounded-card border border-hairline bg-surface p-4 shadow-card transition-colors hover:border-medical-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-medical-500/15"
              >
                <p className="text-2xs font-semibold uppercase tracking-wide text-ink-muted">
                  Latest assessment
                </p>
                <p className="mt-1.5 text-[0.85rem] font-semibold text-ink">
                  {formatDateTime(prediction.createdAt)}
                </p>
                <p className="mt-1 text-2xs text-ink-muted">{risk.headline}</p>
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

      <SafetyNote />
    </div>
  )
}
