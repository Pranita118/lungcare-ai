/**
 * Runtime configuration.
 *
 * The application is live-only: it requires a reachable ML service with trained
 * artifacts. If the service is down the interface says so and offers a retry —
 * it never substitutes simulated results.
 */
const rawBase = (import.meta.env.VITE_API_BASE_URL ?? '').trim()

export const env = {
  /** Empty string routes requests through the Vite dev proxy. */
  apiBaseUrl: rawBase.replace(/\/$/, ''),
  requestTimeoutMs: 45_000,
  healthProbeTimeoutMs: 3_000,
  maxUploadBytes: 12 * 1024 * 1024,
  allowedImageTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/dicom'] as const,
} as const

export const isDev = import.meta.env.DEV
