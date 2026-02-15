import { useEffect, useState } from 'react'
import { getPlantSummary } from '../api/client'
import { StatCard, LoadingSpinner, PageHeader } from '../components/UI'
import {
  LayoutDashboard, Wind, Zap, MapPin, Calendar,
  Database, TrendingUp, Gauge
} from 'lucide-react'

export default function Dashboard() {
  const [plant, setPlant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getPlantSummary()
      .then(res => setPlant(res.data))
      .catch(err => setError(err.response?.data?.detail || err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner text="Loading plant data..." />
  if (error) return <div className="text-red-400">Error: {error}</div>

  return (
    <div>
      <PageHeader
        icon={LayoutDashboard}
        title="Plant Dashboard"
        description={`${plant.name} — ${plant.capacity_mw} MW wind farm with ${plant.num_turbines} turbines`}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="animate-fade-in-up delay-75">
        <StatCard
          icon={Zap}
          label="Plant Capacity"
          value={plant.capacity_mw}
          unit="MW"
          color="blue"
        />
        </div>
        <div className="animate-fade-in-up delay-150">
        <StatCard
          icon={Wind}
          label="Avg Wind Speed"
          value={plant.avg_wind_speed}
          unit="m/s"
          color="cyan"
        />
        </div>
        <div className="animate-fade-in-up delay-200">
        <StatCard
          icon={TrendingUp}
          label="Avg Power"
          value={plant.avg_power_kw ? Math.round(plant.avg_power_kw) : null}
          unit="kW"
          color="green"
        />
        </div>
        <div className="animate-fade-in-up delay-300">
        <StatCard
          icon={Gauge}
          label="Capacity Factor"
          value={plant.capacity_factor ? (plant.capacity_factor * 100).toFixed(1) : null}
          unit="%"
          color="purple"
        />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Turbine Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 animate-fade-in-up delay-400">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Wind className="w-5 h-5 text-blue-400" />
            Turbines
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800">
                  <th className="text-left py-2 px-3">ID</th>
                  <th className="text-right py-2 px-3">Rated (kW)</th>
                  <th className="text-right py-2 px-3">Hub (m)</th>
                  <th className="text-right py-2 px-3">Rotor (m)</th>
                </tr>
              </thead>
              <tbody>
                {plant.turbines.map(t => (
                  <tr key={t.asset_id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="py-2 px-3 font-medium text-white">{t.asset_id}</td>
                    <td className="py-2 px-3 text-right text-slate-300">{t.rated_power}</td>
                    <td className="py-2 px-3 text-right text-slate-300">{t.hub_height}</td>
                    <td className="py-2 px-3 text-right text-slate-300">{t.rotor_diameter}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Plant Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 animate-fade-in-up delay-500">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-400" />
            Data Summary
          </h3>
          <div className="space-y-3">
            <InfoRow icon={MapPin} label="Location" value={`${plant.latitude}°N, ${plant.longitude}°E`} />
            <InfoRow icon={Calendar} label="Data Period" value={`${plant.scada_date_range[0].slice(0,10)} to ${plant.scada_date_range[1].slice(0,10)}`} />
            <InfoRow icon={Database} label="SCADA Records" value={plant.scada_rows.toLocaleString()} />
            <InfoRow icon={Database} label="Meter Records" value={plant.meter_rows.toLocaleString()} />
            <InfoRow icon={Wind} label="Reanalysis" value={plant.reanalysis_products.join(', ').toUpperCase()} />
          </div>

          {/* Mini map placeholder */}
          <div className="mt-4 bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h4 className="text-sm text-slate-400 mb-2">Turbine Positions</h4>
            <div className="relative w-full h-40">
              {plant.turbines.map((t, i) => {
                const lats = plant.turbines.map(x => x.latitude)
                const lngs = plant.turbines.map(x => x.longitude)
                const minLat = Math.min(...lats), maxLat = Math.max(...lats)
                const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
                const pad = 0.15
                const x = maxLng === minLng ? 50 : ((t.longitude - minLng) / (maxLng - minLng)) * (100 - pad*200) + pad*100
                const y = maxLat === minLat ? 50 : ((maxLat - t.latitude) / (maxLat - minLat)) * (100 - pad*200) + pad*100
                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']
                return (
                  <div
                    key={t.asset_id}
                    className="absolute group"
                    style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
                  >
                    <div
                      className="w-4 h-4 rounded-full border-2 border-white shadow-lg cursor-pointer"
                      style={{ backgroundColor: colors[i % colors.length] }}
                    />
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-700 text-xs text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                      {t.asset_id}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-800/50">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon className="w-4 h-4" />
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  )
}
