import { useState } from 'react'
import { runGapAnalysis } from '../api/client'
import { PlotImage, LoadingSpinner, PageHeader, ErrorAlert, DataRequirementBanner, DownloadButton } from '../components/UI'
import usePersistedResult, { downloadResultJSON, downloadResultCSV } from '../hooks/usePersistedResult'
import useAnalysisRunner from '../hooks/useAnalysisRunner'
import useDataStatus from '../hooks/useDataStatus'
import { GitCompareArrows } from 'lucide-react'

export default function GapAnalysis() {
  const [params, setParams] = useState({
    eya_aep: 20.0,
    eya_gross_energy: 25.0,
    eya_availability_losses: 0.05,
    eya_electrical_losses: 0.02,
    eya_turbine_losses: 0.10,
    eya_blade_degradation_losses: 0.0,
    eya_wake_losses: 0.05,
    oa_aep: 18.5,
    oa_availability_losses: 0.06,
    oa_electrical_losses: 0.03,
    oa_turbine_ideal_energy: 23.0,
  })
  const [result, setResult] = usePersistedResult('gap_analysis')
  const { run, loading, waiting, error } = useAnalysisRunner(runGapAnalysis, setResult, 'Gap Analysis')
  const dataStatus = useDataStatus('EYAGapAnalysis')

  const handleRun = () => run(params)

  const fields = [
    { key: 'eya_aep', label: 'EYA AEP (GWh/yr)', group: 'eya' },
    { key: 'eya_gross_energy', label: 'EYA Gross Energy (GWh/yr)', group: 'eya' },
    { key: 'eya_availability_losses', label: 'EYA Availability Losses (frac)', group: 'eya' },
    { key: 'eya_electrical_losses', label: 'EYA Electrical Losses (frac)', group: 'eya' },
    { key: 'eya_turbine_losses', label: 'EYA Turbine Losses (frac)', group: 'eya' },
    { key: 'eya_blade_degradation_losses', label: 'EYA Blade Degradation (frac)', group: 'eya' },
    { key: 'eya_wake_losses', label: 'EYA Wake Losses (frac)', group: 'eya' },
    { key: 'oa_aep', label: 'OA AEP (GWh/yr)', group: 'oa' },
    { key: 'oa_availability_losses', label: 'OA Availability Losses (frac)', group: 'oa' },
    { key: 'oa_electrical_losses', label: 'OA Electrical Losses (frac)', group: 'oa' },
    { key: 'oa_turbine_ideal_energy', label: 'OA TIE (GWh/yr)', group: 'oa' },
  ]

  return (
    <div>
      <PageHeader
        icon={GitCompareArrows}
        title="EYA Gap Analysis"
        description="Compare pre-construction EYA predictions vs operational assessment results"
      />

      <DataRequirementBanner {...dataStatus} />

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6 animate-fade-in-up">
        <h3 className="text-sm font-semibold text-white mb-1">Analysis Settings</h3>
        <p className="text-xs text-slate-500 mb-4">Enter the EYA predictions and OA results to compare. Your uploaded/demo data is used automatically for plant context.</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* EYA */}
          <div>
            <h3 className="text-sm font-semibold text-blue-400 mb-3">Pre-Construction (EYA) Estimates</h3>
            <div className="space-y-3">
              {fields.filter(f => f.group === 'eya').map(f => (
                <div key={f.key}>
                  <label className="block text-xs text-slate-400 mb-1">{f.label}</label>
                  <input type="number" step="0.01" value={params[f.key]}
                    onChange={e => setParams({...params, [f.key]: parseFloat(e.target.value) || 0})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
          {/* OA */}
          <div>
            <h3 className="text-sm font-semibold text-emerald-400 mb-3">Operational Assessment (OA) Results</h3>
            <div className="space-y-3">
              {fields.filter(f => f.group === 'oa').map(f => (
                <div key={f.key}>
                  <label className="block text-xs text-slate-400 mb-1">{f.label}</label>
                  <input type="number" step="0.01" value={params[f.key]}
                    onChange={e => setParams({...params, [f.key]: parseFloat(e.target.value) || 0})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        <button onClick={handleRun} disabled={loading || waiting || !dataStatus.ready}
          className="mt-4 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? 'Running...' : !dataStatus.ready ? 'Missing Required Data' : 'Run Gap Analysis'}
        </button>
      </div>

      {(loading || waiting) && <LoadingSpinner text={waiting ? 'Analysis is still processing on the server — please wait...' : 'Running EYA gap analysis...'} />}
      <ErrorAlert message={error} />

      {result && (
        <>
          <div className="flex justify-end mb-4 animate-fade-in relative z-20">
            <DownloadButton
              onDownloadJSON={() => downloadResultJSON(result, 'gap_analysis_results.json')}
              onDownloadCSV={() => downloadResultCSV(result, 'gap_analysis_results.csv')}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 animate-fade-in-up delay-150">
          <PlotImage src={result.plots?.waterfall} alt="Gap Analysis Waterfall" />

          {result.gap_analysis && Array.isArray(result.gap_analysis) && result.gap_analysis.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Gap Analysis Results</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-800">
                      {Object.keys(result.gap_analysis[0]).map(k => (
                        <th key={k} className="text-left py-2 px-3">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.gap_analysis.map((row, i) => (
                      <tr key={i} className="border-b border-slate-800/50">
                        {Object.values(row).map((v, j) => (
                          <td key={j} className="py-2 px-3 text-slate-300">
                            {typeof v === 'number' ? v.toFixed(4) : String(v)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        </>
      )}
    </div>
  )
}
