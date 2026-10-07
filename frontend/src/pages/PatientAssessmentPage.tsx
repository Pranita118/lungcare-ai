import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Activity,
  Brain,
  ClipboardList,
  FileText,
  WifiOff,
  RotateCcw,
  ScanLine,
  Sparkles,
  UserRound,
  Wand2,
} from 'lucide-react'
import { PageHeader, SectionTitle } from '@/components/medical/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field, fieldDescribedBy } from '@/components/ui/Field'
import { NumberInput, Segmented, TextInput, Toggle } from '@/components/ui/Input'
import { Badge, ProvenanceChip, RiskBadge } from '@/components/ui/Badge'
import { EmptyState, ErrorState } from '@/components/ui/StatusStates'
import { ProcessSteps } from '@/components/medical/ProcessSteps'
import { InlineDisclaimer } from '@/components/medical/Disclaimer'
import { ScreeningResultPanel } from '@/components/results/ScreeningResultPanel'
import { useApp } from '@/store/AppProvider'
import { useToast } from '@/components/ui/Toast'
import { FEATURES } from '@/lib/clinical'
import { createPatientId } from '@/lib/id'
import { formatDateTime, formatPercent } from '@/lib/format'
import { hasErrors, validatePatient } from '@/lib/validation'
import { SAMPLE_PATIENT } from '@/services/samples/sampleCase'
import type { ExposureLevel, PatientInput, YesNo } from '@/types'

const EXPOSURE_OPTIONS: { value: ExposureLevel; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'low', label: 'Low' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'high', label: 'High' },
]

const GENDER_OPTIONS = [
  { value: 'female' as const, label: 'Female' },
  { value: 'male' as const, label: 'Male' },
  { value: 'other' as const, label: 'Other' },
]

const EMPTY_FORM: PatientInput = {
  patientId: '',
  age: null,
  gender: '',
  packYears: null,
  radonExposure: '',
  asbestosExposure: '',
  secondhandSmokeExposure: '',
  copdDiagnosis: '',
  alcoholConsumption: '',
  familyHistory: '',
}

export function PatientAssessmentPage() {
  const navigate = useNavigate()
  const { notify } = useToast()
  const {
    mode,
    prediction,
    explanation,
    isAnalyzing,
    analysisStage,
    analysisError,
    runAnalysis,
    clearAnalysisError,
    stats,
    generateReport,
    isGeneratingReport,
  } = useApp()

  const [form, setForm] = useState<PatientInput>(EMPTY_FORM)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const resultRef = useRef<HTMLDivElement>(null)

  const errors = useMemo(() => validatePatient(form), [form])
  const showError = useCallback(
    (field: keyof PatientInput) => (touched[field] || submitAttempted ? errors[field] : undefined),
    [errors, submitAttempted, touched],
  )

  useEffect(() => {
    if (stats.lastPatient) setForm(stats.lastPatient)
  }, [stats.lastPatient])

  const update = useCallback(<K extends keyof PatientInput>(field: K, value: PatientInput[K]) => {
    setForm((current) => ({ ...current, [field]: value }))
  }, [])

  const handleSubmit = async () => {
    setSubmitAttempted(true)
    if (hasErrors(errors)) {
      notify({
        tone: 'warning',
        title: 'Check the highlighted fields',
        description: 'Some required information is missing or out of range.',
      })
      return
    }
    const patient: PatientInput = { ...form, patientId: form.patientId || createPatientId() }
    setForm(patient)
    const outcome = await runAnalysis(patient)
    if (outcome) {
      window.setTimeout(
        () => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        120,
      )
    }
  }

  const loadSample = () => {
    setForm(SAMPLE_PATIENT)
    setTouched({})
    setSubmitAttempted(false)
    notify({
      tone: 'info',
      title: 'Sample case loaded',
      description: 'Synthetic demonstration data — not a real patient record.',
    })
  }

  const reset = () => {
    setForm(EMPTY_FORM)
    setTouched({})
    setSubmitAttempted(false)
    clearAnalysisError()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Clinical workflow"
        title="Patient Risk Assessment"
        subtitle="Capture lung cancer risk factors and run them through the screening model. All processing is logged locally in this browser session."
        actions={
          <>
            <Button variant="secondary" icon={Wand2} onClick={loadSample}>
              Load sample case
            </Button>
            <Button variant="ghost" icon={RotateCcw} onClick={reset}>
              Reset
            </Button>
          </>
        }
      />

      {isAnalyzing ? <ProcessSteps stage={analysisStage} /> : null}

      {analysisError ? (
        <ErrorState error={analysisError} onRetry={handleSubmit} />
      ) : null}

      <div ref={resultRef} className="scroll-mt-24">
        {prediction && !isAnalyzing ? (
          <ScreeningResultPanel
            prediction={prediction}
            onViewExplanation={() => navigate('/explainable-ai')}
            onOpenCt={() => navigate('/ct-analysis')}
            onGenerateReport={async () => {
              const record = await generateReport({
                patient: prediction.patient,
                prediction,
                explanation,
                ct: null,
              })
              if (record) {
                notify({
                  tone: 'success',
                  title: 'Report generated',
                  description: `${record.id} is ready to review.`,
                })
                navigate(`/reports/${record.id}`)
              }
            }}
          />
        ) : !isAnalyzing && !analysisError ? (
          <EmptyState
            icon={ClipboardList}
            title="No analysis yet"
            description="Start a patient assessment to see AI screening insights, feature contributions and a generated report."
            action={
              <Button icon={Sparkles} onClick={() => document.getElementById('run-analysis')?.focus()}>
                Start assessment
              </Button>
            }
          />
        ) : null}
      </div>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-panel border border-hairline bg-surface shadow-panel"
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-medical-50 text-medical-500 ring-1 ring-inset ring-medical-100">
              <UserRound className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h2 className="font-display text-[0.98rem] font-semibold text-ink">
                Patient risk factor input
              </h2>
              <p className="text-2xs text-ink-muted">
                Fields marked <span className="text-danger">*</span> are required for screening
              </p>
            </div>
          </div>
          <Badge tone={mode === 'live' ? 'success' : 'warning'} icon={mode === 'live' ? Brain : WifiOff}>
            {mode === 'live' ? 'Trained model' : 'Service offline'}
          </Badge>
        </header>

        <div className="space-y-8 px-5 py-6 sm:px-6">
          {/* ---------------------------------------------- patient information */}
          <fieldset>
            <legend className="mb-4 flex items-center gap-2 text-2xs font-bold uppercase tracking-[0.14em] text-medical-500">
              Patient information
            </legend>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Field
                label="Patient ID"
                htmlFor="patientId"
                helper="Optional. A reference code is generated automatically if left blank."
                error={showError('patientId') ?? null}
              >
                <div className="flex gap-2">
                  <TextInput
                    id="patientId"
                    value={form.patientId}
                    placeholder="e.g. LC-2041"
                    invalid={Boolean(showError('patientId'))}
                    aria-describedby={fieldDescribedBy('patientId', {
                      hasError: Boolean(showError('patientId')),
                      hasHelper: true,
                    })}
                    onBlur={() => setTouched((current) => ({ ...current, patientId: true }))}
                    onChange={(event) => update('patientId', event.target.value)}
                  />
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => update('patientId', createPatientId())}
                    aria-label="Generate a patient reference"
                  >
                    Generate
                  </Button>
                </div>
              </Field>

              <Field
                label="Age"
                htmlFor="age"
                required
                helper={FEATURES.age.helper}
                error={showError('age') ?? null}
                trailing={
                  <span className="text-2xs text-ink-muted">18–100 years</span>
                }
              >
                <NumberInput
                  id="age"
                  value={form.age}
                  min={18}
                  max={100}
                  step={1}
                  unit="yrs"
                  placeholder="e.g. 64"
                  invalid={Boolean(showError('age'))}
                  aria-describedby={fieldDescribedBy('age', {
                    hasError: Boolean(showError('age')),
                    hasHelper: true,
                  })}
                  onBlur={() => setTouched((current) => ({ ...current, age: true }))}
                  onValueChange={(value) => {
                    update('age', value)
                    setTouched((current) => ({ ...current, age: true }))
                  }}
                />              </Field>

              <Field
                label="Gender"
                required
                helper={FEATURES.gender.helper}
                error={showError('gender') ?? null}
              >
                <Segmented
                  name="gender"
                  columns={3}
                  value={form.gender}
                  options={GENDER_OPTIONS}
                  onChange={(value) => update('gender', value)}
                  invalid={Boolean(showError('gender'))}
                />
              </Field>
            </div>
          </fieldset>

          {/* ------------------------------------------------- risk factors */}
          <fieldset>
            <legend className="mb-4 flex items-center gap-2 text-2xs font-bold uppercase tracking-[0.14em] text-medical-500">
              Lung cancer risk factors
            </legend>

            <div className="grid gap-6 lg:grid-cols-2">
              <Field
                label="Pack Years"
                htmlFor="packYears"
                required
                helper={FEATURES.pack_years.helper}
                error={showError('packYears') ?? null}
                trailing={<span className="text-2xs text-ink-muted">0–120</span>}
              >
                <NumberInput
                  id="packYears"
                  value={form.packYears}
                  min={0}
                  max={120}
                  step={1}
                  unit="pack-years"
                  placeholder="e.g. 35"
                  invalid={Boolean(showError('packYears'))}
                  aria-describedby={fieldDescribedBy('packYears', {
                    hasError: Boolean(showError('packYears')),
                    hasHelper: true,
                  })}
                  onValueChange={(value) => {
                    update('packYears', value)
                    setTouched((current) => ({ ...current, packYears: true }))
                  }}
                />
              </Field>

              <Field
                label="Alcohol Consumption"
                required
                helper={FEATURES.alcohol_consumption.helper}
                error={showError('alcoholConsumption') ?? null}
              >
                <Segmented
                  name="alcoholConsumption"
                  value={form.alcoholConsumption}
                  options={EXPOSURE_OPTIONS}
                  onChange={(value) => update('alcoholConsumption', value)}
                  invalid={Boolean(showError('alcoholConsumption'))}
                />
              </Field>

              <Field
                label="Radon Exposure"
                required
                helper={FEATURES.radon_exposure.helper}
                error={showError('radonExposure') ?? null}
              >
                <Segmented
                  name="radonExposure"
                  value={form.radonExposure}
                  options={EXPOSURE_OPTIONS}
                  onChange={(value) => update('radonExposure', value)}
                  invalid={Boolean(showError('radonExposure'))}
                />
              </Field>

              <Field
                label="Asbestos Exposure"
                required
                helper={FEATURES.asbestos_exposure.helper}
                error={showError('asbestosExposure') ?? null}
              >
                <Segmented
                  name="asbestosExposure"
                  value={form.asbestosExposure}
                  options={EXPOSURE_OPTIONS}
                  onChange={(value) => update('asbestosExposure', value)}
                  invalid={Boolean(showError('asbestosExposure'))}
                />
              </Field>

              <Field
                label="Secondhand Smoke Exposure"
                required
                helper={FEATURES.secondhand_smoke_exposure.helper}
                error={showError('secondhandSmokeExposure') ?? null}
              >
                <Segmented
                  name="secondhandSmokeExposure"
                  value={form.secondhandSmokeExposure}
                  options={EXPOSURE_OPTIONS}
                  onChange={(value) => update('secondhandSmokeExposure', value)}
                  invalid={Boolean(showError('secondhandSmokeExposure'))}
                />
              </Field>

              <div className="grid gap-3">
                <Toggle
                  id="copdDiagnosis"
                  checked={form.copdDiagnosis === 'yes'}
                  onChange={(value) => update('copdDiagnosis', (value ? 'yes' : 'no') as YesNo)}
                  label="COPD Diagnosis"
                  description={FEATURES.copd_diagnosis.helper}
                />
                <Toggle
                  id="familyHistory"
                  checked={form.familyHistory === 'yes'}
                  onChange={(value) => update('familyHistory', (value ? 'yes' : 'no') as YesNo)}
                  label="Family History"
                  description={FEATURES.family_history.helper}
                />
              </div>
            </div>
          </fieldset>

          {/* ------------------------------------------------------- actions */}
          <div className="flex flex-col gap-4 border-t border-hairline pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                id="run-analysis"
                size="lg"
                icon={Sparkles}
                loading={isAnalyzing}
                loadingLabel="Analyzing with AI…"
                onClick={handleSubmit}
                className="min-w-[13rem]"
              >
                Analyze with AI
              </Button>
              <Button variant="secondary" size="lg" icon={ScanLine} onClick={() => navigate('/ct-analysis')}>
                Analyze CT Image
              </Button>
            </div>
            <div className="text-right">
              <p className="text-2xs text-ink-muted">
                Assessments this session
                <span className="ml-1.5 font-semibold text-ink tabular">{stats.assessments}</span>
              </p>
              {prediction ? (
                <p className="text-2xs text-ink-muted">
                  Last run {formatDateTime(prediction.createdAt)} ·{' '}
                  {formatPercent(prediction.riskScore)} predicted risk
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {submitAttempted && hasErrors(errors) ? (
          <div className="border-t border-hairline bg-tint-danger px-5 py-3 sm:px-6">
            <p className="text-2xs font-medium text-danger-ink">
              {Object.keys(errors).length === 1
                ? '1 field needs'
                : `${Object.keys(errors).length} fields need`}{' '}
              attention before the model can run.
            </p>
          </div>
        ) : null}
      </motion.section>

      {/* ------------------------------------------------- recent session card */}
      {prediction ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Screening status</CardTitle>
              <CardDescription>
                Current result held in this session. Generate a report to keep a permanent record.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <RiskBadge level={prediction.riskLevel} size="sm" />
              <ProvenanceChip provenance={prediction.provenance} compact />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                icon={Activity}
                onClick={() => navigate('/explainable-ai')}
                loading={isGeneratingReport}
              >
                View explanation
              </Button>
              <Button
                variant="secondary"
                icon={FileText}
                loading={isGeneratingReport}
                loadingLabel="Generating report…"
                onClick={async () => {
                  const record = await generateReport({
                    patient: prediction.patient,
                    prediction,
                    explanation,
                    ct: null,
                  })
                  if (record) navigate(`/reports/${record.id}`)
                }}
              >
                Generate report
              </Button>
            </div>
            <InlineDisclaimer className="mt-4" />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-2 text-2xs text-ink-muted sm:grid-cols-3">
        <p className="rounded-input border border-hairline bg-surface px-3 py-2">
          Fields marked <span className="text-danger">*</span> are required.
        </p>
        <p className="rounded-input border border-hairline bg-surface px-3 py-2">
          {mode === 'live'
            ? 'Predictions come from the served model artifacts.'
            : 'The ML service is offline, so no score can be produced.'}
        </p>
        <p className="rounded-input border border-hairline bg-surface px-3 py-2">
          Results stay in this browser session until a report is generated.
        </p>
      </div>

      <SectionTitle
        title="How the screening pipeline works"
        description="The same steps run for every case, against the served model artifacts."
        className="pt-2"
      />
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { step: '01', title: 'Validate & encode', copy: 'Ranges are checked, categories encoded, numeric features prepared.' },
          { step: '02', title: 'Score', copy: 'The trained classifier produces the screening score.' },
          { step: '03', title: 'Explain', copy: 'Per-feature attributions are computed for this individual case.' },
          { step: '04', title: 'Report', copy: 'A structured AI analysis report can be generated and printed.' },
        ].map((item) => (
          <li key={item.step} className="rounded-card border border-hairline bg-surface p-4 shadow-card">
            <span className="text-2xs font-bold text-medical-300 tabular">{item.step}</span>
            <p className="mt-1.5 text-[0.85rem] font-semibold text-ink">{item.title}</p>
            <p className="mt-1 text-2xs leading-relaxed text-ink-muted">{item.copy}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}
