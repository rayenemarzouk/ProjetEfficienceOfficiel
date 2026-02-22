import axios from 'axios';

// En production, utiliser VITE_API_URL si défini (ex: https://ton-backend.onrender.com/api)
// Sinon, utiliser /api (quand frontend et backend sont sur le même serveur)
const API_URL = import.meta.env.VITE_API_URL || '/api';

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

// Public settings (no auth — for maintenance check)
export const getPublicSettings = () => api.get('/settings/public');

// Admin
export const getAdminDashboard = () => api.get('/admin/dashboard');
export const getComparison = (p1, p2) => api.get(`/admin/comparison?practitioner1=${p1}&practitioner2=${p2}`);
export const getCabinetDetails = (code) => api.get(`/admin/cabinet/${code}`);
export const getStatistics = () => api.get('/admin/statistics');
export const getSettings = () => api.get('/admin/settings');
export const updateSettings = (data) => api.put('/admin/settings', data);
export const impersonateUser = (practitionerId) => api.post('/admin/impersonate', { practitionerId });
export const deactivateSendCode = (userId) => api.post('/admin/deactivate-send-code', { userId });
export const deactivateConfirm = (userId, code) => api.post('/admin/deactivate-confirm', { userId, code });
export const aiToggleSendCode = (targetState, sendEmail = false) => api.post('/admin/ai-toggle-send-code', { targetState, sendEmail });
export const aiToggleConfirm = (code, type = 'admin') => api.post('/admin/ai-toggle-confirm', { code, type });

// Profile
export const updateProfile = (data) => api.put('/auth/profile', data);

// Practitioner
export const getPractitionerDashboard = () => api.get('/practitioner/dashboard');
export const getPractitionerStatistics = () => api.get('/practitioner/statistics');
export const submitManualEntry = (type, mois, data) => api.post('/practitioner/manual-entry', { type, mois, data });
export const getManualEntry = (type, mois) => api.get(`/practitioner/manual-entry/${type}/${mois}`);

// Patients
export const getPatients = (params) => api.get('/practitioner/patients', { params });
export const addPatient = (data) => api.post('/practitioner/patients', data);
export const updatePatient = (id, data) => api.put(`/practitioner/patients/${id}`, data);
export const deletePatient = (id) => api.delete(`/practitioner/patients/${id}`);

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
