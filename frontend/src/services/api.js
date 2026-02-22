import axios from 'axios';

const API_URL = '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Intercepteur pour ajouter le token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercepteur réponse pour gérer les erreurs d'auth
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = (email, password) => api.post('/auth/login', { email, password });
export const register = (data) => api.post('/auth/register', data);
export const getMe = () => api.get('/auth/me');

// Admin
export const getAdminDashboard = () => api.get('/admin/dashboard');
export const getComparison = (p1, p2) => api.get(`/admin/comparison?practitioner1=${p1}&practitioner2=${p2}`);
export const getCabinetDetails = (code) => api.get(`/admin/cabinet/${code}`);
export const getStatistics = () => api.get('/admin/statistics');
export const getSettings = () => api.get('/admin/settings');
export const updateSettings = (data) => api.put('/admin/settings', data);

// Practitioner
export const getPractitionerDashboard = () => api.get('/practitioner/dashboard');
export const getPractitionerStatistics = () => api.get('/practitioner/statistics');

// Data
export const getDataSummary = () => api.get('/data/summary');
export const importData = (type, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/data/import/${type}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

// Reports
export const generateReport = (practitionerCode, mois) => api.post('/reports/generate', { practitionerCode, mois });
export const generateAllReports = (mois) => api.post('/reports/generate-all', { mois });
export const sendReports = (mois) => api.post('/reports/send', { mois, force: true });
export const sendReportsNow = (mois) => api.post('/reports/send-now', { mois });
export const getReportsList = (mois) => api.get(`/reports/list${mois ? `?mois=${mois}` : ''}`);
export const getAvailableMonths = () => api.get('/reports/available-months');
export const downloadReport = (id) => api.get(`/reports/download/${id}`, { responseType: 'blob' });

export default api;
