import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  FiBell, FiSearch, FiMoon, FiSun,
  FiHome, FiBarChart2, FiGitMerge, FiBriefcase, FiFileText,
  FiPieChart, FiSettings, FiDatabase, FiCpu,
  FiSend, FiAlertTriangle, FiCheckCircle, FiX, FiArrowRight
} from 'react-icons/fi';
import { getReportsList, getAdminDashboard } from '../services/api';

// ═══ Pages indexées pour la recherche ═══
const adminPages = [
  { path: '/admin', label: 'Dashboard Dentaire', Icon: FiHome, desc: "Vue d'ensemble", keywords: ['dashboard', 'tableau de bord', 'accueil', 'home', 'vue ensemble'] },
  { path: '/admin/cabinets', label: 'Analyse des Cabinets', Icon: FiBarChart2, desc: 'Performances et IA', keywords: ['analyse', 'cabinets', 'patients', 'performance', 'ia', 'tendance', 'scoring'] },
  { path: '/admin/comparison', label: 'Comparaison Cabinets', Icon: FiGitMerge, desc: 'Comparer les praticiens', keywords: ['comparaison', 'comparer', 'versus', 'absences', 'presences', 'praticiens'] },
  { path: '/admin/gestion', label: 'Gestion Cabinets', Icon: FiBriefcase, desc: 'Suivi et détails', keywords: ['gestion', 'management', 'suivi', 'cabinets', 'details', 'score'] },
  { path: '/admin/reports', label: 'Rapports Cabinet', Icon: FiFileText, desc: 'Générer et envoyer', keywords: ['rapports', 'reports', 'pdf', 'email', 'envoyer', 'generer', 'mensuel'] },
  { path: '/admin/statistics', label: 'Statistiques des Cabinets', Icon: FiPieChart, desc: 'Graphiques et données', keywords: ['statistiques', 'stats', 'graphiques', 'donnees', 'evolution', 'chiffre'] },
  { path: '/admin/settings', label: 'Réglages', Icon: FiSettings, desc: 'Configuration système', keywords: ['reglages', 'settings', 'parametres', 'configuration', 'cron', 'automatique'] },
];

const practitionerPages = [
  { path: '/dashboard', label: 'Mon Tableau de Bord', Icon: FiHome, desc: "Vue d'ensemble", keywords: ['dashboard', 'tableau de bord', 'accueil'] },
  { path: '/dashboard/stats', label: 'Mes Statistiques', Icon: FiBarChart2, desc: 'Performances', keywords: ['statistiques', 'stats', 'graphiques', 'performance'] },
  { path: '/dashboard/data', label: 'Gestion Données', Icon: FiDatabase, desc: 'Import de données', keywords: ['donnees', 'data', 'import', 'fichier', 'csv'] },
  { path: '/dashboard/ai', label: 'Bilan du Cabinet', Icon: FiCpu, desc: 'Analyse et prévisions', keywords: ['bilan', 'cabinet', 'analyse', 'prevision', 'tendance', 'sante'] },
  { path: '/dashboard/patients', label: 'Mes Patients', Icon: FiHome, desc: 'Gestion des patients', keywords: ['patients', 'patientele', 'ajouter', 'patient', 'fiche', 'contact'] },
  { path: '/dashboard/reports', label: 'Mes Rapports', Icon: FiFileText, desc: 'Rapports mensuels', keywords: ['rapports', 'reports', 'pdf', 'mensuel'] },
];

const normalize = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Il y a ${days}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

export default function Header({ title, subtitle }) {
  const { user } = useAuth();
  const { dark, toggleDark } = useTheme();
  const navigate = useNavigate();

  // ═══ SEARCH ═══
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef(null);

  // ═══ NOTIFICATIONS ═══
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifSeen, setNotifSeen] = useState(false);
  const notifRef = useRef(null);

  // Fermer les dropdowns au clic extérieur
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchFocused(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Search logic ──
  const pages = user?.role === 'admin' ? adminPages : practitionerPages;
  const searchResults = searchQuery.trim().length > 0
    ? pages.filter(p => {
        const q = normalize(searchQuery);
        return normalize(p.label).includes(q)
          || normalize(p.desc).includes(q)
          || p.keywords.some(k => normalize(k).includes(q));
      })
    : [];

  const handleSearchSelect = (path) => {
    navigate(path);
    setSearchQuery('');
    setSearchFocused(false);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Escape') { setSearchQuery(''); setSearchFocused(false); }
    if (e.key === 'Enter' && searchResults.length > 0) handleSearchSelect(searchResults[0].path);
  };

  // ── Notifications logic ──
  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const notifs = [];
      if (user?.role === 'admin') {
        const [reportsRes, dashRes] = await Promise.all([getReportsList(), getAdminDashboard()]);
        const reports = reportsRes.data || [];
        const dash = dashRes.data || {};
        const practitioners = dash.practitioners || [];
        const caByP = dash.caByPractitioner || [];

        const moisNoms = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
        reports.slice(0, 5).forEach(r => {
          const ml = r.mois ? `${moisNoms[parseInt(r.mois.substring(4, 6)) - 1]} ${r.mois.substring(0, 4)}` : '';
          notifs.push({
            id: r._id, type: r.emailEnvoye ? 'success' : 'info', iconKey: r.emailEnvoye ? 'send' : 'file',
            title: r.emailEnvoye ? `Rapport envoyé — ${r.praticien}` : `Rapport généré — ${r.praticien}`,
            message: ml + (r.contenu?.caMensuel ? ` • CA: ${new Intl.NumberFormat('fr-FR').format(r.contenu.caMensuel)} €` : ''),
            time: r.dateEnvoi || r.createdAt, action: '/admin/reports',
          });
        });

        practitioners.forEach(p => {
          const ca = caByP.find(c => c._id === p.code);
          const totalCA = ca?.totalFacture || 0;
          const totalEnc = ca?.totalEncaisse || 0;
          const score = totalCA > 0 ? Math.round((totalEnc / totalCA) * 100) : 0;
          if (score < 30) {
            notifs.push({
              id: `perf-${p.code}`, type: score < 30 ? 'error' : 'warning', iconKey: 'alert',
              title: score < 30 ? `⚠ Alerte — ${p.name}` : `À vérifier — ${p.name}`,
              message: `Taux encaissement: ${score}% (${p.code})`, time: new Date().toISOString(), action: '/admin/gestion',
            });
          }
        });

        notifs.push({
          id: 'sys', type: 'success', iconKey: 'check',
          title: 'Système opérationnel',
          message: `${practitioners.length} praticiens actifs • ${reports.length} rapports`,
          time: new Date().toISOString(),
        });
      } else {
        notifs.push(
          { id: 'n1', type: 'info', iconKey: 'file', title: 'Rapports disponibles', message: 'Consultez vos rapports mensuels', time: new Date().toISOString(), action: '/dashboard/reports' },
          { id: 'n2', type: 'success', iconKey: 'check', title: 'Données à jour', message: 'Votre tableau de bord est actif', time: new Date().toISOString(), action: '/dashboard' },
        );
      }
      setNotifications(notifs);
    } catch {
      setNotifications([{ id: 'err', type: 'error', iconKey: 'alert', title: 'Erreur', message: 'Impossible de charger les notifications', time: new Date().toISOString() }]);
    } finally {
      setNotifLoading(false);
    }
  }, [user]);

  const handleBellClick = () => {
    const opening = !notifOpen;
    setNotifOpen(opening);
    if (opening) { setNotifSeen(true); fetchNotifications(); }
  };

  const iconMap = { send: FiSend, file: FiFileText, alert: FiAlertTriangle, check: FiCheckCircle };
  const colorMap = {
    success: { icon: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/30' },
    info: { icon: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/30' },
    warning: { icon: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/30' },
    error: { icon: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/30' },
  };

  const isRayan = user?.email === 'maarzoukrayan3@gmail.com';

  return (
    <header className={`px-8 py-4 transition-colors duration-300 ${isRayan ? 'bg-[#0f1d2f] border-b border-[#1e3a5f]/50' : 'bg-white dark:bg-[#1e293b] border-b border-gray-200 dark:border-gray-700'}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isRayan ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>{title}</h1>
          {subtitle && <p className={`text-sm mt-0.5 ${isRayan ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>{subtitle}</p>}
        </div>
        <div className="flex items-center gap-4">
          {/* ═══ SEARCH BAR ═══ */}
          <div className="relative hidden md:block" ref={searchRef}>
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchFocused(true); }}
              onFocus={() => setSearchFocused(true)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Rechercher..."
              className={`pl-10 pr-8 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64 transition-colors ${isRayan ? 'bg-[#0a1628] border border-[#1e3a5f] text-gray-200 placeholder-gray-500' : 'bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500'}`}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className={`absolute right-3 top-1/2 -translate-y-1/2 ${isRayan ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
                <FiX className="w-3.5 h-3.5" />
              </button>
            )}
            {/* Search dropdown */}
            {searchFocused && searchQuery.trim().length > 0 && (
              <div className={`absolute top-full left-0 right-0 mt-2 rounded-xl shadow-xl z-[60] overflow-hidden ${isRayan ? 'bg-[#1e293b] border border-[#1e3a5f]' : 'bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-700'}`}>
                {searchResults.length > 0 ? (
                  <div className="py-1">
                    <p className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider ${isRayan ? 'text-gray-500' : 'text-gray-400 dark:text-gray-500'}`}>Pages</p>
                    {searchResults.map((page) => (
                      <button
                        key={page.path}
                        onClick={() => handleSearchSelect(page.path)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left group ${isRayan ? 'hover:bg-blue-900/20' : 'hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
                      >
                        <div className={`p-1.5 rounded-lg transition-colors ${isRayan ? 'bg-blue-900/30 group-hover:bg-blue-900/50' : 'bg-blue-50 dark:bg-blue-900/30 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50'}`}>
                          <page.Icon className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isRayan ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{page.label}</p>
                          <p className={`text-[11px] ${isRayan ? 'text-gray-500' : 'text-gray-400 dark:text-gray-500'}`}>{page.desc}</p>
                        </div>
                        <FiArrowRight className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity ${isRayan ? 'text-gray-600' : 'text-gray-300 dark:text-gray-600'}`} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-6 text-center">
                    <FiSearch className={`w-8 h-8 mx-auto mb-2 ${isRayan ? 'text-gray-600' : 'text-gray-300 dark:text-gray-600'}`} />
                    <p className={`text-sm ${isRayan ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>Aucun résultat pour « {searchQuery} »</p>
                    <p className={`text-[11px] mt-1 ${isRayan ? 'text-gray-500' : 'text-gray-400 dark:text-gray-500'}`}>Essayez : dashboard, rapports, statistiques…</p>
                  </div>
                )}
              </div>
            )}
          </div>

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

          {/* ═══ NOTIFICATION BELL ═══ */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={handleBellClick}
              className={`relative p-2 rounded-xl transition-colors ${isRayan ? 'text-gray-400 hover:bg-white/10' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              <FiBell className="w-5 h-5" />
              {!notifSeen && (
                <span className="absolute top-1 right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              )}
            </button>

            {/* Notification dropdown */}
            {notifOpen && (
              <div className={`absolute right-0 top-full mt-2 w-96 rounded-xl shadow-2xl z-[60] overflow-hidden ${isRayan ? 'bg-[#1e293b] border border-[#1e3a5f]' : 'bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-700'}`}>
                <div className={`px-4 py-3 flex items-center justify-between ${isRayan ? 'border-b border-[#1e3a5f] bg-gradient-to-r from-blue-900/20 to-violet-900/20' : 'border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-violet-50 dark:from-blue-900/20 dark:to-violet-900/20'}`}>
                  <div className="flex items-center gap-2">
                    <FiBell className="w-4 h-4 text-blue-600" />
                    <h3 className={`text-sm font-bold ${isRayan ? 'text-white' : 'text-gray-900 dark:text-white'}`}>Notifications</h3>
                  </div>
                  {notifications.length > 0 && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isRayan ? 'text-blue-400 bg-blue-900/50' : 'text-blue-600 bg-blue-100 dark:bg-blue-900/50'}`}>{notifications.length}</span>
                  )}
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {notifLoading ? (
                    <div className="flex flex-col items-center justify-center py-10">
                      <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600 mb-3"></div>
                      <p className="text-xs text-gray-400">Chargement…</p>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="px-4 py-10 text-center">
                      <FiBell className={`w-10 h-10 mx-auto mb-3 ${isRayan ? 'text-gray-700' : 'text-gray-200 dark:text-gray-700'}`} />
                      <p className="text-sm text-gray-400">Aucune notification</p>
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const NIcon = iconMap[n.iconKey] || FiBell;
                      const colors = colorMap[n.type] || colorMap.info;
                      return (
                        <div
                          key={n.id}
                          className={`px-4 py-3 transition-colors ${n.action ? 'cursor-pointer' : ''} ${isRayan ? 'border-b border-gray-800 hover:bg-gray-800/50' : 'border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                          onClick={() => { if (n.action) { navigate(n.action); setNotifOpen(false); } }}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${colors.bg} flex-shrink-0`}>
                              <NIcon className={`w-4 h-4 ${colors.icon}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-[13px] font-semibold leading-tight ${isRayan ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{n.title}</p>
                              <p className={`text-[11px] mt-0.5 ${isRayan ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>{n.message}</p>
                            </div>
                            <span className={`text-[10px] whitespace-nowrap flex-shrink-0 mt-0.5 ${isRayan ? 'text-gray-500' : 'text-gray-400 dark:text-gray-500'}`}>{timeAgo(n.time)}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                {notifications.length > 0 && !notifLoading && (
                  <div className={`px-4 py-2.5 border-t text-center ${isRayan ? 'border-[#1e3a5f]' : 'border-gray-100 dark:border-gray-700'}`}>
                    <button onClick={() => { navigate(user?.role === 'admin' ? '/admin/reports' : '/dashboard/reports'); setNotifOpen(false); }}
                      className={`text-xs font-semibold transition-colors ${isRayan ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300'}`}>
                      Voir tous les rapports →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className={`flex items-center gap-3 pl-4 border-l ${isRayan ? 'border-[#1e3a5f]' : 'border-gray-200 dark:border-gray-600'}`}>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold ${isRayan ? 'bg-blue-600' : 'bg-primary-600'}`}>
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="hidden md:block">
              <p className={`text-sm font-medium ${isRayan ? 'text-gray-300' : 'text-gray-700 dark:text-gray-300'}`}>{user?.email}</p>
              <p className={`text-xs capitalize ${isRayan ? 'text-gray-500' : 'text-gray-400 dark:text-gray-500'}`}>{user?.role === 'admin' ? 'Administrateur' : 'Cabinet'}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
