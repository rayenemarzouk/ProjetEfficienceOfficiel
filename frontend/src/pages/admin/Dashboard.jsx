import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import { getAdminDashboard } from '../../services/api';
import { FiTrendingUp, FiUsers, FiFileText, FiMail, FiDollarSign, FiActivity, FiAlertTriangle, FiArrowRight, FiCpu } from 'react-icons/fi';
import { useCountUp } from '../../utils/useCountUp';
import { useDynamic } from '../../context/DynamicContext';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { generateTrendLineDataset, generateAIInsight, forecast as aiForecast } from '../../utils/aiModels';
import { streamingLinePlugin, streamingDoughnutPlugin, startChartAnimation } from '../../utils/chartPlugins';
import { useTheme } from '../../context/ThemeContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler);

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { isDynamic } = useDynamic();
  const { dark } = useTheme();
  const chartTextColor = dark ? '#94a3b8' : '#64748b';
  const chartGridColor = dark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(226, 232, 240, 0.5)';
  const lineChartRef = useRef(null);
  const doughnutChartRef = useRef(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  // Animation loop pour les effets streaming temps réel
  useEffect(() => {
    if (!isDynamic) return;
    const stopLine = startChartAnimation(lineChartRef);
    const stopDoughnut = startChartAnimation(doughnutChartRef);
    return () => { stopLine(); stopDoughnut(); };
  }, [loading, isDynamic]);

  const fetchDashboard = async () => {
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

  const caData = data?.caMensuel || [];
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

  const lineChartData = {
    labels: allLabels,
    datasets: [
      {
        label: 'Facturé',
        data: [...factureValues, ...new Array(3).fill(null)],
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
        data: [...encaisseValues, ...new Array(3).fill(null)],
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
      },
      // IA: Ligne de tendance (régression linéaire)
      {
        ...aiTrend.dataset,
        data: [...(aiTrend.trendData || []), ...new Array(3).fill(null)],
      },
      // IA: Prévision 3 mois
      {
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
      },
    ]
  };

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
      borderColor: '#ffffff',
      hoverBorderWidth: 2,
      hoverOffset: 12,
    }]
  };

  const totalEncaisse = (data?.caByPractitioner || []).reduce((s, p) => s + (p.totalEncaisse || 0), 0);

  // Dynamic counts based on practitioners
  const rapportsGeneres = data?.totalReports || nbPractitioners;
  const emailsEnvoyes = data?.reportsEnvoyes || nbPractitioners;

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
  const rapportsNonEnvoyes = Math.max(0, nbPractitioners - (data?.reportsEnvoyes || 0));

  // ═══ ANIMATED COUNTERS ═══
  const dyn = isDynamic && !loading;
  const animCA = useCountUp(Math.round(totalCA), 2200, dyn);
  const animPatients = useCountUp(totalPatients, 1800, dyn);
  const animRapports = useCountUp(rapportsGeneres, 1200, dyn);
  const animEmails = useCountUp(emailsEnvoyes, 1200, dyn);
  const animAbsences = useCountUp(totalAbsences, 1400, dyn);
  const animPresences = useCountUp(totalPresences, 1400, dyn);
  const animFaible = useCountUp(caFaibleEncaissement, 1000, dyn);
  const animNonEnvoyes = useCountUp(rapportsNonEnvoyes, 1000, dyn);
  const animCABottom = useCountUp(Math.round(totalCA), 2400, dyn);
  const animEncaisseBottom = useCountUp(Math.round(totalEncaisse), 2400, dyn);
  const animEncaissePct = useCountUp(totalCA > 0 ? Math.round((totalEncaisse / totalCA) * 100) : 0, 1800, dyn);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Dashboard Général" subtitle="Vue d'ensemble de tous les cabinets" />
      
      <div className="p-6">
        {/* Bannière Efficience */}
        <div className="relative overflow-hidden rounded-2xl mb-6 bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-gray-700 transition-colors" style={{ height: '120px' }}>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-4xl font-black tracking-[0.08em] text-[#2956b2] dark:text-blue-400" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                <span style={{ letterSpacing: '0.02em' }}>≡</span>FFICI
                <span style={{ letterSpacing: '0.02em' }}>≡</span>NC
                <span style={{ letterSpacing: '0.02em' }}>≡</span>
              </h2>
              <p className="text-[11px] mt-1 tracking-[0.05em] text-[#5a7cbf] dark:text-blue-300" style={{ fontFamily: 'system-ui, sans-serif' }}>
                L'accompagnement personnalisé de votre cabinet dentaire
              </p>
            </div>
          </div>
        </div>

        {/* KPI Cards — Animated */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          <div className="group bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-gray-700 p-5 hover:shadow-lg hover:shadow-blue-100/50 dark:hover:shadow-blue-900/30 transition-all duration-500 hover:-translate-y-1 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 dark:from-blue-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors"><FiDollarSign className="w-6 h-6" /></div>
                {trendCA !== null && (
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${trendCA >= 0 ? 'text-green-500 bg-green-50' : 'text-red-500 bg-red-50'}`}>
                    {trendCA >= 0 ? '+' : ''}{trendCA}%
                  </span>
                )}
              </div>
              <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(animCA)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">CA Total</p>
              <div className="mt-3 w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                <div className={`h-1.5 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 ${isDynamic ? 'transition-all duration-[2200ms] ease-out' : ''}`} style={{ width: (!isDynamic || !loading) ? '100%' : '0%' }}></div>
              </div>
            </div>
          </div>
          <div className="group bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-gray-700 p-5 hover:shadow-lg hover:shadow-indigo-100/50 dark:hover:shadow-indigo-900/30 transition-all duration-500 hover:-translate-y-1 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 dark:from-indigo-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-indigo-100 transition-colors"><FiUsers className="w-6 h-6" /></div>
                {trendPatients !== null && (
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${trendPatients >= 0 ? 'text-green-500 bg-green-50' : 'text-red-500 bg-red-50'}`}>
                    {trendPatients >= 0 ? '+' : ''}{trendPatients}%
                  </span>
                )}
              </div>
              <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{animPatients.toLocaleString('fr-FR')}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Patients Total</p>
              <div className="mt-3 w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                <div className={`h-1.5 rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600 ${isDynamic ? 'transition-all duration-[1800ms] ease-out' : ''}`} style={{ width: (!isDynamic || !loading) ? '100%' : '0%' }}></div>
              </div>
            </div>
          </div>
          <div className="group bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-gray-700 p-5 hover:shadow-lg hover:shadow-gray-100/50 dark:hover:shadow-gray-900/30 transition-all duration-500 hover:-translate-y-1 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-50/50 dark:from-gray-700/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 group-hover:bg-gray-100 dark:group-hover:bg-gray-600 transition-colors"><FiFileText className="w-6 h-6" /></div>
              </div>
              <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{animRapports}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Rapports Générés</p>
              <div className="mt-3 w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                <div className={`h-1.5 rounded-full bg-gradient-to-r from-gray-400 to-gray-600 ${isDynamic ? 'transition-all duration-[1200ms] ease-out' : ''}`} style={{ width: (!isDynamic || !loading) ? '100%' : '0%' }}></div>
              </div>
            </div>
          </div>
          <div className="group bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-gray-700 p-5 hover:shadow-lg hover:shadow-emerald-100/50 dark:hover:shadow-emerald-900/30 transition-all duration-500 hover:-translate-y-1 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 dark:from-emerald-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 transition-colors"><FiMail className="w-6 h-6" /></div>
              </div>
              <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{animEmails}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Emails Envoyés</p>
              <div className="mt-3 w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                <div className={`h-1.5 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 ${isDynamic ? 'transition-all duration-[1200ms] ease-out' : ''}`} style={{ width: (!isDynamic || !loading) ? '100%' : '0%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Practitioner Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          {data?.practitioners?.map((p, idx) => {
            const ca = data.caByPractitioner?.find(c => c._id === p.code);
            const heures = data.heuresByPractitioner?.find(h => h._id === p.code);
            const hTotal = heures ? (heures.totalMinutes / 60) : 0;
            const cardThemes = [
              { bg: dark ? 'from-violet-900/30 to-purple-900/30' : 'from-violet-50 to-purple-50', badge: dark ? 'bg-violet-900/50' : 'bg-violet-100', badgeText: dark ? 'text-violet-300' : 'text-violet-700', border: dark ? 'border-violet-800' : 'border-violet-100', accent: dark ? 'text-violet-400' : 'text-violet-600' },
              { bg: dark ? 'from-blue-900/30 to-cyan-900/30' : 'from-blue-50 to-cyan-50', badge: dark ? 'bg-blue-900/50' : 'bg-blue-100', badgeText: dark ? 'text-blue-300' : 'text-blue-700', border: dark ? 'border-blue-800' : 'border-blue-100', accent: dark ? 'text-blue-400' : 'text-blue-600' },
              { bg: dark ? 'from-amber-900/30 to-orange-900/30' : 'from-amber-50 to-orange-50', badge: dark ? 'bg-amber-900/50' : 'bg-amber-100', badgeText: dark ? 'text-amber-300' : 'text-amber-700', border: dark ? 'border-amber-800' : 'border-amber-100', accent: dark ? 'text-amber-400' : 'text-amber-600' },
              { bg: dark ? 'from-pink-900/30 to-rose-900/30' : 'from-pink-50 to-rose-50', badge: dark ? 'bg-pink-900/50' : 'bg-pink-100', badgeText: dark ? 'text-pink-300' : 'text-pink-700', border: dark ? 'border-pink-800' : 'border-pink-100', accent: dark ? 'text-pink-400' : 'text-pink-600' },
            ];
            const theme = cardThemes[idx % cardThemes.length];

            return (
              <div key={p.code} className={`bg-gradient-to-br ${theme.bg} rounded-2xl border ${theme.border} p-5 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5`}>
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-11 h-11 ${theme.badge} rounded-xl flex items-center justify-center shadow-sm`}>
                    <span className={`${theme.badgeText} font-bold text-sm`}>{p.code}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{p.name}</h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{p.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-white/70 dark:bg-white/10 backdrop-blur-sm rounded-xl border border-white/50 dark:border-gray-600/50 shadow-sm">
                    <p className={`text-base font-bold ${theme.accent}`}>{formatMoney(ca?.totalFacture || 0)}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">CA Total</p>
                  </div>
                  <div className="text-center p-3 bg-white/70 dark:bg-white/10 backdrop-blur-sm rounded-xl border border-white/50 dark:border-gray-600/50 shadow-sm">
                    <p className="text-base font-bold text-blue-600">{ca?.totalPatients || 0}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Patients</p>
                  </div>
                  <div className="text-center p-3 bg-white/70 dark:bg-white/10 backdrop-blur-sm rounded-xl border border-white/50 dark:border-gray-600/50 shadow-sm">
                    <p className="text-base font-bold text-amber-600">{hTotal.toFixed(0)}h</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Heures</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          <div className="lg:col-span-2 bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm transition-colors">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Évolution du Chiffre d'Affaires</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Analyse comparative facturé vs encaissé</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                  <span className="relative flex h-2 w-2"><span className={`${isDynamic ? 'animate-ping' : ''} absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75`}></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span>
                  Temps réel
                </span>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-50 border border-violet-200 rounded-full">
                  <FiCpu className="w-3 h-3 text-violet-500" />
                  <span className="text-[10px] font-semibold text-violet-600">Modèle IA — Régression + Holt</span>
                </div>
              </div>
            </div>
            <div style={{ height: '280px' }}>
              <Line ref={lineChartRef} data={lineChartData} plugins={isDynamic ? [streamingLinePlugin] : []} options={{
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { color: chartTextColor, usePointStyle: true, pointStyle: 'circle', font: { size: 11, weight: '500' }, padding: 20 }
                  },
                  tooltip: {
                    backgroundColor: '#1e293b',
                    titleColor: '#f8fafc',
                    bodyColor: '#e2e8f0',
                    titleFont: { size: 13, weight: '600' },
                    bodyFont: { size: 12 },
                    borderColor: 'rgba(139, 92, 246, 0.3)',
                    borderWidth: 1,
                    cornerRadius: 10,
                    padding: 14,
                    displayColors: true,
                    usePointStyle: true,
                    callbacks: { label: (c) => ` ${c.dataset.label}: ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(c.raw)}` }
                  }
                },
                scales: {
                  x: {
                    grid: { display: false },
                    ticks: { color: chartTextColor, font: { size: 10, weight: '500' }, maxRotation: 45 },
                    border: { display: false }
                  },
                  y: {
                    beginAtZero: true,
                    grid: { color: chartGridColor, drawBorder: false },
                    ticks: { color: chartTextColor, font: { size: 10 }, padding: 8, callback: v => `${(v/1000).toFixed(0)}k€` },
                    border: { display: false }
                  }
                }
              }} />
            </div>
          </div>
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-gray-700 p-6 transition-colors">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Répartition CA par Cabinet</h3>
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200">
                <span className="relative flex h-1.5 w-1.5"><span className={`${isDynamic ? 'animate-ping' : ''} absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75`}></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span></span>
                Live
              </span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Part de chaque cabinet dans le CA global</p>
            <Doughnut ref={doughnutChartRef} data={doughnutData} plugins={isDynamic ? [streamingDoughnutPlugin] : []} options={{
              responsive: true,
              cutout: '60%',
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: {
                    color: chartTextColor,
                    usePointStyle: true,
                    pointStyle: 'circle',
                    font: { size: 12, weight: '600' },
                    padding: 16,
                  }
                },
                tooltip: {
                  backgroundColor: '#1e293b',
                  titleColor: '#f8fafc',
                  bodyColor: '#e2e8f0',
                  titleFont: { size: 13, weight: '600' },
                  bodyFont: { size: 12 },
                  cornerRadius: 10,
                  padding: 14,
                  callbacks: {
                    label: (c) => {
                      const val = c.raw || 0;
                      const total = c.dataset.data.reduce((a, b) => a + b, 0);
                      const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                      return ` ${c.label}: ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val)} (${pct}%)`;
                    }
                  }
                }
              }
            }} />
            <div className="mt-4 space-y-2">
              {(data?.caByPractitioner || []).map((p, i) => {
                const pct = totalCA > 0 ? ((p.totalFacture / totalCA) * 100).toFixed(1) : 0;
                return (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: doughnutColors[i % doughnutColors.length] }}></span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">{p._id}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 dark:text-gray-500">{pct}%</span>
                      <span className="font-bold text-gray-900 dark:text-white">{formatMoney(p.totalFacture)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* AI Insight Panel */}
        {aiInsightCA && (
          <div className="bg-gradient-to-r from-violet-50 via-blue-50 to-amber-50 dark:from-violet-900/30 dark:via-blue-900/30 dark:to-amber-900/30 rounded-2xl border border-violet-100 dark:border-violet-800 p-5 mb-6 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-violet-100 dark:bg-violet-900/50 rounded-lg"><FiCpu className="w-4 h-4 text-violet-600" /></div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">Analyse IA — Chiffre d'Affaires</h4>
              <span className="ml-auto text-[10px] font-semibold text-violet-500 bg-violet-100 px-2 py-0.5 rounded-full">Fiabilité {aiInsightCA.confidence}%</span>
            </div>
            <div className="space-y-1">
              {aiInsightCA.parts.map((part, i) => (
                <p key={i} className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{part}</p>
              ))}
            </div>
          </div>
        )}

        {/* Alertes & Notifications - clickable */}
        <div className="mb-6">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Alertes & Notifications</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-400 rounded-xl p-4 cursor-pointer hover:shadow-md transition-all duration-300 hover:-translate-y-0.5" onClick={() => navigate('/admin/statistics')}>
              <p className="text-sm font-bold text-red-600">Encaissement faible <FiAlertTriangle className="inline w-4 h-4 ml-1" /></p>
              <p className="text-3xl font-black text-gray-900 dark:text-white mt-1 tabular-nums">{animFaible}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">cabinets &lt; 85% encaissement</p>
              <p className="text-xs text-blue-600 mt-2 flex items-center gap-1 hover:underline">Voir les détails <FiArrowRight className="w-3 h-3" /></p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/30 border-l-4 border-orange-400 rounded-xl p-4 cursor-pointer hover:shadow-md transition-all duration-300 hover:-translate-y-0.5" onClick={() => navigate('/admin/comparison')}>
              <p className="text-sm font-bold text-orange-600">Absences détectées <span className={`inline-block w-2 h-2 rounded-full bg-orange-400 ml-1 ${isDynamic ? 'animate-pulse' : ''}`}></span></p>
              <p className="text-3xl font-black text-gray-900 dark:text-white mt-1 tabular-nums">{animAbsences}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">RDV sans présence patient</p>
              <p className="text-xs text-blue-600 mt-2 flex items-center gap-1 hover:underline">Voir les détails <FiArrowRight className="w-3 h-3" /></p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/30 border-l-4 border-green-400 rounded-xl p-4 cursor-pointer hover:shadow-md transition-all duration-300 hover:-translate-y-0.5" onClick={() => navigate('/admin/comparison')}>
              <p className="text-sm font-bold text-green-600">Total Présences <span className={`inline-block w-2 h-2 rounded-full bg-green-400 ml-1 ${isDynamic ? 'animate-pulse' : ''}`}></span></p>
              <p className="text-3xl font-black text-gray-900 dark:text-white mt-1 tabular-nums">{animPresences}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">présences confirmées</p>
              <p className="text-xs text-blue-600 mt-2 flex items-center gap-1 hover:underline">Voir les détails <FiArrowRight className="w-3 h-3" /></p>
            </div>
            <div className="bg-pink-50 dark:bg-pink-900/30 border-l-4 border-pink-400 rounded-xl p-4 cursor-pointer hover:shadow-md transition-all duration-300 hover:-translate-y-0.5" onClick={() => navigate('/admin/reports')}>
              <p className="text-sm font-bold text-pink-600">Rapports non envoyés <span className={`inline-block w-2 h-2 rounded-full bg-pink-400 ml-1 ${isDynamic ? 'animate-pulse' : ''}`}></span></p>
              <p className="text-3xl font-black text-gray-900 dark:text-white mt-1 tabular-nums">{animNonEnvoyes}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">rapports en attente</p>
              <p className="text-xs text-blue-600 mt-2 flex items-center gap-1 hover:underline">Voir les détails <FiArrowRight className="w-3 h-3" /></p>
            </div>
          </div>
        </div>

        {/* CA Total & Objectif Total — Animated */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="group bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-gray-700 p-5 flex items-center gap-4 hover:shadow-lg hover:shadow-green-100/50 dark:hover:shadow-green-900/30 transition-all duration-500 hover:-translate-y-0.5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-green-50/40 dark:from-green-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10 w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <FiTrendingUp className="w-6 h-6 text-white" />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 tracking-widest uppercase">CA TOTAL ({nbPractitioners} CABINETS)</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{formatMoney(animCABottom)}</p>
            </div>
          </div>
          <div className="group bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-gray-700 p-5 flex items-center gap-4 hover:shadow-lg hover:shadow-green-100/50 dark:hover:shadow-green-900/30 transition-all duration-500 hover:-translate-y-0.5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-green-50/40 dark:from-green-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10 w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <FiFileText className="w-6 h-6 text-white" />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 tracking-widest uppercase">TOTAL ENCAISSÉ ({nbPractitioners} CABINETS)</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{formatMoney(animEncaisseBottom)}</p>
              <div className="mt-1 w-48 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                <div className={`h-1.5 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 ${isDynamic ? 'transition-all duration-[2400ms] ease-out' : ''}`} style={{ width: `${animEncaissePct}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
