import { useState, useEffect, useCallback, useRef } from 'react'

const STORAGE_PREFIX = 'openoa_result_'

/**
 * Like useState but persists the value in localStorage under a unique key.
 * Stores metadata alongside the result: timestamp, data source, etc.
 *
 * Returns [result, setResult, resultMeta, isFreshRun]
 *   - result:     the raw analysis data (or null)
 *   - setResult:  (data, source?) => void — auto-stamps metadata
 *   - resultMeta: { timestamp, source } of the cached result
 *   - isFreshRun: boolean — true only after setResult is called during this
 *                 page visit (i.e. the user clicked "Run" and got new results)
 */
export default function usePersistedResult(analysisKey) {
  const storageKey = STORAGE_PREFIX + analysisKey

  // Load persisted envelope { data, _meta }
  const [envelope, setEnvelopeRaw] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (!stored) return null
      const parsed = JSON.parse(stored)
      // Support old format (raw data without _meta wrapper)
      if (parsed && !parsed._meta) {
        return { data: parsed, _meta: { timestamp: null, source: 'unknown' } }
      }
      return parsed
    } catch {
      return null
    }
  })

  // Track whether the user has run the analysis during *this* page visit
  const freshRef = useRef(false)
  const [isFreshRun, setIsFreshRun] = useState(false)

  // Keep localStorage in sync
  useEffect(() => {
    try {
      if (envelope === null) {
        localStorage.removeItem(storageKey)
      } else {
        localStorage.setItem(storageKey, JSON.stringify(envelope))
      }
    } catch {
      // localStorage full or unavailable — silently ignore
    }
  }, [envelope, storageKey])

  /**
   * Save a new result. Pass `source` (e.g. "demo" / "custom") to stamp it.
   * Passing null clears the result.
   */
  const setResult = useCallback((data, source) => {
    if (data === null) {
      setEnvelopeRaw(null)
      freshRef.current = false
      setIsFreshRun(false)
      return
    }
    setEnvelopeRaw({
      data,
      _meta: {
        timestamp: new Date().toISOString(),
        source: source || 'unknown',
      },
    })
    freshRef.current = true
    setIsFreshRun(true)
  }, [])

  const result = envelope?.data ?? null
  const resultMeta = envelope?._meta ?? null

  return [result, setResult, resultMeta, isFreshRun]
}

/**
 * Trigger a JSON file download of the given data object.
 * Strips out base64 plot images to keep the file small & useful.
 */
export function downloadResultJSON(data, filename) {
  if (!data) return
  // Deep clone and strip plots (base64 blobs are huge)
  const clean = JSON.parse(JSON.stringify(data))
  if (clean.plots) {
    Object.keys(clean.plots).forEach(k => {
      clean.plots[k] = '(base64 image omitted)'
    })
  }
  const blob = new Blob([JSON.stringify(clean, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Trigger a CSV file download of scalar metrics from the result object.
 * Arrays, objects, and base64 images are excluded — only flat key:value pairs.
 */
export function downloadResultCSV(data, filename) {
  if (!data) return
  const rows = [['Metric', 'Value']]
  for (const [key, value] of Object.entries(data)) {
    // Skip plots, arrays, nested objects
    if (key === 'plots') continue
    if (Array.isArray(value)) {
      rows.push([key, `[${value.length} items]`])
      continue
    }
    if (value !== null && typeof value === 'object') {
      // Flatten one level (e.g., turbine_wake_losses)
      for (const [subKey, subVal] of Object.entries(value)) {
        rows.push([`${key}.${subKey}`, subVal ?? ''])
      }
      continue
    }
    rows.push([key, value ?? ''])
  }
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
