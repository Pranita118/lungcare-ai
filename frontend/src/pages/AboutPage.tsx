import {
  Activity,
  Brain,
  Cpu,
  Database,
  WifiOff,
  Layers,
  ScanLine,
  Search,
  Stethoscope,
} from 'lucide-react'
import { PageHeader, SectionTitle, KeyValue } from '@/components/medical/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ResearchDisclaimer, InlineDisclaimer } from '@/components/medical/Disclaimer'
import { Logo } from '@/components/layout/Brand'
import { useNavigate } from 'react-router-dom'
import { APP } from '@/lib/clinical'
import { useApp } from '@/store/AppProvider'

const TECHNOLOGIES = [
  { icon: Brain, label: 'Machine Learning', copy: 'Random Forest screening model with tree-based baselines.' },
  { icon: Layers, label: 'Ensemble Learning', copy: 'Soft voting and stacked generalisation models.' },
  { icon: ScanLine, label: 'Medical Image Processing', copy: 'Grayscale, denoising, Otsu thresholding and K-Means segmentation.' },
  { icon: Activity, label: 'Explainable AI', copy: 'Per-prediction feature attribution translated for clinical reading.' },
  { icon: Search, label: 'SHAP', copy: 'TreeSHAP and kernel approximations for global and local explanations.' },
  { icon: Database, label: 'Data Visualization', copy: 'Distributions, model comparison and confusion matrices.' },
]

const PIPELINE = [
  { label: 'Data Collection', copy: 'Tabular risk-factor dataset and CT slices.' },
  { label: 'Cleaning', copy: 'Missing values, duplicates and range checks.' },
  { label: 'Feature Engineering', copy: 'Encoding, banding and scaling of model inputs.' },
  { label: 'Model Training', copy: 'Baseline, tree-based and ensemble classifiers.' },
  { label: 'Evaluation', copy: 'Metrics and confusion matrices on a held-out split.' },
  { label: 'Prediction', copy: 'Served to the web application through a REST API.' },
  { label: 'XAI', copy: 'SHAP attribution for every individual prediction.' },
  { label: 'Report', copy: 'Structured AI healthcare analysis report.' },
]

const SCOPE = [
  'Intended for academic demonstration and research exploration only.',
  'Not validated for clinical use, diagnosis or patient management.',
  'Expects synthetic or de-identified research data, not real patient records.',
  'Every result is produced by a trained model artifact, or it is not shown.',
]

export function AboutPage() {
  const navigate = useNavigate()
  const { mode } = useApp()

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Project"
        title="About LungCare AI"
        subtitle={APP.subtitle}
        actions={
          <Button icon={Stethoscope} onClick={() => navigate('/assessment')}>
            Start an assessment
          </Button>
        }
      />

      {/* ------------------------------------------------------------ hero */}
      <section className="relative overflow-hidden rounded-panel border border-hairline bg-surface p-6 shadow-panel sm:p-8">
        <div
          className="pointer-events-none absolute inset-0 bg-glow-medical opacity-70"
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-0 bg-grid-faint opacity-40" aria-hidden />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <Logo size="lg" />
              <div>
                <p className="font-display text-xl font-bold text-ink">{APP.name}</p>
                <p className="text-2xs text-ink-muted">{APP.shortSubtitle}</p>
              </div>
            </div>
            <p className="mt-4 text-[0.9rem] leading-relaxed text-ink-soft text-pretty">
              LungCare AI is a research prototype that demonstrates how artificial intelligence and
              machine learning can support lung cancer screening research. It combines tabular risk
              factor modelling, explainable predictions and medical image processing in a single
              clinical-style interface.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone={mode === 'live' ? 'success' : 'warning'} icon={mode === 'live' ? Cpu : WifiOff}>
                {mode === 'live' ? 'Connected to trained artifacts' : 'Service offline — no results available'}
              </Badge>
              <Badge tone="medical">Educational prototype</Badge>
              <Badge tone="teal">Not a diagnostic tool</Badge>
            </div>
          </div>
          <dl className="grid shrink-0 grid-cols-2 gap-4 rounded-card border border-hairline bg-surface/90 p-4 lg:w-72">
            <KeyValue label="Domain" value="Lung cancer screening" />
            <KeyValue label="Modality" value="Tabular + CT image" />
            <KeyValue label="Explainability" value="SHAP attribution" />
            <KeyValue label="Interface" value="React + TypeScript" />
          </dl>
        </div>
      </section>

      {/* ------------------------------------------------ problem/solution */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Problem</CardTitle>
              <CardDescription>Why this project exists</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-[0.85rem] leading-relaxed text-ink-soft">
              Lung cancer is a major healthcare challenge worldwide, and the data required to study
              it is large, multi-source and unevenly recorded. Risk factors such as tobacco exposure,
              radon and asbestos contact, COPD and family history must be interpreted together before
              a screening decision can even be considered.
            </p>
            <p className="text-[0.85rem] leading-relaxed text-ink-soft">
              Analysing this volume of patient and medical data by hand is slow and difficult to
              audit, and a purely statistical model gives clinicians no way to understand why a
              particular case was flagged.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Solution</CardTitle>
              <CardDescription>What the platform demonstrates</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-[0.85rem] leading-relaxed text-ink-soft">
              LungCare AI demonstrates how machine learning can assist with structured risk
              assessment, how medical images can be processed to surface regions for human review,
              and how explainable AI can translate a model output into language a clinician can
              interrogate.
            </p>
            <ul className="space-y-2">
              {[
                'Risk-factor screening with a served classification model.',
                'CT slice segmentation and region-of-interest extraction.',
                'SHAP-based global and per-prediction explanations.',
                'Structured, printable AI analysis reports.',
              ].map((item) => (
                <li key={item} className="flex gap-2 text-2xs leading-relaxed text-ink-soft">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-teal-400" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* --------------------------------------------------- technologies */}
      <section className="space-y-4">
        <SectionTitle
          title="Technologies"
          description="The techniques combined in this prototype."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TECHNOLOGIES.map((tech) => (
            <div
              key={tech.label}
              className="flex items-start gap-3 rounded-card border border-hairline bg-surface p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-medical-50 text-medical-500 ring-1 ring-inset ring-medical-100">
                <tech.icon className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[0.83rem] font-semibold text-ink">{tech.label}</p>
                <p className="mt-0.5 text-2xs leading-relaxed text-ink-muted">{tech.copy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------- pipeline */}
      <section className="space-y-4">
        <SectionTitle
          title="Project pipeline"
          description="From raw data collection through to the final report."
        />
        <ol className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {PIPELINE.map((item, index) => (
            <li
              key={item.label}
              className="relative rounded-card border border-hairline bg-surface p-4 shadow-card"
            >
              <div className="flex items-center justify-between">
                <span className="text-2xs font-bold text-medical-300 tabular">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-teal-300" aria-hidden />
              </div>
              <p className="mt-1.5 text-[0.83rem] font-semibold text-ink">{item.label}</p>
              <p className="mt-0.5 text-2xs leading-relaxed text-ink-muted">{item.copy}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* --------------------------------------------------------- scope */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Scope and intended use</CardTitle>
              <CardDescription>Boundaries of this prototype</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {SCOPE.map((item) => (
                <li key={item} className="flex gap-2 text-2xs leading-relaxed text-ink-soft">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-medical-300" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Architecture</CardTitle>
              <CardDescription>How the frontend and the ML service connect</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <pre className="rounded-card border border-hairline bg-surface-subtle p-4 font-mono text-2xs leading-relaxed text-ink-soft">
{`React + TypeScript (Vite)
  └── service layer (MLService interface)
        └── LiveMLService  → FastAPI  (trained artifacts)

FastAPI (required backend)
  ├── POST /api/predict
  ├── POST /api/analyze-ct
  ├── GET  /api/models
  ├── GET  /api/datasets
  ├── POST /api/explain
  ├── POST /api/report`}
              </pre>
            </div>
            <p className="mt-3 text-2xs leading-relaxed text-ink-muted">
              The React application never contains model training code, and it has no simulated
              engine to fall back on. It talks only to the service interface, so a result is either
              produced by a trained artifact or it is not shown.
            </p>
          </CardContent>
        </Card>
      </div>

      <ResearchDisclaimer />
      <InlineDisclaimer />
    </div>
  )
}
