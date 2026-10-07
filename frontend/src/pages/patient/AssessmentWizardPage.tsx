import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Flame,
  HeartPulse,
  Loader2,
  Sparkles,
  Users,
  Wind,
} from 'lucide-react'
import { PatientPageHeader, ResultDisclaimer, SafetyNote } from '@/components/patient/Safety'
import { RiskCard, riskToneFor } from '@/components/patient/HealthCard'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { NumberInput, Segmented, TextInput, Toggle } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { ErrorState } from '@/components/ui/StatusStates'
import { useApp } from '@/store/AppProvider'
import { useHealth } from '@/store/HealthProvider'
import { useToast } from '@/components/ui/Toast'
import { toScreeningInput, type HealthProfile } from '@/types/health'
import { describeRisk, personalFactors, NEXT_STEPS } from '@/lib/guidance'
import { FEATURES } from '@/lib/clinical'
import { createPatientId } from '@/lib/id'
import { cn } from '@/lib/cn'

const STEPS = [
  { key: 'basic', label: 'Basic Information' },
  { key: 'smoking', label: 'Smoking & Exposure' },
  { key: 'history', label: 'Health History' },
  { key: 'review', label: 'Review Information' },
  { key: 'result', label: 'Your Result' },
] as const

type StepKey = (typeof STEPS)[number]['key']
type Errors = Partial<Record<string, string>>

/**
 * Accepted pack-years range. Sourced from the shared feature definition so the
 * wizard, the research form and the ML service all agree on the same bounds.
 */
const MIN_PACK_YEARS = FEATURES.pack_years.range!.min
const MAX_PACK_YEARS = FEATURES.pack_years.range!.max

const EXPOSURE_OPTIONS = [
  { value: 'none' as const, label: 'None' },
  { value: 'low' as const, label: 'A little' },
  { value: 'moderate' as const, label: 'Some' },
  { value: 'high' as const, label: 'A lot' },
]

export function AssessmentWizardPage() {
  const navigate = useNavigate()
  const { notify } = useToast()
  const { prediction, isAnalyzing, analysisStage, analysisError, runAnalysis, clearAnalysisError } =
    useApp()
  const { profile, onboarded, saveProfile, markOnboarded } = useHealth()

  const [step, setStep] = useState<StepKey>(onboarded ? 'result' : 'basic')
  const [draft, setDraft] = useState<HealthProfile>(profile)
  const [errors, setErrors] = useState<Errors>({})
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    setDraft(profile)
  }, [profile])

  useEffect(() => {
    if (prediction) setStep('result')
  }, [prediction])

  const update = useCallback(<K extends keyof HealthProfile>(key: K, value: HealthProfile[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!current[key as string]) return current
      const next = { ...current }
      delete next[key as string]
      return next
    })
  }, [])

  /* ------------------------------------------------------------ validation */

  const validateStep = useCallback(
    (target: StepKey): Errors => {
      const found: Errors = {}
      if (target === 'basic') {
        if (draft.age === null) found.age = 'Please enter your age.'
        else if (draft.age < 18 || draft.age > 100)
          found.age = 'Please enter an age between 18 and 100.'
        if (!draft.gender) found.gender = 'Please select an option.'
      }
      if (target === 'smoking') {
        if (draft.smokingStatus === 'current' || draft.smokingStatus === 'former') {
          if (draft.packYears === null) found.packYears = 'Please enter your smoking exposure.'
          else if (draft.packYears < MIN_PACK_YEARS || draft.packYears > MAX_PACK_YEARS)
            found.packYears = `Please enter a value between ${MIN_PACK_YEARS} and ${MAX_PACK_YEARS}.`
        } else if (draft.packYears !== null) {
          // Not required for a never-smoker, but still has to be a legal value.
          if (draft.packYears < MIN_PACK_YEARS || draft.packYears > MAX_PACK_YEARS)
            found.packYears = `Please enter a value between ${MIN_PACK_YEARS} and ${MAX_PACK_YEARS}.`
        }
        if (!draft.secondhandSmokeExposure)
          found.secondhandSmokeExposure = 'Please choose an option.'
        if (!draft.radonExposure) found.radonExposure = 'Please choose an option.'
        if (!draft.asbestosExposure) found.asbestosExposure = 'Please choose an option.'
      }
      if (target === 'history') {
        if (!draft.copdDiagnosis) found.copdDiagnosis = 'Please choose an option.'
        if (!draft.familyHistory) found.familyHistory = 'Please choose an option.'
        if (!draft.alcoholConsumption) found.alcoholConsumption = 'Please choose an option.'
      }
      return found
    },
    [draft],
  )

  const goNext = () => {
    const found = validateStep(step)
    if (Object.keys(found).length > 0) {
      setErrors(found)
      return
    }
    setErrors({})
    const index = STEPS.findIndex((entry) => entry.key === step)
    const next = STEPS[index + 1]
    if (next) setStep(next.key)
  }

  const goBack = () => {
    setErrors({})
    const index = STEPS.findIndex((entry) => entry.key === step)
    const previous = STEPS[index - 1]
    if (previous) setStep(previous.key)
  }

  /* --------------------------------------------------------------- submit */

  const submit = async () => {
    const basic = validateStep('basic')
    const smoking = validateStep('smoking')
    const history = validateStep('history')
    const all = { ...basic, ...smoking, ...history }
    if (Object.keys(all).length > 0) {
      setErrors(all)
      notify({
        tone: 'warning',
        title: 'A few answers are still needed',
        description: 'Please complete the highlighted questions before continuing.',
      })
      return
    }

    setIsRunning(true)
    clearAnalysisError()
    saveProfile(draft)
    markOnboarded()

    const patientId = createPatientId()
    const outcome = await runAnalysis(toScreeningInput(draft, patientId))
    setIsRunning(false)

    if (outcome) {
      setStep('result')
      notify({
        tone: 'success',
        title: 'Assessment completed',
        description: 'Your AI-assisted screening result is ready to review.',
      })
    }
  }

  const stepIndex = STEPS.findIndex((entry) => entry.key === step)
  const isBusy = isAnalyzing || isRunning

  const factors = useMemo(() => personalFactors(prediction, profile), [prediction, profile])
  const risk = describeRisk(prediction)

  /* --------------------------------------------------------------- render */

  return (
    <div className="space-y-6">
      <PatientPageHeader
        title="My Health Assessment"
        subtitle="Answer a few questions so we can give you an AI-assisted screening result. It takes about two minutes, and you can change anything later."
        actions={
          step !== 'basic' ? (
            <Button variant="secondary" icon={ArrowLeft} onClick={goBack} disabled={isBusy}>
              Back
            </Button>
          ) : null
        }
      />

      {/* -------------------------------------------------------- progress */}
      <ol className="flex items-center gap-1.5 sm:gap-2" aria-label="Assessment progress">
        {STEPS.map((entry, index) => {
          const state =
            index < stepIndex ? 'done' : index === stepIndex ? 'current' : 'upcoming'
          return (
            <li key={entry.key} className="flex flex-1 items-center gap-1.5 sm:gap-2">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <motion.div
                  initial={false}
                  animate={{ scaleX: state === 'upcoming' ? 0.99 : 1 }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    'h-1.5 w-full rounded-full',
                    state === 'done'
                      ? 'bg-teal-500'
                      : state === 'current'
                        ? 'bg-medical-500'
                        : 'bg-track',
                  )}
                />
                <span
                  className={cn(
                    'truncate text-[0.65rem] font-semibold sm:text-2xs',
                    state === 'current'
                      ? 'text-medical-600'
                      : state === 'done'
                        ? 'text-teal-600'
                        : 'text-ink-muted',
                  )}
                >
                  <span className="hidden sm:inline">{index + 1}. </span>
                  {entry.label}
                </span>
              </div>
            </li>
          )
        })}
      </ol>

      {analysisError ? <ErrorState error={analysisError} onRetry={submit} /> : null}

      {/* ------------------------------------------------------ step: basic */}
      {step === 'basic' ? (
        <StepShell
          title="Let's start with the basics"
          copy="This information helps put your result into context."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="What should we call you?"
              htmlFor="displayName"
              helper="Optional. Used only to greet you in this app."
            >
              <TextInput
                id="displayName"
                value={draft.displayName}
                placeholder="e.g. Alex"
                onChange={(event) => update('displayName', event.target.value)}
              />
            </Field>
            <Field label="How old are you?" htmlFor="age" required error={errors.age ?? null}>
              <NumberInput
                id="age"
                value={draft.age}
                min={18}
                max={100}
                step={1}
                unit="years"
                placeholder="e.g. 58"
                invalid={Boolean(errors.age)}
                onValueChange={(value) => update('age', value)}
              />
            </Field>
          </div>

          <Field
            label="What is your gender?"
            required
            error={errors.gender ?? null}
            helper="This is one of the inputs the screening model considers."
            className="mt-5"
          >
            <Segmented
              name="gender"
              columns={3}
              value={draft.gender}
              options={[
                { value: 'female', label: 'Female' },
                { value: 'male', label: 'Male' },
                { value: 'other', label: 'Prefer to self-describe' },
              ]}
              onChange={(value) => update('gender', value)}
              invalid={Boolean(errors.gender)}
            />
          </Field>
        </StepShell>
      ) : null}

      {/* ---------------------------------------------------- step: smoking */}
      {step === 'smoking' ? (
        <StepShell
          title="Smoking and exposure"
          copy="These questions are about things you may have been exposed to over your life."
        >
          <Field
            label="Which best describes you?"
            required
            className="mb-5"
            helper="There is no wrong answer here — it simply helps put your result in context."
          >
            <Segmented
              name="smokingStatus"
              columns={2}
              value={draft.smokingStatus}
              options={[
                { value: 'never', label: 'I have never smoked' },
                { value: 'former', label: 'I used to smoke' },
                { value: 'current', label: 'I currently smoke' },
                { value: 'prefer-not-to-say', label: 'Prefer not to say' },
              ]}
              onChange={(value) => update('smokingStatus', value)}
            />
          </Field>

          {draft.smokingStatus === 'current' || draft.smokingStatus === 'former' ? (
            <div className="mb-5 rounded-card border border-teal-100 bg-tint-teal p-4">
              <Field
                label="How much have you smoked, in total?"
                htmlFor="packYears"
                required
                error={errors.packYears ?? null}
                helper="Pack-years are used by healthcare professionals to describe smoking exposure. One pack-year is about one pack of 20 cigarettes a day for a year. An estimate is fine."
              >
                <NumberInput
                  id="packYears"
                  value={draft.packYears}
                  min={MIN_PACK_YEARS}
                  max={MAX_PACK_YEARS}
                  step={1}
                  unit="pack-years"
                  placeholder="e.g. 20"
                  invalid={Boolean(errors.packYears)}
                  onValueChange={(value) => update('packYears', value)}
                />
              </Field>
            </div>
          ) : null}

          <div className="space-y-5">
            <Field
              label="Have you been exposed to tobacco smoke from others?"
              required
              error={errors.secondhandSmokeExposure ?? null}
              helper="For example at home, in a vehicle, or at work."
            >
              <Segmented
                name="secondhand"
                value={draft.secondhandSmokeExposure}
                options={EXPOSURE_OPTIONS}
                onChange={(value) => update('secondhandSmokeExposure', value)}
                invalid={Boolean(errors.secondhandSmokeExposure)}
              />
            </Field>

            <Field
              label="Are you exposed to radon at home?"
              required
              error={errors.radonExposure ?? null}
              helper="Radon is a natural gas that can build up in buildings, particularly basements and ground floors."
            >
              <Segmented
                name="radon"
                value={draft.radonExposure}
                options={EXPOSURE_OPTIONS}
                onChange={(value) => update('radonExposure', value)}
                invalid={Boolean(errors.radonExposure)}
              />
            </Field>

            <Field
              label="Have you been exposed to asbestos?"
              required
              error={errors.asbestosExposure ?? null}
              helper="For example in certain jobs, construction work, or hobbies."
            >
              <Segmented
                name="asbestos"
                value={draft.asbestosExposure}
                options={EXPOSURE_OPTIONS}
                onChange={(value) => update('asbestosExposure', value)}
                invalid={Boolean(errors.asbestosExposure)}
              />
            </Field>
          </div>
        </StepShell>
      ) : null}

      {/* ---------------------------------------------------- step: history */}
      {step === 'history' ? (
        <StepShell
          title="Health history"
          copy="A little context about your health helps make your result more useful."
        >
          <div className="space-y-4">
            <Toggle
              id="copd"
              checked={draft.copdDiagnosis === 'yes'}
              onChange={(value) => update('copdDiagnosis', value ? 'yes' : 'no')}
              label="Have you been diagnosed with COPD?"
              description="COPD is a long-term breathing condition. Leave off if you are unsure."
            />
            {errors.copdDiagnosis ? (
              <p role="alert" className="text-2xs font-medium text-danger-ink">
                {errors.copdDiagnosis}
              </p>
            ) : null}

            <Toggle
              id="familyHistory"
              checked={draft.familyHistory === 'yes'}
              onChange={(value) => update('familyHistory', value ? 'yes' : 'no')}
              label="Has a close family member had lung cancer?"
              description="For example a parent, sibling or child."
            />
            {errors.familyHistory ? (
              <p role="alert" className="text-2xs font-medium text-danger-ink">
                {errors.familyHistory}
              </p>
            ) : null}
          </div>

          <Field
            label="How much alcohol do you usually drink?"
            required
            className="mt-5"
            error={errors.alcoholConsumption ?? null}
            helper="This is recorded as a category, not a clinical judgement."
          >
            <Segmented
              name="alcohol"
              value={draft.alcoholConsumption}
              options={EXPOSURE_OPTIONS}
              onChange={(value) => update('alcoholConsumption', value)}
              invalid={Boolean(errors.alcoholConsumption)}
            />
          </Field>

          <div className="mt-6 space-y-5 border-t border-hairline pt-5">
            <p className="text-2xs font-bold uppercase tracking-[0.12em] text-medical-500">
              A little about your day-to-day
            </p>
            <p className="text-2xs leading-relaxed text-ink-muted">
              These answers are used only to tailor supportive guidance. They are not used by the
              screening model.
            </p>

            <Field label="How active are you on a typical day?" helper="Be honest — there is no right level.">
              <Segmented
                name="activity"
                value={draft.activityLevel}
                options={[
                  { value: 'low', label: 'Mostly sitting' },
                  { value: 'moderate', label: 'Some movement' },
                  { value: 'high', label: 'Quite active' },
                ]}
                onChange={(value) => update('activityLevel', value)}
              />
            </Field>

            <Field label="How have you been sleeping?">
              <Segmented
                name="sleep"
                value={draft.sleepQuality}
                options={[
                  { value: 'good', label: 'Generally well' },
                  { value: 'fair', label: 'Could be better' },
                  { value: 'poor', label: 'Poorly' },
                ]}
                onChange={(value) => update('sleepQuality', value)}
              />
            </Field>

            <Field label="How stressed have you felt recently?">
              <Segmented
                name="stress"
                value={draft.stressLevel}
                options={[
                  { value: 'low', label: 'Not very' },
                  { value: 'moderate', label: 'A bit' },
                  { value: 'high', label: 'A lot' },
                ]}
                onChange={(value) => update('stressLevel', value)}
              />
            </Field>

            <Toggle
              id="appetite"
              checked={draft.appetite === 'reduced'}
              onChange={(value) => update('appetite', value ? 'reduced' : 'normal')}
              label="Has your appetite been reduced?"
              description="If this is ongoing, it is worth mentioning at your appointment."
            />
          </div>
        </StepShell>
      ) : null}

      {/* ----------------------------------------------------- step: review */}
      {step === 'review' ? (
        <StepShell
          title="Please check your answers"
          copy="Make sure everything looks right before we generate your screening result."
        >
          <ReviewList
            rows={[
              { label: 'Age', value: draft.age ? `${draft.age} years` : null },
              { label: 'Gender', value: draft.gender || null },
              { label: 'Smoking', value: SMOKING_LABEL[draft.smokingStatus] },
              {
                label: 'Pack-years',
                value:
                  draft.smokingStatus === 'current' || draft.smokingStatus === 'former'
                    ? draft.packYears
                      ? `${draft.packYears}`
                      : null
                    : 'Not applicable',
              },
              { label: 'Secondhand smoke', value: draft.secondhandSmokeExposure || null },
              { label: 'Radon exposure', value: draft.radonExposure || null },
              { label: 'Asbestos exposure', value: draft.asbestosExposure || null },
              { label: 'COPD history', value: draft.copdDiagnosis || null },
              { label: 'Family history', value: draft.familyHistory || null },
              { label: 'Alcohol use', value: draft.alcoholConsumption || null },
            ]}
            onEdit={(key) => {
              if (key === 'age' || key === 'gender') setStep('basic')
              else if (key === 'copdDiagnosis' || key === 'familyHistory' || key === 'alcoholConsumption')
                setStep('history')
              else setStep('smoking')
            }}
          />

          <div className="mt-5 flex items-start gap-2.5 rounded-card border border-teal-100 bg-tint-teal p-3.5">
            <HeartPulse className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden />
            <p className="text-2xs leading-relaxed text-teal-700 dark:text-teal-300">
              The screening model only receives your age, gender, pack-years and exposure answers.
              Your day-to-day answers are used solely to tailor supportive guidance.
            </p>
          </div>
        </StepShell>
      ) : null}

      {/* ----------------------------------------------------- step: result */}
      {step === 'result' ? (
        <div className="space-y-5">
          <PatientPageHeader
            title="My AI Screening Result"
            subtitle="Your assessment has been completed. Here is what the model found, explained in plain language."
            actions={
              <>
                <Button variant="secondary" onClick={() => setStep('review')}>
                  Review answers
                </Button>
                <Button icon={ArrowRight} onClick={() => navigate('/understand-my-result')}>
                  Understand my result
                </Button>
              </>
            }
          />

          {isBusy ? (
            <div className="flex flex-col items-center rounded-panel border border-hairline bg-surface px-6 py-14 text-center shadow-card">
              <span className="relative grid h-12 w-12 place-items-center">
                <span
                  className="absolute inset-0 rounded-xl bg-medical-50"
                  style={{ animation: 'breathe 2.6s ease-in-out infinite' }}
                  aria-hidden
                />
                <Loader2 className="relative h-5 w-5 animate-spin text-medical-500" aria-hidden />
              </span>
              <p className="mt-4 font-display text-sm font-semibold text-ink">
                Analyzing your information…
              </p>
              <p className="mt-1.5 text-xs text-ink-muted">
                {analysisStage === 'model'
                  ? 'Running the screening model…'
                  : 'Preparing your answers and generating an explanation…'}
              </p>
            </div>
          ) : prediction ? (
            <>
              <RiskCard
                tone={riskToneFor(prediction.riskLevel)}
                headline={risk.headline}
                meaning={risk.meaning}
                scoreNote={`Completed on ${new Date(prediction.createdAt).toLocaleDateString()}.`}
              />

              <section className="rounded-panel border border-hairline bg-surface p-5 shadow-card">
                <h2 className="font-display text-[1rem] font-semibold text-ink">
                  Why did the AI give this result?
                </h2>
                <p className="mt-1 text-xs text-ink-muted">
                  These are the factors from your answers that contributed most.
                </p>
                <ul className="mt-4 space-y-3">
                  {factors.map((factor) => (
                    <li
                      key={factor.key}
                      className="flex items-start gap-3 rounded-card border border-hairline bg-surface-subtle p-3.5"
                    >
                      <FactorIcon icon={factor.icon} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.85rem] font-semibold text-ink">{factor.title}</p>
                        <p className="mt-0.5 text-2xs leading-relaxed text-ink-muted">
                          {factor.message}
                        </p>
                      </div>
                      <Badge tone={factor.direction === 'raised' ? 'warning' : factor.direction === 'lowered' ? 'teal' : 'neutral'}>
                        {factor.direction === 'raised'
                          ? 'Raised'
                          : factor.direction === 'lowered'
                            ? 'Lowered'
                            : 'Neutral'}
                      </Badge>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-2xs leading-relaxed text-ink-muted">
                  These show how your answers influenced the model. They do not show what is
                  happening inside your body, and they are not medical findings.
                </p>
              </section>

              <NextStepsCard />

              <div className="flex flex-wrap gap-2">
                <Button icon={Sparkles} onClick={() => navigate('/my-healthy-steps')}>
                  My Healthy Steps
                </Button>
                <Button variant="secondary" onClick={() => navigate('/questions-for-my-doctor')}>
                  Questions for my doctor
                </Button>
                <Button variant="secondary" onClick={() => navigate('/my-health-report')}>
                  My Health Report
                </Button>
              </div>

              <ResultDisclaimer />
            </>
          ) : (
            <div className="rounded-panel border border-dashed border-medical-200 bg-surface/70 px-6 py-12 text-center">
              <p className="font-display text-sm font-semibold text-ink">No result yet</p>
              <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-ink-muted">
                Complete the questions above and we will generate your AI-assisted screening result.
              </p>
              <Button className="mt-5" icon={Sparkles} onClick={() => setStep('basic')}>
                Start the assessment
              </Button>
            </div>
          )}
        </div>
      ) : null}

      {/* ------------------------------------------------------- navigation */}
      {step !== 'result' ? (
        <div className="flex flex-col-reverse gap-3 border-t border-hairline pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {step === 'review' ? (
              <p className="text-2xs text-ink-muted">
                Step {stepIndex + 1} of {STEPS.length} · Review your answers
              </p>
            ) : (
              <p className="text-2xs text-ink-muted">
                Step {stepIndex + 1} of {STEPS.length} · {STEPS[stepIndex].label}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {step === 'review' ? (
              <>
                <Button variant="secondary" onClick={goBack} disabled={isBusy}>
                  Back
                </Button>
                <Button size="lg" icon={Sparkles} onClick={submit} loading={isRunning} loadingLabel="Analyzing…">
                  Generate My Screening Result
                </Button>
              </>
            ) : (
              <>
                {step !== 'basic' ? (
                  <Button variant="secondary" onClick={goBack} disabled={isBusy}>
                    Back
                  </Button>
                ) : null}
                <Button size="lg" iconRight={ArrowRight} onClick={goNext} disabled={isBusy}>
                  Continue
                </Button>
              </>
            )}
          </div>
        </div>
      ) : null}

      <SafetyNote />
    </div>
  )
}

/* ------------------------------------------------------------------ pieces */

const SMOKING_LABEL: Record<string, string> = {
  never: 'I have never smoked',
  former: 'I used to smoke',
  current: 'I currently smoke',
  'prefer-not-to-say': 'Prefer not to say',
}

function StepShell({
  title,
  copy,
  children,
}: {
  title: string
  copy: string
  children: React.ReactNode
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-panel border border-hairline bg-surface p-5 shadow-panel sm:p-6"
    >
      <h2 className="font-display text-[1.1rem] font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-[0.85rem] leading-relaxed text-ink-soft">{copy}</p>
      <div className="mt-6">{children}</div>
    </motion.section>
  )
}

function ReviewList({
  rows,
  onEdit,
}: {
  rows: { label: string; value: string | null }[]
  onEdit: (key: string) => void
}) {
  const missing = rows.filter((row) => row.value === null)
  return (
    <div className="space-y-4">
      <dl className="divide-y divide-hairline overflow-hidden rounded-card border border-hairline">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 bg-surface px-4 py-3">
            <dt className="text-2xs font-medium uppercase tracking-wide text-ink-muted">{row.label}</dt>
            <dd className="flex items-center gap-2">
              {row.value === null ? (
                <span className="flex items-center gap-1.5 text-2xs font-semibold text-danger-ink">
                  <AlertCircle className="h-3.5 w-3.5" aria-hidden />
                  Needed
                </span>
              ) : (
                <span className="text-[0.85rem] font-semibold capitalize text-ink">{row.value}</span>
              )}
              <button
                type="button"
                onClick={() => onEdit(row.label.toLowerCase().replace(/[-\s]/g, ''))}
                className="rounded-md px-1.5 py-0.5 text-2xs font-semibold text-medical-600 transition-colors hover:bg-medical-50"
              >
                Edit
              </button>
            </dd>
          </div>
        ))}
      </dl>
      {missing.length > 0 ? (
        <p className="text-2xs text-danger-ink">
          {missing.length} answer{missing.length > 1 ? 's are' : ' is'} still needed. Use Edit to go
          back to the relevant question.
        </p>
      ) : null}
    </div>
  )
}

function FactorIcon({ icon }: { icon: string }) {
  const classes = 'h-4 w-4'
  if (icon === 'cigarette')
    return (
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-warning/10 text-warning-ink ring-1 ring-inset ring-warning/20">
        <Flame className={classes} aria-hidden />
      </span>
    )
  if (icon === 'users')
    return (
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-medical-50 text-medical-500 ring-1 ring-inset ring-medical-100">
        <Users className={classes} aria-hidden />
      </span>
    )
  if (icon === 'wind' || icon === 'lungs')
    return (
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-600 ring-1 ring-inset ring-teal-100">
        <Wind className={classes} aria-hidden />
      </span>
    )
  if (icon === 'clock')
    return (
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-muted text-ink-soft ring-1 ring-inset ring-hairline">
        <HeartPulse className={classes} aria-hidden />
      </span>
    )
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-muted text-ink-soft ring-1 ring-inset ring-hairline">
      <Check className={classes} aria-hidden />
    </span>
  )
}

function NextStepsCard() {
  return (
    <section className="rounded-panel border border-hairline bg-surface p-5 shadow-card">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-teal-600" aria-hidden />
        <h2 className="font-display text-[1rem] font-semibold text-ink">What should I do next?</h2>
      </div>
      <ul className="mt-3.5 space-y-2.5">
        {NEXT_STEPS.map((item) => (
          <li key={item.title} className="flex gap-2.5">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" aria-hidden />
            <span>
              <span className="block text-[0.85rem] font-semibold text-ink">{item.title}</span>
              <span className="block text-2xs leading-relaxed text-ink-muted">{item.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
