import { useEffect, useState, useCallback } from 'react'
import { uploadCSV, getDataStatus, resetData, getTemplates } from '../api/client'
import { PageHeader, ErrorAlert, LoadingSpinner } from '../components/UI'
import ColumnGlossary from '../components/ColumnGlossary'
import { Upload, CheckCircle, XCircle, RotateCcw, FileText, AlertTriangle, Info } from 'lucide-react'

const DATASET_CONFIG = [
  {
    type: 'scada',
    label: 'SCADA Data',
    description: 'Turbine-level time series: power, wind speed, direction, pitch, temperature, status.',
    color: 'blue',
    requiredBy: ['MonteCarloAEP', 'ElectricalLosses', 'TurbineLongTermGrossEnergy', 'WakeLosses', 'StaticYawMisalignment'],
    columnNames: ['time', 'asset_id', 'WMET_HorWdSpd', 'WTUR_W', 'pitch', 'temperature', 'status'],
  },
  {
    type: 'meter',
    label: 'Meter Data',
    description: 'Plant-level energy production from the revenue meter.',
    color: 'green',
    requiredBy: ['MonteCarloAEP', 'ElectricalLosses'],
    columnNames: ['time', 'energy'],
  },
  {
    type: 'reanalysis',
    label: 'Reanalysis Data',
    description: 'Gridded weather data (ERA5/MERRA2) — wind speed, direction, temperature, density.',
    color: 'purple',
    requiredBy: ['MonteCarloAEP', 'TurbineLongTermGrossEnergy', 'WakeLosses'],
    columnNames: ['time', 'wind_speed', 'wind_direction', 'temperature', 'density', 'pressure'],
  },
  {
    type: 'curtailment',
    label: 'Curtailment Data',
    description: 'Plant-level availability and curtailment losses (optional for AEP).',
    color: 'yellow',
    requiredBy: ['MonteCarloAEP (optional)'],
    columnNames: ['time', 'availability', 'curtailment'],
  },
  {
    type: 'asset',
    label: 'Asset Data',
    description: 'Turbine metadata: location (lat/lon), rated power, hub height, rotor diameter.',
    color: 'cyan',
    requiredBy: ['WakeLosses'],
    columnNames: ['asset_id', 'latitude', 'longitude', 'rated_power', 'hub_height', 'rotor_diameter'],
  },
]

export default function DataUpload() {
  const [status, setStatus] = useState(null)
  const [templates, setTemplates] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState({})
  const [uploadResult, setUploadResult] = useState({})
  const [error, setError] = useState(null)

  const fetchStatus = useCallback(() => {
    getDataStatus()
      .then(res => setStatus(res.data))
      .catch(err => setError(err.response?.data?.detail || err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchStatus()
    getTemplates()
      .then(res => setTemplates(res.data))
      .catch(() => {})
  }, [fetchStatus])

  const handleUpload = async (datasetType, file) => {
    setUploading(prev => ({ ...prev, [datasetType]: true }))
    setUploadResult(prev => ({ ...prev, [datasetType]: null }))
    try {
      const res = await uploadCSV(datasetType, file)
      setUploadResult(prev => ({
        ...prev,
        [datasetType]: { success: true, message: res.data.message, rows: res.data.rows },
      }))
      fetchStatus()
    } catch (err) {
      setUploadResult(prev => ({
        ...prev,
        [datasetType]: { success: false, message: err.response?.data?.detail || err.message },
      }))
    } finally {
      setUploading(prev => ({ ...prev, [datasetType]: false }))
    }
  }

  const handleReset = async () => {
    if (!confirm('Reset all data back to the demo dataset?')) return
    try {
      await resetData()
      setUploadResult({})
      fetchStatus()
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
    }
  }

  if (loading) return <LoadingSpinner text="Loading data status..." />

  const colorMap = {
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', dot: 'bg-blue-500' },
    green: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-500' },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', dot: 'bg-purple-500' },
    yellow: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', dot: 'bg-amber-500' },
    cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', dot: 'bg-cyan-500' },
  }

  return (
    <div>
      <PageHeader
        icon={Upload}
        title="Data Upload"
        description="Upload custom CSV datasets or use the default demo data. New uploads replace previous data."
      />

      <ErrorAlert message={error} />

      {/* Data Source Banner */}
      <div className={`mb-6 p-4 rounded-xl border flex items-center justify-between ${
        status?.source === 'demo'
          ? 'bg-blue-500/10 border-blue-500/30'
          : status?.source === 'custom'
          ? 'bg-amber-500/10 border-amber-500/30'
          : 'bg-slate-800 border-slate-700'
      }`}>
        <div className="flex items-center gap-3">
          <Info className="w-5 h-5 text-slate-400" />
          <div>
            <p className="text-sm font-medium text-white">
              {status?.source === 'demo' ? 'Using Demo Dataset (La Haute Borne)' :
               status?.source === 'custom' ? 'Using Custom Uploaded Data' :
               'No Data Loaded'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {status?.source === 'demo'
                ? 'All datasets are pre-loaded. Upload custom CSVs below to override.'
                : 'Custom data is in use. Click Reset to return to demo data.'}
            </p>
          </div>
        </div>
        <button onClick={handleReset}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-xs text-white transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset to Demo
        </button>
      </div>

      {/* Analysis Readiness */}
      {status?.analysis_ready && (
        <div className="mb-6 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Analysis Readiness</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(status.analysis_ready).map(([name, info]) => (
              <div key={name} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                info.ready
                  ? 'bg-emerald-500/10 border-emerald-500/20'
                  : 'bg-red-500/10 border-red-500/20'
              }`}>
                {info.ready
                  ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  : <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                <div>
                  <p className="text-xs font-medium text-white">{name}</p>
                  {!info.ready && (
                    <p className="text-[10px] text-red-400">Missing: {info.missing.join(', ')}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Column Name Glossary Dropdown */}
      <ColumnGlossary />

      {/* Upload Cards */}
      <div className="space-y-4">
        {DATASET_CONFIG.map(ds => {
          const isLoaded = status?.datasets?.[ds.type] ?? false
          const details = status?.details?.[ds.type]
          const result = uploadResult[ds.type]
          const isUploading = uploading[ds.type]
          const cols = colorMap[ds.color] || colorMap.blue
          const templateCols = templates?.[ds.type]?.required_columns

          return (
            <div key={ds.type}
              className={`bg-slate-900 border border-slate-800 rounded-xl p-5 ${isUploading ? 'opacity-70' : ''}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${isLoaded ? cols.dot : 'bg-slate-600'}`} />
                  <div>
                    <h3 className="text-sm font-semibold text-white">{ds.label}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{ds.description}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                  isLoaded
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-slate-700 text-slate-400'
                }`}>
                  {isLoaded ? `✓ Loaded${details?.rows ? ` (${details.rows.toLocaleString()} rows)` : ''}` : 'Not loaded'}
                </span>
              </div>

              {/* Required columns */}
              {templateCols && (
                <div className="mb-3 px-3 py-2 bg-slate-800/50 rounded-lg">
                  <p className="text-[10px] text-slate-500 mb-1 flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Required columns:
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {templateCols.join(', ')}
                  </p>
                </div>
              )}

              {/* Used by */}
              <div className="mb-3">
                <p className="text-[10px] text-slate-500">Required by: {ds.requiredBy.join(', ')}</p>
              </div>

              {/* Upload input */}
              <div className="flex items-center gap-3">
                <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  isUploading
                    ? 'border-slate-700 bg-slate-800/50'
                    : 'border-slate-700 hover:border-blue-500/50 hover:bg-blue-500/5'
                }`}>
                  <Upload className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-400">
                    {isUploading ? 'Uploading...' : 'Choose CSV file or drag & drop'}
                  </span>
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    disabled={isUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleUpload(ds.type, file)
                      e.target.value = '' // reset so same file can be re-uploaded
                    }}
                  />
                </label>
              </div>

              {/* Upload result feedback */}
              {result && (
                <div className={`mt-3 px-3 py-2 rounded-lg text-xs flex items-center gap-2 ${
                  result.success
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {result.success
                    ? <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                    : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                  {result.message}
                  {result.rows && ` (${result.rows.toLocaleString()} rows)`}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
