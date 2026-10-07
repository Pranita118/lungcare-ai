import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart3,
  FileText,
  Lightbulb,
  ScanLine,
  Sparkles,
  Wand2,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader, SectionTitle, KeyValue } from '@/components/medical/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, ProvenanceChip, RiskBadge } from '@/components/ui/Badge'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StatusStates'
import { ChartFrame, ChartTooltip } from '@/components/charts/ChartFrame'
import { AXIS_PROPS, CHART } from '@/components/charts/chartTheme'
import { ShapForcePlot } from '@/components/medical/ShapForcePlot'
import { ShapBeeswarm } from '@/components/medical/ShapBeeswarm'
import { ContributionBars, ContributionLegend } from '@/components/medical/ContributionBars'
import { ResearchDisclaimer, InlineDisclaimer } from '@/components/medical/Disclaimer'
import { InsightsAssistant } from '@/components/assistant/InsightsAssistant'
import { useApp } from '@/store/AppProvider'
import { FEATURES } from '@/lib/clinical'
import { formatDecimal, formatPercent } from '@/lib/format'
import { SAMPLE_PATIENT } from '@/services/samples/sampleCase'
import { SigmoidExplainer } from '@/components/medical/SigmoidExplainer'

export function ExplainableAiPage() {
  const navigate = useNavigate()
  const {
    prediction,
    explanation,
    isAnalyzing,
    runAnalysis,
    analysisError,
    generateReport,
    isGeneratingReport,
    ctResult,
    loadGlobalExplanation,
    isLoadingGlobal,
  } = useApp()
  const [isLoadingSample, setIsLoadingSample] = useState(false)

  const globalData = useMemo(() => {
    if (!explanation) return []
    return [...explanation.global]
      .sort((a, b) => b.meanAbsShap - a.meanAbsShap)
      .map((entry) => ({
        ...entry,
        name: FEATURES[entry.feature].label,
        value: entry.meanAbsShap,
      }))
  }, [explanation])

  // Patient screens request local attribution only, because the model-wide
  // importance block is expensive to compute. This is the one screen that shows
  // it, so it asks for the full bundle on demand.
  useEffect(() => {
    if (prediction && explanation && explanation.global.length === 0 && !isLoadingGlobal) {
      void loadGlobalExplanation()
    }
  }, [prediction, explanation, isLoadingGlobal, loadGlobalExplanation])

  const runSample = async () => {
    setIsLoadingSample(true)
    await runAnalysis(SAMPLE_PATIENT)
    setIsLoadingSample(false)
  }

  if (!prediction || !explanation) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Explainability"
          title="Explainable AI"
          subtitle="Understand which factors contributed to the model prediction."
        />
        {analysisError ? <ErrorState error={analysisError} onRetry={runSample} /> : null}
        {isAnalyzing ? (
          <LoadingState
            title="Generating explanation…"
            description="Computing per-feature attributions for the current case."
          />
        ) : (
          <EmptyState
            icon={BarChart3}
            title="No explanation yet"
            description="Run a patient assessment to see global feature importance and the individual SHAP attribution for this case."
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button icon={Sparkles} loading={isLoadingSample} loadingLabel="Running sample case…" onClick={runSample}>
                  Run sample case
                </Button>
                <Button variant="secondary" onClick={() => navigate('/assessment')}>
                  Start assessment
                </Button>
              </div>
            }
          />
        )}
        <InlineDisclaimer />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Explainability"
        title="Explainable AI"
        subtitle="Understand which factors contributed to the model prediction."
        provenance={explanation.provenance}
        actions={
          <>
            <Button variant="secondary" icon={ScanLine} onClick={() => navigate('/ct-analysis')}>
              CT analysis
            </Button>
            <Button
              icon={FileText}
              loading={isGeneratingReport}
              loadingLabel="Generating…"
              onClick={async () => {
                const record = await generateReport({
                  patient: prediction.patient,
                  prediction,
                  explanation,
                  ct: ctResult,
                })
                if (record) navigate(`/reports/${record.id}`)
              }}
            >
              Generate report
            </Button>
          </>
        }
      />

      {/* ------------------------------------------------------ case header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-panel border border-hairline bg-surface px-5 py-4 shadow-card">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <KeyValue label="Case" value={prediction.patient.patientId || 'Unassigned'} />
          <KeyValue label="Model" value={prediction.model.name} />
          <KeyValue label="Method" value={explanation.method} />
          <KeyValue label="Base value E[f(x)]" value={formatDecimal(explanation.baseValue)} />
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="outline">Screening score {formatPercent(prediction.riskScore)}</Badge>
          <RiskBadge level={prediction.riskLevel} size="sm" />
        </div>
      </div>

      {/* --------------------------------------------------- global summary */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <ChartFrame
          title="Global Feature Importance"
          description="Average absolute attribution of each feature across the evaluation population."
          provenance={explanation.provenance}
          descriptionText={globalData
            .map((entry) => `${entry.name}: ${formatDecimal(entry.value)} average attribution`)
            .join('. ')}
        >
          {isLoadingGlobal || globalData.length === 0 ? (
            <div className="grid h-[330px] w-full place-items-center">
              <LoadingState
                title="Computing global feature importance"
                description="This averages SHAP attributions across the held-out evaluation split. It is model-wide rather than per-patient, so it is calculated once and reused."
              />
            </div>
          ) : (
            <div className="h-[330px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={globalData}
                layout="vertical"
                margin={{ top: 4, right: 46, bottom: 4, left: 8 }}
                barCategoryGap={6}
              >
                <CartesianGrid stroke={CHART.grid} horizontal={false} />
                <XAxis
                  type="number"
                  {...AXIS_PROPS}
                  tickFormatter={(value: number) => value.toFixed(1)}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  {...AXIS_PROPS}
                  width={124}
                  tick={{ fill: CHART.text, fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(11,92,173,0.05)' }}
                  content={({ active, payload }) => {
                    const point = payload?.[0]?.payload
                    if (!active || !point) return null
                    return (
                      <ChartTooltip
                        label={point.name}
                        rows={[
                          {
                            key: 'shap',
                            label: 'Mean |attribution|',
                            value: formatDecimal(point.value),
                            color: CHART.medical,
                          },
                          {
                            key: 'share',
                            label: 'Share of total',
                            value: formatPercent(point.share),
                          },
                        ]}
                      />
                    )
                  }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22} animationDuration={700}>
                  {globalData.map((entry, index) => (
                    <Cell
                      key={entry.feature}
                      fill={index < 3 ? CHART.medical : CHART.medicalSoft}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            </div>
          )}
          <p className="mt-2 text-2xs leading-relaxed text-ink-muted">
            Values are mean absolute SHAP values computed on the held-out evaluation split.
          </p>
        </ChartFrame>

        <div className="space-y-5">
          <SigmoidExplainer
            baseValue={explanation.baseValue}
            predictionValue={explanation.predictionValue}
            riskScore={prediction.riskScore}
          />

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-warning" aria-hidden />
                <CardTitle>What this means</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <p className="text-[0.82rem] leading-relaxed text-ink-soft">{explanation.summary}</p>
              <p className="text-2xs leading-relaxed text-ink-muted">
                {prediction.summary}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ------------------------------------------------ individual case */}
      <section className="space-y-4">
        <SectionTitle
          title="Individual Prediction Explanation"
          description="How each recorded value moved the model output away from the population average."
          right={<ProvenanceChip provenance={explanation.provenance} />}
        />

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Why did the AI make this prediction?</CardTitle>
              <CardDescription>
                Additive attribution from the base value to the final model output.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ShapForcePlot
              baseValue={explanation.baseValue}
              finalValue={explanation.predictionValue}
              points={explanation.local}
            />
          </CardContent>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Plain-language contributions</CardTitle>
                <CardDescription>
                  Technical attributions translated for clinical reading.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <ContributionLegend className="mb-4" />
              <ContributionBars contributions={prediction.contributions} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Input summary for this case</CardTitle>
                <CardDescription>Exactly what was sent to the model</CardDescription>
              </div>
              <Badge tone="outline">{prediction.contributions.length} features</Badge>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                {prediction.contributions.map((item) => (
                  <div key={item.feature} className="min-w-0">
                    <dt className="truncate text-2xs font-medium uppercase tracking-wide text-ink-muted">
                      {FEATURES[item.feature].label}
                    </dt>
                    <dd className="truncate text-[0.82rem] font-semibold capitalize text-ink">
                      {item.displayValue}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 border-t border-hairline pt-3 text-2xs leading-relaxed text-ink-muted">
                Feature contribution indicates how individual input variables influenced this model
                prediction. It does not represent medical causation.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ------------------------------------------------------- beeswarm */}
      {explanation.beeswarm.length > 0 ? (
        <ChartFrame
          title="SHAP summary distribution"
          description="Every reference record plotted by its attribution, coloured by the feature value that produced it."
          provenance={explanation.provenance}
          descriptionText="SHAP summary plot. Points to the right increased the model output and points to the left decreased it."
        >
          <ShapBeeswarm rows={explanation.beeswarm} />
        </ChartFrame>
      ) : null}

      <InsightsAssistant prediction={prediction} explanation={explanation} />

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" icon={Wand2} onClick={runSample} loading={isLoadingSample}>
          Re-run sample case
        </Button>
        <Button variant="secondary" icon={Sparkles} onClick={() => navigate('/assessment')}>
          New assessment
        </Button>
      </div>

      <ResearchDisclaimer />
    </div>
  )
}
