import { useState } from 'react'
import { runAEP } from '../api/client'
import { StatCard, PlotImage, LoadingSpinner, PageHeader, ErrorAlert, DataRequirementBanner, DownloadButton } from '../components/UI'
import usePersistedResult, { downloadResultJSON, downloadResultCSV } from '../hooks/usePersistedResult'
import useAnalysisRunner from '../hooks/useAnalysisRunner'
import useDataStatus from '../hooks/useDataStatus'
import { BarChart3, TrendingUp, Gauge, AlertTriangle, Activity, Target, Zap, FileText } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

function getCapacityFactorRating(cf) {
  if (cf == null) return { label: 'N/A', color: 'text-slate-400' }
  if (cf >= 40) return { label: 'Excellent', color: 'text-emerald-400' }
  if (cf >= 30) return { label: 'Good', color: 'text-blue-400' }
  if (cf >= 20) return { label: 'Moderate', color: 'text-amber-400' }
  return { label: 'Low', color: 'text-red-400' }
}

function getUncertaintyRating(pct) {
  if (pct == null) return { label: 'N/A', color: 'text-slate-400' }
  if (pct < 3) return { label: 'very low', color: 'text-emerald-400' }
  if (pct < 6) return { label: 'acceptable', color: 'text-blue-400' }
  if (pct < 10) return { label: 'moderate', color: 'text-amber-400' }
  return { label: 'high', color: 'text-red-400' }
}

export default function AEPAnalysis() {
  const [params, setParams] = useState({
    num_sim: 1000,
    reg_model: 'lin',
    reg_temperature: false,
    reg_wind_direction: false,
    time_resolution: 'MS',
  })
  const [result, setResult] = usePersistedResult('aep')
  const { run, loading, waiting, error } = useAnalysisRunner(runAEP, setResult, 'AEP')
  const dataStatus = useDataStatus('MonteCarloAEP')

  const handleRun = () => run(params)

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

  // Resolve values with fallbacks for old cached results that lack p50/p90/cf fields
  const p50 = result?.p50_aep_gwh ?? result?.median_aep_gwh ?? null
  const p90 = result?.p90_aep_gwh ?? null
  const capacityFactor = result?.capacity_factor_pct ?? null
  const uncertaintyPct = result?.uncertainty_pct ?? (
    result?.std_aep_gwh && result?.mean_aep_gwh && result.mean_aep_gwh > 0
      ? (result.std_aep_gwh / result.mean_aep_gwh) * 100
      : null
  )
  const cfRating = getCapacityFactorRating(capacityFactor)
  const uncRating = getUncertaintyRating(uncertaintyPct)

  return (
    <div>
      <PageHeader
        icon={BarChart3}
        title="Annual Energy Production (AEP)"
        description="Monte Carlo estimation of long-term AEP with uncertainty quantification"
      />

      <DataRequirementBanner {...dataStatus} />

      {/* Analysis Settings Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6 animate-fade-in-up">
        <h3 className="text-sm font-semibold text-white mb-1">Analysis Settings</h3>
        <p className="text-xs text-slate-500 mb-4">Tune the analysis parameters below. Your uploaded/demo data is used automatically — no need to re-upload.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormField label="Monte Carlo Simulations">
            <input type="number" value={params.num_sim}
              onChange={e => setParams({...params, num_sim: parseInt(e.target.value) || 100})}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none transition-smooth"
            />
          </FormField>
          <FormField label="Regression Model">
            <select value={params.reg_model}
              onChange={e => setParams({...params, reg_model: e.target.value})}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none transition-smooth"
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
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none transition-smooth"
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
        <button onClick={handleRun} disabled={loading || waiting || !dataStatus.ready}
          className="mt-4 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors animate-pulse-glow"
        >
          {loading ? 'Running...' : !dataStatus.ready ? 'Missing Required Data' : 'Run AEP Analysis'}
        </button>
      </div>

      {(loading || waiting) && <LoadingSpinner text={waiting ? 'Analysis is still processing on the server — please wait...' : 'Running Monte Carlo AEP analysis...'} />}
      <ErrorAlert message={error} />

      {/* Results */}
      {result && (
        <>
          <div className="flex justify-end mb-4 gap-2 animate-fade-in relative z-20">
            <DownloadButton
              onDownloadJSON={() => downloadResultJSON(result, 'aep_results.json')}
              onDownloadCSV={() => downloadResultCSV(result, 'aep_results.csv')}
            />
          </div>

          {/* Executive Summary */}
          <div className="bg-gradient-to-r from-blue-500/10 via-slate-900 to-emerald-500/10 border border-blue-500/20 rounded-xl p-6 mb-6 animate-fade-in-up">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-bold text-white">Executive Summary</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Expected AEP (P50)</p>
                <p className="text-3xl font-bold text-blue-400">{p50?.toFixed(2) ?? '—'}</p>
                <p className="text-xs text-slate-500">GWh/yr</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Conservative Estimate (P90)</p>
                <p className="text-3xl font-bold text-emerald-400">{p90?.toFixed(2) ?? '—'}</p>
                <p className="text-xs text-slate-500">GWh/yr</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Capacity Factor</p>
                <p className="text-3xl font-bold">
                  <span className={cfRating.color}>{capacityFactor?.toFixed(1) ?? '—'}</span>
                </p>
                <p className={`text-xs ${cfRating.color}`}>{cfRating.label}</p>
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 text-sm text-slate-300 leading-relaxed">
              <p>
                The Monte Carlo analysis ({result.num_simulations} simulations) estimates a
                <strong className="text-white"> mean AEP of {result.mean_aep_gwh?.toFixed(2)} GWh/yr</strong> with
                a standard deviation of {result.std_aep_gwh?.toFixed(3)} GWh
                ({uncertaintyPct != null ? <span className={uncRating.color}>{uncertaintyPct.toFixed(1)}% uncertainty — {uncRating.label}</span> : 'N/A'}).
                {p50 != null && p90 != null && (
                  <> The P50/P90 spread of {(p50 - p90).toFixed(3)} GWh indicates the
                  range between the median expectation and the conservative financing scenario.</>
                )}
                {capacityFactor != null && (
                  <> At a <strong className={cfRating.color}>{capacityFactor.toFixed(1)}%</strong> capacity factor
                  ({cfRating.label.toLowerCase()}), this plant
                  {capacityFactor >= 30 ? ' is performing well relative to industry benchmarks.' : ' may benefit from further investigation into operational improvements.'}
                  </>
                )}
                {result.mean_avail_pct != null && (
                  <> Availability losses account for approximately <strong className="text-amber-400">{(result.mean_avail_pct * 100).toFixed(1)}%</strong> of total energy.</>
                )}
              </p>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="animate-fade-in-up delay-75">
              <StatCard icon={BarChart3} label="Mean AEP" value={result.mean_aep_gwh?.toFixed(2)} unit="GWh/yr" color="blue" />
            </div>
            <div className="animate-fade-in-up delay-150">
              <StatCard icon={Target} label="P50 (Median)" value={p50?.toFixed(2)} unit="GWh/yr" color="cyan" />
            </div>
            <div className="animate-fade-in-up delay-200">
              <StatCard icon={Activity} label="P90 (Conservative)" value={p90?.toFixed(2)} unit="GWh/yr" color="green" />
            </div>
            <div className="animate-fade-in-up delay-300">
              <StatCard icon={Zap} label="Capacity Factor" value={capacityFactor?.toFixed(1)} unit="%" color="purple" subtext={cfRating.label} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="animate-fade-in-up delay-300">
              <StatCard icon={Gauge} label="Uncertainty (±1σ)" value={result.std_aep_gwh?.toFixed(3)} unit="GWh" color="yellow" />
            </div>
            <div className="animate-fade-in-up delay-400">
              <StatCard icon={TrendingUp} label="P5 / P95" value={`${result.p5_aep_gwh?.toFixed(2)} / ${result.p95_aep_gwh?.toFixed(2)}`} unit="GWh" color="green" />
            </div>
            <div className="animate-fade-in-up delay-500">
              <StatCard icon={AlertTriangle} label="Availability Loss" value={result.mean_avail_pct ? (result.mean_avail_pct * 100).toFixed(1) : null} unit="%" color="red" />
            </div>
            <div className="animate-fade-in-up delay-600">
              <StatCard icon={AlertTriangle} label="Curtailment Loss" value={result.mean_curt_pct ? (result.mean_curt_pct * 100).toFixed(1) : null} unit="%" color="yellow" />
            </div>
          </div>

          {/* Interactive histogram */}
          {histData.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6 animate-fade-in-up delay-400">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in delay-500">
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
