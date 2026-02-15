import { useState, useEffect, useCallback } from 'react'
import { getDataStatus } from '../api/client'

/**
 * Hook to check if required datasets are loaded for an analysis type.
 *
 * @param {string} analysisType - e.g. "MonteCarloAEP", "ElectricalLosses"
 * @returns {{ ready, missing, loading, source, refresh }}
 */
export default function useDataStatus(analysisType) {
  const [state, setState] = useState({
    ready: true,
    missing: [],
    required: [],
    loading: true,
    source: 'demo',
    description: '',
  })

  const refresh = useCallback(() => {
    getDataStatus()
      .then(res => {
        const info = res.data.analysis_ready?.[analysisType]
        setState({
          ready: info?.ready ?? true,
          missing: info?.missing ?? [],
          required: info?.required ?? [],
          loading: false,
          source: res.data.source || 'demo',
          description: info?.description ?? '',
        })
      })
      .catch(() => setState(prev => ({ ...prev, loading: false })))
  }, [analysisType])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { ...state, refresh }
}
