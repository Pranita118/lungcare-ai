import { AppError, type HealthResponse } from '@/types'
import { env } from '@/config/env'

export interface RequestOptions {
  method?: 'GET' | 'POST'
  body?: unknown
  signal?: AbortSignal
  timeoutMs?: number
  /** FormData uploads must not set Content-Type manually. */
  isForm?: boolean
}

const USER_FACING_MESSAGES: { match: RegExp; message: string; hint: string }[] = [
  {
    match: /timeout|aborted/i,
    message: 'The analysis took longer than expected.',
    hint: 'The service may be busy. Please try again.',
  },
  {
    match: /failed to fetch|networkerror|load failed/i,
    message: 'Unable to reach the analysis service.',
    hint: 'Check that the service is running, then retry.',
  },
  {
    match: /unprocessable|422/i,
    message: 'Some submitted values could not be processed.',
    hint: 'Please review the highlighted fields and try again.',
  },
  {
    match: /500|internal server/i,
    message: 'Unable to complete the analysis.',
    hint: 'The service reported an internal problem. Please try again.',
  },
]

function mapFailure(error: unknown, fallback: string): AppError {
  if (error instanceof AppError) return error

  const raw = error instanceof Error ? error.message : String(error)
  const match = USER_FACING_MESSAGES.find((entry) => entry.match.test(raw))
  if (match) {
    return new AppError(match.message, { hint: match.hint, cause: error })
  }
  return new AppError(fallback, { cause: error })
}

/**
 * Single network entry point. Translates transport/parser failures into
 * user-safe AppErrors so raw stack traces never reach the interface.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, timeoutMs = env.requestTimeoutMs, isForm = false } = options
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)

  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort(), { once: true })
  }

  try {
    const response = await fetch(`${env.apiBaseUrl}${path}`, {
      method,
      signal: controller.signal,
      headers: isForm || body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body:
        body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    })

    if (!response.ok) {
      throw new AppError(
        'Unable to complete the analysis.',
        {
          hint:
            response.status >= 500
              ? 'The analysis service reported a problem. Please try again.'
              : 'Please verify the input information and try again.',
          cause: { status: response.status },
        },
      )
    }

    if (response.status === 204) return undefined as T

    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) {
      throw new AppError('The analysis service returned an unexpected response.', {
        hint: 'Please try again in a moment.',
      })
    }
    return (await response.json()) as T
  } catch (error) {
    throw mapFailure(error, 'Unable to complete the analysis.')
  } finally {
    window.clearTimeout(timer)
  }
}

/**
 * Start-up probe. Returns the service health payload when trained artifacts are
 * available, or `null` when the service cannot be reached / has nothing trained.
 */
export async function probeHealth(): Promise<HealthResponse | null> {
  try {
    const result = await request<HealthResponse>('/api/health', {
      timeoutMs: env.healthProbeTimeoutMs,
    })
    if (result?.status !== 'ok' || result.mode !== 'live') return null
    return result
  } catch {
    return null
  }
}
