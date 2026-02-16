import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

// Glossary of column names and their full forms/descriptions
const COLUMN_GLOSSARY = {
  'WMET_HorWdSpd': 'Wind Meteorological Horizontal Wind Speed',
  'WTUR_W': 'Wind Turbine Power Output (Watts)',
  'asset_id': 'Unique Turbine Identifier',
  'latitude': 'Turbine Latitude (decimal degrees)',
  'longitude': 'Turbine Longitude (decimal degrees)',
  'rated_power': 'Turbine Rated Power (kW)',
  'hub_height': 'Turbine Hub Height (meters)',
  'rotor_diameter': 'Turbine Rotor Diameter (meters)',
  'time': 'Timestamp (date/time)',
  // Add more as needed
}

export default function ColumnGlossary() {
  const [open, setOpen] = useState(false)

  return (
    <div className="mb-6">
      <button
        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-all duration-200 hover:border-blue-500"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="column-glossary-dropdown"
      >
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        Column Name Glossary
      </button>
      {open && (
        <div id="column-glossary-dropdown" className="mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-xl p-4 animate-fade-in">
          <h3 className="text-sm font-semibold text-white mb-3">Column Name Glossary</h3>
          <ul className="space-y-2">
            {Object.entries(COLUMN_GLOSSARY).map(([col, desc]) => (
              <li key={col} className="flex items-start gap-2">
                <span className="font-mono text-xs text-blue-400 min-w-[120px]">{col}</span>
                <span className="text-xs text-slate-300">{desc}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
