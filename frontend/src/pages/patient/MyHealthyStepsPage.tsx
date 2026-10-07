import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarHeart, Check, ClipboardList, Flame, Heart, Sparkles, Wind } from 'lucide-react'
import { PatientPageHeader, SectionHeading, SafetyNote, PatientDisclaimer } from '@/components/patient/Safety'
import { ProgressRing } from '@/components/patient/HealthCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import { useApp } from '@/store/AppProvider'
import { useHealth } from '@/store/HealthProvider'
import { careAreas, extraSteps, healthySteps } from '@/lib/guidance'
import type { StepCategory } from '@/types/health'

const CATEGORY_ICON: Record<StepCategory, typeof Flame> = {
  tobacco: Flame,
  nutrition: Heart,
  activity: ClipboardList,
  rest: Wind,
  wellbeing: Heart,
  appointments: CalendarHeart,
  hydration: Heart,
  routine: Sparkles,
}

const PRIORITY_TONE = {
  high: 'warning',
  medium: 'medical',
  routine: 'teal',
} as const

export function MyHealthyStepsPage() {
  const navigate = useNavigate()
  const { prediction } = useApp()
  const { profile, onboarded, isStepDone, toggleStep } = useHealth()

  const daily = useMemo(() => healthySteps(profile), [profile])
  const personalised = useMemo(() => extraSteps(profile, prediction), [profile, prediction])
  const areas = useMemo(() => careAreas(profile, prediction), [profile, prediction])
  const done = daily.filter((step) => isStepDone(step.id)).length

  return (
    <div className="space-y-6">
      <PatientPageHeader
        title="My Healthy Steps"
        subtitle="Small steps that can support your overall lung health. These are supportive suggestions, not medical instructions — check with your healthcare professional before making significant changes."
      />

      {!onboarded ? (
        <div className="flex flex-wrap items-center gap-3 rounded-card border border-dashed border-medical-200 bg-surface/70 px-4 py-3.5">
          <Sparkles className="h-4 w-4 shrink-0 text-medical-500" aria-hidden />
          <p className="flex-1 text-xs leading-relaxed text-ink-soft">
            Complete your health assessment and these steps will be tailored to your own answers.
          </p>
          <Button size="sm" onClick={() => navigate('/my-risk')}>
            Start my assessment
          </Button>
        </div>
      ) : null}

      {/* ------------------------------------------------ based on your info */}
      {areas.length > 0 ? (
        <section className="space-y-4">
          <SectionHeading
            title="Based on your information"
            description="Areas we would suggest raising with your healthcare professional."
            action={<Badge tone="outline">{areas.length} areas</Badge>}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {areas.map((area, index) => {
              const Icon = CATEGORY_ICON[area.id] ?? Sparkles
              return (
                <motion.article
                  key={`${area.id}-${index}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  className="rounded-card border border-hairline bg-surface p-5 shadow-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-medical-50 text-medical-500 ring-1 ring-inset ring-medical-100">
                      <Icon className="h-[18px] w-[18px]" aria-hidden />
                    </span>
                    <Badge tone={PRIORITY_TONE[area.priority]}>
                      {area.priority === 'high'
                        ? 'Worth raising'
                        : area.priority === 'medium'
                          ? 'Worth discussing'
                          : 'General wellbeing'}
                    </Badge>
                  </div>
                  <h3 className="mt-3.5 text-[0.95rem] font-semibold text-ink">{area.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{area.guidance}</p>
                  <p className="mt-2.5 text-2xs italic text-ink-muted">Why: {area.because}</p>
                </motion.article>
              )
            })}
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------- today's checklist */}
      <section className="space-y-4">
        <SectionHeading
          title="Today's Healthy Steps"
          description="Tick each step as you go. Your progress is saved on this device."
        />
        <div className="rounded-panel border border-hairline bg-surface p-5 shadow-panel sm:p-6">
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-8">
            <ProgressRing done={done} total={daily.length} label="of today" size={112} />
            <div className="flex-1 text-center sm:text-left">
              <p className="font-display text-[1.05rem] font-semibold text-ink">
                {done} of {daily.length} steps completed
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                {done === daily.length
                  ? "That's everything for today. Well done — these small habits add up."
                  : 'Pick one or two that feel realistic right now. You do not have to do all of them at once.'}
              </p>
              {done > 0 ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2"
                  onClick={() => daily.forEach((step) => isStepDone(step.id) && toggleStep(step.id))}
                >
                  Reset today's progress
                </Button>
              ) : null}
            </div>
          </div>

          <ul className="mt-6 space-y-2.5">
            {daily.map((step) => {
              const checked = isStepDone(step.id)
              return (
                <li key={step.id}>
                  <button
                    type="button"
                    onClick={() => toggleStep(step.id)}
                    aria-pressed={checked}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-card border px-4 py-3.5 text-left transition-all duration-150',
                      'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-medical-500/15',
                      checked
                        ? 'border-success/25 bg-success/[0.06]'
                        : 'border-hairline bg-surface hover:border-medical-200 hover:bg-surface-subtle',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors',
                        checked ? 'border-success bg-success text-white' : 'border-hairline-strong bg-surface',
                      )}
                      aria-hidden
                    >
                      {checked ? <Check className="h-3.5 w-3.5" /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          'block text-[0.87rem] font-semibold',
                          checked ? 'text-success-ink line-through decoration-[#1F6B55]/40' : 'text-ink',
                        )}
                      >
                        {step.title}
                      </span>
                      <span className="mt-0.5 block text-2xs leading-relaxed text-ink-muted">
                        {step.detail}
                      </span>
                    </span>
                    {step.personalised ? (
                      <Badge tone="teal" className="shrink-0">
                        For you
                      </Badge>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------- extra suggestions */}
      {personalised.length > 0 ? (
        <section className="space-y-4">
          <SectionHeading
            title="Suggested for you this week"
            description="Personalised because of what you told us in your assessment."
          />
          <ul className="grid gap-3 sm:grid-cols-2">
            {personalised.map((step, index) => {
              const Icon = CATEGORY_ICON[step.category] ?? Sparkles
              return (
                <motion.li
                  key={step.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: index * 0.04 }}
                  className="flex items-start gap-3 rounded-card border border-teal-100 bg-tint-teal p-4"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface text-teal-600 ring-1 ring-inset ring-teal-100">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[0.85rem] font-semibold text-ink">{step.title}</p>
                    <p className="mt-0.5 text-2xs leading-relaxed text-ink-soft">{step.detail}</p>
                  </div>
                </motion.li>
              )
            })}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => navigate('/questions-for-my-doctor')}>
          Questions to ask my doctor
        </Button>
        <Button variant="secondary" onClick={() => navigate('/my-health-report')}>
          My Health Report
        </Button>
      </div>

      <PatientDisclaimer />
      <SafetyNote />
    </div>
  )
}
