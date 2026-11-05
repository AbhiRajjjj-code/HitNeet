import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Loads data and tracks the 3 states every screen must handle:
 * loading, error (with retry), and success.
 *
 *   const { data, error, loading, reload } = useAsync(() => api.listTests(), [])
 *
 * `reload()` refreshes in the background: the old data stays on screen
 * (no skeleton flash) until the new data arrives.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)
  const fnRef = useRef(fn)
  fnRef.current = fn
  const runId = useRef(0)

  const run = useCallback((silent: boolean) => {
    const id = ++runId.current
    if (!silent) setLoading(true)
    setError(null)
    fnRef
      .current()
      .then((d) => {
        if (id === runId.current) setData(d)
      })
      .catch((e: unknown) => {
        if (id === runId.current) setError(e instanceof Error ? e : new Error('Something went wrong.'))
      })
      .finally(() => {
        if (id === runId.current) setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    run(false)
  }, [run])

  const reload = useCallback(() => run(true), [run])

  return { data, error, loading, reload, setData }
}
