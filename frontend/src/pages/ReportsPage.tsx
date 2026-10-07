import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  FileText,
  FilePlus2,
  RefreshCw,
  ScanLine,
  Search,
  Sparkles,
} from 'lucide-react'
import { PageHeader } from '@/components/medical/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, ProvenanceChip, RiskBadge } from '@/components/ui/Badge'
import { TextInput } from '@/components/ui/Input'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StatusStates'
import { Modal } from '@/components/ui/Modal'
import { InlineDisclaimer } from '@/components/medical/Disclaimer'
import { useApp } from '@/store/AppProvider'
import { useToast } from '@/components/ui/Toast'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/cn'

export function ReportsPage() {
  const navigate = useNavigate()
  const { notify } = useToast()
  const {
    reports,
    reportsError,
    isLoadingReports,
    refreshReports,
    prediction,
    explanation,
    ctResult,
    generateReport,
    isGeneratingReport,
  } = useApp()
  const [query, setQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return reports
    return reports.filter((report) =>
      [report.id, report.patientId, report.patientLabel, report.modelName, report.resultLabel]
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [reports, query])

  const canGenerate = Boolean(prediction || ctResult)

  const handleGenerate = async () => {
    const payload = {
      patient: prediction?.patient ?? {
        patientId: 'IMAGE-ONLY',
        age: null,
        gender: '' as const,
        packYears: null,
        radonExposure: '' as const,
        asbestosExposure: '' as const,
        secondhandSmokeExposure: '' as const,
        copdDiagnosis: '' as const,
        alcoholConsumption: '' as const,
        familyHistory: '' as const,
      },
      prediction,
      explanation,
      ct: ctResult,
    }
    const record = await generateReport(payload)
    if (record) {
      setDialogOpen(false)
      notify({
        tone: 'success',
        title: 'Report generated',
        description: `${record.id} is ready to review.`,
      })
      navigate(`/reports/${record.id}`)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Documentation"
        title="AI Analysis Reports"
        subtitle="Structured summaries of each screening and image analysis run performed in this project."
        actions={
          <>
            <Button
              variant="secondary"
              icon={RefreshCw}
              onClick={refreshReports}
              disabled={isLoadingReports}
            >
              Refresh
            </Button>
            <Button
              icon={FilePlus2}
              disabled={!canGenerate}
              onClick={() => setDialogOpen(true)}
              title={canGenerate ? undefined : 'Run a patient assessment or CT analysis first'}
            >
              Generate Report
            </Button>
          </>
        }
      />

      {!canGenerate ? (
        <div className="flex flex-wrap items-center gap-3 rounded-card border border-dashed border-medical-200 bg-surface/70 px-4 py-3.5">
          <Sparkles className="h-4 w-4 shrink-0 text-medical-500" aria-hidden />
          <p className="flex-1 text-2xs leading-relaxed text-ink-muted">
            Run a patient assessment or a CT image analysis in this session to enable report
            generation.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => navigate('/assessment')}>
              Patient assessment
            </Button>
            <Button size="sm" variant="secondary" icon={ScanLine} onClick={() => navigate('/ct-analysis')}>
              CT analysis
            </Button>
          </div>
        </div>
      ) : null}

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-4">
            <div>
              <h2 className="font-display text-[0.95rem] font-semibold text-ink">Report history</h2>
              <p className="text-2xs text-ink-muted">
                {isLoadingReports
                  ? 'Loading reports…'
                  : `${filtered.length} report${filtered.length === 1 ? '' : 's'}`}
              </p>
            </div>
            <div className="w-full sm:w-64">
              <label htmlFor="report-search" className="sr-only">
                Search reports
              </label>
              <TextInput
                id="report-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by ID, case or model"
                prefix={<Search className="h-4 w-4" />}
              />
            </div>
          </div>

          {isLoadingReports ? (
            <div className="p-5">
              <LoadingState title="Loading reports…" compact />
            </div>
          ) : reportsError ? (
            <div className="p-5">
              <ErrorState error={reportsError} onRetry={refreshReports} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={FileText}
                title={query ? 'No matching reports' : 'No reports yet'}
                description={
                  query
                    ? 'Try a different report ID, case reference or model name.'
                    : 'Generate a report from a patient assessment or CT analysis to see it listed here.'
                }
                action={
                  query ? (
                    <Button variant="secondary" onClick={() => setQuery('')}>
                      Clear search
                    </Button>
                  ) : (
                    <Button
                      icon={Sparkles}
                      disabled={!canGenerate}
                      onClick={() => navigate('/assessment')}
                    >
                      Start assessment
                    </Button>
                  )
                }
                className="border-0 bg-transparent"
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead>
                  <tr className="border-b border-hairline bg-surface-subtle text-2xs uppercase tracking-wide text-ink-muted">
                    <th className="px-5 py-3 font-semibold">Report ID</th>
                    <th className="px-5 py-3 font-semibold">Patient / Case</th>
                    <th className="px-5 py-3 font-semibold">Analysis type</th>
                    <th className="px-5 py-3 font-semibold">Result</th>
                    <th className="px-5 py-3 font-semibold">Model</th>
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {filtered.map((report) => (
                    <tr key={report.id} className="transition-colors hover:bg-surface-subtle">
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-2xs font-semibold text-medical-600">
                          {report.id}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="block font-semibold text-ink">{report.patientLabel}</span>
                        <span className="block text-2xs text-ink-muted">{report.patientId}</span>
                      </td>
                      <td className="px-5 py-3.5 text-ink-soft">{report.analysisType}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-ink-soft">{report.resultLabel}</span>
                          {report.includesCt ? (
                            <Badge tone="teal" className="mr-1">
                              + CT
                            </Badge>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-ink-soft">{report.modelName}</td>
                      <td className="px-5 py-3.5 text-ink-muted tabular">
                        {formatDateTime(report.createdAt)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <RiskBadge level={report.riskLevel} size="sm" showLabel={false} />
                          <ProvenanceChip provenance={report.provenance} compact />
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          iconRight={ArrowRight}
                          onClick={() => navigate(`/reports/${report.id}`)}
                        >
                          View Report
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <InlineDisclaimer />

      <Modal
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Generate AI analysis report"
        description="The report captures everything currently held in this session."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              icon={FileText}
              loading={isGeneratingReport}
              loadingLabel="Generating report…"
              onClick={handleGenerate}
            >
              Generate Report
            </Button>
          </>
        }
      >
        <ul className="space-y-3">
          <IncludeRow
            label="AI screening result"
            available={Boolean(prediction)}
            detail={
              prediction
                ? `${prediction.riskCategoryLabel} · ${prediction.model.name}`
                : 'No patient assessment has been run in this session.'
            }
          />
          <IncludeRow
            label="Explainable AI summary"
            available={Boolean(explanation)}
            detail={
              explanation
                ? `${explanation.local.length} feature attributions · ${explanation.method}`
                : 'Available after a patient assessment.'
            }
          />
          <IncludeRow
            label="CT image analysis"
            available={Boolean(ctResult)}
            detail={
              ctResult
                ? `${ctResult.regions.length} regions of interest · ${ctResult.width}×${ctResult.height} px`
                : 'No CT slice has been processed in this session.'
            }
          />
        </ul>
        <p className={cn('mt-4 rounded-input bg-surface-subtle p-3 text-2xs leading-relaxed text-ink-muted')}>
          Reports are stored in this browser only. Each one records which model produced it, and a
          report is only created when the trained model service is connected.
        </p>
      </Modal>
    </div>
  )
}

function IncludeRow({
  label,
  available,
  detail,
}: {
  label: string
  available: boolean
  detail: string
}) {
  return (
    <li className="flex items-start gap-3 rounded-input border border-hairline bg-surface p-3.5">
      <span
        className={cn(
          'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[0.6rem] font-bold',
          available ? 'bg-success/12 text-success-ink' : 'bg-surface-muted text-ink-muted',
        )}
        aria-hidden
      >
        {available ? '✓' : '—'}
      </span>
      <div className="min-w-0">
        <p className="text-[0.82rem] font-semibold text-ink">
          {label}
          <span className="ml-2 text-2xs font-normal text-ink-muted">
            {available ? 'Included' : 'Not available'}
          </span>
        </p>
        <p className="mt-0.5 text-2xs leading-relaxed text-ink-muted">{detail}</p>
      </div>
    </li>
  )
}
