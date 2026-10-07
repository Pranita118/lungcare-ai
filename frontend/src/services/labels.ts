/**
 * Engine labels shown next to results.
 *
 * The application is live-only, so the only distinction that matters is whether
 * an image was processed by the server pipeline or on the user's own device.
 */
export const LIVE_ENGINE_LABEL = 'Trained model served by the LungCare ML API'

export const CLIENT_CT_ENGINE_LABEL = 'On-device image processing (no tumour detector involved)'

export const ENGINE_LABELS: Record<string, string> = {
  server: LIVE_ENGINE_LABEL,
  client: CLIENT_CT_ENGINE_LABEL,
}

export function engineLabel(engine: string): string {
  return ENGINE_LABELS[engine] ?? LIVE_ENGINE_LABEL
}
