import { useEffect, useState, useCallback } from 'react'
import { getScadaPreview } from '../api/client'
import { LoadingSpinner, PageHeader } from '../components/UI'
import { Database, RefreshCw, Info } from 'lucide-react'

export default function DataExplorer() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(() => {
    setLoading(true)
    setError(null)
    getScadaPreview()
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.detail || err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) return <LoadingSpinner text="Loading SCADA data..." />
  if (error) return <div className="text-red-400">Error: {error}</div>

  return (
    <div>
      <PageHeader
        icon={Database}
        title="Data Explorer"
        description={`SCADA dataset with ${data.total_rows.toLocaleString()} records across ${data.columns.length} columns`}
      />

      {/* Data Source Indicator */}
      <div className={`mb-5 px-4 py-3 rounded-lg border flex items-center justify-between animate-fade-in ${
        data.source === 'custom'
          ? 'bg-amber-500/10 border-amber-500/25'
          : 'bg-blue-500/10 border-blue-500/25'
      }`}>
        <div className="flex items-center gap-2">
          <Info className={`w-4 h-4 ${data.source === 'custom' ? 'text-amber-400' : 'text-blue-400'}`} />
          <span className={`text-xs font-medium ${data.source === 'custom' ? 'text-amber-300' : 'text-blue-300'}`}>
            {data.source === 'custom'
              ? 'Exploring your uploaded SCADA data'
              : 'Exploring demo SCADA data (La Haute Borne). Upload your own CSVs to see custom data here.'}
          </span>
        </div>
        <button onClick={fetchData} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors" title="Refresh data">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Column Stats */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Column Statistics</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800">
                <th className="text-left py-2 px-3">Column</th>
                <th className="text-right py-2 px-3">Min</th>
                <th className="text-right py-2 px-3">Max</th>
                <th className="text-right py-2 px-3">Mean</th>
                <th className="text-right py-2 px-3">Missing %</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data.column_stats).map(([col, stats]) => (
                <tr key={col} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="py-2 px-3 font-mono text-blue-400 text-xs">{col}</td>
                  <td className="py-2 px-3 text-right text-slate-300">{stats.min ?? stats.unique ?? '—'}</td>
                  <td className="py-2 px-3 text-right text-slate-300">{stats.max ?? '—'}</td>
                  <td className="py-2 px-3 text-right text-slate-300">{stats.mean ?? '—'}</td>
                  <td className="py-2 px-3 text-right">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      stats.missing_pct > 10 ? 'bg-red-500/20 text-red-400' :
                      stats.missing_pct > 0 ? 'bg-amber-500/20 text-amber-400' :
                      'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {stats.missing_pct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sample Rows */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-lg font-semibold text-white mb-4">Sample Data (first 50 rows)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800">
                {data.columns.map(col => (
                  <th key={col} className="text-left py-2 px-2 whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.sample_rows.slice(0, 20).map((row, i) => (
                <tr key={i} className="border-b border-slate-800/30 hover:bg-slate-800/30">
                  {data.columns.map(col => (
                    <td key={col} className="py-1.5 px-2 whitespace-nowrap text-slate-300">
                      {row[col] != null ? String(row[col]).slice(0, 20) : <span className="text-slate-600">null</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
