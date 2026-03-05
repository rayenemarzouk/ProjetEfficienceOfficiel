import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FiHome, FiBarChart2, FiGitMerge, FiFileText, FiPieChart, 
  FiSettings, FiLogOut, FiActivity, FiDatabase, FiCpu, FiBriefcase, FiEdit3, FiUsers
} from 'react-icons/fi';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isRayan = user?.email === 'maarzoukrayan3@gmail.com';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Menu spécial pour Rayan (design original)
  const rayanLinks = [
    { to: '/admin', icon: FiHome, label: 'DASHBOARD DENTAIRE', end: true },
    { to: '/admin/cabinets', icon: FiBarChart2, label: 'ANALYSE & COMPARAISON' },
    { to: '/admin/gestion', icon: FiBriefcase, label: 'GESTION CABINETS' },
    { to: '/admin/reports', icon: FiFileText, label: 'RAPPORTS CABINET' },
    { to: '/admin/statistics', icon: FiPieChart, label: 'STATISTIQUES DES CABINETS' },
    { to: '/admin/settings', icon: FiSettings, label: 'RÉGLAGES' },
  ];

  const adminLinks = [
    { to: '/admin', icon: FiHome, label: 'DASHBOARD DENTAIRE', end: true },
    { to: '/admin/cabinets', icon: FiBarChart2, label: 'ANALYSE & COMPARAISON' },
    { to: '/admin/gestion', icon: FiBriefcase, label: 'GESTION CABINETS' },
    { to: '/admin/reports', icon: FiFileText, label: 'RAPPORTS CABINET' },
    { to: '/admin/statistics', icon: FiPieChart, label: 'STATISTIQUES DES CABINETS' },
    { to: '/admin/settings', icon: FiSettings, label: 'RÉGLAGES' },
  ];

  const practitionerLinks = [
    { to: '/dashboard', icon: FiHome, label: 'MON TABLEAU DE BORD', end: true },
    { to: '/dashboard/stats', icon: FiBarChart2, label: 'MES STATISTIQUES' },
    { to: '/dashboard/saisie', icon: FiEdit3, label: 'SAISIE MANUELLE' },
    { to: '/dashboard/patients', icon: FiUsers, label: 'MES PATIENTS' },
    { to: '/dashboard/data', icon: FiDatabase, label: 'GESTION DONNÉES' },
    { to: '/dashboard/ai', icon: FiCpu, label: 'BILAN DU CABINET' },
    { to: '/dashboard/reports', icon: FiFileText, label: 'MES RAPPORTS' },
  ];

  const links = isRayan ? rayanLinks : (user?.role === 'admin' ? adminLinks : practitionerLinks);

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 ${
      isActive
        ? 'bg-[#2563eb] text-white'
        : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
    }`;

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col z-50" style={{ backgroundColor: '#0f172a' }}>
      {/* Logo */}
      <div className="px-4 py-6">
        {isRayan ? (
          <div>
            <h1 className="text-sm font-black text-white whitespace-nowrap tracking-wide" style={{ fontFamily: 'Arial Black, sans-serif' }}>
              EFFICIENCE ANALYTICS
            </h1>
            <p className="text-[9px] font-semibold text-gray-500 tracking-wider uppercase">
              Administration
            </p>
          </div>
        ) : (
          <div className="bg-[#1e3a5f] rounded-xl p-4">
            <h1 className="text-xl font-black text-white whitespace-nowrap tracking-wide" style={{ fontFamily: 'Arial Black, sans-serif' }}>
              EFFICIENCE
            </h1>
            <p className="text-lg font-semibold text-cyan-400 tracking-wide">
              Analytics
            </p>
            <p className="text-[9px] font-semibold text-gray-400 tracking-wider uppercase mt-2">
              {user?.role === 'admin' ? 'Administration' : `Cabinet ${user?.practitionerCode || user?.name || ''}`}
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto mt-2">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
            <link.icon className="w-4 h-4 flex-shrink-0" />
            <span className="leading-tight">{link.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-4 py-3 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-white/5 rounded-xl transition-colors tracking-wide"
        >
          <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-bold">
            {user?.name?.charAt(0) || 'N'}
          </div>
          <span>DÉCONNEXION</span>
        </button>
      </div>
    </aside>
  );
}
