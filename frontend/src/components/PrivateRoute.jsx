import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { useDynamic } from '../context/DynamicContext';
import { FiTool, FiLock } from 'react-icons/fi';

export default function PrivateRoute({ allowedRoles }) {
  const { user, loading } = useAuth();
  const appSettings = useAppSettings();
  const { dataAccessEnabled } = useDynamic();
  const location = useLocation();
  const isRayan = user?.email === 'maarzoukrayan3@gmail.com';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  // ═══ Mode Maintenance — bloque les non-admin (Rayan toujours autorisé) ═══
  if (appSettings?.maintenanceMode && user.role !== 'admin' && !isRayan) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
        <div className="text-center max-w-md p-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-500/20 flex items-center justify-center animate-pulse">
            <FiTool className="w-10 h-10 text-amber-400" />
          </div>
          <h1 className="text-3xl font-black text-white mb-3">Maintenance en cours</h1>
          <p className="text-blue-200 text-sm leading-relaxed mb-6">
            La plateforme Efficience Analytics est temporairement indisponible pour maintenance.
            Veuillez réessayer ultérieurement.
          </p>
          <div className="w-16 h-1 bg-amber-500/50 rounded-full mx-auto mb-6"></div>
          <p className="text-slate-500 text-xs">
            Si le problème persiste, contactez votre administrateur.
          </p>
        </div>
      </div>
    );
  }

  // ═══ Accès aux données — Rayan contrôle l'accès via le toggle IA ═══
  // Quand désactivé, seul Rayan voit les données. Les autres voient un écran d'attente.
  // La page Réglages reste accessible pour que Rayan puisse réactiver.
  const isSettingsPage = location.pathname === '/admin/settings';
  if (!dataAccessEnabled && !isRayan && !isSettingsPage && user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
        <div className="text-center max-w-md p-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-500/20 flex items-center justify-center">
            <FiLock className="w-10 h-10 text-blue-400" />
          </div>
          <h1 className="text-3xl font-black text-white mb-3">Données non disponibles</h1>
          <p className="text-blue-200 text-sm leading-relaxed mb-6">
            L'accès aux données est actuellement désactivé par l'administrateur.
            Les informations seront disponibles une fois l'accès réactivé.
          </p>
          <div className="w-16 h-1 bg-blue-500/50 rounded-full mx-auto mb-6"></div>
          <p className="text-slate-500 text-xs">
            Contactez votre administrateur pour plus d'informations.
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
