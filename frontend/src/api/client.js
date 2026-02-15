import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 300000, // 5 min for long analyses
});

export const getHealth = () => api.get('/health');
export const getPlantSummary = () => api.get('/plant/summary');
export const getScadaPreview = () => api.get('/plant/scada-preview');

export const runAEP = (params) => api.post('/analysis/aep', params);
export const runElectricalLosses = (params) => api.post('/analysis/electrical-losses', params);
export const runTurbineEnergy = (params) => api.post('/analysis/turbine-energy', params);
export const runWakeLosses = (params) => api.post('/analysis/wake-losses', params);
export const runGapAnalysis = (params) => api.post('/analysis/gap-analysis', params);
export const runYawMisalignment = (params) => api.post('/analysis/yaw-misalignment', params);

export default api;
