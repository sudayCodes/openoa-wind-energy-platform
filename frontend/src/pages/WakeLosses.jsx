import { useState } from 'react'
import { runWakeLosses } from '../api/client'
import { StatCard, PlotImage, LoadingSpinner, PageHeader, ErrorAlert, DataRequirementBanner, DownloadButton } from '../components/UI'
import usePersistedResult, { downloadResultJSON } from '../hooks/usePersistedResult'
import useAnalysisRunner from '../hooks/useAnalysisRunner'
import useDataStatus from '../hooks/useDataStatus'
import { Wind, Gauge } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function WakeLosses() {
  const [params, setParams] = useState({
    num_sim: 10,
    wind_direction_col: 'WMET_HorWdDir',
    wind_direction_data_type: 'scada',
  })
  const [result, setResult] = usePersistedResult('wake_losses')
  const { run, loading, waiting, error } = useAnalysisRunner(runWakeLosses, setResult, 'Wake Losses')
  const dataStatus = useDataStatus('WakeLosses')

  const handleRun = () => run(params)

  const turbineData = result?.turbine_wake_losses
    ? Object.entries(result.turbine_wake_losses).map(([id, val]) => ({
        name: id.length > 8 ? id.slice(-6) : id,
        loss: val ?? 0
      }))
    : []

  return (
    <div>
      <PageHeader
        icon={Wind}
        title="Wake Losses"
        description="Estimate plant-level and turbine-level internal wake losses with long-term correction"
      />

      <DataRequirementBanner {...dataStatus} />

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-white mb-1">Analysis Settings</h3>
        <p className="text-xs text-slate-500 mb-4">Tune the analysis parameters below. Your uploaded/demo data is used automatically — no need to re-upload.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Simulations</label>
            <input type="number" value={params.num_sim}
              onChange={e => setParams({...params, num_sim: parseInt(e.target.value) || 10})}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Wind Direction Source</label>
            <select value={params.wind_direction_data_type}
              onChange={e => setParams({...params, wind_direction_data_type: e.target.value})}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="scada">SCADA</option>
              <option value="tower">Met Tower</option>
            </select>
          </div>
        </div>
        <button onClick={handleRun} disabled={loading || waiting || !dataStatus.ready}
          className="mt-4 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? 'Running...' : !dataStatus.ready ? 'Missing Required Data' : 'Run Wake Losses Analysis'}
        </button>
      </div>

      {(loading || waiting) && <LoadingSpinner text={waiting ? 'Analysis is still processing on the server — please wait...' : 'Running wake losses analysis...'} />}
      <ErrorAlert message={error} />

      {result && (
        <>
          <div className="flex justify-end mb-4">
            <DownloadButton onClick={() => downloadResultJSON(result, 'wake_losses_results.json')} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <StatCard icon={Wind} label="Wake Loss (POR)" value={result.plant_wake_loss_por_pct?.toFixed(2)} unit="%" color="blue" />
            <StatCard icon={Gauge} label="Wake Loss (Long-term)" value={result.plant_wake_loss_lt_pct?.toFixed(2)} unit="%" color="green" />
          </div>

          {turbineData.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
              <h3 className="text-sm font-semibold text-white mb-4">Per-Turbine Wake Losses</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={turbineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} label={{ value: '%', fill: '#94a3b8', position: 'insideLeft' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    formatter={(val) => [`${val.toFixed(2)}%`, 'Wake Loss']}
                  />
                  <Bar dataKey="loss" radius={[4, 4, 0, 0]}>
                    {turbineData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PlotImage src={result.plots?.wake_by_direction} alt="Wake Losses by Direction" />
          </div>
        </>
      )}
    </div>
  )
}
