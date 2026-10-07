/**
 * Runtime configuration.
 *
 * The application is live-only: it requires a reachable ML service with trained
 * artifacts. If the service is down the interface says so and offers a retry —
 * it never substitutes simulated results.
 */
const rawBase = (import.meta.env.VITE_API_BASE_URL ?? '').trim()

/** Reads a positive integer from the environment, falling back when unusable. */
function intFromEnv(name: string, fallback: number): number {
  const parsed = Number.parseInt(import.meta.env[name] ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export const env = {
  /** Empty string routes requests through the Vite dev proxy. */
  apiBaseUrl: rawBase.replace(/\/$/, ''),
  requestTimeoutMs: intFromEnv('VITE_REQUEST_TIMEOUT_MS', 45_000),
  /**
   * Timeout for the reachability probe that gates the connection screen.
   *
   * In development the service is already running, so 3 s is generous. In
   * deployment the ML service is on a free tier that spins down when idle, and a
   * cold start has to import SHAP and load every model before it can answer —
   * that takes 40-60 s. A 3 s probe therefore reports "not connected" for a
   * service that is actually about to reply, and the user sees an error screen
   * on a perfectly healthy deployment. The production default is long enough to
   * outlast a cold start; override with VITE_HEALTH_PROBE_TIMEOUT_MS if your
   * host needs a different allowance.
   */
  healthProbeTimeoutMs: intFromEnv('VITE_HEALTH_PROBE_TIMEOUT_MS', isDevBuild() ? 3_000 : 75_000),
  maxUploadBytes: 12 * 1024 * 1024,
  allowedImageTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/dicom'] as const,
} as const

export const isDev = import.meta.env.DEV

/** True in `vite dev`; false in a production build, including `vite preview`. */
function isDevBuild(): boolean {
  return import.meta.env.DEV
}
