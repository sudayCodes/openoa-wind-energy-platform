import { useState, useEffect } from 'react'

const STORAGE_PREFIX = 'openoa_result_'

/**
 * Like useState but persists the value in localStorage under a unique key.
 * When the component mounts it restores the last saved result.
 * Calling setResult(data) saves to localStorage; setResult(null) clears it.
 */
export default function usePersistedResult(analysisKey) {
  const storageKey = STORAGE_PREFIX + analysisKey

  const [result, setResultRaw] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  // Keep localStorage in sync whenever result changes
  useEffect(() => {
    try {
      if (result === null) {
        localStorage.removeItem(storageKey)
      } else {
        localStorage.setItem(storageKey, JSON.stringify(result))
      }
    } catch {
      // localStorage full or unavailable — silently ignore
    }
  }, [result, storageKey])

  return [result, setResultRaw]
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
