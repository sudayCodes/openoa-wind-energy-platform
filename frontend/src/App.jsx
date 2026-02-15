import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import DataExplorer from './pages/DataExplorer'
import DataUpload from './pages/DataUpload'
import AEPAnalysis from './pages/AEPAnalysis'
import ElectricalLosses from './pages/ElectricalLosses'
import TurbineEnergy from './pages/TurbineEnergy'
import WakeLosses from './pages/WakeLosses'
import GapAnalysis from './pages/GapAnalysis'
import YawMisalignment from './pages/YawMisalignment'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="data" element={<DataExplorer />} />
        <Route path="upload" element={<DataUpload />} />
        <Route path="aep" element={<AEPAnalysis />} />
        <Route path="electrical" element={<ElectricalLosses />} />
        <Route path="turbine-energy" element={<TurbineEnergy />} />
        <Route path="wake" element={<WakeLosses />} />
        <Route path="gap" element={<GapAnalysis />} />
        <Route path="yaw" element={<YawMisalignment />} />
      </Route>
    </Routes>
  )
}
