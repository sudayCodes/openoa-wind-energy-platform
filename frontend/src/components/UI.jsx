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
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
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
    <div className={`bg-slate-900 border border-slate-800 rounded-xl p-4 ${className}`}>
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
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-12 h-12 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin mb-4" />
      <p className="text-slate-400 text-sm">{text}</p>
      <p className="text-slate-600 text-xs mt-1">This may take a minute</p>
    </div>
  )
}

export function PageHeader({ title, description, icon: Icon }) {
  return (
    <div className="mb-6">
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
    <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
      <strong>Error:</strong> {message}
    </div>
  )
}
