import { useState } from 'react'
import { runTurbineEnergy } from '../api/client'
import { StatCard, PlotImage, LoadingSpinner, PageHeader, ErrorAlert } from '../components/UI'
import { TrendingUp, Gauge } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function TurbineEnergy() {
  const [params, setParams] = useState({ num_sim: 20, uncertainty_meter: 0.005 })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleRun = () => {
    setLoading(true)
    setError(null)
    runTurbineEnergy(params)
      .then(res => setResult(res.data.data))
      .catch(err => setError(err.response?.data?.detail || err.message))
      .finally(() => setLoading(false))
  }

  const turbineData = result?.turbine_gross_energy
    ? Object.entries(result.turbine_gross_energy).map(([id, val]) => ({
        name: id.length > 8 ? id.slice(-6) : id,
        fullName: id,
        energy: val ? (val / 1e6) : 0
      }))
    : []

  return (
    <div>
      <PageHeader
        icon={TrendingUp}
        title="Turbine Long-Term Gross Energy"
        description="Estimate per-turbine gross energy using GAM models fit to SCADA + reanalysis data"
      />

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-white mb-4">Configuration</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Simulations</label>
            <input type="number" value={params.num_sim}
              onChange={e => setParams({...params, num_sim: parseInt(e.target.value) || 5})}
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
        </div>
        <button onClick={handleRun} disabled={loading}
          className="mt-4 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? 'Running...' : 'Run Turbine Energy Analysis'}
        </button>
      </div>

      {loading && <LoadingSpinner text="Running turbine gross energy analysis..." />}
      <ErrorAlert message={error} />

      {result && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <StatCard icon={TrendingUp} label="Plant Gross Energy" value={result.mean_plant_gross_gwh?.toFixed(2)} unit="GWh" color="green" />
            <StatCard icon={Gauge} label="Uncertainty (±1σ)" value={result.std_plant_gross_gwh?.toFixed(3)} unit="GWh" color="yellow" />
          </div>

          {turbineData.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
              <h3 className="text-sm font-semibold text-white mb-4">Per-Turbine Long-Term Gross Energy</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={turbineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} label={{ value: 'GWh', fill: '#94a3b8', position: 'insideLeft', offset: -5 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    formatter={(val) => [`${val.toFixed(3)} GWh`, 'Gross Energy']}
                    labelFormatter={(label) => `Turbine: ${label}`}
                  />
                  <Bar dataKey="energy" radius={[4, 4, 0, 0]}>
                    {turbineData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PlotImage src={result.plots?.turbine_gross} alt="Turbine Gross Energy" />
          </div>
        </>
      )}
    </div>
  )
}
