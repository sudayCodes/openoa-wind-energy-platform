import { useState } from 'react'
import { runYawMisalignment } from '../api/client'
import { PlotImage, LoadingSpinner, PageHeader, ErrorAlert, DataRequirementBanner, DownloadButton } from '../components/UI'
import usePersistedResult, { downloadResultJSON, downloadResultCSV } from '../hooks/usePersistedResult'
import useAnalysisRunner from '../hooks/useAnalysisRunner'
import useDataStatus from '../hooks/useDataStatus'
import { Compass } from 'lucide-react'

export default function YawMisalignment() {
  const [params, setParams] = useState({ num_sim: 10 })
  const [result, setResult] = usePersistedResult('yaw_misalignment')
  const { run, loading, waiting, error } = useAnalysisRunner(runYawMisalignment, setResult, 'Yaw Misalignment')
  const dataStatus = useDataStatus('StaticYawMisalignment')

  const handleRun = () => run(params)

  const turbineYaw = result?.turbine_yaw_misalignment
    ? Object.entries(result.turbine_yaw_misalignment)
    : []

  return (
    <div>
      <PageHeader
        icon={Compass}
        title="Static Yaw Misalignment"
        description="Detect static yaw misalignment for individual turbines as a function of wind speed"
      />

      <DataRequirementBanner {...dataStatus} />

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6 animate-fade-in-up">
        <h3 className="text-sm font-semibold text-white mb-1">Analysis Settings</h3>
        <p className="text-xs text-slate-500 mb-4">Tune the analysis parameters below. Your uploaded/demo data is used automatically — no need to re-upload.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Simulations</label>
            <input type="number" value={params.num_sim}
              onChange={e => setParams({...params, num_sim: parseInt(e.target.value) || 10})}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
        <button onClick={handleRun} disabled={loading || waiting || !dataStatus.ready}
          className="mt-4 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? 'Running...' : !dataStatus.ready ? 'Missing Required Data' : 'Run Yaw Misalignment Analysis'}
        </button>
      </div>

      {(loading || waiting) && <LoadingSpinner text={waiting ? 'Analysis is still processing on the server — please wait...' : 'Running yaw misalignment analysis...'} />}
      <ErrorAlert message={error} />

      {result && (
        <>
          <div className="flex justify-end mb-4 animate-fade-in">
            <DownloadButton
              onDownloadJSON={() => downloadResultJSON(result, 'yaw_misalignment_results.json')}
              onDownloadCSV={() => downloadResultCSV(result, 'yaw_misalignment_results.csv')}
            />
          </div>
          {turbineYaw.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6 animate-fade-in-up delay-150">
              <h3 className="text-sm font-semibold text-white mb-4">Per-Turbine Yaw Misalignment</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {turbineYaw.map(([tid, val]) => (
                  <div key={tid} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                    <p className="text-xs text-slate-400 mb-1">{tid}</p>
                    <p className="text-2xl font-bold text-white">
                      {val != null ? `${val.toFixed(2)}°` : '—'}
                    </p>
                    <p className="text-xs mt-1">
                      {val != null && (
                        <span className={val > 2 || val < -2 ? 'text-amber-400' : 'text-emerald-400'}>
                          {val > 2 || val < -2 ? '⚠ Notable misalignment' : '✓ Within tolerance'}
                        </span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            <PlotImage src={result.plots?.yaw_curves} alt="Yaw Misalignment Curves" />
          </div>
        </>
      )}
    </div>
  )
}
