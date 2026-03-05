import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  ChevronRightIcon
} from '@heroicons/react/24/outline';

const menuItems = [
  {
    name: 'Dashboard général',
    icon: HomeIcon,
    path: '/consultant/dashboard'
  },
  {
    name: 'Analyses',
    icon: ChartBarIcon,
    subItems: [
      { name: 'Analyse globales', path: '/consultant/analyses' }
    ]
  },
  {
    name: 'Gestion clients',
    icon: UsersIcon,
    path: '/consultant/clients'
  },
  {
    name: 'Rapports',
    icon: DocumentTextIcon,
    path: '/consultant/reports'
  },
  {
    name: 'Paramètres',
    icon: Cog6ToothIcon,
    path: '/consultant/settings'
  }
];

export default function ConsultantLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState(['Analyses']);

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

  const isActive = (path) => location.pathname === path;
  const isSubActive = (subItems) => subItems?.some(item => location.pathname === item.path);

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
        fixed inset-y-0 left-0 z-50 h-screen
        w-64 bg-[#1a2b4f] text-white
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        {/* Logo */}
        <div className="p-4 border-b border-white/10">
          <div className="bg-[#1e3a5f] rounded-xl p-4">
            <h1 className="text-xl font-black text-white whitespace-nowrap tracking-wide" style={{ fontFamily: 'Arial Black, sans-serif' }}>
              EFFICIENCE
            </h1>
            <p className="text-lg font-semibold text-cyan-400 tracking-wide">
              Analytics
            </p>
            <p className="text-[9px] font-semibold text-gray-400 tracking-wider uppercase mt-2">
              Espace Consultant
            </p>
          </div>
        </div>

        {/* User info */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center text-sm font-bold">
              {user?.nom?.charAt(0) || 'C'}
            </div>
            <div>
              <p className="text-sm font-medium">{user?.prenom} {user?.nom}</p>
              <p className="text-xs text-blue-200">Consultant</p>
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
      <div className="flex-1 flex flex-col min-h-screen lg:ml-64">
        {/* Top header */}
        <header className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
          
          <div className="hidden lg:block"></div>
          
          <div className="flex items-center gap-4">
            {/* Status card */}
            <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-semibold text-green-600">Système actif</span>
              </div>
              <div className="w-px h-4 bg-blue-200"></div>
              <div className="text-center">
                <p className="text-xs font-bold text-blue-700">
                  {new Date().toLocaleDateString('fr-FR', { weekday: 'long' }).charAt(0).toUpperCase() + new Date().toLocaleDateString('fr-FR', { weekday: 'long' }).slice(1)}
                </p>
                <p className="text-[10px] text-blue-500">
                  {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Notifications */}
            <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* User avatar */}
            <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                {user?.nom?.charAt(0) || 'C'}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
