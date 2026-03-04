import { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HomeIcon,
  ChartBarIcon,
  UsersIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PresentationChartLineIcon
} from '@heroicons/react/24/outline';
import { 
  FiHome, FiBarChart2, FiGitMerge, FiFileText, FiPieChart, 
  FiSettings, FiBriefcase
} from 'react-icons/fi';

const menuItems = [
  {
    name: 'Dashboard général',
    icon: HomeIcon,
    path: '/admin'
  },
  {
    name: 'Analyses',
    icon: ChartBarIcon,
    subItems: [
      { name: 'Analyse globales', path: '/admin/cabinets' }
    ]
  },
  {
    name: 'Gestion clients',
    icon: UsersIcon,
    path: '/admin/gestion'
  },
  {
    name: 'Rapports',
    icon: DocumentTextIcon,
    path: '/admin/reports'
  },
  {
    name: 'Paramètres',
    icon: Cog6ToothIcon,
    path: '/admin/settings'
  }
];

// Menu spécial pour Rayan (design original des captures)
const rayanMenuItems = [
  { to: '/admin', icon: FiHome, label: 'DASHBOARD DENTAIRE', end: true },
  { to: '/admin/cabinets', icon: FiBarChart2, label: 'ANALYSE DES CABINETS' },
  { to: '/admin/comparison', icon: FiGitMerge, label: 'COMPARAISON CABINETS' },
  { to: '/admin/gestion', icon: FiBriefcase, label: 'GESTION CABINETS' },
  { to: '/admin/reports', icon: FiFileText, label: 'RAPPORTS CABINET' },
  { to: '/admin/statistics', icon: FiPieChart, label: 'STATISTIQUES DES CABINETS' },
  { to: '/admin/settings', icon: FiSettings, label: 'RÉGLAGES' },
];

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState(['Analyses']);
  
  const isRayan = user?.email === 'maarzoukrayan3@gmail.com';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSubmenu = (menuName) => {
    setExpandedMenus(prev => 
      prev.includes(menuName) 
        ? prev.filter(m => m !== menuName)
        : [...prev, menuName]
    );
  };

  const isActive = (path) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname === path;
  };
  const isSubActive = (subItems) => subItems?.some(item => location.pathname === item.path);

  // Layout spécial pour Rayan (design des captures d'écran)
  if (isRayan) {
    const linkClass = ({ isActive }) =>
      `flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 ${
        isActive
          ? 'bg-[#2563eb] text-white'
          : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
      }`;

    return (
      <div className="min-h-screen flex" style={{ backgroundColor: '#0a1628' }}>
        {/* Sidebar Rayan */}
        <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col z-50" style={{ backgroundColor: '#0f172a' }}>
          {/* Logo */}
          <div className="px-5 py-6">
            <h1 className="text-base font-black text-white whitespace-nowrap" style={{ fontFamily: 'monospace' }}>
              EFFICIENCE ANALYTICS
            </h1>
            <p className="text-[10px] font-semibold text-gray-500 tracking-[0.2em] mt-1 uppercase">Cabinet Source</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 space-y-1 overflow-y-auto mt-2">
            {rayanMenuItems.map((link) => (
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
                {user?.name?.charAt(0) || 'R'}
              </div>
              <span>DÉCONNEXION</span>
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 ml-64 min-h-screen">
          {children}
        </main>
      </div>
    );
  }

  // Layout standard pour les autres admins
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-[#1a2b4f] text-white
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        {/* Logo */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <span className="text-[#1a2b4f] font-bold text-xl">E</span>
            </div>
            <div>
              <h1 className="text-sm font-black text-white whitespace-nowrap tracking-[0.08em]" style={{ fontFamily: 'Consolas, Monaco, monospace' }}>
                EFFICIENCE ANALYTICS
              </h1>
              <p className="text-[10px] font-semibold text-gray-400 tracking-[0.1em] uppercase">
                Administration
              </p>
            </div>
          </div>
        </div>

        {/* User info */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center text-sm font-bold">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div>
              <p className="text-sm font-medium">{user?.name || 'Admin'}</p>
              <p className="text-xs text-blue-200">Administrateur</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {menuItems.map((item) => (
            <div key={item.name}>
              {item.subItems ? (
                <>
                  <button
                    onClick={() => toggleSubmenu(item.name)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 text-left
                      hover:bg-white/10 transition-colors
                      ${isSubActive(item.subItems) ? 'bg-white/10 border-l-4 border-blue-400' : ''}
                    `}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="flex-1 text-sm">{item.name}</span>
                    {expandedMenus.includes(item.name) ? (
                      <ChevronDownIcon className="w-4 h-4" />
                    ) : (
                      <ChevronRightIcon className="w-4 h-4" />
                    )}
                  </button>
                  {expandedMenus.includes(item.name) && (
                    <div className="bg-black/20">
                      {item.subItems.map((subItem) => (
                        <Link
                          key={subItem.path}
                          to={subItem.path}
                          onClick={() => setSidebarOpen(false)}
                          className={`
                            flex items-center gap-3 pl-12 pr-4 py-2.5 text-sm
                            hover:bg-white/10 transition-colors
                            ${isActive(subItem.path) ? 'bg-white/10 text-blue-300' : 'text-blue-100'}
                          `}
                        >
                          {subItem.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3
                    hover:bg-white/10 transition-colors
                    ${isActive(item.path) ? 'bg-white/10 border-l-4 border-blue-400' : ''}
                  `}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-sm">{item.name}</span>
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-300 hover:bg-red-500/20 rounded-lg transition-colors"
          >
            <ArrowLeftOnRectangleIcon className="w-5 h-5" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between lg:justify-end">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {new Date().toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}
