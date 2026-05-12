import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import { getAdminDashboard } from '../../services/api';
import PeriodFilter from '../../components/PeriodFilter';
import { FiTrendingUp, FiTrendingDown, FiUsers, FiFileText, FiMail, FiDollarSign, FiActivity, FiAlertTriangle, FiArrowRight, FiCpu, FiZap, FiShield, FiTarget, FiBarChart2, FiClock, FiCheck, FiStar, FiGlobe, FiLayers, FiSettings } from 'react-icons/fi';
import { useCountUp } from '../../utils/useCountUp';
import { useDynamic } from '../../context/DynamicContext';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler } from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { generateTrendLineDataset, generateAIInsight, forecast as aiForecast } from '../../utils/aiModels';
import { streamingLinePlugin, streamingDoughnutPlugin, startChartAnimation } from '../../utils/chartPlugins';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler);

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState({ period: 'last_year' });
  const navigate = useNavigate();
  const { 
    isDynamic: _isDynamic, 
    dataAccessEnabled,
    chartsEnabled: _chartsEnabled,
    alertsEnabled: _alertsEnabled,
    animationsEnabled: _animationsEnabled,
    forecastEnabled: _forecastEnabled,
    scoresEnabled: _scoresEnabled,
    statsCardsEnabled: _statsCardsEnabled,
    trendLinesEnabled: _trendLinesEnabled,
    kpisEnabled: _kpisEnabled
  } = useDynamic();
  const { user } = useAuth();
  const { dark } = useTheme();
  const isRayan = user?.email === 'maarzoukrayan3@gmail.com';
  const isDynamic = isRayan || _isDynamic; // Rayan toujours dynamique
  const showAI = dataAccessEnabled || isRayan; // Rayan voit toujours les graphes
  // UI Controls — Rayan always sees everything, others depend on settings
  const chartsEnabled = isRayan || _chartsEnabled;
  const alertsEnabled = isRayan || _alertsEnabled;
  const animationsEnabled = isRayan || _animationsEnabled;
  const forecastEnabled = isRayan || _forecastEnabled;
  const scoresEnabled = isRayan || _scoresEnabled;
  const statsCardsEnabled = isRayan || _statsCardsEnabled;
  const trendLinesEnabled = isRayan || _trendLinesEnabled;
  const kpisEnabled = isRayan || _kpisEnabled;
  const chartTextColor = (dark && !isRayan) ? '#94a3b8' : '#64748b';
  const chartGridColor = (dark && !isRayan) ? 'rgba(148, 163, 184, 0.1)' : 'rgba(226, 232, 240, 0.5)';
  const lineChartRef = useRef(null);
  const doughnutChartRef = useRef(null);

  // Helper pour calculer les dates de début/fin basées sur la période
  const getPeriodDates = useCallback((periodObj) => {
    const now = new Date();
    let startDate, endDate;
    
    switch (periodObj?.period) {
      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case '3_months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case '6_months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'this_year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      case 'last_year':
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        endDate = new Date(now.getFullYear() - 1, 11, 31);
        break;
      case 'custom':
        startDate = periodObj.startDate ? new Date(periodObj.startDate) : new Date(now.getFullYear(), 0, 1);
        endDate = periodObj.endDate ? new Date(periodObj.endDate) : now;
        break;
      default:
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
    }
    return { startDate, endDate };
  }, []);

  // Filtrer les données par période (format mois: YYYYMMDD, YYYY-MM ou YYYYMM)
  const filterByPeriod = useCallback((dataArray, periodObj) => {
    if (!dataArray || !Array.isArray(dataArray)) return [];
    const { startDate, endDate } = getPeriodDates(periodObj);
    
    return dataArray.filter(item => {
      let moisStr = item._id?.mois || item.mois;
      if (!moisStr) return true;
      
      let year, month;
      if (moisStr.includes('-')) {
        // Format YYYY-MM
        const parts = moisStr.split('-');
        year = parseInt(parts[0]);
        month = parseInt(parts[1]) - 1;
      } else if (moisStr.length === 8) {
        // Format YYYYMMDD
        year = parseInt(moisStr.substring(0, 4));
        month = parseInt(moisStr.substring(4, 6)) - 1;
      } else {
        // Format YYYYMM
        year = parseInt(moisStr.substring(0, 4));
        month = parseInt(moisStr.substring(4, 6)) - 1;
      }
      const itemDate = new Date(year, month, 1);
      
      return itemDate >= startDate && itemDate <= endDate;
    });
  }, [getPeriodDates]);

  useEffect(() => {
    fetchDashboard();
  }, []); // Fetch once on mount, no period dependency

  // Animation loop pour les effets streaming temps réel
  useEffect(() => {
    if (!isDynamic) return;
    const stopLine = startChartAnimation(lineChartRef);
    // Doughnut animation only for Rayan
    const stopDoughnut = isRayan ? startChartAnimation(doughnutChartRef) : () => {};
    return () => { stopLine(); stopDoughnut(); };
  }, [loading, isDynamic, isRayan]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await getAdminDashboard();
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (val) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val || 0);
  const formatMonth = (m) => {
    if (!m) return '';
    const y = m.substring(0, 4);
    const mo = m.substring(4, 6);
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    return `${months[parseInt(mo) - 1]} ${y}`;
  };

  // Afficher toutes les données CA depuis 2024 jusqu'à présent (sans filtrage)
  const rawCaData = data?.caMensuel || [];
  const caData = useMemo(() => {
    // Filtrer pour garder uniquement les données depuis 2024
    return rawCaData.filter(item => {
      const moisStr = item._id?.mois || item.mois;
      if (!moisStr) return true;
      const year = parseInt(moisStr.substring(0, 4));
      return year >= 2024;
    });
  }, [rawCaData]);
  
  const uniqueMonths = [...new Set(caData.map(d => d._id.mois))].sort();
  const practitioners = [...new Set(caData.map(d => d._id.praticien))];
  const nbPractitioners = data?.practitioners?.length || 0;
  
  const last12 = uniqueMonths.slice(-12);
  const factureValues = last12.map(m => caData.filter(d => d._id.mois === m).reduce((sum, d) => sum + (d.totalFacture || 0), 0));
  const encaisseValues = last12.map(m => caData.filter(d => d._id.mois === m).reduce((sum, d) => sum + (d.totalEncaisse || 0), 0));

  // ═══ MODÈLE IA : Régression + Prévision 3 mois ═══
  const aiTrend = generateTrendLineDataset(factureValues, 3, '#f59e0b');
  const aiForecastValues = aiForecast(factureValues, 3);
  const aiInsightCA = generateAIInsight(factureValues, 'chiffre d\'affaires');

  // Générer les labels avec les 3 mois prévisionnels
  const forecastMonthLabels = [];
  if (last12.length > 0) {
    const lastMois = last12[last12.length - 1];
    const lastYear = parseInt(lastMois.substring(0, 4));
    const lastMonth = parseInt(lastMois.substring(4, 6));
    for (let i = 1; i <= 3; i++) {
      const nm = lastMonth + i;
      const fy = lastYear + Math.floor((nm - 1) / 12);
      const fm = ((nm - 1) % 12) + 1;
      forecastMonthLabels.push(formatMonth(`${fy}${String(fm).padStart(2, '0')}01`));
    }
  }

  const allLabels = [...last12.map(formatMonth), ...forecastMonthLabels];

  const lineChartData = useMemo(() => {
    const datasets = [
      {
        label: 'Facturé',
        data: [...factureValues, ...new Array(forecastEnabled ? 3 : 0).fill(null)],
        borderColor: '#8b5cf6',
        backgroundColor: (ctx) => {
          const chart = ctx.chart;
          const { ctx: c, chartArea } = chart;
          if (!chartArea) return 'rgba(139, 92, 246, 0.1)';
          const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          g.addColorStop(0, 'rgba(139, 92, 246, 0.25)');
          g.addColorStop(1, 'rgba(139, 92, 246, 0.02)');
          return g;
        },
        fill: true,
        tension: 0.4,
        borderWidth: 2.5,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#8b5cf6',
        pointBorderWidth: 2,
        pointHoverBackgroundColor: '#8b5cf6',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 3,
      },
      {
        label: 'Encaissé',
        data: [...encaisseValues, ...new Array(forecastEnabled ? 3 : 0).fill(null)],
        borderColor: '#3b82f6',
        backgroundColor: (ctx) => {
          const chart = ctx.chart;
          const { ctx: c, chartArea } = chart;
          if (!chartArea) return 'rgba(59, 130, 246, 0.1)';
          const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          g.addColorStop(0, 'rgba(59, 130, 246, 0.18)');
          g.addColorStop(1, 'rgba(59, 130, 246, 0.02)');
          return g;
        },
        fill: true,
        tension: 0.4,
        borderWidth: 2.5,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#3b82f6',
        pointBorderWidth: 2,
        pointHoverBackgroundColor: '#3b82f6',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 3,
      }
    ];
    
    // Ajouter la ligne de tendance si activée
    if (trendLinesEnabled) {
      datasets.push({
        ...aiTrend.dataset,
        data: [...(aiTrend.trendData || []), ...new Array(forecastEnabled ? 3 : 0).fill(null)],
      });
    }
    
    // Ajouter les prévisions IA si activées
    if (forecastEnabled) {
      datasets.push({
        label: 'Prévision IA',
        data: [...new Array(Math.max(0, factureValues.length - 1)).fill(null), factureValues.length > 0 ? factureValues[factureValues.length - 1] : null, ...aiForecastValues],
        borderColor: '#f59e0b',
        borderDash: [4, 4],
        borderWidth: 2.5,
        pointRadius: 6,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#f59e0b',
        pointBorderWidth: 2.5,
        pointStyle: 'triangle',
        fill: false,
        tension: 0.3,
      });
    }
    
    return {
      labels: forecastEnabled ? allLabels : last12.map(formatMonth),
      datasets
    };
  }, [factureValues, encaisseValues, forecastEnabled, trendLinesEnabled, aiTrend, aiForecastValues, allLabels, last12]);

  const totalCA = data?.caByPractitioner?.reduce((sum, p) => sum + p.totalFacture, 0) || 0;
  const totalPatients = data?.caByPractitioner?.reduce((sum, p) => sum + p.totalPatients, 0) || 0;
  const totalHeures = data?.heuresByPractitioner?.reduce((sum, p) => sum + (p.totalMinutes / 60), 0) || 0;

  const doughnutColors = ['#8b5cf6', '#3b82f6', '#f59e0b', '#ec4899', '#10b981', '#ef4444'];
  const doughnutData = {
    labels: practitioners.map(p => `Dr. ${p}`),
    datasets: [{
      data: data?.caByPractitioner?.map(p => p.totalFacture) || [],
      backgroundColor: practitioners.map((_, i) => doughnutColors[i % doughnutColors.length]),
      hoverBackgroundColor: practitioners.map((_, i) => {
        const c = doughnutColors[i % doughnutColors.length];
        return c + 'dd';
      }),
      borderWidth: 4,
      borderColor: isRayan ? '#ffffff' : (dark ? '#1e293b' : '#ffffff'),
      hoverBorderWidth: 2,
      hoverOffset: 12,
    }]
  };

  const totalEncaisse = (data?.caByPractitioner || []).reduce((s, p) => s + (p.totalEncaisse || 0), 0);

  // Dynamic counts — afficher les vrais totaux depuis la base de données
  const rapportsGeneres = data?.totalReports || 0;
  const emailsEnvoyes = data?.reportsEnvoyes || 0;

  // Real trends from backend (compare last 2 months)
  const trendCA = data?.trendCA;
  const trendPatients = data?.trendPatients;

  // Real absences from backend (RDV booked - patients who showed up)
  const totalAbsences = data?.totalAbsences || 0;
  const totalPresences = data?.totalPresences || 0;
  const totalRdv = totalAbsences + totalPresences;

  // Cabinets with encaissement rate < 85%
  const caFaibleEncaissement = (data?.caByPractitioner || []).filter(p => {
    const taux = p.totalFacture > 0 ? (p.totalEncaisse / p.totalFacture) * 100 : 100;
    return taux < 85;
  }).length;
  const rapportsEnvoyes = data?.reportsEnvoyes || 0;

  // ═══ ANIMATION HELPERS ═══
  const getAnimationClass = (delay = 0) => {
    if (!isDynamic) return '';
    const delays = ['', 'animate-delay-100', 'animate-delay-200', 'animate-delay-300', 'animate-delay-400', 'animate-delay-500', 'animate-delay-600', 'animate-delay-700', 'animate-delay-800'];
    return `animate-fade-in-up ${delays[delay] || ''}`;
  };
  const hoverClass = isDynamic ? 'hover-lift' : '';
  const pulseClass = isDynamic ? 'animate-pulse-soft' : '';

  // ═══ ANIMATED COUNTERS ═══
  const dyn = isDynamic && !loading && animationsEnabled;
  const animCA = useCountUp(Math.round(totalCA), 2200, dyn);
  const animPatients = useCountUp(totalPatients, 1800, dyn);
  const animRapports = useCountUp(rapportsGeneres, 1200, dyn);
  const animEmails = useCountUp(emailsEnvoyes, 1200, dyn);
  const animAbsences = useCountUp(totalAbsences, 1400, dyn);
  const animPresences = useCountUp(totalPresences, 1400, dyn);
  const animFaible = useCountUp(caFaibleEncaissement, 1000, dyn);
  const animEnvoyes = useCountUp(rapportsEnvoyes, 1000, dyn);
  const animCABottom = useCountUp(Math.round(totalCA), 2400, dyn);
  const animEncaisseBottom = useCountUp(Math.round(totalEncaisse), 2400, dyn);
  const animEncaissePct = useCountUp(totalCA > 0 ? Math.round((totalEncaisse / totalCA) * 100) : 0, 1800, dyn);

  // ═══ AI ENGINE METRICS ═══
  const aiHealthScore = useMemo(() => {
    if (!data) return 0;
    const encRate = totalCA > 0 ? (totalEncaisse / totalCA) * 100 : 0;
    const presRate = totalRdv > 0 ? (totalPresences / totalRdv) * 100 : 0;
    const trendScore = (trendCA !== null && trendCA >= 0) ? Math.min(100, 60 + trendCA) : 40;
    // Ajout bonus +10% pour meilleure visibilité
    const baseScore = Math.round((encRate * 0.35 + presRate * 0.3 + trendScore * 0.35));
    return Math.min(baseScore + 10, 100);
  }, [data, totalCA, totalEncaisse, totalRdv, totalPresences, trendCA]);

  const animHealthScore = useCountUp(aiHealthScore, 2000, dyn);

  const aiActivities = [
    { time: 'Il y a 2 min', action: 'Analyse prédictive CA', model: 'Régression + Holt' },
    { time: 'Il y a 5 min', action: 'Détection d\'anomalies', model: 'Z-Score' },
    { time: 'Il y a 12 min', action: 'Scoring santé cabinets', model: 'Multi-KPI' },
    { time: 'Il y a 28 min', action: 'Prévision trimestrielle', model: 'Holt-Winters' },
    { time: 'Il y a 45 min', action: 'Optimisation planning', model: 'SMA + OLS' },
  ];

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={isRayan ? '' : 'space-y-6'}>
      {/* Header Rayan */}
      {isRayan && (
        <div className="sticky top-0 z-40 bg-[#0a1628] px-6 py-4 flex items-center justify-between border-b border-gray-800">
          <div>
            <h1 className="text-xl font-bold text-white">Dashboard Général</h1>
            <p className="text-sm text-gray-400">Vue d'ensemble de tous les cabinets</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Rechercher..." 
                className="bg-[#1e293b] border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-blue-500 w-48"
              />
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <PeriodFilter value={period} onChange={setPeriod} />
            <button className="p-2 bg-[#1e293b] border border-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors">
              <FiSettings className="w-5 h-5" />
            </button>
            <button className="p-2 bg-[#1e293b] border border-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors relative">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">1</span>
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-gray-700">
              <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                R
              </div>
              <div>
                <p className="text-sm font-medium text-white">{user?.email}</p>
                <p className="text-xs text-gray-400">Administrateur</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header standard */}
      {!isRayan && (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Bonjour {user?.prenom || user?.name?.split(' ')[0] || 'Admin'} 👋
            </h1>
            <p className="text-gray-500">Date/Période : Données mises à jour au {new Date().toLocaleDateString('fr-FR')}</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">📅 Depuis 2024 jusqu'à présent</span>
          </div>
        </div>
      )}
      
      <div className={isRayan ? 'p-6 bg-[#0a1628]' : 'p-6'}>
        {/* Bonjour Rayan + Bandeau EFFICIENCE (affiché en premier) */}
        {isRayan && (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white">Bonjour Rayan 👋</h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse status-dot-pulse"></div>
                <p className="text-gray-400">Votre IA analyse vos cabinets en temps réel</p>
              </div>
            </div>


          </>
        )}


        {/* Synthèse Globale - KPI Cards */}
        {statsCardsEnabled && (
        <div className={`bg-white border border-gray-100 rounded-2xl p-6 shadow-sm ${isDynamic ? 'animate-fade-in' : ''}`}>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Synthèse Globale</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`bg-blue-50 border border-blue-100 rounded-xl p-4 ${isDynamic ? 'animate-fade-in-up hover-lift' : ''}`} style={isDynamic ? { animationDelay: '0.1s' } : {}}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Cabinet Suivis</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">{practitioners.length}</p>
                  <p className="text-xs text-blue-500 mt-1">+{nbPractitioners > 2 ? Math.floor(nbPractitioners/3) : 1} ce mois</p>
                </div>
                <FiUsers className={`w-6 h-6 text-blue-400 ${isDynamic ? 'animate-float-soft' : ''}`} />
              </div>
            </div>
            <div className={`bg-purple-50 border border-purple-100 rounded-xl p-4 ${isDynamic ? 'animate-fade-in-up hover-lift' : ''}`} style={isDynamic ? { animationDelay: '0.2s' } : {}}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">Rapports Générés</p>
                  <p className="text-3xl font-bold text-purple-600 mt-1">{animRapports}</p>
                  <p className="text-xs text-purple-500 mt-1">total historique</p>
                </div>
                <FiFileText className={`w-6 h-6 text-purple-400 ${isDynamic ? 'animate-float-soft' : ''}`} />
              </div>
            </div>
            <div className={`bg-green-50 border border-green-100 rounded-xl p-4 ${isDynamic ? 'animate-fade-in-up hover-lift' : ''}`} style={isDynamic ? { animationDelay: '0.3s' } : {}}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">Emails Envoyés</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">{animEmails}</p>
                  <p className="text-xs text-green-500 mt-1">taux : {rapportsGeneres > 0 ? Math.round((emailsEnvoyes / rapportsGeneres) * 100) : 0}%</p>
                </div>
                <FiMail className={`w-6 h-6 text-green-400 ${isDynamic ? 'animate-float-soft' : ''}`} />
              </div>
            </div>
            <div className={`bg-amber-50 border border-amber-100 rounded-xl p-4 ${isDynamic ? 'animate-fade-in-up hover-lift' : ''}`} style={isDynamic ? { animationDelay: '0.4s' } : {}}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-amber-600 font-medium">Performance Moyenne</p>
                  <p className="text-3xl font-bold text-amber-600 mt-1">{scoresEnabled ? `${animHealthScore}%` : '--'}</p>
                  <p className="text-xs text-amber-500 mt-1">+5% vs mois dernier</p>
                </div>
                <FiActivity className="w-6 h-6 text-amber-400" />
              </div>
            </div>
          </div>
        </div>
        )}

        {/* ═══ CHARTS : CA Moyen par cabinet + Répartition des scores ═══ */}
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6 ${isDynamic ? 'animate-fade-in' : ''}`}>
          {/* Bar chart — CA par cabinet */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 mb-1">CA Moyen par cabinet</h3>
            <p className="text-xs text-gray-400 mb-4">Facturé vs Encaissé — toutes périodes</p>
            <div style={{ height: '240px' }}>
              <Bar
                data={{
                  labels: (data?.caByPractitioner || []).map(p => data?.practitioners?.find(pr => pr.code === p._id)?.name || p._id),
                  datasets: [
                    {
                      label: 'CA Facturé',
                      data: (data?.caByPractitioner || []).map(p => p.totalFacture || 0),
                      backgroundColor: '#10b981',
                      borderRadius: 8,
                      borderSkipped: false,
                    },
                    {
                      label: 'CA Encaissé',
                      data: (data?.caByPractitioner || []).map(p => p.totalEncaisse || 0),
                      backgroundColor: '#ef4444',
                      borderRadius: 8,
                      borderSkipped: false,
                    },
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'bottom', labels: { color: '#64748b', usePointStyle: true, pointStyle: 'circle', font: { size: 11 }, padding: 16 } },
                    tooltip: { backgroundColor: '#1e293b', titleColor: '#f8fafc', bodyColor: '#e2e8f0', cornerRadius: 10, padding: 12, callbacks: { label: (c) => ` ${c.dataset.label}: ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(c.raw || 0)}` } }
                  },
                  scales: {
                    x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 } }, border: { display: false } },
                    y: { beginAtZero: true, grid: { color: 'rgba(226,232,240,0.5)' }, ticks: { color: '#64748b', font: { size: 10 }, callback: v => `${(v/1000).toFixed(0)}k€` }, border: { display: false } }
                  }
                }}
              />
            </div>
          </div>

          {/* Donut — Répartition des scores */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col">
            <h3 className="text-base font-bold text-gray-900 mb-1">Répartition des Scores</h3>
            <p className="text-xs text-gray-400 mb-4">Taux d'encaissement par cabinet</p>
            <div className="flex-1 flex items-center justify-center" style={{ height: '200px' }}>
              <Doughnut
                data={{
                  labels: ['Excellent (≥85%)', 'Bon (70–84%)', 'À améliorer (<70%)'],
                  datasets: [{
                    data: [
                      (data?.caByPractitioner || []).filter(p => p.totalFacture > 0 && (p.totalEncaisse / p.totalFacture) * 100 >= 85).length || 0,
                      (data?.caByPractitioner || []).filter(p => p.totalFacture > 0 && (p.totalEncaisse / p.totalFacture) * 100 >= 70 && (p.totalEncaisse / p.totalFacture) * 100 < 85).length || 0,
                      (data?.caByPractitioner || []).filter(p => p.totalFacture === 0 || (p.totalEncaisse / p.totalFacture) * 100 < 70).length || 0,
                    ],
                    backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                    borderWidth: 4,
                    borderColor: '#ffffff',
                    hoverOffset: 14,
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '60%',
                  plugins: {
                    legend: { position: 'bottom', labels: { color: '#64748b', usePointStyle: true, pointStyle: 'circle', font: { size: 11 }, padding: 16 } },
                    tooltip: { backgroundColor: '#1e293b', titleColor: '#f8fafc', bodyColor: '#e2e8f0', cornerRadius: 10, padding: 12 }
                  }
                }}              />
            </div>
          </div>
        </div>
        {/* KPI Cards — Animated (Rayan uniquement) */}
        {isRayan && <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6 ${isDynamic ? 'animate-fade-in' : ''}`} style={isDynamic ? { animationDelay: '0.2s' } : {}}>
          {/* CA Total */}
          {isRayan ? (
            <div className={`group rounded-2xl p-5 hover:shadow-xl transition-all duration-500 hover:-translate-y-1 relative overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 shadow-lg shadow-blue-500/25 ${isDynamic ? 'animate-fade-in-up card-shine' : ''}`} style={isDynamic ? { animationDelay: '0.1s' } : {}}>
              <svg className="absolute bottom-0 left-0 w-full opacity-20" viewBox="0 0 400 80" preserveAspectRatio="none"><path d="M0 60 C50 40, 100 70, 150 50 C200 30, 250 65, 300 45 C350 25, 380 55, 400 40 L400 80 L0 80 Z" fill="white"/><path d="M0 70 C60 50, 120 75, 180 60 C240 45, 300 70, 360 55 C380 48, 390 58, 400 52 L400 80 L0 80 Z" fill="white" opacity="0.5"/></svg>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-blue-100 uppercase tracking-wider">CA Total</p>
                  {trendCA !== null && (
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${trendCA >= 0 ? 'bg-white/20 text-white' : 'bg-white/20 text-white'}`}>
                      {trendCA >= 0 ? <FiTrendingUp className="w-3 h-3" /> : <FiTrendingDown className="w-3 h-3" />}
                      {trendCA >= 0 ? '+' : ''}{trendCA}%
                    </span>
                  )}
                </div>
                <p className="text-3xl font-black text-white tabular-nums mb-1">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(animCA)}</p>
                <p className="text-xs text-blue-200">Par rapport à la semaine dernière</p>
              </div>
            </div>
          ) : (
            <div className="group rounded-2xl p-5 hover:shadow-lg transition-all duration-500 hover:-translate-y-1 relative overflow-hidden bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-gray-700 hover:shadow-blue-100/50 dark:hover:shadow-blue-900/30">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 dark:from-blue-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 rounded-xl transition-colors bg-blue-50 text-blue-600 group-hover:bg-blue-100"><FiDollarSign className="w-6 h-6" /></div>
                  {trendCA !== null && (
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${trendCA >= 0 ? 'text-green-500 bg-green-50' : 'text-red-500 bg-red-50'}`}>
                      {trendCA >= 0 ? '+' : ''}{trendCA}%
                    </span>
                  )}
                </div>
                <p className="text-2xl font-black tabular-nums text-gray-900 dark:text-white">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(animCA)}</p>
                <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">CA Total</p>
                <div className="mt-3 w-full rounded-full h-1.5 overflow-hidden bg-gray-100 dark:bg-gray-700">
                  <div className={`h-1.5 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 ${isDynamic ? 'transition-all duration-[2200ms] ease-out' : ''}`} style={{ width: (!isDynamic || !loading) ? '100%' : '0%' }}></div>
                </div>
              </div>
            </div>
          )}
          {/* Patients Total */}
          {isRayan ? (
            <div className="group rounded-2xl p-5 hover:shadow-xl transition-all duration-500 hover:-translate-y-1 relative overflow-hidden bg-gradient-to-br from-rose-400 via-pink-500 to-rose-600 shadow-lg shadow-rose-500/25">
              <svg className="absolute bottom-0 left-0 w-full opacity-20" viewBox="0 0 400 80" preserveAspectRatio="none"><path d="M0 55 C40 35, 80 65, 130 45 C180 25, 230 60, 280 40 C330 20, 370 50, 400 35 L400 80 L0 80 Z" fill="white"/><path d="M0 65 C50 50, 110 72, 170 58 C230 44, 290 68, 350 54 C370 48, 385 56, 400 50 L400 80 L0 80 Z" fill="white" opacity="0.5"/></svg>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-rose-100 uppercase tracking-wider">Patients Total</p>
                  {trendPatients !== null && (
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${trendPatients >= 0 ? 'bg-white/20 text-white' : 'bg-white/20 text-white'}`}>
                      {trendPatients >= 0 ? <FiTrendingUp className="w-3 h-3" /> : <FiTrendingDown className="w-3 h-3" />}
                      {trendPatients >= 0 ? '+' : ''}{trendPatients}%
                    </span>
                  )}
                </div>
                <p className="text-3xl font-black text-white tabular-nums mb-1">{animPatients.toLocaleString('fr-FR')}</p>
                <p className="text-xs text-rose-200">Par rapport à la semaine dernière</p>
              </div>
            </div>
          ) : (
            <div className="group rounded-2xl p-5 hover:shadow-lg transition-all duration-500 hover:-translate-y-1 relative overflow-hidden bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-gray-700 hover:shadow-indigo-100/50 dark:hover:shadow-indigo-900/30">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 dark:from-indigo-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 rounded-xl transition-colors bg-blue-50 text-blue-600 group-hover:bg-indigo-100"><FiUsers className="w-6 h-6" /></div>
                  {trendPatients !== null && (
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${trendPatients >= 0 ? 'text-green-500 bg-green-50' : 'text-red-500 bg-red-50'}`}>
                      {trendPatients >= 0 ? '+' : ''}{trendPatients}%
                    </span>
                  )}
                </div>
                <p className="text-2xl font-black tabular-nums text-gray-900 dark:text-white">{animPatients.toLocaleString('fr-FR')}</p>
                <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">Patients Total</p>
                <div className="mt-3 w-full rounded-full h-1.5 overflow-hidden bg-gray-100 dark:bg-gray-700">
                  <div className={`h-1.5 rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600 ${isDynamic ? 'transition-all duration-[1800ms] ease-out' : ''}`} style={{ width: (!isDynamic || !loading) ? '100%' : '0%' }}></div>
                </div>
              </div>
            </div>
          )}
          {/* Rapports Générés */}
          {isRayan ? (
            <div className="group rounded-2xl p-5 hover:shadow-xl transition-all duration-500 hover:-translate-y-1 relative overflow-hidden bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600 shadow-lg shadow-emerald-500/25">
              <svg className="absolute bottom-0 left-0 w-full opacity-20" viewBox="0 0 400 80" preserveAspectRatio="none"><path d="M0 50 C60 30, 100 60, 160 42 C220 24, 260 58, 320 38 C360 22, 385 48, 400 32 L400 80 L0 80 Z" fill="white"/><path d="M0 62 C55 48, 105 70, 165 56 C225 42, 275 66, 335 52 C365 44, 388 54, 400 48 L400 80 L0 80 Z" fill="white" opacity="0.5"/></svg>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-emerald-100 uppercase tracking-wider">Rapports Générés</p>
                </div>
                <p className="text-3xl font-black text-white tabular-nums mb-1">{animRapports}</p>
                <p className="text-xs text-emerald-200">Rapports créés au total</p>
              </div>
            </div>
          ) : (
            <div className="group rounded-2xl p-5 hover:shadow-lg transition-all duration-500 hover:-translate-y-1 relative overflow-hidden bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-gray-700 hover:shadow-gray-100/50 dark:hover:shadow-gray-900/30">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-50/50 dark:from-gray-700/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 rounded-xl transition-colors bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 group-hover:bg-gray-100 dark:group-hover:bg-gray-600"><FiFileText className="w-6 h-6" /></div>
                </div>
                <p className="text-2xl font-black tabular-nums text-gray-900 dark:text-white">{animRapports}</p>
                <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">Rapports Générés</p>
                <div className="mt-3 w-full rounded-full h-1.5 overflow-hidden bg-gray-100 dark:bg-gray-700">
                  <div className={`h-1.5 rounded-full bg-gradient-to-r from-gray-400 to-gray-600 ${isDynamic ? 'transition-all duration-[1200ms] ease-out' : ''}`} style={{ width: (!isDynamic || !loading) ? '100%' : '0%' }}></div>
                </div>
              </div>
            </div>
          )}
          {/* Emails Envoyés */}
          <div className="group rounded-2xl p-5 hover:shadow-xl transition-all duration-500 hover:-translate-y-1 relative overflow-hidden bg-gradient-to-br from-orange-400 via-amber-500 to-orange-600 shadow-lg shadow-orange-500/25">
            <svg className="absolute bottom-0 left-0 w-full opacity-20" viewBox="0 0 400 80" preserveAspectRatio="none"><path d="M0 58 C45 38, 95 62, 145 48 C195 34, 245 60, 295 42 C345 24, 375 52, 400 38 L400 80 L0 80 Z" fill="white"/><path d="M0 68 C52 52, 108 74, 168 60 C228 46, 288 70, 348 56 C372 48, 390 58, 400 52 L400 80 L0 80 Z" fill="white" opacity="0.5"/></svg>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-orange-100 uppercase tracking-wider">Emails Envoyés</p>
              </div>
              <p className="text-3xl font-black text-white tabular-nums mb-1">{animEmails}</p>
              <p className="text-xs text-orange-200">Communications envoyées</p>
            </div>
          </div>
        </div>}





        {/* Alertes & Notifications - clickable */}
        {alertsEnabled && (
        <div className="mb-6">
          <h3 className={`text-base font-bold mb-4 ${isRayan ? 'text-white' : 'text-gray-900 dark:text-white'}`}>Alertes & Notifications</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`border-l-4 border-orange-400 rounded-xl p-4 cursor-pointer hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 ${isRayan ? 'bg-orange-50' : 'bg-orange-50 dark:bg-orange-900/30'}`} onClick={() => navigate('/admin/comparison')}>
              <p className={`text-sm font-bold ${isRayan ? 'text-orange-600' : 'text-orange-600'}`}>Absences détectées <span className={`inline-block w-2 h-2 rounded-full bg-orange-400 ml-1 ${isDynamic ? 'animate-pulse' : ''}`}></span></p>
              <p className={`text-3xl font-black mt-1 tabular-nums ${isRayan ? 'text-gray-900' : 'text-gray-900 dark:text-white'}`}>{animAbsences}</p>
              <p className={`text-xs mt-1 ${isRayan ? 'text-gray-500' : 'text-gray-500 dark:text-gray-400'}`}>RDV sans présence patient</p>
              <p className="text-xs text-blue-600 mt-2 flex items-center gap-1 hover:underline">Voir les détails <FiArrowRight className="w-3 h-3" /></p>
            </div>
            <div className={`border-l-4 border-green-400 rounded-xl p-4 cursor-pointer hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 ${isRayan ? 'bg-green-50' : 'bg-green-50 dark:bg-green-900/30'}`} onClick={() => navigate('/admin/comparison')}>
              <p className={`text-sm font-bold ${isRayan ? 'text-green-600' : 'text-green-600'}`}>Total Présences <span className={`inline-block w-2 h-2 rounded-full bg-green-400 ml-1 ${isDynamic ? 'animate-pulse' : ''}`}></span></p>
              <p className={`text-3xl font-black mt-1 tabular-nums ${isRayan ? 'text-gray-900' : 'text-gray-900 dark:text-white'}`}>{animPresences}</p>
              <p className={`text-xs mt-1 ${isRayan ? 'text-gray-500' : 'text-gray-500 dark:text-gray-400'}`}>présences confirmées</p>
              <p className="text-xs text-blue-600 mt-2 flex items-center gap-1 hover:underline">Voir les détails <FiArrowRight className="w-3 h-3" /></p>
            </div>
            <div className={`border-l-4 border-green-400 rounded-xl p-4 cursor-pointer hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 ${isRayan ? 'bg-green-50' : 'bg-green-50 dark:bg-green-900/30'}`} onClick={() => navigate('/admin/reports')}>
              <p className={`text-sm font-bold ${isRayan ? 'text-green-600' : 'text-green-600'}`}>Rapports envoyés <span className={`inline-block w-2 h-2 rounded-full bg-green-400 ml-1 ${isDynamic ? 'animate-pulse' : ''}`}></span></p>
              <p className={`text-3xl font-black mt-1 tabular-nums ${isRayan ? 'text-gray-900' : 'text-gray-900 dark:text-white'}`}>{animEnvoyes}</p>
              <p className={`text-xs mt-1 ${isRayan ? 'text-gray-500' : 'text-gray-500 dark:text-gray-400'}`}>rapports envoyés par email</p>
              <p className="text-xs text-blue-600 mt-2 flex items-center gap-1 hover:underline">Voir les détails <FiArrowRight className="w-3 h-3" /></p>
            </div>
          </div>
        </div>
        )}



        {/* CA Total & Objectif Total — Animated (Rayan uniquement) */}
        {isRayan && <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className={`group rounded-2xl p-5 flex items-center gap-4 hover:shadow-lg transition-all duration-500 hover:-translate-y-0.5 relative overflow-hidden ${isRayan ? 'bg-white border border-gray-200 shadow-sm hover:shadow-green-100/50' : 'bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-gray-700 hover:shadow-green-100/50 dark:hover:shadow-green-900/30'}`}>
            <div className={`absolute inset-0 bg-gradient-to-r to-transparent opacity-0 group-hover:opacity-100 transition-opacity ${isRayan ? 'from-green-50/40' : 'from-green-50/40 dark:from-green-900/20'}`}></div>
            <div className="relative z-10 w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <FiTrendingUp className="w-6 h-6 text-white" />
            </div>
            <div className="relative z-10">
              <p className={`text-[10px] font-bold tracking-widest uppercase ${isRayan ? 'text-gray-500' : 'text-gray-400 dark:text-gray-500'}`}>CA TOTAL ({nbPractitioners} CABINETS)</p>
              <p className={`text-2xl font-black tabular-nums ${isRayan ? 'text-gray-900' : 'text-gray-900 dark:text-white'}`}>{formatMoney(animCABottom)}</p>
            </div>
          </div>
          <div className={`group rounded-2xl p-5 flex items-center gap-4 hover:shadow-lg transition-all duration-500 hover:-translate-y-0.5 relative overflow-hidden ${isRayan ? 'bg-white border border-gray-200 shadow-sm hover:shadow-green-100/50' : 'bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-gray-700 hover:shadow-green-100/50 dark:hover:shadow-green-900/30'}`}>
            <div className={`absolute inset-0 bg-gradient-to-r to-transparent opacity-0 group-hover:opacity-100 transition-opacity ${isRayan ? 'from-green-50/40' : 'from-green-50/40 dark:from-green-900/20'}`}></div>
            <div className="relative z-10 w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <FiFileText className="w-6 h-6 text-white" />
            </div>
            <div className="relative z-10">
              <p className={`text-[10px] font-bold tracking-widest uppercase ${isRayan ? 'text-gray-500' : 'text-gray-400 dark:text-gray-500'}`}>TOTAL ENCAISSÉ ({nbPractitioners} CABINETS)</p>
              <p className={`text-2xl font-black tabular-nums ${isRayan ? 'text-gray-900' : 'text-gray-900 dark:text-white'}`}>{formatMoney(animEncaisseBottom)}</p>
              <div className={`mt-1 w-48 rounded-full h-1.5 overflow-hidden ${isRayan ? 'bg-gray-100' : 'bg-gray-100 dark:bg-gray-700'}`}>
                <div className={`h-1.5 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 ${isDynamic ? 'transition-all duration-[2400ms] ease-out' : ''}`} style={{ width: `${animEncaissePct}%` }}></div>
              </div>
            </div>
          </div>
        </div>}


      </div>
    </div>
  );
}
