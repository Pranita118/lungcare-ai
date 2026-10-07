import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Activity,
  BrainCircuit,
  FileText,
  ScanLine,
  ServerCog,
  Sparkles,
  UserRoundPlus,
} from 'lucide-react'
import { PageHeader, SectionTitle, KeyValue } from '@/components/medical/PageHeader'
import { StatCard } from '@/components/medical/StatCard'
import { WorkflowDiagram } from '@/components/medical/WorkflowDiagram'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, ProvenanceChip, RiskBadge, StatusDot } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/StatusStates'
import { RiskScale } from '@/components/results/RiskScale'
import { InlineDisclaimer, ResearchDisclaimer } from '@/components/medical/Disclaimer'
import { useApp } from '@/store/AppProvider'
import { useResource } from '@/store/useResource'
import { ml } from '@/services'
import { APP, FEATURES } from '@/lib/clinical'
import { formatClock, formatDateTime, formatPercent } from '@/lib/format'

const QUICK_ACTIONS = [
  {
    to: '/assessment',
    label: 'New Patient Assessment',
    icon: UserRoundPlus,
    description: 'Capture risk factors and run the screening model',
  },
  {
    to: '/ct-analysis',
    label: 'Analyze CT Image',
    icon: ScanLine,
    description: 'Segment a lung CT slice and inspect regions of interest',
  },
  {
    to: '/model-insights',
    label: 'View Model Insights',
    icon: BrainCircuit,
    description: 'Compare evaluation metrics across models',
  },
  {
    to: '/reports',
    label: 'Generate Report',
    icon: FileText,
    description: 'Open the report workspace',
  },
] as const

export function DashboardPage() {
  const navigate = useNavigate()
  const { isOnline, prediction, ctResult, stats, reports, isLoadingReports } = useApp()

  const models = useResource(() => ml().getModels(), [isOnline])
  const trainedModels = useMemo(
    () => (models.data ?? []).filter((model) => model.status === 'trained').length,
    [models.data],
  )
  const anyProvenance = useMemo(() => {
    const list = models.data ?? []
    if (list.length === 0) return 'unavailable' as const
    return list.some((model) => model.metrics === null)
      ? ('unavailable' as const)
      : ('trained-model' as const)
  }, [models.data])

  const topFactors = prediction?.contributions.slice(0, 3) ?? []

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={formatClock(new Date())}
        title="LungCare AI Overview"
        subtitle={APP.subtitle}
        actions={
          <div className="flex items-center gap-2 rounded-card border border-hairline bg-surface px-3.5 py-2 shadow-card">
            <StatusDot tone={isOnline ? 'success' : 'danger'} pulse />
            <div>
              <p className="text-2xs font-semibold text-ink">
                'AI Service Connected'
              </p>
              <p className="text-[0.68rem] text-ink-muted">
                isOnline ? 'Trained artifacts in use' : 'Service not connected'
              </p>
            </div>
          </div>
        }
      />

      {/* ------------------------------------------------------ metric row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={UserRoundPlus}
          label="Patient Assessments"
          value={stats.assessments}
          caption="Screening runs completed in this browser session."
          tone="medical"
          onClick={() => navigate('/assessment')}
          delay={0}
        />
        <StatCard
          icon={BrainCircuit}
          label="AI Models"
          value={models.isLoading ? '—' : (models.data?.length ?? 0)}
          caption={
            isOnline
              ? `${trainedModels} trained and served by the ML service.`
              : 'The model catalogue appears once the service reconnects.'
          }
          tone="teal"
          onClick={() => navigate('/models')}
          delay={0.05}
          footer={
            <div className="mt-3">
              <ProvenanceChip provenance={anyProvenance} compact />
            </div>
          }
        />
        <StatCard
          icon={ScanLine}
          label="CT Analyses"
          value={stats.ctAnalyses}
          caption="CT slices processed with segmentation and ROI extraction."
          tone="medical"
          onClick={() => navigate('/ct-analysis')}
          delay={0.1}
        />
        <StatCard
          icon={Activity}
          label="XAI Enabled"
          value="Active"
          caption="Per-feature attributions are produced for every screening run."
          tone="teal"
          onClick={() => navigate('/explainable-ai')}
          delay={0.15}
          footer={
            <p className="mt-3 text-2xs text-ink-muted">
              'SHAP served by the ML API'
            </p>
          }
        />
      </div>

      {/* -------------------------------------------- current result + CT */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="rounded-panel border border-hairline bg-surface shadow-panel">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-gradient-to-r from-sheen-from to-sheen-to px-5 py-4">
            <div>
              <h2 className="font-display text-[0.98rem] font-semibold text-ink">
                Current AI screening result
              </h2>
              <p className="text-2xs text-ink-muted">Most recent assessment in this session</p>
            </div>
            {prediction ? (
              <div className="flex items-center gap-2">
                <ProvenanceChip provenance={prediction.provenance} compact />
                <RiskBadge level={prediction.riskLevel} size="sm" />
              </div>
            ) : null}
          </header>

          {prediction ? (
            <div className="space-y-5 p-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                    Predicted risk
                  </p>
                  <p className="mt-1 font-display text-[2.2rem] font-bold leading-none text-ink tabular">
                    {formatPercent(prediction.riskScore)}
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
                  <KeyValue label="Case" value={prediction.patient.patientId || 'Unassigned'} />
                  <KeyValue label="Model" value={prediction.model.name.split(' ')[0]} />
                  <KeyValue label="Confidence" value={formatPercent(prediction.confidence)} />
                </dl>
              </div>

              <RiskScale score={prediction.riskScore} level={prediction.riskLevel} />

              <div>
                <p className="mb-2 text-2xs font-semibold uppercase tracking-[0.1em] text-ink-muted">
                  Key contributing factors
                </p>
                <ul className="space-y-2">
                  {topFactors.map((item) => {
                    const positive = item.contribution > 0
                    return (
                      <li key={item.feature} className="flex items-center gap-3">
                        <span className="w-32 shrink-0 truncate text-[0.78rem] font-semibold text-ink">
                          {FEATURES[item.feature].label}
                        </span>
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-track">
                          <motion.span
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(3, item.magnitude)}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            className={`block h-full rounded-full ${positive ? 'bg-danger/75' : 'bg-teal-500/80'}`}
                          />
                        </span>
                        <span
                          className={`w-12 shrink-0 text-right text-2xs font-bold tabular ${
                            positive ? 'text-danger-ink' : 'text-success-ink'
                          }`}
                        >
                          {positive ? '+' : ''}
                          {item.contribution.toFixed(2)}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-hairline pt-4">
                <Button size="sm" icon={Sparkles} onClick={() => navigate('/assessment')}>
                  New assessment
                </Button>
                <Button size="sm" variant="secondary" icon={Activity} onClick={() => navigate('/explainable-ai')}>
                  View explanation
                </Button>
                <span className="ml-auto text-2xs text-ink-muted">
                  {formatDateTime(prediction.createdAt)}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-5">
              <EmptyState
                icon={Sparkles}
                title="No analysis yet"
                description="Start a patient assessment to see AI screening insights on this dashboard."
                action={
                  <Button icon={UserRoundPlus} onClick={() => navigate('/assessment')}>
                    Start assessment
                  </Button>
                }
              />
            </div>
          )}
        </section>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>AI engine status</CardTitle>
                <CardDescription>Where the numbers on this screen come from</CardDescription>
              </div>
              <StatusDot tone={isOnline ? 'success' : 'danger'} pulse />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2.5 rounded-input border border-hairline bg-surface-subtle p-3">
                {isOnline ? (
                  <ServerCog className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden />
                ) : (
                  <FlaskIcon />
                )}
                <div className="min-w-0">
                  <p className="text-[0.8rem] font-semibold text-ink">
                    'Trained ML service'
                  </p>
                  <p className="mt-0.5 text-2xs leading-relaxed text-ink-muted">
                    {isOnline
                      ? 'Predictions and explanations are produced by served model artifacts.'
                      : 'The service is not answering. Screens update automatically once it reconnects.'}
                  </p>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-3">
                <KeyValue
                  label="Models listed"
                  value={models.isLoading ? <Skeleton className="h-5 w-10" /> : (models.data?.length ?? 0)}
                />
                <KeyValue label="Reports stored" value={isLoadingReports ? '—' : reports.length} />
              </dl>
              {!isOnline ? (
                <Link
                  to="/settings"
                  className="inline-flex items-center gap-1.5 text-2xs font-semibold text-medical-600 hover:text-medical-700 hover:underline"
                >
                  How to connect trained models →
                </Link>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>CT image analysis</CardTitle>
                <CardDescription>Segmentation is image processing, not detection</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {ctResult ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={ctResult.images.overlay}
                      alt={`Processed CT slice with ${ctResult.regions.length} regions of interest marked`}
                      className="h-20 w-20 rounded-card border border-hairline object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[0.8rem] font-semibold text-ink">
                        {ctResult.fileName}
                      </p>
                      <p className="text-2xs text-ink-muted">
                        {ctResult.width}×{ctResult.height} · {ctResult.regions.length} ROI ·{' '}
                        {formatDateTime(ctResult.createdAt)}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="secondary" icon={ScanLine} onClick={() => navigate('/ct-analysis')}>
                    Open analysis
                  </Button>
                </div>
              ) : (
                <EmptyState
                  icon={ScanLine}
                  title="No CT image uploaded"
                  description="Upload a lung CT image to begin analysis."
                  action={
                    <Button size="sm" variant="secondary" onClick={() => navigate('/ct-analysis')}>
                      Upload CT image
                    </Button>
                  }
                  className="border-0 bg-transparent px-0 py-6"
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ---------------------------------------------------------- workflow */}
      <section className="space-y-4">
        <SectionTitle
          title="AI Screening Workflow"
          description="The end-to-end path from patient data to an explainable AI report."
          right={
            <Badge tone="medical" icon={Sparkles}>
              Live in this session
            </Badge>
          }
        />
        <WorkflowDiagram />
      </section>

      {/* ---------------------------------------------------- quick actions */}
      <section className="space-y-4">
        <SectionTitle title="Quick actions" description="Jump straight into the common workflows." />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="group flex items-start gap-3 rounded-card border border-hairline bg-surface p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-medical-200 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-medical-500/15"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-medical-50 text-medical-500 ring-1 ring-inset ring-medical-100 transition-colors group-hover:bg-tint-medical">
                <action.icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-[0.83rem] font-semibold text-ink">{action.label}</span>
                <span className="mt-0.5 block text-2xs leading-relaxed text-ink-muted">
                  {action.description}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <ResearchDisclaimer />
      <InlineDisclaimer />
    </div>
  )
}

function FlaskIcon() {
  return (
    <svg
      className="mt-0.5 h-4 w-4 shrink-0 text-warning"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 3h6M10 3v6.5L4.8 18a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3L14 9.5V3" />
      <path d="M7.5 15h9" />
    </svg>
  )
}
