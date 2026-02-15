import { useState } from 'react'
import { runAEP } from '../api/client'
import { StatCard, PlotImage, LoadingSpinner, PageHeader, ErrorAlert, DataRequirementBanner, DownloadButton } from '../components/UI'
import usePersistedResult, { downloadResultJSON } from '../hooks/usePersistedResult'
import useDataStatus from '../hooks/useDataStatus'
import { BarChart3, TrendingUp, Gauge, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export default function AEPAnalysis() {
  const [params, setParams] = useState({
    num_sim: 1000,
    reg_model: 'lin',
    reg_temperature: false,
    reg_wind_direction: false,
    time_resolution: 'MS',
  })
  const [result, setResult] = usePersistedResult('aep')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const dataStatus = useDataStatus('MonteCarloAEP')

  const handleRun = () => {
    setLoading(true)
    setError(null)
    runAEP(params)
      .then(res => setResult(res.data.data))
      .catch(err => setError(err.response?.data?.detail || err.message))
      .finally(() => setLoading(false))
  }

  // Build histogram data for Recharts
  const histData = result?.distribution ? (() => {
    const vals = result.distribution.filter(v => v != null)
    if (vals.length === 0) return []
    const min = Math.min(...vals), max = Math.max(...vals)
    const bins = 30
    const step = (max - min) / bins || 1
    const counts = Array(bins).fill(0)
    vals.forEach(v => {
      const idx = Math.min(Math.floor((v - min) / step), bins - 1)
      counts[idx]++
    })
    return counts.map((count, i) => ({
      range: (min + i * step).toFixed(2),
      count
    }))
  })() : []

  return (
    <div>
      <PageHeader
        icon={BarChart3}
        title="Annual Energy Production (AEP)"
        description="Monte Carlo estimation of long-term AEP with uncertainty quantification"
      />

      <DataRequirementBanner {...dataStatus} />

      {/* Analysis Settings Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-white mb-1">Analysis Settings</h3>
        <p className="text-xs text-slate-500 mb-4">Tune the analysis parameters below. Your uploaded/demo data is used automatically — no need to re-upload.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormField label="Monte Carlo Simulations">
            <input type="number" value={params.num_sim}
              onChange={e => setParams({...params, num_sim: parseInt(e.target.value) || 100})}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
            />
          </FormField>
          <FormField label="Regression Model">
            <select value={params.reg_model}
              onChange={e => setParams({...params, reg_model: e.target.value})}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="lin">Linear (lin)</option>
              <option value="gam">GAM (gam)</option>
              <option value="gbm">Gradient Boost (gbm)</option>
              <option value="etr">Extra Trees (etr)</option>
            </select>
          </FormField>
          <FormField label="Time Resolution">
            <select value={params.time_resolution}
              onChange={e => setParams({...params, time_resolution: e.target.value})}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="MS">Monthly (MS)</option>
              <option value="D">Daily (D)</option>
              <option value="h">Hourly (h)</option>
            </select>
          </FormField>
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" checked={params.reg_temperature}
              onChange={e => setParams({...params, reg_temperature: e.target.checked})}
              className="rounded border-slate-600"
            />
            Include Temperature
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" checked={params.reg_wind_direction}
              onChange={e => setParams({...params, reg_wind_direction: e.target.checked})}
              className="rounded border-slate-600"
            />
            Include Wind Direction
          </label>
        </div>
        <button onClick={handleRun} disabled={loading || !dataStatus.ready}
          className="mt-4 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? 'Running...' : !dataStatus.ready ? 'Missing Required Data' : 'Run AEP Analysis'}
        </button>
      </div>

      {loading && <LoadingSpinner text="Running Monte Carlo AEP analysis..." />}
      <ErrorAlert message={error} />

      {/* Results */}
      {result && (
        <>
          <div className="flex justify-end mb-4">
            <DownloadButton onClick={() => downloadResultJSON(result, 'aep_results.json')} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard icon={BarChart3} label="Mean AEP" value={result.mean_aep_gwh?.toFixed(2)} unit="GWh/yr" color="blue" />
            <StatCard icon={Gauge} label="Uncertainty (±1σ)" value={result.std_aep_gwh?.toFixed(3)} unit="GWh" color="yellow" />
            <StatCard icon={TrendingUp} label="P5 / P95" value={`${result.p5_aep_gwh?.toFixed(2)} / ${result.p95_aep_gwh?.toFixed(2)}`} unit="GWh" color="green" />
            <StatCard icon={AlertTriangle} label="Availability Loss" value={result.mean_avail_pct ? (result.mean_avail_pct * 100).toFixed(1) : null} unit="%" color="red" />
          </div>

          {/* Interactive histogram */}
          {histData.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
              <h3 className="text-sm font-semibold text-white mb-4">AEP Distribution (Interactive)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={histData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="range" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={4} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#f1f5f9' }}
                    itemStyle={{ color: '#3b82f6' }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* OpenOA native plots */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PlotImage src={result.plots?.aep_distribution} alt="AEP Distribution" />
            <PlotImage src={result.plots?.monthly_energy} alt="Monthly Energy" />
            <PlotImage src={result.plots?.monthly_windspeed} alt="Monthly Windspeed" />
          </div>
        </>
      )}
    </div>
  )
}

function FormField({ label, children }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  )
}
