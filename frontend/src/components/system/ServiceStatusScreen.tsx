import { useState } from 'react'
import { Database, RefreshCw, ServerCrash, Terminal, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/layout/Brand'
import { useApp } from '@/store/AppProvider'
import { useHealth } from '@/store/HealthProvider'
import { PatientDisclaimer } from '@/components/patient/Safety'
import { env, isDev } from '@/config/env'

const STEPS = [
  { icon: Terminal, title: 'Open a terminal in the backend folder', copy: 'cd backend' },
  { icon: Database, title: 'Add the project dataset', copy: 'Place lung_cancer_dataset.csv in backend/data' },
  {
    icon: RefreshCw,
    title: 'Train the screening models',
    copy: 'py -m app.train   (writes metrics + artifacts)',
  },
  { icon: ServerCrash, title: 'Start the service', copy: 'uvicorn app.main:app --reload --port 8000' },
]

/**
 * Live-only connection screen.
 *
 * LungCare AI has no simulated engine, so when the ML service is unreachable the
 * application stops here and explains how to bring it online. Nothing is faked.
 */
export function ServiceOfflineScreen() {
  const { reconnect, isResolving } = useApp()
  const { clearAll } = useHealth()
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <Logo size="lg" />
          <div>
            <p className="font-display text-lg font-bold leading-tight text-ink">LungCare AI</p>
            <p className="text-2xs text-ink-muted">AI Healthcare Platform</p>
          </div>
        </div>

        <div className="rounded-panel border border-hairline bg-surface p-6 shadow-panel sm:p-8">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-danger/10 text-danger">
              <WifiOff className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-xl font-bold text-ink">
                The screening service is not connected
              </h1>
              <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-soft">
                LungCare AI works only with real, trained model artifacts. Because the service is
                not answering, screening results are unavailable rather than simulated.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-card border border-hairline bg-surface-subtle p-4">
            <p className="text-2xs font-semibold uppercase tracking-wide text-ink-muted">
              Start the service
            </p>
            <ol className="mt-3 space-y-2.5">
              {STEPS.map((step, index) => (
                <li key={step.title} className="flex items-start gap-2.5">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-medical-50 text-2xs font-bold text-medical-600">
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[0.82rem] font-semibold text-ink">{step.title}</span>
                    <code className="mt-0.5 block font-mono text-2xs text-ink-soft">{step.copy}</code>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-3 border-t border-hairline pt-3 text-2xs leading-relaxed text-ink-muted">
              {isDev ? (
                <>
                  The frontend proxies <code className="font-mono">/api</code> to{' '}
                  <code className="font-mono">http://127.0.0.1:8000</code> in development. If the
                  service runs elsewhere, set{' '}
                  <code className="font-mono">VITE_API_BASE_URL</code> in{' '}
                  <code className="font-mono">frontend/.env</code>.
                </>
              ) : (
                <>
                  This deployment calls{' '}
                  <code className="font-mono">{env.apiBaseUrl || '/api'}</code>. If the screening
                  service is unreachable, wait a moment and try again — a cold start can take up to
                  a minute. If it keeps failing, the service owner should check that the ML API is
                  running.
                </>
              )}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button icon={RefreshCw} loading={isResolving} loadingLabel="Checking…" onClick={() => void reconnect()}>
              Try again
            </Button>
            <Button variant="secondary" onClick={() => setShowDetails((value) => !value)}>
              {showDetails ? 'Hide details' : 'Technical details'}
            </Button>
          </div>

          {showDetails ? (
            <div className="mt-4 rounded-card border border-hairline bg-viewer p-3.5">
              <p className="text-2xs leading-relaxed text-[#B7CBD9]">
                GET /api/health returned no trained artifacts. The service must be running and
                <code className="mx-1 font-mono text-white">backend/artifacts/registry.json</code>
                must exist. Re-run <code className="font-mono text-white">py -m app.train</code> if
                the dataset has changed.
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-5 rounded-card border border-hairline bg-surface p-4">
          <p className="text-[0.82rem] font-semibold text-ink">Waiting on the service</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">
            Anything you have already entered is stored on this device and will still be here once
            the service is running.
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => {
              clearAll()
              window.location.reload()
            }}
          >
            Clear the data stored on this device
          </Button>
        </div>

        <PatientDisclaimer className="mt-5" />
      </div>
    </div>
  )
}

/** Full-screen loader shown while the first connection check runs. */
export function ServiceConnectingScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-4">
      <div className="flex flex-col items-center text-center">
        <Logo size="lg" />
        <div className="mt-6 flex items-center gap-1" aria-hidden>
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className="h-2 w-2 rounded-full bg-medical-400"
              style={{ animation: `pulse-dot 1.3s ease-in-out ${index * 0.16}s infinite` }}
            />
          ))}
        </div>
        <p className="mt-4 font-display text-sm font-semibold text-ink" role="status">
          Connecting to the screening service…
        </p>
        <p className="mt-1 text-xs text-ink-muted">Checking for trained model artifacts</p>
      </div>
    </div>
  )
}
