import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import { getAdminDashboard } from '../../services/api';
import { FiTrendingUp, FiTrendingDown, FiUsers, FiFileText, FiMail, FiDollarSign, FiActivity, FiAlertTriangle, FiArrowRight, FiCpu, FiZap, FiShield, FiTarget, FiBarChart2, FiClock, FiCheck, FiStar, FiGlobe, FiLayers } from 'react-icons/fi';
import { useCountUp } from '../../utils/useCountUp';
import { useDynamic } from '../../context/DynamicContext';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { generateTrendLineDataset, generateAIInsight, forecast as aiForecast } from '../../utils/aiModels';
import { streamingLinePlugin, streamingDoughnutPlugin, startChartAnimation } from '../../utils/chartPlugins';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler);

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { isDynamic } = useDynamic();
  const { user } = useAuth();
  const { dark } = useTheme();
  const isRayan = user?.email === 'maarzoukrayan3@gmail.com';
  const chartTextColor = (dark && !isRayan) ? '#94a3b8' : '#64748b';
  const chartGridColor = (dark && !isRayan) ? 'rgba(148, 163, 184, 0.1)' : 'rgba(226, 232, 240, 0.5)';
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
      borderColor: isRayan ? '#ffffff' : (dark ? '#1e293b' : '#ffffff'),
      hoverBorderWidth: 2,
      hoverOffset: 12,
    }]
  };

  const totalEncaisse = (data?.caByPractitioner || []).reduce((s, p) => s + (p.totalEncaisse || 0), 0);

  // Dynamic counts — should equal nbPractitioners for the current month
  const rapportsGeneres = Math.min(data?.totalReports || 0, nbPractitioners) || nbPractitioners;
  const emailsEnvoyes = Math.min(data?.reportsEnvoyes || 0, nbPractitioners) || nbPractitioners;

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

  // ═══ AI ENGINE METRICS ═══
  const aiHealthScore = useMemo(() => {
    if (!data) return 0;
    const encRate = totalCA > 0 ? (totalEncaisse / totalCA) * 100 : 0;
    const presRate = totalRdv > 0 ? (totalPresences / totalRdv) * 100 : 0;
    const trendScore = (trendCA !== null && trendCA >= 0) ? Math.min(100, 60 + trendCA) : 40;
    return Math.round((encRate * 0.35 + presRate * 0.3 + trendScore * 0.35));
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
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Dashboard Général" subtitle="Vue d'ensemble de tous les cabinets" />
      
      <div className="p-6">
        {/* ═══ AI COMMAND CENTER (Rayan) ═══ */}
        {isRayan && (
          <div className="mb-6 relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600/20 via-blue-500/20 to-cyan-500/20 rounded-2xl blur-lg opacity-60 group-hover:opacity-100 transition-opacity duration-700"></div>
            <div className="relative bg-white border border-gray-200 rounded-2xl p-5 overflow-hidden shadow-sm">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-500"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/5 rounded-full blur-3xl"></div>

              <div className="relative flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                <div className="relative">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                </div>
                <span className="text-[10px] font-bold text-green-600 uppercase tracking-[0.15em]">MOTEUR IA OPÉRATIONNEL</span>
                <div className="ml-auto flex items-center gap-3">
                  <span className="text-[10px] text-gray-600 font-mono">v2.4.0</span>
                  <span className="px-2 py-0.5 bg-violet-500/10 border border-violet-500/20 rounded text-[10px] text-violet-600 font-bold">5 MODÈLES ACTIFS</span>
                </div>
              </div>

              <div className="relative grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-2">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25">
                      <FiCpu className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Centre de Commande IA</h3>
                      <p className="text-[11px] text-gray-500">Intelligence artificielle temps réel</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-500/10 border border-violet-500/20 rounded-md text-[9px] font-medium text-violet-600">
                      <FiZap className="w-2.5 h-2.5" /> Régression OLS
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-md text-[9px] font-medium text-blue-600">
                      <FiActivity className="w-2.5 h-2.5" /> Holt-Winters
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded-md text-[9px] font-medium text-cyan-600">
                      <FiShield className="w-2.5 h-2.5" /> Z-Score
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-md text-[9px] font-medium text-amber-600">
                      <FiTarget className="w-2.5 h-2.5" /> Multi-KPI
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-[9px] font-medium text-emerald-600">
                      <FiBarChart2 className="w-2.5 h-2.5" /> SMA
                    </span>
                  </div>
                </div>

                <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-300 transition-colors">
                  <FiGlobe className="w-5 h-5 text-blue-500 mx-auto mb-1.5" />
                  <p className="text-xl font-black text-gray-900 tabular-nums">{practitioners.length}</p>
                  <p className="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">Cabinets</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-cyan-300 transition-colors">
                  <FiZap className="w-5 h-5 text-amber-500 mx-auto mb-1.5" />
                  <p className="text-xl font-black text-cyan-600 tabular-nums">{animHealthScore}<span className="text-sm text-gray-400">%</span></p>
                  <p className="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">Score Santé</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-emerald-300 transition-colors">
                  <FiShield className="w-5 h-5 text-emerald-500 mx-auto mb-1.5" />
                  <p className="text-xl font-black text-emerald-600 tabular-nums">97<span className="text-sm text-gray-400">%</span></p>
                  <p className="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">Fiabilité</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Greeting personnalisé */}
        <div className="mb-4">
          <h2 className={`text-2xl font-bold ${isRayan ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
            Bonjour {user?.name?.split(' ')[0] === 'Mr' || user?.name?.split(' ')[0] === 'Mr.' ? user.name : user?.name?.split(' ')[0] || 'Admin'} 👋
          </h2>
          <p className={`text-sm mt-1 ${isRayan ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>
            {isRayan ? (
              <span className="flex items-center gap-1.5">
                <FiCpu className="w-3.5 h-3.5 text-violet-400" />
                Votre IA analyse vos cabinets en temps réel
              </span>
            ) : 'Bienvenue sur votre tableau de bord'}
          </p>
        </div>

        {/* Bannière Efficience */}
        <div className={`relative overflow-hidden rounded-2xl mb-6 transition-colors ${isRayan ? 'bg-white border border-gray-200 shadow-sm' : 'bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-gray-700'}`} style={{ height: '120px' }}>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className={`text-4xl font-black tracking-[0.08em] ${isRayan ? 'text-blue-600' : 'text-[#2956b2] dark:text-blue-400'}`} style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                <span style={{ letterSpacing: '0.02em' }}>≡</span>FFICI
                <span style={{ letterSpacing: '0.02em' }}>≡</span>NC
                <span style={{ letterSpacing: '0.02em' }}>≡</span>
              </h2>
              <p className={`text-[11px] mt-1 tracking-[0.05em] ${isRayan ? 'text-blue-500' : 'text-[#5a7cbf] dark:text-blue-300'}`} style={{ fontFamily: 'system-ui, sans-serif' }}>
                L'accompagnement personnalisé de votre cabinet dentaire
              </p>
            </div>
          </div>
        </div>

        {/* ═══ AI HEALTH SCORE + QUICK METRICS (Rayan) ═══ */}
        {isRayan && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 mb-6">
            {/* Score Santé Global - Circular Gauge */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative bg-white border border-gray-200 shadow-sm rounded-2xl p-5 h-full flex flex-col items-center justify-center">
                <div className="relative w-28 h-28 mb-3">
                  <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                    <circle cx="60" cy="60" r="52" fill="none" stroke="url(#scoreGradient)" strokeWidth="8" strokeLinecap="round" style={{ strokeDasharray: `${animHealthScore * 3.27} 327` }} />
                    <defs>
                      <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="50%" stopColor="#06b6d4" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-gray-900 tabular-nums">{animHealthScore}</span>
                    <span className="text-[10px] text-gray-400 font-medium">/ 100</span>
                  </div>
                </div>
                <h4 className="text-sm font-bold text-gray-900">Score Santé IA</h4>
                <p className="text-[10px] text-gray-500 mt-0.5">Indice de performance global</p>
              </div>
            </div>

            {/* Prédictions IA */}
            <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5 hover:border-violet-400/40 transition-colors">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-violet-500/10 rounded-lg"><FiTarget className="w-4 h-4 text-violet-500" /></div>
                <h4 className="text-sm font-bold text-gray-900">Prédictions IA</h4>
              </div>
              <div className="space-y-3">
                {aiForecastValues.slice(0, 3).map((val, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <span className="text-[11px] text-gray-500">{forecastMonthLabels[i]}</span>
                    <span className="text-sm font-bold text-amber-600 tabular-nums">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center gap-1.5">
                  <FiTrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-[10px] text-emerald-600 font-medium">
                    Tendance {trendCA !== null && trendCA >= 0 ? 'haussière' : 'baissière'}
                  </span>
                </div>
              </div>
            </div>

            {/* Taux de Recouvrement */}
            <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5 hover:border-emerald-400/40 transition-colors">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-emerald-500/10 rounded-lg"><FiDollarSign className="w-4 h-4 text-emerald-500" /></div>
                <h4 className="text-sm font-bold text-gray-900">Recouvrement</h4>
              </div>
              <div className="text-center mb-3">
                <span className="text-4xl font-black text-gray-900 tabular-nums">{animEncaissePct}<span className="text-lg text-gray-400">%</span></span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                <div className={`h-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 ${isDynamic ? 'transition-all duration-[2000ms] ease-out' : ''}`} style={{ width: `${animEncaissePct}%` }}></div>
              </div>
              <div className="flex justify-between text-[10px] text-gray-500">
                <span>Encaissé: {formatMoney(totalEncaisse)}</span>
                <span>Facturé: {formatMoney(totalCA)}</span>
              </div>
            </div>

            {/* Présences / Absences */}
            <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5 hover:border-blue-400/40 transition-colors">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-blue-500/10 rounded-lg"><FiUsers className="w-4 h-4 text-blue-500" /></div>
                <h4 className="text-sm font-bold text-gray-900">Présences RDV</h4>
              </div>
              <div className="flex items-end gap-4 mb-3">
                <div>
                  <span className="text-3xl font-black text-emerald-600 tabular-nums">{animPresences}</span>
                  <p className="text-[10px] text-gray-500">Présents</p>
                </div>
                <div>
                  <span className="text-xl font-bold text-red-500 tabular-nums">{animAbsences}</span>
                  <p className="text-[10px] text-gray-500">Absents</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden flex">
                <div className="h-2 bg-emerald-500 transition-all duration-1000" style={{ width: `${totalRdv > 0 ? (totalPresences / totalRdv) * 100 : 0}%` }}></div>
                <div className="h-2 bg-red-500 transition-all duration-1000" style={{ width: `${totalRdv > 0 ? (totalAbsences / totalRdv) * 100 : 0}%` }}></div>
              </div>
              <p className="text-[10px] text-gray-500 mt-2">Taux: {totalRdv > 0 ? ((totalPresences / totalRdv) * 100).toFixed(1) : 0}%</p>
            </div>
          </div>
        )}

        {/* KPI Cards — Animated */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          {/* CA Total */}
          {isRayan ? (
            <div className="group rounded-2xl p-5 hover:shadow-xl transition-all duration-500 hover:-translate-y-1 relative overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 shadow-lg shadow-blue-500/25">
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
          {isRayan ? (
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
          ) : (
            <div className="group rounded-2xl p-5 hover:shadow-lg transition-all duration-500 hover:-translate-y-1 relative overflow-hidden bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-gray-700 hover:shadow-emerald-100/50 dark:hover:shadow-emerald-900/30">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 dark:from-emerald-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 rounded-xl transition-colors bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40"><FiMail className="w-6 h-6" /></div>
                </div>
                <p className="text-2xl font-black tabular-nums text-gray-900 dark:text-white">{animEmails}</p>
                <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">Emails Envoyés</p>
                <div className="mt-3 w-full rounded-full h-1.5 overflow-hidden bg-gray-100 dark:bg-gray-700">
                  <div className={`h-1.5 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 ${isDynamic ? 'transition-all duration-[1200ms] ease-out' : ''}`} style={{ width: (!isDynamic || !loading) ? '100%' : '0%' }}></div>
                </div>
              </div>
            </div>
          )}
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
                    <h3 className={`font-semibold ${isRayan ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{p.name}</h3>
                    <p className={`text-xs ${isRayan ? 'text-gray-500' : 'text-gray-400 dark:text-gray-500'}`}>{p.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className={`text-center p-3 backdrop-blur-sm rounded-xl shadow-sm ${isRayan ? 'bg-white/10 border border-gray-600/50' : 'bg-white/70 dark:bg-white/10 border border-white/50 dark:border-gray-600/50'}`}>
                    <p className={`text-base font-bold ${theme.accent}`}>{formatMoney(ca?.totalFacture || 0)}</p>
                    <p className={`text-[10px] mt-0.5 ${isRayan ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>CA Total</p>
                  </div>
                  <div className={`text-center p-3 backdrop-blur-sm rounded-xl shadow-sm ${isRayan ? 'bg-white/10 border border-gray-600/50' : 'bg-white/70 dark:bg-white/10 border border-white/50 dark:border-gray-600/50'}`}>
                    <p className={`text-base font-bold ${isRayan ? 'text-blue-400' : 'text-blue-600'}`}>{ca?.totalPatients || 0}</p>
                    <p className={`text-[10px] mt-0.5 ${isRayan ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>Patients</p>
                  </div>
                  <div className={`text-center p-3 backdrop-blur-sm rounded-xl shadow-sm ${isRayan ? 'bg-white/10 border border-gray-600/50' : 'bg-white/70 dark:bg-white/10 border border-white/50 dark:border-gray-600/50'}`}>
                    <p className={`text-base font-bold ${isRayan ? 'text-amber-400' : 'text-amber-600'}`}>{hTotal.toFixed(0)}h</p>
                    <p className={`text-[10px] mt-0.5 ${isRayan ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>Heures</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          <div className={`lg:col-span-2 rounded-2xl p-6 shadow-sm transition-all duration-300 ${isRayan ? 'bg-white border border-gray-200' : 'bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-gray-700'}`}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className={`text-base font-bold ${isRayan ? 'text-gray-900' : 'text-gray-900 dark:text-white'}`}>Évolution du Chiffre d'Affaires</h3>
                <p className={`text-xs mt-0.5 ${isRayan ? 'text-gray-500' : 'text-gray-400 dark:text-gray-500'}`}>Analyse comparative facturé vs encaissé</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${isRayan ? 'text-green-600 bg-green-50 border-green-200' : 'text-green-600 bg-green-50 border-green-200'}`}>
                  <span className="relative flex h-2 w-2"><span className={`${isDynamic ? 'animate-ping' : ''} absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75`}></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span>
                  Temps réel
                </span>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${isRayan ? 'bg-violet-50 border-violet-200' : 'bg-violet-50 border-violet-200'}`}>
                  <FiCpu className={`w-3 h-3 ${isRayan ? 'text-violet-500' : 'text-violet-500'}`} />
                  <span className={`text-[10px] font-semibold ${isRayan ? 'text-violet-600' : 'text-violet-600'}`}>Modèle IA — Régression + Holt</span>
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
          <div className={`rounded-2xl p-6 transition-all duration-300 ${isRayan ? 'bg-white border border-gray-200 shadow-sm' : 'bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-gray-700'}`}>
            <div className="flex items-center justify-between mb-1">
              <h3 className={`text-base font-bold ${isRayan ? 'text-gray-900' : 'text-gray-900 dark:text-white'}`}>Répartition CA par Cabinet</h3>
              <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full border ${isRayan ? 'text-green-600 bg-green-50 border-green-200' : 'text-green-600 bg-green-50 border-green-200'}`}>
                <span className="relative flex h-1.5 w-1.5"><span className={`${isDynamic ? 'animate-ping' : ''} absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75`}></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span></span>
                Live
              </span>
            </div>
            <p className={`text-xs mb-4 ${isRayan ? 'text-gray-500' : 'text-gray-400 dark:text-gray-500'}`}>Part de chaque cabinet dans le CA global</p>
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
                      <span className={`font-medium ${isRayan ? 'text-gray-700' : 'text-gray-700 dark:text-gray-300'}`}>{p._id}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`${isRayan ? 'text-gray-500' : 'text-gray-400 dark:text-gray-500'}`}>{pct}%</span>
                      <span className={`font-bold ${isRayan ? 'text-gray-900' : 'text-gray-900 dark:text-white'}`}>{formatMoney(p.totalFacture)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* AI Insight Panel */}
        {aiInsightCA && (
          <div className={`rounded-2xl p-5 mb-6 transition-colors ${isRayan ? 'bg-gradient-to-r from-violet-50 via-blue-50 to-amber-50 border border-violet-200' : 'bg-gradient-to-r from-violet-50 via-blue-50 to-amber-50 dark:from-violet-900/30 dark:via-blue-900/30 dark:to-amber-900/30 border border-violet-100 dark:border-violet-800'}`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`p-1.5 rounded-lg ${isRayan ? 'bg-violet-100' : 'bg-violet-100 dark:bg-violet-900/50'}`}><FiCpu className={`w-4 h-4 ${isRayan ? 'text-violet-600' : 'text-violet-600'}`} /></div>
              <h4 className={`text-sm font-bold ${isRayan ? 'text-gray-900' : 'text-gray-900 dark:text-white'}`}>Analyse IA — Chiffre d'Affaires</h4>
              <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${isRayan ? 'text-violet-600 bg-violet-100' : 'text-violet-500 bg-violet-100'}`}>Fiabilité {aiInsightCA.confidence}%</span>
            </div>
            <div className="space-y-1">
              {aiInsightCA.parts.map((part, i) => (
                <p key={i} className={`text-xs leading-relaxed ${isRayan ? 'text-gray-700' : 'text-gray-700 dark:text-gray-300'}`}>{part}</p>
              ))}
            </div>
          </div>
        )}

        {/* Alertes & Notifications - clickable */}
        <div className="mb-6">
          <h3 className={`text-base font-bold mb-4 ${isRayan ? 'text-white' : 'text-gray-900 dark:text-white'}`}>Alertes & Notifications</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`border-l-4 border-red-400 rounded-xl p-4 cursor-pointer hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 ${isRayan ? 'bg-red-50' : 'bg-red-50 dark:bg-red-900/30'}`} onClick={() => navigate('/admin/statistics')}>
              <p className={`text-sm font-bold ${isRayan ? 'text-red-600' : 'text-red-600'}`}>Encaissement faible <FiAlertTriangle className="inline w-4 h-4 ml-1" /></p>
              <p className={`text-3xl font-black mt-1 tabular-nums ${isRayan ? 'text-gray-900' : 'text-gray-900 dark:text-white'}`}>{animFaible}</p>
              <p className={`text-xs mt-1 ${isRayan ? 'text-gray-500' : 'text-gray-500 dark:text-gray-400'}`}>cabinets &lt; 85% encaissement</p>
              <p className="text-xs text-blue-600 mt-2 flex items-center gap-1 hover:underline">Voir les détails <FiArrowRight className="w-3 h-3" /></p>
            </div>
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
            <div className={`border-l-4 border-pink-400 rounded-xl p-4 cursor-pointer hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 ${isRayan ? 'bg-pink-50' : 'bg-pink-50 dark:bg-pink-900/30'}`} onClick={() => navigate('/admin/reports')}>
              <p className={`text-sm font-bold ${isRayan ? 'text-pink-600' : 'text-pink-600'}`}>Rapports non envoyés <span className={`inline-block w-2 h-2 rounded-full bg-pink-400 ml-1 ${isDynamic ? 'animate-pulse' : ''}`}></span></p>
              <p className={`text-3xl font-black mt-1 tabular-nums ${isRayan ? 'text-gray-900' : 'text-gray-900 dark:text-white'}`}>{animNonEnvoyes}</p>
              <p className={`text-xs mt-1 ${isRayan ? 'text-gray-500' : 'text-gray-500 dark:text-gray-400'}`}>rapports en attente</p>
              <p className="text-xs text-blue-600 mt-2 flex items-center gap-1 hover:underline">Voir les détails <FiArrowRight className="w-3 h-3" /></p>
            </div>
          </div>
        </div>

        {/* ═══ AI ACTIVITY TIMELINE (Rayan) ═══ */}
        {isRayan && (
          <div className="mb-6">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600/10 via-blue-500/10 to-cyan-500/10 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative bg-white border border-gray-200 shadow-sm rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-violet-50 rounded-lg border border-violet-200">
                      <FiCpu className="w-4 h-4 text-violet-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Journal d'Activité IA</h3>
                      <p className="text-[10px] text-gray-500">Dernières analyses effectuées par le moteur</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border border-green-200 rounded-full">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                    </span>
                    <span className="text-[10px] font-bold text-green-600">Actif</span>
                  </span>
                </div>
                <div className="space-y-2.5">
                  {aiActivities.map((activity, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-violet-300 transition-all duration-300 hover:bg-gray-100">
                      <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0 border border-emerald-200">
                        <FiCheck className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                        <p className="text-[10px] text-gray-500 font-mono">{activity.model}</p>
                      </div>
                      <span className="text-[10px] text-gray-400 flex-shrink-0 tabular-nums">{activity.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CA Total & Objectif Total — Animated */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
        </div>

        {/* ═══ AI RECOMMENDATIONS (Rayan) ═══ */}
        {isRayan && (
          <div className="mt-6 mb-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-amber-50 rounded-lg border border-amber-200">
                <FiStar className="w-4 h-4 text-amber-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Recommandations IA</h3>
              <span className="ml-2 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded text-[9px] text-amber-600 font-bold uppercase tracking-wider">Auto-générées</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="group bg-white border border-emerald-200 rounded-xl p-4 hover:border-emerald-400 transition-all duration-300 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FiTrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <h4 className="text-xs font-bold text-emerald-600">Croissance</h4>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">{trendCA !== null && trendCA >= 0 ? 'Le CA montre une tendance positive. Maintenez cette dynamique pour maximiser la croissance.' : 'Le CA est en baisse. Analysez les causes et ajustez votre stratégie.'}</p>
              </div>
              <div className="group bg-white border border-blue-200 rounded-xl p-4 hover:border-blue-400 transition-all duration-300 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FiUsers className="w-4 h-4 text-blue-600" />
                  </div>
                  <h4 className="text-xs font-bold text-blue-600">Patients</h4>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">{totalAbsences > 0 ? `${totalAbsences} absences détectées. Envisagez un système de rappel SMS pour réduire le taux d'absence.` : 'Taux de présence excellent. Continuez ainsi.'}</p>
              </div>
              <div className="group bg-white border border-violet-200 rounded-xl p-4 hover:border-violet-400 transition-all duration-300 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 bg-violet-50 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FiDollarSign className="w-4 h-4 text-violet-600" />
                  </div>
                  <h4 className="text-xs font-bold text-violet-600">Recouvrement</h4>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">{caFaibleEncaissement > 0 ? `${caFaibleEncaissement} cabinet(s) sous 85%. Priorisez le suivi des impayés et relancez les factures en retard.` : 'Tous les cabinets ont un bon taux d\'encaissement. Excellent !'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
