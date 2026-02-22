import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { DynamicProvider } from './context/DynamicContext';
import { AppSettingsProvider } from './context/AppSettingsContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import CabinetAnalysis from './pages/admin/CabinetAnalysis';
import Comparison from './pages/admin/Comparison';
import CabinetManagement from './pages/admin/CabinetManagement';
import Reports from './pages/admin/Reports';
import Statistics from './pages/admin/Statistics';
import Settings from './pages/admin/Settings';

// Practitioner pages
import PractitionerDashboard from './pages/practitioner/Dashboard';
import MyStats from './pages/practitioner/MyStats';
import DataManagement from './pages/practitioner/DataManagement';
import AIAnalysis from './pages/practitioner/AIAnalysis';
import MyReports from './pages/practitioner/MyReports';

export default function App() {
  return (
    <DynamicProvider>
    <ThemeProvider>
    <AuthProvider>
    <AppSettingsProvider>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Admin Routes */}
          <Route element={<PrivateRoute allowedRoles={['admin']} />}>
            <Route element={<Layout />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/cabinets" element={<CabinetAnalysis />} />
              <Route path="/admin/comparison" element={<Comparison />} />
              <Route path="/admin/gestion" element={<CabinetManagement />} />
              <Route path="/admin/reports" element={<Reports />} />
              <Route path="/admin/statistics" element={<Statistics />} />
              <Route path="/admin/settings" element={<Settings />} />
            </Route>
          </Route>

          {/* Practitioner Routes */}
          <Route element={<PrivateRoute allowedRoles={['practitioner']} />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<PractitionerDashboard />} />
              <Route path="/dashboard/stats" element={<MyStats />} />
              <Route path="/dashboard/data" element={<DataManagement />} />
              <Route path="/dashboard/ai" element={<AIAnalysis />} />
              <Route path="/dashboard/reports" element={<MyReports />} />
            </Route>
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AppSettingsProvider>
    </AuthProvider>
    </ThemeProvider>
    </DynamicProvider>
  );
}
