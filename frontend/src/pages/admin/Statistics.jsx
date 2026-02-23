import { useState, useEffect, useRef, useCallback } from 'react';
import Header from '../../components/Header';
import { getStatistics } from '../../services/api';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { FiCpu, FiBarChart2, FiTrendingUp, FiDollarSign, FiCheckCircle, FiUsers, FiPercent, FiActivity, FiZap } from 'react-icons/fi';
import { useCountUp } from '../../utils/useCountUp';
import { generateTrendLineDataset, generateAIInsight, detectAnomalies, cabinetHealthScore } from '../../utils/aiModels';
import { streamingLinePlugin, startChartAnimation } from '../../utils/chartPlugins';
import { useDynamic } from '../../context/DynamicContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const fmtNum = (v) => new Intl.NumberFormat('fr-FR').format(Math.round(v || 0));
const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const BAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Statistics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState('2025');
  const [barMetric, setBarMetric] = useState('facture'); // 'facture' | 'encaisse' | 'patients'
  const [animatedBars, setAnimatedBars] = useState(false);
  const [chartView, setChartView] = useState('all'); // 'all' | 'facture' | 'encaisse' | 'tendance'
  const [scoreAnimated, setScoreAnimated] = useState(false);
  const { isDynamic: _isDynamic, dataAccessEnabled } = useDynamic();
  const { dark } = useTheme();
  const { user } = useAuth();
  const isRayan = user?.email === 'maarzoukrayan3@gmail.com';
  const isDynamic = isRayan || _isDynamic; // Rayan toujours dynamique
  const showAI = dataAccessEnabled || isRayan;
  const cardCls = isRayan ? 'bg-white border border-gray-200 shadow-sm' : 'bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-gray-700';
  const chartTextColor = (dark && !isRayan) ? '#94a3b8' : '#64748b';
  const chartGridColor = (dark && !isRayan) ? 'rgba(148, 163, 184, 0.1)' : 'rgba(226, 232, 240, 0.5)';
  const caChartRef = useRef(null);
  const patientsChartRef = useRef(null);

  // Trigger score animation after load
  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => setScoreAnimated(true), 300);
      return () => clearTimeout(t);
    }
  }, [loading]);

  // Animation loop pour les effets streaming
  useEffect(() => {
    if (!isDynamic) return;
    const stopCA = startChartAnimation(caChartRef);
    const stopPatients = startChartAnimation(patientsChartRef);
    return () => { stopCA(); stopPatients(); };
  }, [loading, isDynamic]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getStatistics();
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Data from backend: evolutionMensuelle, globalCA, globalRdv, globalHeures, encours, nbPraticiens
  const evolution = data?.evolutionMensuelle || [];
  const globalCA = data?.globalCA || {};
  const globalRdv = data?.globalRdv || {};

  // Filter by selected year
  const evoYear = evolution.filter(e => e._id && e._id.startsWith(year));

  // Build monthly arrays from evolutionMensuelle
  const monthlyCA = new Array(12).fill(0);
  const monthlyEncaisse = new Array(12).fill(0);
  const monthlyPatients = new Array(12).fill(0);

  evoYear.forEach(e => {
    const mi = parseInt(e._id.substring(4, 6)) - 1;
    monthlyCA[mi] += e.totalFacture || 0;
    monthlyEncaisse[mi] += e.totalEncaisse || 0;
    monthlyPatients[mi] += e.totalPatients || 0;
  });

  // CA by practitioner - aggregate from evolutionMensuelle per praticien
  const caByPractitioner = {};
  const encaisseByPractitioner = {};
  const patientsByPractitioner = {};
  const perPractitioner = data?.perPractitioner || [];
  if (perPractitioner.length > 0) {
    perPractitioner.filter(p => p._id?.startsWith(year)).forEach(p => {
      const code = p.praticien || 'Inconnu';
      if (!caByPractitioner[code]) caByPractitioner[code] = 0;
      if (!encaisseByPractitioner[code]) encaisseByPractitioner[code] = 0;
      if (!patientsByPractitioner[code]) patientsByPractitioner[code] = 0;
      caByPractitioner[code] += p.totalFacture || 0;
      encaisseByPractitioner[code] += p.totalEncaisse || 0;
      patientsByPractitioner[code] += p.totalPatients || 0;
    });
  } else {
    const totalCA = monthlyCA.reduce((a, b) => a + b, 0);
    const totalEnc = monthlyEncaisse.reduce((a, b) => a + b, 0);
    const totalPat = monthlyPatients.reduce((a, b) => a + b, 0);
    const nbP = data?.nbPraticiens || 1;
    if (totalCA > 0) {
      for (let i = 0; i < nbP; i++) {
        caByPractitioner[`Cabinet ${i + 1}`] = Math.round(totalCA / nbP);
        encaisseByPractitioner[`Cabinet ${i + 1}`] = Math.round(totalEnc / nbP);
        patientsByPractitioner[`Cabinet ${i + 1}`] = Math.round(totalPat / nbP);
      }
    }
  }
  const caEntries = Object.entries(caByPractitioner).sort((a, b) => b[1] - a[1]);
  // Build combined entries for dynamic metric switching
  const barDataByMetric = {
    facture: caEntries.map(([name]) => ({ name, value: caByPractitioner[name] || 0 })),
    encaisse: caEntries.map(([name]) => ({ name, value: encaisseByPractitioner[name] || 0 })),
    patients: caEntries.map(([name]) => ({ name, value: patientsByPractitioner[name] || 0 })),
  };
  const currentBarData = barDataByMetric[barMetric] || barDataByMetric.facture;
  const maxBarValue = currentBarData.length > 0 ? Math.max(...currentBarData.map(d => d.value), 1) : 1;
  const barGradients = [
    'linear-gradient(90deg, #3b82f6, #60a5fa, #93c5fd)',
    'linear-gradient(90deg, #10b981, #34d399, #6ee7b7)',
    'linear-gradient(90deg, #f59e0b, #fbbf24, #fde68a)',
    'linear-gradient(90deg, #ef4444, #f87171, #fca5a5)',
    'linear-gradient(90deg, #8b5cf6, #a78bfa, #c4b5fd)',
    'linear-gradient(90deg, #ec4899, #f472b6, #f9a8d4)',
  ];
  const barMetricLabel = barMetric === 'facture' ? 'CA Facturé' : barMetric === 'encaisse' ? 'CA Encaissé' : 'Patients';
  const barMetricSuffix = barMetric === 'patients' ? '' : ' €';

  // Totals for selected year
  const totalFacture = monthlyCA.reduce((a, b) => a + b, 0);
  const totalEncaisse = monthlyEncaisse.reduce((a, b) => a + b, 0);
  const totalPatients = monthlyPatients.reduce((a, b) => a + b, 0);

  // Score moyen
  const scoreMoyen = totalFacture > 0 ? Math.round((totalEncaisse / totalFacture) * 100) : 0;
  const scoreLabel = scoreMoyen >= 90 ? 'Excellent' : scoreMoyen >= 75 ? 'Bon' : scoreMoyen >= 60 ? 'Moyen' : 'Faible';
  const scoreColor = scoreMoyen >= 90 ? '#10b981' : scoreMoyen >= 75 ? '#3b82f6' : scoreMoyen >= 60 ? '#f59e0b' : '#ef4444';

  // Available years from evolution data
  const availableYears = [...new Set(evolution.map(e => e._id?.substring(0, 4)).filter(Boolean))].sort();
  if (!availableYears.includes('2024')) availableYears.unshift('2024');
  if (!availableYears.includes('2025')) availableYears.push('2025');
  if (!availableYears.includes('2026')) availableYears.push('2026');
  availableYears.sort();

  // ═══ MODÈLES IA ═══
  const activeMonthlyCA = monthlyCA.filter(v => v > 0);
  const activeMonthlyPatients = monthlyPatients.filter(v => v > 0);
  const aiCA = generateAIInsight(activeMonthlyCA, 'CA facturé');
  const aiPatients = generateAIInsight(activeMonthlyPatients, 'nombre de patients');
  const aiTrendCA = generateTrendLineDataset(monthlyCA, 0, '#f59e0b');
  const aiTrendPatients = generateTrendLineDataset(monthlyPatients, 0, '#f59e0b');
  const caAnomalies = detectAnomalies(monthlyCA);
  const patientAnomalies = detectAnomalies(monthlyPatients);

  // Health score
  const healthScore = cabinetHealthScore({
    tauxEncaissement: scoreMoyen,
    evolutionCA: aiCA.trend === 'upward' ? aiCA.confidence * 0.5 : aiCA.trend === 'downward' ? -aiCA.confidence * 0.5 : 0,
    tauxAbsence: 0,
    productionHoraire: totalFacture > 0 && totalPatients > 0 ? totalFacture / totalPatients : 0,
    tauxNouveauxPatients: 10,
  });

  // Line chart config for CA mensuel
  const caLineData = {
    labels: MONTHS,
    datasets: [
      {
        label: 'CA Facturé',
        data: monthlyCA,
        borderColor: '#2563eb',
        backgroundColor: (ctx) => {
          const chart = ctx.chart;
          const { ctx: c, chartArea } = chart;
          if (!chartArea) return 'rgba(37, 99, 235, 0.1)';
          const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(37, 99, 235, 0.15)');
          gradient.addColorStop(1, 'rgba(37, 99, 235, 0.01)');
          return gradient;
        },
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#2563eb',
        pointBorderWidth: 2,
        borderWidth: 2.5,
      },
      {
        label: 'CA Encaissé',
        data: monthlyEncaisse,
        borderColor: '#10b981',
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#10b981',
        pointBorderWidth: 2,
        borderWidth: 2,
        borderDash: [5, 3],
      },
      // IA: Ligne de tendance (régression linéaire)
      {
        ...aiTrendCA.dataset,
        label: 'Tendance IA (Régression)',
      },
      // IA: Points d'anomalie CA
      {
        label: 'Anomalies IA',
        data: monthlyCA.map((v, i) => caAnomalies[i]?.isAnomaly ? v : null),
        borderColor: 'transparent',
        backgroundColor: '#ef4444',
        pointRadius: monthlyCA.map((_, i) => caAnomalies[i]?.isAnomaly ? 8 : 0),
        pointStyle: 'crossRot',
        pointBorderColor: '#ef4444',
        pointBorderWidth: 3,
        showLine: false,
        fill: false,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top', align: 'end',
        labels: { usePointStyle: true, pointStyle: 'circle', padding: 16, font: { size: 11, weight: '500' }, color: chartTextColor },
      },
      tooltip: {
        backgroundColor: '#1e293b', titleColor: '#f8fafc', bodyColor: '#e2e8f0',
        titleFont: { size: 13, weight: '600' }, bodyFont: { size: 12 },
        padding: 12, cornerRadius: 8,
        callbacks: { label: (ctx) => `  ${ctx.dataset.label}: ${fmtNum(ctx.parsed.y)} €` },
      },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: chartTextColor, font: { size: 11, weight: '500' } } },
      y: { beginAtZero: true, border: { display: false }, grid: { color: chartGridColor }, ticks: { color: chartTextColor, font: { size: 11 }, callback: (v) => v >= 1000 ? `${Math.round(v/1000)}k` : v } },
    },
  };

  // Patients line chart
  const patientsLineData = {
    labels: MONTHS,
    datasets: [{
      label: 'Patients traités',
      data: monthlyPatients,
      borderColor: '#8b5cf6',
      backgroundColor: (ctx) => {
        const chart = ctx.chart;
        const { ctx: c, chartArea } = chart;
        if (!chartArea) return 'rgba(139, 92, 246, 0.1)';
        const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        gradient.addColorStop(0, 'rgba(139, 92, 246, 0.15)');
        gradient.addColorStop(1, 'rgba(139, 92, 246, 0.01)');
        return gradient;
      },
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 7,
      pointBackgroundColor: '#fff',
      pointBorderColor: '#8b5cf6',
      pointBorderWidth: 2,
      borderWidth: 2.5,
    }],
  };

  // IA: ajout tendance patients
  patientsLineData.datasets.push(
    {
      ...aiTrendPatients.dataset,
      label: 'Tendance IA',
    },
    {
      label: 'Anomalies IA',
      data: monthlyPatients.map((v, i) => patientAnomalies[i]?.isAnomaly ? v : null),
      borderColor: 'transparent',
      backgroundColor: '#ef4444',
      pointRadius: monthlyPatients.map((_, i) => patientAnomalies[i]?.isAnomaly ? 8 : 0),
      pointStyle: 'crossRot',
      pointBorderColor: '#ef4444',
      pointBorderWidth: 3,
      showLine: false,
      fill: false,
    }
  );

  const patientsLineOptions = {
    ...lineOptions,
    plugins: {
      ...lineOptions.plugins,
      tooltip: {
        ...lineOptions.plugins.tooltip,
        callbacks: { label: (ctx) => `  ${ctx.parsed.y} patients` },
      },
    },
    scales: {
      ...lineOptions.scales,
      y: { ...lineOptions.scales.y, ticks: { ...lineOptions.scales.y.ticks, callback: (v) => v } },
    },
  };

  // SVG circular progress for score
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const scoreOffset = scoreAnimated ? (circumference - (scoreMoyen / 100) * circumference) : circumference;

  // Animated counters
  const dyn = isDynamic && !loading;
  const animFacture = useCountUp(totalFacture, 2000, dyn);
  const animEncaisse = useCountUp(totalEncaisse, 2000, dyn);
  const animPatients = useCountUp(totalPatients, 1800, dyn);
  const animScore = useCountUp(scoreMoyen, 1500, dyn);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f8fafc] dark:bg-[#0f172a]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Dynamic chart data based on chartView
  const filteredCALineData = {
    labels: MONTHS,
    datasets: caLineData.datasets.filter((ds) => {
      if (chartView === 'all') return true;
      if (chartView === 'facture') return ds.label === 'CA Factur\u00e9' || ds.label === 'Tendance IA (R\u00e9gression)' || ds.label === 'Anomalies IA';
      if (chartView === 'encaisse') return ds.label === 'CA Encaiss\u00e9';
      if (chartView === 'tendance') return ds.label === 'Tendance IA (R\u00e9gression)' || ds.label === 'Anomalies IA';
      return true;
    }),
  };

  return (
    <div>
      <Header title="Statistiques des cabinets" subtitle={`Année ${year}`} />

      <div className="p-6">
        {/* Year selector — animated */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Année</span>
          <div className="flex gap-1.5 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
            {availableYears.map(y => (
              <button
                key={y}
                onClick={() => { setYear(y); setScoreAnimated(false); setTimeout(() => setScoreAnimated(true), 100); }}
                className={`px-5 py-2 rounded-lg font-semibold text-sm transition-all duration-300 ${
                  year === y ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-200 dark:shadow-blue-900 scale-105' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white/60 dark:hover:bg-white/10'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
          {year && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <FiActivity className="w-3 h-3 text-blue-400" />
              {evoYear.length} mois de données
            </span>
          )}
        </div>

        {/* KPI Cards — Animated */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { icon: FiDollarSign, label: 'CA Factur\u00e9', value: animFacture, suffix: ' \u20ac', gradient: 'from-blue-500 to-blue-600', bgLight: 'bg-blue-50', textColor: 'text-blue-600', raw: totalFacture },
            { icon: FiCheckCircle, label: 'CA Encaiss\u00e9', value: animEncaisse, suffix: ' \u20ac', gradient: 'from-green-500 to-emerald-600', bgLight: 'bg-green-50', textColor: 'text-green-600', raw: totalEncaisse },
            { icon: FiUsers, label: 'Patients trait\u00e9s', value: animPatients, suffix: '', gradient: 'from-purple-500 to-violet-600', bgLight: 'bg-purple-50', textColor: 'text-purple-600', raw: totalPatients },
            { icon: FiPercent, label: 'Taux encaissement', value: animScore, suffix: '%', gradient: scoreMoyen >= 85 ? 'from-green-500 to-emerald-600' : scoreMoyen >= 70 ? 'from-amber-500 to-orange-500' : 'from-red-500 to-rose-600', bgLight: scoreMoyen >= 85 ? 'bg-green-50' : scoreMoyen >= 70 ? 'bg-amber-50' : 'bg-red-50', textColor: scoreMoyen >= 85 ? 'text-green-600' : scoreMoyen >= 70 ? 'text-amber-600' : 'text-red-600', raw: scoreMoyen },
          ].map((kpi, i) => (
            <div key={i} className={`${cardCls} rounded-xl p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group cursor-default relative overflow-hidden`}>
              {/* Background glow on hover */}
              <div className={`absolute -top-6 -right-6 w-20 h-20 rounded-full bg-gradient-to-br ${kpi.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-xl`} />
              <div className="flex items-center gap-3 relative">
                <div className={`p-2.5 rounded-xl ${kpi.bgLight} ${kpi.textColor} group-hover:scale-110 transition-transform duration-300`}>
                  <kpi.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{kpi.label}</p>
                  <p className={`text-2xl font-black ${kpi.label === 'Taux encaissement' ? kpi.textColor : 'text-gray-900 dark:text-white'}`}>
                    {fmtNum(kpi.value)}{kpi.suffix}
                  </p>
                </div>
              </div>
              {/* Mini sparkline indicator */}
              <div className="mt-2 flex items-center gap-1">
                <FiActivity className={`w-3 h-3 ${kpi.textColor}`} />
                <div className="flex-1 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-1 rounded-full bg-gradient-to-r ${kpi.gradient} transition-all duration-1000`} style={{ width: `${Math.min((kpi.raw / Math.max(totalFacture, 1)) * 100, 100)}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CA par cabinet - animated bars with metric toggle */}
        <div className={`${cardCls} rounded-xl p-6 mb-6 transition-colors`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-0.5">Performance par cabinet</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500">Répartition en {year} — {barMetricLabel}</p>
            </div>
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
              <button
                onClick={() => { setBarMetric('facture'); setAnimatedBars(true); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-300 ${
                  barMetric === 'facture' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <FiDollarSign className="w-3 h-3" /> Facturé
              </button>
              <button
                onClick={() => { setBarMetric('encaisse'); setAnimatedBars(true); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-300 ${
                  barMetric === 'encaisse' ? 'bg-green-600 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <FiCheckCircle className="w-3 h-3" /> Encaissé
              </button>
              <button
                onClick={() => { setBarMetric('patients'); setAnimatedBars(true); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-300 ${
                  barMetric === 'patients' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <FiBarChart2 className="w-3 h-3" /> Patients
              </button>
            </div>
          </div>
          <div className="space-y-5">
            {currentBarData.map((item, i) => {
              const pct = maxBarValue > 0 ? (item.value / maxBarValue) * 100 : 0;
              const gradient = barGradients[i % barGradients.length];
              const tauxEnc = caByPractitioner[item.name] > 0 ? Math.round((encaisseByPractitioner[item.name] / caByPractitioner[item.name]) * 100) : 0;
              return (
                <div key={item.name + barMetric} className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm" style={{ background: barGradients[i % barGradients.length] }}>
                        {item.name.substring(0, 2)}
                      </div>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {barMetric !== 'patients' && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          tauxEnc >= 85 ? 'bg-green-50 text-green-600' : tauxEnc >= 70 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                        }`}>
                          Enc. {tauxEnc}%
                        </span>
                      )}
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{fmtNum(item.value)}{barMetricSuffix}</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-7 overflow-hidden relative group-hover:shadow-md transition-shadow">
                    <div
                      className="h-7 rounded-full relative overflow-hidden"
                      style={{
                        width: animatedBars || true ? `${pct}%` : '0%',
                        background: gradient,
                        transition: isDynamic ? 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
                      }}
                    >
                      {/* Shimmer effect */}
                      <div className="absolute inset-0 overflow-hidden rounded-full">
                        <div
                          className="absolute inset-0"
                          style={{
                            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                            animation: isDynamic ? 'shimmer 2.5s ease-in-out infinite' : 'none',
                          }}
                        />
                      </div>
                      {/* Value inside bar */}
                      {pct > 20 && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-white/90 drop-shadow">
                          {fmtNum(item.value)}{barMetricSuffix}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {currentBarData.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Aucune donnée pour {year}</p>
            )}
          </div>
          {/* Comparison summary */}
          {currentBarData.length >= 2 && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <FiTrendingUp className="w-3.5 h-3.5 text-blue-500" />
                <span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{currentBarData[0].name}</span> est en tête avec{' '}
                  <span className="font-bold text-blue-600">{fmtNum(currentBarData[0].value)}{barMetricSuffix}</span>
                  {currentBarData.length > 1 && (
                    <> — écart de <span className="font-bold text-amber-600">{fmtNum(currentBarData[0].value - currentBarData[currentBarData.length - 1].value)}{barMetricSuffix}</span> avec {currentBarData[currentBarData.length - 1].name}</>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* CA Evolution chart — Interactive */}
        {!showAI && (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-12 text-center mb-6">
            <FiCpu className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-400 dark:text-gray-500 mb-2">Modèles IA désactivés</h3>
            <p className="text-sm text-gray-400 dark:text-gray-500">Les graphiques et analyses IA sont temporairement indisponibles.<br/>Contactez l'administrateur pour réactiver les modèles.</p>
          </div>
        )}
        {showAI && <>
        <div className={`${cardCls} rounded-xl p-6 mb-6 transition-colors`}>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Évolution du Chiffre d'Affaires</h3>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
                {[
                  { key: 'all', label: 'Tout', icon: FiBarChart2 },
                  { key: 'facture', label: 'Factur\u00e9', icon: FiDollarSign },
                  { key: 'encaisse', label: 'Encaiss\u00e9', icon: FiCheckCircle },
                  { key: 'tendance', label: 'IA', icon: FiCpu },
                ].map(v => (
                  <button
                    key={v.key}
                    onClick={() => setChartView(v.key)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all duration-300 ${
                      chartView === v.key ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                  >
                    <v.icon className="w-3 h-3" /> {v.label}
                  </button>
                ))}
              </div>
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                <span className="relative flex h-2 w-2"><span className={`${isDynamic ? 'animate-ping' : ''} absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75`}></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span>
                Temps réel
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">CA Facturé vs Encaissé par mois en {year} — <span className="font-semibold text-blue-500 cursor-pointer hover:underline" onClick={() => setChartView(chartView === 'all' ? 'facture' : 'all')}>{chartView === 'all' ? 'Cliquez pour filtrer' : 'Voir tout'}</span></p>
          <div style={{ height: '320px' }}>
            <div className={isRayan ? 'bg-white rounded-xl p-3' : ''}>
              <Line ref={caChartRef} data={filteredCALineData} options={lineOptions} plugins={isDynamic ? [streamingLinePlugin] : []} />
            </div>
          </div>
          {/* AI Insight CA */}
          <div className="mt-4 bg-gradient-to-r from-amber-50 to-violet-50 dark:from-amber-900/30 dark:to-violet-900/30 rounded-xl border border-amber-100 dark:border-amber-800 p-4 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <FiCpu className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200">Analyse IA — CA</span>
              <span className="ml-auto text-[9px] font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Régression linéaire • R²={aiCA.confidence}%</span>
            </div>
            {aiCA.parts.map((p, i) => <p key={i} className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">{p}</p>)}
          </div>
        </div>

        {/* Patients chart */}
        <div className={`${cardCls} rounded-xl p-6 mb-6 transition-colors`}>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Nombre de patients traités</h3>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
              <span className="relative flex h-2 w-2"><span className={`${isDynamic ? 'animate-ping' : ''} absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75`}></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span>
              Temps réel
            </span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Évolution mensuelle en {year}</p>
          <div style={{ height: '280px' }}>
            <div className={isRayan ? 'bg-white rounded-xl p-3' : ''}>
              <Line ref={patientsChartRef} data={patientsLineData} options={patientsLineOptions} plugins={isDynamic ? [streamingLinePlugin] : []} />
            </div>
          </div>
          {/* AI Insight Patients */}
          <div className="mt-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30 rounded-xl border border-purple-100 dark:border-purple-800 p-4 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <FiCpu className="w-3.5 h-3.5 text-purple-600" />
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200">Analyse IA — Patients</span>
              <span className="ml-auto text-[9px] font-semibold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">Modèle Holt-Winters</span>
            </div>
            {aiPatients.parts.map((p, i) => <p key={i} className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">{p}</p>)}
          </div>
        </div>

        {/* Score moyen — Animated circular gauge */}
        <div className={`${cardCls} rounded-xl p-8 relative overflow-hidden transition-colors`}>
          {/* Background decorative circles */}
          <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full border-[30px] border-gray-50 dark:border-gray-700 opacity-50" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full border-[20px] border-gray-50 dark:border-gray-700 opacity-30" />
          
          <div className="flex items-center justify-center gap-2 mb-6">
            <FiZap className={`w-5 h-5 ${scoreMoyen >= 85 ? 'text-green-500' : scoreMoyen >= 70 ? 'text-amber-500' : 'text-red-500'}`} />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Score moyen d'encaissement</h3>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
              scoreMoyen >= 85 ? 'bg-green-50 text-green-600' : scoreMoyen >= 70 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
            }`}>{healthScore.label}</span>
          </div>
          <div className="flex flex-col items-center relative">
            {/* Outer glow ring */}
            <div className="relative">
              <div className="absolute inset-0 rounded-full" style={{
                background: `conic-gradient(${scoreColor}22 0deg, ${scoreColor}11 ${scoreMoyen * 3.6}deg, transparent ${scoreMoyen * 3.6}deg)`,
                transform: 'scale(1.25)',
                filter: 'blur(8px)',
              }} />
              <svg width="200" height="200" viewBox="0 0 200 200" className="relative z-10">
                {/* Background track */}
                <circle cx="100" cy="100" r={radius} fill="none" stroke={dark ? '#334155' : '#f1f5f9'} strokeWidth="14" />
                {/* Animated progress arc */}
                <circle
                  cx="100" cy="100" r={radius} fill="none"
                  stroke="url(#scoreGradient)" strokeWidth="14" strokeLinecap="round"
                  strokeDasharray={circumference} strokeDashoffset={scoreOffset}
                  transform="rotate(-90 100 100)"
                  style={{ transition: isDynamic ? 'stroke-dashoffset 2s cubic-bezier(0.4, 0, 0.2, 1)' : 'none' }}
                />
                {/* Gradient definition */}
                <defs>
                  <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={scoreColor} />
                    <stop offset="100%" stopColor={scoreMoyen >= 85 ? '#34d399' : scoreMoyen >= 70 ? '#fbbf24' : '#f87171'} />
                  </linearGradient>
                </defs>
                {/* Center text */}
                <text x="100" y="90" textAnchor="middle" fill={dark ? '#f1f5f9' : '#1e293b'} fontSize="40" fontWeight="900">
                  {animScore}%
                </text>
                <text x="100" y="118" textAnchor="middle" fill={scoreColor} fontSize="14" fontWeight="600">
                  {scoreLabel}
                </text>
              </svg>
              {/* Dot indicator at end of arc */}
              {scoreAnimated && (
                <div
                  className="absolute w-4 h-4 rounded-full shadow-lg z-20"
                  style={{
                    backgroundColor: scoreColor,
                    boxShadow: `0 0 12px ${scoreColor}88`,
                    top: `${100 - radius * Math.cos((scoreMoyen / 100) * Math.PI * 2 - Math.PI / 2) - 2}px`,
                    left: `${100 + radius * Math.sin((scoreMoyen / 100) * Math.PI * 2 - Math.PI / 2) - 2}px`,
                    transition: 'all 2s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />
              )}
            </div>
            {/* Bottom stats cards */}
            <div className="mt-8 grid grid-cols-3 gap-4 w-full max-w-lg">
              {[
                { label: 'CA Factur\u00e9', value: animFacture, suffix: ' \u20ac', color: 'blue', icon: FiDollarSign },
                { label: 'CA Encaiss\u00e9', value: animEncaisse, suffix: ' \u20ac', color: 'green', icon: FiCheckCircle },
                { label: 'Patients', value: animPatients, suffix: '', color: 'purple', icon: FiUsers },
              ].map((s, i) => (
                <div key={i} className={`text-center p-4 rounded-xl bg-${s.color}-50/50 border border-${s.color}-100/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-default`}>
                  <s.icon className={`w-4 h-4 text-${s.color}-500 mx-auto mb-1`} />
                  <p className="text-xl font-black text-gray-900 dark:text-white">{fmtNum(s.value)}{s.suffix}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        </>}
      </div>
    </div>
  );
}
