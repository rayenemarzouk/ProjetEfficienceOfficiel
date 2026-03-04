import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { DynamicProvider } from './context/DynamicContext';
import { AppSettingsProvider } from './context/AppSettingsContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import ConsultantLayout from './components/ConsultantLayout';
import Login from './pages/Login';
import Register from './pages/Register';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import CabinetsUnified from './pages/admin/CabinetsUnified';
import CabinetManagement from './pages/admin/CabinetManagement';
import Reports from './pages/admin/Reports';
import Statistics from './pages/admin/Statistics';
import Settings from './pages/admin/Settings';
import Comparison from './pages/admin/Comparison';

// Practitioner pages
import PractitionerDashboard from './pages/practitioner/Dashboard';
import MyStats from './pages/practitioner/MyStats';
import DataManagement from './pages/practitioner/DataManagement';
import AIAnalysis from './pages/practitioner/AIAnalysis';
import MyReports from './pages/practitioner/MyReports';
import ManualEntry from './pages/practitioner/ManualEntry';
import PatientManagement from './pages/practitioner/PatientManagement';

// Consultant pages
import ConsultantDashboard from './pages/consultant/Dashboard';
import ConsultantAnalyses from './pages/consultant/Analyses';
import ConsultantClients from './pages/consultant/Clients';
import ConsultantReports from './pages/consultant/Reports';
import ConsultantSettings from './pages/consultant/Settings';

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
            <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
            <Route path="/admin/cabinets" element={<AdminLayout><CabinetsUnified /></AdminLayout>} />
            <Route path="/admin/comparison" element={<AdminLayout><Comparison /></AdminLayout>} />
            <Route path="/admin/gestion" element={<AdminLayout><CabinetManagement /></AdminLayout>} />
            <Route path="/admin/reports" element={<AdminLayout><Reports /></AdminLayout>} />
            <Route path="/admin/statistics" element={<AdminLayout><Statistics /></AdminLayout>} />
            <Route path="/admin/settings" element={<AdminLayout><Settings /></AdminLayout>} />
          </Route>

          {/* Practitioner Routes */}
          <Route element={<PrivateRoute allowedRoles={['practitioner']} />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<PractitionerDashboard />} />
              <Route path="/dashboard/stats" element={<MyStats />} />
              <Route path="/dashboard/data" element={<DataManagement />} />
              <Route path="/dashboard/ai" element={<AIAnalysis />} />
              <Route path="/dashboard/reports" element={<MyReports />} />
              <Route path="/dashboard/saisie" element={<ManualEntry />} />
              <Route path="/dashboard/patients" element={<PatientManagement />} />
            </Route>
          </Route>

          {/* Consultant Routes */}
          <Route element={<PrivateRoute allowedRoles={['consultant']} />}>
            <Route path="/consultant" element={<ConsultantLayout><ConsultantDashboard /></ConsultantLayout>} />
            <Route path="/consultant/dashboard" element={<ConsultantLayout><ConsultantDashboard /></ConsultantLayout>} />
            <Route path="/consultant/analyses" element={<ConsultantLayout><ConsultantAnalyses /></ConsultantLayout>} />
            <Route path="/consultant/clients" element={<ConsultantLayout><ConsultantClients /></ConsultantLayout>} />
            <Route path="/consultant/reports" element={<ConsultantLayout><ConsultantReports /></ConsultantLayout>} />
            <Route path="/consultant/settings" element={<ConsultantLayout><ConsultantSettings /></ConsultantLayout>} />
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
