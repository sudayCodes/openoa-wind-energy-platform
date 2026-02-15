import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 900000, // 15 min for heavy analyses (GBM, daily resolution, etc.)
});

// ── Plant ──
export const getHealth = () => api.get('/health');
export const getPlantSummary = () => api.get('/plant/summary');
export const getScadaPreview = () => api.get('/plant/scada-preview');

// ── Data Upload ──
export const uploadCSV = (datasetType, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/data/upload/${datasetType}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
};
export const getDataStatus = () => api.get('/data/status');
export const resetData = () => api.post('/data/reset');
export const getTemplates = () => api.get('/data/templates');

// ── Analyses ──
export const runAEP = (params) => api.post('/analysis/aep', params);
export const runElectricalLosses = (params) => api.post('/analysis/electrical-losses', params);
export const runTurbineEnergy = (params) => api.post('/analysis/turbine-energy', params);
export const runWakeLosses = (params) => api.post('/analysis/wake-losses', params);
export const runGapAnalysis = (params) => api.post('/analysis/gap-analysis', params);
export const runYawMisalignment = (params) => api.post('/analysis/yaw-misalignment', params);
export const getAnalysisStatus = () => api.get('/analysis/status', { timeout: 10000 });
export const getLastResult = () => api.get('/analysis/last-result', { timeout: 30000 });

export default api;
