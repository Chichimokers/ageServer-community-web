import { useCallback, useEffect, useState } from "react"
import { getErrorMessage } from "./community"

export interface RemoteState<T> {
  data: T | undefined
  error: string
  loading: boolean
  refresh: () => void
}

export function useRemote<T>(load: () => Promise<T>): RemoteState<T> {
  const [requestNumber, setRequestNumber] = useState(0)
  const [result, setResult] = useState<{
    data: T | undefined
    error: string
    requestNumber: number
  }>({ data: undefined, error: "", requestNumber: -1 })

  const refresh = useCallback(() => setRequestNumber((previous) => previous + 1), [])

  useEffect(() => {
    let active = true
    load()
      .then((result) => {
        if (active) setResult({ data: result, error: "", requestNumber })
      })
      .catch((reason: unknown) => {
        if (active) setResult({ data: undefined, error: getErrorMessage(reason), requestNumber })
      })

    return () => {
      active = false
    }
  }, [load, requestNumber])

  const current = result.requestNumber === requestNumber
  return {
    data: current ? result.data : undefined,
    error: current ? result.error : "",
    loading: !current,
    refresh,
  }
}
