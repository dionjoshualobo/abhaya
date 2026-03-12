import axios from 'axios';

// Change to your backend machine's local IP when testing on a physical device
// e.g. 'http://192.168.x.x:5000'
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000';

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
export const sendAlert = (latitude: number, longitude: number) =>
  api.post('/alert', { latitude, longitude });

// ----- Contacts -----
export const getContacts = () => api.get('/contacts');
export const addContact = (name: string, phone: string, relation?: string) =>
  api.post('/contacts', { name, phone, relation });
export const updateContact = (id: number, data: { name?: string; phone?: string; relation?: string }) =>
  api.put(`/contacts/${id}`, data);
export const deleteContact = (id: number) => api.delete(`/contacts/${id}`);

// ----- Safe Places -----
export const getPlaces = () => api.get('/places');
export const addPlace = (label: string, latitude: number, longitude: number, radius_meters?: number) =>
  api.post('/places', { label, latitude, longitude, radius_meters });
export const updatePlace = (id: number, data: object) => api.put(`/places/${id}`, data);
export const deletePlace = (id: number) => api.delete(`/places/${id}`);
export const checkLocation = (latitude: number, longitude: number) =>
  api.post('/location/check', { latitude, longitude });

// ----- Heatmap -----
export const getHeatmap = () => api.get('/heatmap');
export const reportDangerZone = (latitude: number, longitude: number, description?: string, weight?: number) =>
  api.post('/heatmap', { latitude, longitude, description, weight });

// ----- Anomaly -----
export const reportAnomaly = (x: number, y: number, z: number, latitude?: number, longitude?: number) =>
  api.post('/anomaly', { x, y, z, latitude, longitude });

// ----- Check-in -----
export const requestCheckin = (latitude: number, longitude: number, timeout_seconds?: number) =>
  api.post('/checkin/request', { latitude, longitude, timeout_seconds });
export const respondCheckin = (session_id: string, safe: boolean) =>
  api.post('/checkin/respond', { session_id, safe });
export const pollCheckin = (session_id: string) =>
  api.post('/checkin/poll', { session_id });

export default api;
