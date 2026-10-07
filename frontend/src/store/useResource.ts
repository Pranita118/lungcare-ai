import { useCallback, useEffect, useRef, useState } from 'react'
import { AppError } from '@/types'

export interface Resource<T> {
  data: T | null
  error: AppError | null
  isLoading: boolean
  reload: () => void
}

/**
 * Small data-loading hook for read-only endpoints (models, datasets, reports).
 * Failures are normalised into user-safe AppErrors.
 */
export function useResource<T>(
  loader: () => Promise<T>,
  deps: unknown[] = [],
  options: { enabled?: boolean } = {},
): Resource<T> {
  const enabled = options.enabled ?? true
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<AppError | null>(null)
  const [isLoading, setIsLoading] = useState(enabled)
  const [nonce, setNonce] = useState(0)
  const loaderRef = useRef(loader)
  loaderRef.current = loader

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false)
      return
    }
    let active = true
    setIsLoading(true)
    setError(null)
    loaderRef
      .current()
      .then((result) => {
        if (!active) return
        setData(result)
        setIsLoading(false)
      })
      .catch((cause) => {
        if (!active) return
        setError(
          cause instanceof AppError
            ? cause
            : new AppError('Unable to load this information.', { cause }),
        )
        setIsLoading(false)
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce, enabled])

  const reload = useCallback(() => setNonce((value) => value + 1), [])

  return { data, error, isLoading, reload }
}
