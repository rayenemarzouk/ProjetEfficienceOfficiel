import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useDynamic } from '../context/DynamicContext';
import { FiBell, FiSearch, FiMoon, FiSun, FiZap, FiZapOff } from 'react-icons/fi';

export default function Header({ title, subtitle }) {
  const { user } = useAuth();
  const { dark, toggleDark } = useTheme();
  const { isDynamic, toggleDynamic } = useDynamic();

  return (
    <header className="bg-white dark:bg-[#1e293b] border-b border-gray-200 dark:border-gray-700 px-8 py-4 transition-colors duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Rechercher..."
              className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-64 transition-colors"
            />
          </div>
          {/* Dynamic Mode Toggle — 84 éléments */}
          <button
            onClick={toggleDynamic}
            className="relative p-2.5 rounded-xl transition-all duration-300 group"
            style={{
              background: isDynamic
                ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                : 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)',
              boxShadow: isDynamic
                ? '0 0 14px rgba(16, 185, 129, 0.4), inset 0 1px 0 rgba(255,255,255,0.15)'
                : '0 0 8px rgba(107, 114, 128, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
            title={isDynamic ? 'Désactiver le mode dynamique (84 effets)' : 'Activer le mode dynamique (84 effets)'}
          >
            <div className="relative w-5 h-5">
              <FiZap
                className={`w-5 h-5 absolute inset-0 transition-all duration-300 ${
                  isDynamic ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-0'
                }`}
                style={{ color: '#ffffff' }}
              />
              <FiZapOff
                className={`w-5 h-5 absolute inset-0 transition-all duration-300 ${
                  isDynamic ? 'opacity-0 -rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'
                }`}
                style={{ color: '#ffffff' }}
              />
            </div>
            {isDynamic && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-400 border border-white"></span>
              </span>
            )}
          </button>
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDark}
            className="relative p-2.5 rounded-xl transition-all duration-300 group"
            style={{
              background: dark
                ? 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)'
                : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              boxShadow: dark
                ? '0 0 12px rgba(99, 102, 241, 0.3), inset 0 1px 0 rgba(255,255,255,0.05)'
                : '0 0 12px rgba(251, 191, 36, 0.3), inset 0 1px 0 rgba(255,255,255,0.5)',
            }}
            title={dark ? 'Mode clair' : 'Mode sombre'}
          >
            <div className="relative w-5 h-5">
              <FiSun
                className={`w-5 h-5 absolute inset-0 transition-all duration-300 ${
                  dark ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'
                }`}
                style={{ color: '#d97706' }}
              />
              <FiMoon
                className={`w-5 h-5 absolute inset-0 transition-all duration-300 ${
                  dark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'
                }`}
                style={{ color: '#818cf8' }}
              />
            </div>
          </button>
          <button className="relative p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors">
            <FiBell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-gray-600">
            <div className="w-9 h-9 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{user?.email}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">{user?.role === 'admin' ? 'Administrateur' : 'Cabinet'}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
