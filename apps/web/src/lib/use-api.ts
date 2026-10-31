// Loads data from a GET route and keeps it in state. Call reload() after a change, e.g. a new user.
import * as React from "react"

import { ApiError, api } from "@/lib/api.ts"

export function useApi<T>(path: string) {
  const [data, setData] = React.useState<T | undefined>(undefined)
  const [error, setError] = React.useState<ApiError | null>(null)
  const [version, setVersion] = React.useState(0)

  React.useEffect(() => {
    let cancelled = false // ignore the answer if the screen was left or the path changed meanwhile
    api<T>(path)
      .then((result) => {
        if (cancelled) return
        setData(result)
        setError(null)
      })
      .catch((caught: unknown) => {
        if (cancelled) return
        setError(caught instanceof ApiError ? caught : new ApiError(0, "INTERNAL_ERROR", String(caught)))
      })
    return () => {
      cancelled = true
    }
  }, [path, version])

  const reload = React.useCallback(() => setVersion((v) => v + 1), [])
  return { data, error, loading: data === undefined && error === null, reload }
}
