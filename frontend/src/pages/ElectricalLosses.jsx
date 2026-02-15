import { useState } from 'react'
import { runElectricalLosses } from '../api/client'
import { StatCard, PlotImage, LoadingSpinner, PageHeader, ErrorAlert, DataRequirementBanner, DownloadButton } from '../components/UI'
import usePersistedResult, { downloadResultJSON } from '../hooks/usePersistedResult'
import useAnalysisRunner from '../hooks/useAnalysisRunner'
import useDataStatus from '../hooks/useDataStatus'
import { Zap, TrendingDown, Gauge } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export default function ElectricalLosses() {
  const [params, setParams] = useState({
    num_sim: 1000,
    uncertainty_meter: 0.005,
    uncertainty_scada: 0.005,
  })
  const [result, setResult] = usePersistedResult('electrical_losses')
  const { run, loading, waiting, error } = useAnalysisRunner(runElectricalLosses, setResult, 'Electrical Losses')
  const dataStatus = useDataStatus('ElectricalLosses')

  const handleRun = () => run(params)

  const histData = result?.distribution ? (() => {
    const vals = result.distribution.filter(v => v != null)
    if (vals.length === 0) return []
    const min = Math.min(...vals), max = Math.max(...vals)
    const bins = 30
    const step = (max - min) / bins || 1
    const counts = Array(bins).fill(0)
    vals.forEach(v => { counts[Math.min(Math.floor((v - min) / step), bins - 1)]++ })
    return counts.map((count, i) => ({ range: (min + i * step).toFixed(2), count }))
  })() : []

  return (
    <div>
      <PageHeader
        icon={Zap}
        title="Electrical Losses"
        description="Estimate average electrical losses by comparing turbine SCADA to revenue meter data"
      />

      <DataRequirementBanner {...dataStatus} />

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-white mb-1">Analysis Settings</h3>
        <p className="text-xs text-slate-500 mb-4">Tune the analysis parameters below. Your uploaded/demo data is used automatically — no need to re-upload.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Simulations</label>
            <input type="number" value={params.num_sim}
              onChange={e => setParams({...params, num_sim: parseInt(e.target.value) || 100})}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Meter Uncertainty</label>
            <input type="number" step="0.001" value={params.uncertainty_meter}
              onChange={e => setParams({...params, uncertainty_meter: parseFloat(e.target.value) || 0})}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">SCADA Uncertainty</label>
            <input type="number" step="0.001" value={params.uncertainty_scada}
              onChange={e => setParams({...params, uncertainty_scada: parseFloat(e.target.value) || 0})}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
        <button onClick={handleRun} disabled={loading || waiting || !dataStatus.ready}
          className="mt-4 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? 'Running...' : !dataStatus.ready ? 'Missing Required Data' : 'Run Electrical Losses Analysis'}
        </button>
      </div>

      {(loading || waiting) && <LoadingSpinner text={waiting ? 'Analysis is still processing on the server — please wait...' : 'Running electrical losses analysis...'} />}
      <ErrorAlert message={error} />

      {result && (
        <>
          <div className="flex justify-end mb-4">
            <DownloadButton onClick={() => downloadResultJSON(result, 'electrical_losses_results.json')} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <StatCard icon={Zap} label="Mean Electrical Loss" value={result.mean_loss_pct?.toFixed(2)} unit="%" color="purple" />
            <StatCard icon={Gauge} label="Uncertainty (±1σ)" value={result.std_loss_pct?.toFixed(3)} unit="%" color="yellow" />
            <StatCard icon={TrendingDown} label="Median Loss" value={result.median_loss_pct?.toFixed(2)} unit="%" color="blue" />
          </div>

          {histData.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
              <h3 className="text-sm font-semibold text-white mb-4">Loss Distribution (%)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={histData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="range" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={4} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PlotImage src={result.plots?.loss_distribution} alt="Loss Distribution" />
            <PlotImage src={result.plots?.monthly_losses} alt="Monthly Losses" />
          </div>
        </>
      )}
    </div>
  )
}
