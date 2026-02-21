import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import { getAdminDashboard } from '../../services/api';
import { FiTrendingUp, FiUsers, FiFileText, FiMail, FiDollarSign, FiActivity, FiAlertTriangle, FiArrowRight, FiCpu } from 'react-icons/fi';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { generateTrendLineDataset, generateAIInsight, forecast as aiForecast } from '../../utils/aiModels';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler);

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboard();
  }, []);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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
        data: [...aiTrend.trendData, ...new Array(3).fill(null)],
      },
      // IA: Prévision 3 mois
      {
        label: 'Prévision IA',
        data: [...new Array(factureValues.length - 1).fill(null), factureValues[factureValues.length - 1], ...aiForecastValues],
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

  return (
    <div>
      <Header title="Dashboard Général" subtitle="Vue d'ensemble de tous les cabinets" />
      
      <div className="p-6">
        {/* Bannière Efficience Dental Care */}
        <div className="relative overflow-hidden rounded-2xl mb-6" style={{ height: '180px', background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 40%, #115e59 100%)' }}>
          {/* ECG / Heartbeat line SVG */}
          <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 1200 180" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <polyline fill="none" stroke="#5eead4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              points="0,100 80,100 120,100 160,100 190,100 210,60 225,130 240,40 255,140 270,80 290,100 340,100 400,100 440,100 480,100 510,100 530,60 545,130 560,40 575,140 590,80 610,100 660,100 720,100 760,100 800,100 830,100 850,60 865,130 880,40 895,140 910,80 930,100 980,100 1040,100 1080,100 1120,100 1150,100 1170,60 1185,130 1200,100"
            />
            <polyline fill="none" stroke="#99f6e4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"
              points="0,110 100,110 140,110 175,110 200,80 215,140 230,50 245,145 260,90 275,110 350,110 430,110 500,110 540,80 555,140 570,50 585,145 600,90 625,110 700,110 780,110 840,80 855,140 870,50 885,145 900,90 920,110 1000,110 1100,110 1160,80 1175,140 1200,110"
            />
          </svg>
          
          {/* Contenu central */}
          <div className="relative z-10 flex items-center justify-center h-full">
            <div className="flex items-center gap-8">
              {/* Logo cercle blanc + dent */}
              <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center shadow-2xl" style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.2), 0 0 0 6px rgba(255,255,255,0.15)' }}>
                <svg width="56" height="62" viewBox="0 0 56 62" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Tooth icon */}
                  <path d="M28 4C20 4 16 8 14 12C12 16 10 16 8 16C4 16 2 20 2 24C2 28 4 32 8 34C10 35 12 38 13 42C14 48 16 56 20 58C24 60 26 52 28 48C30 52 32 60 36 58C40 56 42 48 43 42C44 38 46 35 48 34C52 32 54 28 54 24C54 20 52 16 48 16C46 16 44 16 42 12C40 8 36 4 28 4Z"
                    fill="#0d9488" stroke="#0d9488" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  {/* Inner tooth detail */}
                  <path d="M28 10C22 10 19 13 17.5 16C16 19 14.5 19.5 13 19.5C10 19.5 8 22 8 25C8 28 10 30.5 13 31.5" 
                    stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6"/>
                  <path d="M21 20C21 20 24 18 28 18C32 18 35 20 35 20"
                    stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5"/>
                </svg>
              </div>
              
              {/* Texte */}
              <div className="text-center">
                <p className="text-white/60 text-xs font-bold tracking-[0.35em] uppercase mb-1">Efficience Analytics</p>
                <h2 className="text-white text-3xl font-black tracking-[0.15em] uppercase" style={{ fontFamily: 'system-ui, sans-serif', textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
                  DENTAL CARE
                </h2>
                <div className="flex items-center justify-center gap-3 mt-2">
                  <span className="w-8 h-[2px] bg-teal-300/50 rounded-full"></span>
                  <FiActivity className="w-4 h-4 text-teal-300/70" />
                  <span className="text-teal-200/70 text-[10px] font-semibold tracking-widest uppercase">Intelligence Artificielle</span>
                  <FiActivity className="w-4 h-4 text-teal-300/70" />
                  <span className="w-8 h-[2px] bg-teal-300/50 rounded-full"></span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Overlay dégradé subtil */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none"></div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 rounded-xl bg-blue-50 text-blue-600"><FiDollarSign className="w-6 h-6" /></div>
              {trendCA !== null && (
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${trendCA >= 0 ? 'text-green-500 bg-green-50' : 'text-red-500 bg-red-50'}`}>
                  {trendCA >= 0 ? '+' : ''}{trendCA}%
                </span>
              )}
            </div>
            <p className="text-2xl font-black text-gray-900">{formatMoney(totalCA)}</p>
            <p className="text-sm text-gray-500 mt-1">CA Total</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 rounded-xl bg-blue-50 text-blue-600"><FiUsers className="w-6 h-6" /></div>
              {trendPatients !== null && (
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${trendPatients >= 0 ? 'text-green-500 bg-green-50' : 'text-red-500 bg-red-50'}`}>
                  {trendPatients >= 0 ? '+' : ''}{trendPatients}%
                </span>
              )}
            </div>
            <p className="text-2xl font-black text-gray-900">{totalPatients.toLocaleString('fr-FR')}</p>
            <p className="text-sm text-gray-500 mt-1">Patients Total</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 rounded-xl bg-gray-50 text-gray-600"><FiFileText className="w-6 h-6" /></div>
            </div>
            <p className="text-2xl font-black text-gray-900">{rapportsGeneres}</p>
            <p className="text-sm text-gray-500 mt-1">Rapports Générés</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 rounded-xl bg-gray-50 text-gray-600"><FiMail className="w-6 h-6" /></div>
            </div>
            <p className="text-2xl font-black text-gray-900">{emailsEnvoyes}</p>
            <p className="text-sm text-gray-500 mt-1">Emails Envoyés</p>
          </div>
        </div>

        {/* Practitioner Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          {data?.practitioners?.map((p, idx) => {
            const ca = data.caByPractitioner?.find(c => c._id === p.code);
            const heures = data.heuresByPractitioner?.find(h => h._id === p.code);
            const hTotal = heures ? (heures.totalMinutes / 60) : 0;
            const cardThemes = [
              { bg: 'from-violet-50 to-purple-50', badge: 'bg-violet-100', badgeText: 'text-violet-700', border: 'border-violet-100', accent: 'text-violet-600' },
              { bg: 'from-blue-50 to-cyan-50', badge: 'bg-blue-100', badgeText: 'text-blue-700', border: 'border-blue-100', accent: 'text-blue-600' },
              { bg: 'from-amber-50 to-orange-50', badge: 'bg-amber-100', badgeText: 'text-amber-700', border: 'border-amber-100', accent: 'text-amber-600' },
              { bg: 'from-pink-50 to-rose-50', badge: 'bg-pink-100', badgeText: 'text-pink-700', border: 'border-pink-100', accent: 'text-pink-600' },
            ];
            const theme = cardThemes[idx % cardThemes.length];

            return (
              <div key={p.code} className={`bg-gradient-to-br ${theme.bg} rounded-2xl border ${theme.border} p-5 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5`}>
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-11 h-11 ${theme.badge} rounded-xl flex items-center justify-center shadow-sm`}>
                    <span className={`${theme.badgeText} font-bold text-sm`}>{p.code}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{p.name}</h3>
                    <p className="text-xs text-gray-400">{p.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-white/70 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm">
                    <p className={`text-base font-bold ${theme.accent}`}>{formatMoney(ca?.totalFacture || 0)}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">CA Total</p>
                  </div>
                  <div className="text-center p-3 bg-white/70 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm">
                    <p className="text-base font-bold text-blue-600">{ca?.totalPatients || 0}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Patients</p>
                  </div>
                  <div className="text-center p-3 bg-white/70 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm">
                    <p className="text-base font-bold text-amber-600">{hTotal.toFixed(0)}h</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Heures</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-gray-900">Évolution du Chiffre d'Affaires</h3>
                <p className="text-xs text-gray-400 mt-0.5">Analyse comparative facturé vs encaissé</p>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-50 border border-violet-200 rounded-full">
                <FiCpu className="w-3 h-3 text-violet-500" />
                <span className="text-[10px] font-semibold text-violet-600">Modèle IA — Régression + Holt</span>
              </div>
            </div>
            <div style={{ height: '280px' }}>
              <Line data={lineChartData} options={{
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { color: '#64748b', usePointStyle: true, pointStyle: 'circle', font: { size: 11, weight: '500' }, padding: 20 }
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
                    ticks: { color: '#94a3b8', font: { size: 10, weight: '500' }, maxRotation: 45 },
                    border: { display: false }
                  },
                  y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(226, 232, 240, 0.5)', drawBorder: false },
                    ticks: { color: '#94a3b8', font: { size: 10 }, padding: 8, callback: v => `${(v/1000).toFixed(0)}k€` },
                    border: { display: false }
                  }
                }
              }} />
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-base font-bold text-gray-900 mb-1">Répartition CA par Cabinet</h3>
            <p className="text-xs text-gray-400 mb-4">Part de chaque cabinet dans le CA global</p>
            <Doughnut data={doughnutData} options={{
              responsive: true,
              cutout: '60%',
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: {
                    color: '#475569',
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
                      <span className="font-medium text-gray-700">{p._id}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400">{pct}%</span>
                      <span className="font-bold text-gray-900">{formatMoney(p.totalFacture)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* AI Insight Panel */}
        {aiInsightCA && (
          <div className="bg-gradient-to-r from-violet-50 via-blue-50 to-amber-50 rounded-2xl border border-violet-100 p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-violet-100 rounded-lg"><FiCpu className="w-4 h-4 text-violet-600" /></div>
              <h4 className="text-sm font-bold text-gray-900">Analyse IA — Chiffre d'Affaires</h4>
              <span className="ml-auto text-[10px] font-semibold text-violet-500 bg-violet-100 px-2 py-0.5 rounded-full">Fiabilité {aiInsightCA.confidence}%</span>
            </div>
            <div className="space-y-1">
              {aiInsightCA.parts.map((part, i) => (
                <p key={i} className="text-xs text-gray-700 leading-relaxed">{part}</p>
              ))}
            </div>
          </div>
        )}

        {/* Alertes & Notifications - clickable */}
        <div className="mb-6">
          <h3 className="text-base font-bold text-gray-900 mb-4">Alertes & Notifications</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-red-50 border-l-4 border-red-400 rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/admin/statistics')}>
              <p className="text-sm font-bold text-red-600">Encaissement faible <FiAlertTriangle className="inline w-4 h-4 ml-1" /></p>
              <p className="text-3xl font-black text-gray-900 mt-1">{caFaibleEncaissement}</p>
              <p className="text-xs text-gray-500 mt-1">cabinets &lt; 85% encaissement</p>
              <p className="text-xs text-blue-600 mt-2 flex items-center gap-1 hover:underline">Voir les détails <FiArrowRight className="w-3 h-3" /></p>
            </div>
            <div className="bg-orange-50 border-l-4 border-orange-400 rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/admin/comparison')}>
              <p className="text-sm font-bold text-orange-600">Absences détectées <span className="inline-block w-2 h-2 rounded-full bg-orange-400 ml-1"></span></p>
              <p className="text-3xl font-black text-gray-900 mt-1">{totalAbsences}</p>
              <p className="text-xs text-gray-500 mt-1">RDV sans présence patient</p>
              <p className="text-xs text-blue-600 mt-2 flex items-center gap-1 hover:underline">Voir les détails <FiArrowRight className="w-3 h-3" /></p>
            </div>
            <div className="bg-green-50 border-l-4 border-green-400 rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/admin/comparison')}>
              <p className="text-sm font-bold text-green-600">Total Présences <span className="inline-block w-2 h-2 rounded-full bg-green-400 ml-1"></span></p>
              <p className="text-3xl font-black text-gray-900 mt-1">{totalPresences}</p>
              <p className="text-xs text-gray-500 mt-1">présences confirmées</p>
              <p className="text-xs text-blue-600 mt-2 flex items-center gap-1 hover:underline">Voir les détails <FiArrowRight className="w-3 h-3" /></p>
            </div>
            <div className="bg-pink-50 border-l-4 border-pink-400 rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/admin/reports')}>
              <p className="text-sm font-bold text-pink-600">Rapports non envoyés <span className="inline-block w-2 h-2 rounded-full bg-pink-400 ml-1"></span></p>
              <p className="text-3xl font-black text-gray-900 mt-1">{rapportsNonEnvoyes}</p>
              <p className="text-xs text-gray-500 mt-1">rapports en attente</p>
              <p className="text-xs text-blue-600 mt-2 flex items-center gap-1 hover:underline">Voir les détails <FiArrowRight className="w-3 h-3" /></p>
            </div>
          </div>
        </div>

        {/* CA Total & Objectif Total */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
              <FiTrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">CA TOTAL ({nbPractitioners} CABINETS)</p>
              <p className="text-2xl font-black text-gray-900">{formatMoney(totalCA)}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
              <FiFileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">TOTAL ENCAISSÉ ({nbPractitioners} CABINETS)</p>
              <p className="text-2xl font-black text-gray-900">{formatMoney(totalEncaisse)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
