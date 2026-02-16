import { useState, useEffect, useRef, useCallback } from 'react'
import { getAnalysisStatus, getLastResult } from '../api/client'

/**
 * Manages the full lifecycle of running an analysis:
 *  - Calls the API, shows loading state
 *  - On axios timeout / network error, polls /api/analysis/status
 *    to check if the backend is still crunching
 *  - When polling detects completion, fetches the cached result
 *  - Exposes a "waiting" state so the UI can show a different message
 *
 * Returns { run, loading, waiting, error }
 *   - loading: the initial HTTP request is in-flight
 *   - waiting: the request timed out but the backend is still running
 *
 * `setResult` signature: (data, source?) => void  (matches usePersistedResult)
 */
export default function useAnalysisRunner(apiFn, setResult, analysisLabel, dataSource) {
  const [loading, setLoading] = useState(false)
  const [waiting, setWaiting] = useState(false) // backend still running after frontend timeout
  const [error, setError] = useState(null)
  const pollRef = useRef(null)

  // Stop any active polling
  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  // Clean up on unmount
  useEffect(() => stopPolling, [stopPolling])

  // Start polling /api/analysis/status every 5s
  const startPolling = useCallback(() => {
    setWaiting(true)
    setError(null)
    pollRef.current = setInterval(async () => {
      try {
        const res = await getAnalysisStatus()
        const { busy, has_result, last_error } = res.data
        if (!busy) {
          // Analysis finished (or crashed) on the backend
          stopPolling()
          setWaiting(false)
          if (has_result) {
            // Fetch the cached result
            try {
              const r = await getLastResult()
              setResult(r.data.data, dataSource)
            } catch {
              setError('Analysis finished but failed to fetch results.')
            }
          } else if (last_error) {
            setError(last_error)
          } else {
            setError('Analysis ended without producing results.')
          }
        }
        // else: still busy → keep polling
      } catch {
        // status endpoint itself failed — keep trying
      }
    }, 5000)
  }, [stopPolling, setResult])

  const run = useCallback(
    (params) => {
      setLoading(true)
      setWaiting(false)
      setError(null)
      stopPolling()

      apiFn(params)
        .then((res) => {
          setResult(res.data.data, dataSource)
          setLoading(false)
        })
        .catch((err) => {
          setLoading(false)

          // If the error is a timeout or network error, the backend may
          // still be processing. Poll to find out.
          const isTimeout =
            err.code === 'ECONNABORTED' ||
            err.message?.includes('timeout') ||
            err.message?.includes('Network Error')

          const is429 = err.response?.status === 429

          if (isTimeout) {
            // Don't show error — switch to polling mode
            startPolling()
          } else if (is429) {
            // Another analysis is already running, poll for its completion
            setError(err.response?.data?.detail || 'Another analysis is already running.')
          } else {
            setError(err.response?.data?.detail || err.message)
          }
        })
    },
    [apiFn, setResult, stopPolling, startPolling],
  )

  return { run, loading, waiting, error, stopPolling }
}
