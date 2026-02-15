import { AlertTriangle, CheckCircle, Download, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

export function StatCard({ icon: Icon, label, value, unit, color = 'blue', subtext }) {
  const colorMap = {
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-emerald-500/20 text-emerald-400',
    yellow: 'bg-amber-500/20 text-amber-400',
    purple: 'bg-purple-500/20 text-purple-400',
    red: 'bg-red-500/20 text-red-400',
    cyan: 'bg-cyan-500/20 text-cyan-400',
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all duration-200 hover:shadow-lg hover:shadow-slate-900/50">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm text-slate-400">{label}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold text-white">{value ?? '—'}</span>
        {unit && <span className="text-sm text-slate-500">{unit}</span>}
      </div>
      {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
    </div>
  )
}

export function PlotImage({ src, alt, className = '' }) {
  if (!src) return null
  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all duration-200 ${className}`}>
      <img
        src={`data:image/png;base64,${src}`}
        alt={alt}
        className="w-full rounded-lg"
      />
    </div>
  )
}

export function LoadingSpinner({ text = 'Running analysis...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
      <div className="relative w-14 h-14 mb-4">
        <div className="absolute inset-0 rounded-full border-4 border-slate-700" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin" />
      </div>
      <p className="text-slate-400 text-sm">{text}</p>
      <p className="text-slate-600 text-xs mt-1">This may take a minute</p>
    </div>
  )
}

export function PageHeader({ title, description, icon: Icon }) {
  return (
    <div className="mb-6 animate-fade-in-up">
      <div className="flex items-center gap-3 mb-1">
        {Icon && <Icon className="w-6 h-6 text-blue-400" />}
        <h1 className="text-2xl font-bold text-white">{title}</h1>
      </div>
      {description && <p className="text-slate-400 text-sm ml-9">{description}</p>}
    </div>
  )
}

export function ErrorAlert({ message }) {
  if (!message) return null
  return (
    <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm mb-4 animate-scale-in">
      <strong>Error:</strong> {message}
    </div>
  )
}

export function DownloadButton({ onClick, onDownloadJSON, onDownloadCSV }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Legacy single-button mode
  if (onClick && !onDownloadJSON) {
    return (
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-all duration-200 hover:border-slate-600"
      >
        <Download className="w-4 h-4" />
        Download Results
      </button>
    )
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-all duration-200 hover:border-slate-600"
      >
        <Download className="w-4 h-4" />
        Download
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 animate-scale-in overflow-hidden min-w-[160px]">
          <button
            onClick={() => { onDownloadJSON?.(); setOpen(false) }}
            className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 transition-colors flex items-center gap-2"
          >
            <span className="text-blue-400 text-xs font-mono">JSON</span>
            Full Results
          </button>
          {onDownloadCSV && (
            <button
              onClick={() => { onDownloadCSV?.(); setOpen(false) }}
              className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 transition-colors flex items-center gap-2 border-t border-slate-700"
            >
              <span className="text-emerald-400 text-xs font-mono">CSV</span>
              Spreadsheet
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function DataRequirementBanner({ ready, missing, description, source }) {
  if (ready) {
    return (
      <div className="mb-4 px-4 py-3 rounded-lg border bg-emerald-500/10 border-emerald-500/20 flex items-center gap-2 animate-fade-in">
        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
        <span className="text-xs text-emerald-400">
          All required datasets loaded ({source === 'demo' ? 'demo data' : 'custom data'}).
          Ready to run analysis.
        </span>
      </div>
    )
  }
  return (
    <div className="mb-4 px-4 py-3 rounded-lg border bg-red-500/10 border-red-500/20 animate-fade-in">
      <div className="flex items-center gap-2 mb-1">
        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
        <span className="text-sm font-medium text-red-400">Missing Required Data</span>
      </div>
      <p className="text-xs text-red-400/80 ml-6">
        {description || `Missing datasets: ${missing.join(', ')}`}
      </p>
      <p className="text-xs text-red-400/60 ml-6 mt-1">
        Go to <a href="/upload" className="underline hover:text-red-300">Upload Data</a> to add the required CSVs.
      </p>
    </div>
  )
}
