import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Database,
  MonitorPlay,
  RotateCcw,
  ServerCog,
  ShieldCheck,
  Trash2,
  UserRound,
  WifiOff,
} from 'lucide-react'
import { PageHeader, SectionTitle, KeyValue } from '@/components/medical/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, StatusDot } from '@/components/ui/Badge'
import { Toggle } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { Modal } from '@/components/ui/Modal'
import { InlineDisclaimer } from '@/components/medical/Disclaimer'
import { useApp } from '@/store/AppProvider'
import { useResource } from '@/store/useResource'
import { ml } from '@/services'
import { API_ENDPOINTS } from '@/services/contract'
import { env } from '@/config/env'
import { formatDateTime } from '@/lib/format'

export function SettingsPage() {
  const navigate = useNavigate()
  const { notify } = useToast()
  const {
    mode,
    health,
    isResolving,
    isOnline,
    reconnect,
    presentationMode,
    setPresentationMode,
    stats,
    refreshReports,
  } = useApp()
  const [confirmClear, setConfirmClear] = useState(false)
  const reports = useResource(() => ml().getReports(), [mode])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configuration"
        title="Profile & Settings"
        subtitle="Check the connection to the screening service, the appearance, and the data held in this browser."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ------------------------------------------------ engine status */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>AI engine</CardTitle>
              <CardDescription>Which system is producing the results on screen</CardDescription>
            </div>
            <StatusDot tone={isResolving ? 'neutral' : isOnline ? 'success' : 'danger'} pulse />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-2.5 rounded-input border border-hairline bg-surface-subtle p-3.5">
              {isOnline ? (
                <ServerCog className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden />
              ) : (
                <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
              )}
              <div>
                <p className="text-[0.82rem] font-semibold text-ink">
                  {isResolving
                    ? 'Connecting to the ML service…'
                    : isOnline
                      ? 'Live ML service'
                      : 'Service offline'}
                </p>
                <p className="mt-0.5 text-2xs leading-relaxed text-ink-muted">
                  {health?.message ??
                    'No trained artifacts are available. Start the service and run py -m app.train.'}
                </p>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-4">
              <KeyValue label="Service endpoint" value={env.apiBaseUrl || 'Vite proxy (/api)'} />
              <KeyValue label="Service version" value={health?.version ?? 'Not available'} />
              <KeyValue label="Models loaded" value={health?.modelsLoaded ?? 0} />
              <KeyValue label="SHAP available" value={health?.shapAvailable ? 'Yes' : 'Not available'} />
            </dl>

            <div className="flex flex-wrap gap-2 border-t border-hairline pt-4">
              <Button
                variant="secondary"
                icon={RotateCcw}
                loading={isResolving}
                loadingLabel="Checking…"
                onClick={() => void reconnect()}
              >
                Re-check connection
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* --------------------------------------------------- presentation */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Presentation mode</CardTitle>
              <CardDescription>Optimised for a classroom or projector demonstration</CardDescription>
            </div>
            <MonitorPlay className="h-4 w-4 text-medical-500" aria-hidden />
          </CardHeader>
          <CardContent className="space-y-4">
            <Toggle
              id="presentation-mode"
              checked={presentationMode}
              onChange={setPresentationMode}
              label="Presentation Mode"
              description="Keeps the demo flow visible in the header while stepping through the project story."
            />
            <div className="rounded-input border border-hairline bg-surface-subtle p-3.5">
              <p className="text-2xs font-semibold text-ink">Suggested 5-minute flow</p>
              <ol className="mt-2 space-y-1.5">
                {[
                  'Dashboard — platform overview and current result',
                  'Patient Assessment — load the sample case and run the model',
                  'Explainable AI — feature attributions and the SHAP summary',
                  'CT Analysis — sample slice, original vs segmented',
                  'AI Models — comparison and confusion matrix',
                  'Reports — generate and print the AI analysis report',
                ].map((step, index) => (
                  <li key={step} className="flex gap-2 text-2xs text-ink-soft">
                    <span className="font-bold text-medical-300 tabular">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              <Button
                size="sm"
                className="mt-3"
                variant="secondary"
                onClick={() => navigate('/')}
              >
                Go to dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------- API surface */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>ML API surface</CardTitle>
            <CardDescription>
              Endpoints the application expects from the FastAPI service. The frontend holds no model
              code.
            </CardDescription>
          </div>
          <Badge tone="medical">API contract</Badge>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead>
                <tr className="border-b border-hairline text-2xs uppercase tracking-wide text-ink-muted">
                  <th className="py-2.5 pr-4 font-semibold">Method</th>
                  <th className="py-2.5 pr-4 font-semibold">Endpoint</th>
                  <th className="py-2.5 font-semibold">Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {[
                  ['POST', API_ENDPOINTS.predict, 'Run the screening model for one patient'],
                  ['POST', API_ENDPOINTS.analyzeCt, 'Process a CT slice and return the segmentation'],
                  ['GET', API_ENDPOINTS.models, 'List trained models and evaluation metrics'],
                  ['GET', API_ENDPOINTS.datasets, 'Return dataset metadata and distributions'],
                  ['POST', API_ENDPOINTS.explain, 'Return SHAP attribution for a prediction'],
                  ['POST', API_ENDPOINTS.report, 'Generate or retrieve an analysis report'],
                ].map(([method, endpoint, purpose]) => (
                  <tr key={endpoint}>
                    <td className="py-2.5 pr-4">
                      <Badge tone={method === 'GET' ? 'teal' : 'medical'}>{method}</Badge>
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-2xs text-ink">{endpoint}</td>
                    <td className="py-2.5 text-ink-soft">{purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------- local data + profile */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Local data</CardTitle>
              <CardDescription>Everything is kept in this browser only</CardDescription>
            </div>
            <Database className="h-4 w-4 text-medical-500" aria-hidden />
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-2 gap-4">
              <KeyValue label="Assessments this session" value={stats.assessments} />
              <KeyValue label="CT analyses this session" value={stats.ctAnalyses} />
              <KeyValue label="Reports generated" value={stats.reports} />
              <KeyValue label="Stored reports" value={reports.data?.length ?? '—'} />
            </dl>
            {stats.lastPatient ? (
              <p className="text-2xs text-ink-muted">
                Last case analysed:{' '}
                <span className="font-semibold text-ink-soft">
                  {stats.lastPatient.patientId || 'Unassigned'}
                </span>{' '}
                · {stats.lastPatient.age ?? '—'} years
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2 border-t border-hairline pt-4">
              <Button
                variant="secondary"
                size="sm"
                icon={RotateCcw}
                onClick={() => {
                  refreshReports()
                  notify({ tone: 'info', title: 'Reports refreshed' })
                }}
              >
                Refresh reports
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={Trash2}
                onClick={() => setConfirmClear(true)}
                title="Removes reports and session counters stored in this browser"
              >
                Clear local data
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Research environment</CardDescription>
            </div>
            <UserRound className="h-4 w-4 text-medical-500" aria-hidden />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 rounded-input border border-hairline bg-surface-subtle p-3.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-medical-500 to-teal-500 text-sm font-bold text-white">
                LC
              </span>
              <div>
                <p className="text-[0.85rem] font-semibold text-ink">Researcher</p>
                <p className="text-2xs text-ink-muted">Educational prototype environment</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 rounded-input border border-teal-100 bg-tint-teal p-3.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden />
              <p className="text-2xs leading-relaxed text-teal-700 dark:text-teal-300">
                No real patient data is collected, transmitted or stored. Demonstrations should use
                synthetic or de-identified records only.
              </p>
            </div>
            <InlineDisclaimer />
          </CardContent>
        </Card>
      </div>

      <SectionTitle
        title="About this build"
        description="Runtime configuration values for the current environment."
      />
      <Card>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KeyValue label="Mode" value={isOnline ? 'Live service' : 'Offline'} />
                        <KeyValue label="Max upload size" value={`${Math.round(env.maxUploadBytes / 1024 / 1024)} MB`} />
            <KeyValue
              label="Reports last loaded"
              value={reports.data?.length ? formatDateTime(reports.data[0].createdAt) : 'Not available'}
            />
          </dl>
        </CardContent>
      </Card>

      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Clear local data"
        description="This removes reports and session counters stored in this browser."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              icon={Trash2}
              onClick={() => {
                try {
                  window.localStorage.removeItem('lungcare.reports.v1')
                  window.localStorage.removeItem('lungcare.session.v1')
                } catch {
                  /* storage may be blocked */
                }
                setConfirmClear(false)
                notify({
                  tone: 'success',
                  title: 'Local data cleared',
                  description: 'The page will reload with an empty session.',
                })
                window.setTimeout(() => window.location.reload(), 700)
              }}
            >
              Clear data
            </Button>
          </>
        }
      >
        <p className="text-[0.82rem] leading-relaxed text-ink-soft">
          This action cannot be undone. It does not affect any file on your computer and does not
          contact the ML service.
        </p>
      </Modal>
    </div>
  )
}
