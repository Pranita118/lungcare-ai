import type { ApiMode } from '@/types'
import type { MLService } from './contract'
import { LiveMLService } from './live/liveService'
import { probeHealth } from './http'
import { AppError } from '@/types'

/**
 * Live-only service resolution.
 *
 * There is no simulated engine. The application either talks to the real FastAPI
 * service, or it reports that the service is unavailable. A result is never
 * invented to keep the interface looking complete.
 */
class ServiceRegistry {
  private current: MLService = new LiveMLService()
  private listeners = new Set<(mode: ApiMode) => void>()
  private resolved = false
  private mode: ApiMode = 'connecting'

  get service(): MLService {
    return this.current
  }

  get apiMode(): ApiMode {
    return this.mode
  }

  get isResolved(): boolean {
    return this.resolved
  }

  get isOnline(): boolean {
    return this.mode === 'live'
  }

  subscribe(listener: (mode: ApiMode) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private set(mode: ApiMode) {
    this.current = new LiveMLService()
    this.mode = mode
    this.resolved = true
    this.listeners.forEach((listener) => listener(mode))
  }

  /**
   * Probes the backend. Resolves to `live` when the service answers with
   * trained artifacts, and `offline` when it does not.
   */
  async resolve(): Promise<MLService> {
    const health = await probeHealth()
    this.set(health ? 'live' : 'offline')
    return this.current
  }

  /** Marks the service as reachable again after a successful call. */
  markOnline(): void {
    if (this.mode !== 'live') this.set('live')
  }

  /** Marks the service as unreachable. The UI then blocks and offers a retry. */
  markOffline(): void {
    if (this.mode !== 'offline') this.set('offline')
  }
}

export const registry = new ServiceRegistry()

/** Convenience accessor used by the app state layer. */
export function ml(): MLService {
  return registry.service
}

/**
 * Single place that decides whether a failed call means "the service is gone".
 * Returns true when the caller should surface the offline screen.
 */
export function isConnectivityFailure(error: unknown): boolean {
  if (!(error instanceof AppError)) return false
  return /could not reach|connection|network|service is unavailable|unavailable/i.test(
    `${error.userMessage} ${error.hint}`,
  )
}
