import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

// Glossary of column names and their full forms/descriptions
const COLUMN_GLOSSARY = {
  // SCADA Columns
  'time': 'Timestamp (date/time)',
  'asset_id': 'Turbine or Tower Identifier',
  'WTUR_W': 'Wind TURbine Power (kW)',
  'WMET_HorWdSpd': 'Wind METeorological Horizontal Wind Speed (m/s)',
  'WMET_HorWdDir': 'Wind METeorological Horizontal Wind Direction (deg)',
  'WMET_HorWdDirRel': 'Wind Direction Relative to Nacelle (deg)',
  'WTUR_TurSt': 'Wind TURbine Status',
  'WROT_BlPthAngVal': 'Wind ROTor Blade Pitch Angle Value (deg)',
  'WMET_EnvTmp': 'Wind METeorological Environmental Temperature',

  // Meter Columns
  'MMTR_SupWh': 'Main MeTeR Supplied Watt-hours (kWh)',

  // Reanalysis Columns
  'WMETR_HorWdSpd': 'Reanalysis Horizontal Wind Speed',
  'WMETR_HorWdSpdU': 'Reanalysis U-component Wind Speed',
  'WMETR_HorWdSpdV': 'Reanalysis V-component Wind Speed',
  'WMETR_HorWdDir': 'Reanalysis Wind Direction',
  'WMETR_EnvTmp': 'Reanalysis Environmental Temperature',
  'WMETR_AirDen': 'Reanalysis Air Density',
  'WMETR_EnvPres': 'Reanalysis Environmental Pressure',

  // Curtailment Columns
  'IAVL_ExtPwrDnWh': 'Internal AVaiLability External Power Down Watt-hours',
  'IAVL_DnWh': 'Internal AVaiLability Down Watt-hours',

  // Asset Columns
  'latitude': 'Geographic Latitude',
  'longitude': 'Geographic Longitude',
  'rated_power': 'Rated Turbine Power (kW)',
  'hub_height': 'Turbine Hub Height (m)',
  'rotor_diameter': 'Rotor Diameter (m)',
  'elevation': 'Elevation Above Sea Level (m)',
  'type': 'Asset Type (turbine/tower)',
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
