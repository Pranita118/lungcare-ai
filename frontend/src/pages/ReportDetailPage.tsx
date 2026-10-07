import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Printer, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/medical/PageHeader'
import { Button } from '@/components/ui/Button'
import { ErrorState, LoadingState } from '@/components/ui/StatusStates'
import { ReportDocumentView } from '@/components/results/ReportDocumentView'
import { useApp } from '@/store/AppProvider'
import { useResource } from '@/store/useResource'
import { ml } from '@/services'

export function ReportDetailPage() {
  const { reportId = '' } = useParams()
  const navigate = useNavigate()
  const { mode, latestReport } = useApp()

  const document = useResource(
    () => ml().getReportDocument(reportId),
    [reportId, mode],
    { enabled: Boolean(reportId) },
  )

  if (document.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Report" title="AI Analysis Report" />
        <LoadingState title="Loading report…" description="Retrieving the stored analysis document." />
      </div>
    )
  }

  if (document.error) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Report" title="AI Analysis Report" />
        <ErrorState error={document.error} onRetry={document.reload} />
        <Link
          to="/reports"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-medical-600 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to reports
        </Link>
      </div>
    )
  }

  if (!document.data) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Report" title="AI Analysis Report" />
        <div className="rounded-panel border border-dashed border-medical-200 bg-surface/70 px-6 py-14 text-center">
          <p className="font-display text-sm font-semibold text-ink">Report not found</p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-ink-muted">
            {latestReport
              ? `Report ${reportId} is not stored in this browser. Reports are kept locally, so a report generated in another browser or session is not available here.`
              : 'Reports are stored in this browser only. Generate a report from a patient assessment or CT analysis to view it here.'}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Button variant="secondary" onClick={() => navigate('/reports')}>
              Back to reports
            </Button>
            <Button icon={RefreshCw} onClick={document.reload}>
              Try again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Report"
        title="AI Analysis Report"
        subtitle="Generated summary of the screening and image analysis performed for this case."
        actions={
          <>
            <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/reports')}>
              Back to reports
            </Button>
            <Button
              variant="secondary"
              icon={Download}
              onClick={() => window.print()}
              title="Opens the browser print dialog — choose “Save as PDF” to download"
            >
              Download PDF
            </Button>
            <Button icon={Printer} onClick={() => window.print()}>
              Print
            </Button>
          </>
        }
      />

      <ReportDocumentView record={document.data.record} payload={document.data.payload} />

      <p className="text-center text-2xs text-ink-muted no-print">
        To export this report, use “Download PDF” and select “Save as PDF” as the destination in the
        print dialog.
      </p>
    </div>
  )
}
