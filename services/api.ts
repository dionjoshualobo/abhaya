import axios from 'axios';

// TODO: Change this to your machine's local IP when testing on a physical device
// e.g. 'http://192.168.x.x:5000'
const BASE_URL = 'http://localhost:5000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ----- Health -----
export const checkHealth = () => api.get('/health');

// ----- Alerts -----
// export const sendAlert = (data: AlertPayload) => api.post('/alert', data);

// ----- Heatmap -----
// export const getHeatmap = () => api.get('/heatmap');

// ----- Anomaly -----
// export const reportAnomaly = (data: AnomalyPayload) => api.post('/anomaly', data);

export default api;
