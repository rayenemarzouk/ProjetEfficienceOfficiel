import { useState, useEffect, useRef } from 'react';
import Header from '../../components/Header';
import { getPractitionerDashboard } from '../../services/api';
import { Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { FiDollarSign, FiUsers, FiClock, FiTrendingUp, FiCalendar, FiCpu, FiUserPlus, FiTrendingDown, FiMinus } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { linearRegression, generateSimpleInsight, forecast as aiForecast, analyzeTrend, cabinetHealthScore, getSimpleHealthLabel } from '../../utils/aiModels';
import { streamingDoughnutPlugin, startChartAnimation } from '../../utils/chartPlugins';
import { useCountUp } from '../../utils/useCountUp';
import { useDynamic } from '../../context/DynamicContext';
import { useTheme } from '../../context/ThemeContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

const fmt = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v || 0);

export default function PractitionerDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const barChartRef = useRef(null);
  const doughnutChartRef = useRef(null);
  const { isDynamic } = useDynamic();
  const { dark } = useTheme();
  const chartTextColor = dark ? '#94a3b8' : '#64748b';
  const chartGridColor = dark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(226, 232, 240, 0.6)';

  // Animation loop pour les effets streaming (doughnut only)
  useEffect(() => {
    if (!isDynamic) return;
    const stopDoughnut = startChartAnimation(doughnutChartRef);
    return () => { stopDoughnut(); };
  }, [loading, isDynamic]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getPractitionerDashboard();
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const realisations = data?.realisations || [];
  const rdvs = data?.rendezVous || [];
  const joursOuverts = data?.joursOuverts || [];
  const encours = data?.encours || {};
  const patientsStats = data?.patientsStats || { totalInscrits: 0, actifs: 0, nouveaux: 0 };

  // KPIs
  const totalCA = realisations.reduce((s, r) => s + (r.montantFacture || 0), 0);
  const totalEncaisse = realisations.reduce((s, r) => s + (r.montantEncaisse || 0), 0);
  const totalPatients = realisations.reduce((s, r) => s + (r.nbPatients || 0), 0);
  const totalRdv = rdvs.reduce((s, r) => s + (r.nbRdv || 0), 0);
  const totalNouveaux = rdvs.reduce((s, r) => s + (r.nbNouveauxPatients || 0), 0);
  const totalHeures = joursOuverts.reduce((s, r) => s + (r.nbHeures || 0), 0) / 60;
  const rentaHoraire = totalHeures > 0 ? totalCA / totalHeures : 0;

  // Monthly chart data
  const monthMap = {};
  realisations.forEach(r => {
    const key = r.mois;
    if (!monthMap[key]) monthMap[key] = { ca: 0, enc: 0 };
    monthMap[key].ca += r.montantFacture || 0;
    monthMap[key].enc += r.montantEncaisse || 0;
  });
  const sortedMonths = Object.keys(monthMap).sort();
  const monthLabels = sortedMonths.map(m => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    return `${months[parseInt(m.substring(4, 6)) - 1]} ${m.substring(2, 4)}`;
  });

  const caValues = sortedMonths.map(m => monthMap[m].ca);
  const encValues = sortedMonths.map(m => monthMap[m].enc);

  // ═══ MODÈLES IA ═══
  const regCA = linearRegression(caValues);
  const trendLine = caValues.map((_, i) => regCA.slope * i + regCA.intercept);
  const caInsight = generateSimpleInsight(caValues, 'chiffre d\'affaires');
  const caTrend = analyzeTrend(caValues);
  const caForecastVals = aiForecast(caValues, 2);
  const healthScore = cabinetHealthScore({
    tauxEncaissement: totalCA > 0 ? (totalEncaisse / totalCA) * 100 : 0,
    evolutionCA: regCA.slope,
    tauxAbsence: totalRdv > 0 ? Math.max(0, ((totalRdv - totalPatients) / totalRdv) * 100) : 0,
    productionHoraire: rentaHoraire,
    tauxNouveauxPatients: totalPatients > 0 ? (totalNouveaux / totalPatients) * 100 : 0,
  });

  const barData = {
    labels: monthLabels,
    datasets: [
      {
        label: 'CA Facturé',
        data: caValues,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        fill: true,
        tension: 0.4,
        pointRadius: caValues.length <= 6 ? 6 : 4,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointHoverRadius: 8,
        borderWidth: 3,
      },
      {
        label: 'CA Encaissé',
        data: encValues,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        fill: true,
        tension: 0.4,
        pointRadius: encValues.length <= 6 ? 5 : 3,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointHoverRadius: 7,
        borderWidth: 2.5,
        borderDash: [6, 3],
      },
    ],
  };

  const doughnutData = {
    labels: ['Encaissé', 'Non encaissé'],
    datasets: [{
      data: [totalEncaisse, Math.max(0, totalCA - totalEncaisse)],
      backgroundColor: ['#0d9488', dark ? '#334155' : '#e5e7eb'],
      borderWidth: 0,
    }],
  };

  const kpis = [
    { icon: FiDollarSign, label: 'CA Facturé', value: totalCA, format: 'money', color: 'primary' },
    { icon: FiUsers, label: 'Patients (analyse)', value: totalPatients, format: 'number', color: 'blue' },
    { icon: FiUserPlus, label: 'Fichier Patients', value: patientsStats.totalInscrits, format: 'number', color: 'teal' },
    { icon: FiCalendar, label: 'Rendez-vous', value: totalRdv, format: 'number', color: 'amber' },
    { icon: FiClock, label: 'Heures Travaillées', value: Math.round(totalHeures), format: 'hours', color: 'purple' },
    { icon: FiTrendingUp, label: 'Renta. Horaire', value: Math.round(rentaHoraire), format: 'eurh', color: 'green' },
    { icon: FiDollarSign, label: 'Encaissé', value: totalEncaisse, format: 'money', color: 'primary' },
    { icon: FiUserPlus, label: 'Nouveaux Patients', value: totalNouveaux, format: 'number', color: 'blue' },
  ];

  // ═══ ANIMATED COUNTERS ═══
  const dyn = isDynamic && !loading;
  const animValues = [
    useCountUp(Math.round(totalCA), 2200, dyn),
    useCountUp(totalPatients, 1800, dyn),
    useCountUp(patientsStats.totalInscrits, 1600, dyn),
    useCountUp(totalRdv, 1600, dyn),
    useCountUp(Math.round(totalHeures), 1600, dyn),
    useCountUp(Math.round(rentaHoraire), 1400, dyn),
    useCountUp(Math.round(totalEncaisse), 2000, dyn),
    useCountUp(totalNouveaux, 1400, dyn),
  ];
  const animEncaissePct = useCountUp(totalCA > 0 ? Math.round((totalEncaisse / totalCA) * 100) : 0, 1800, dyn);
  const animHealthScore = useCountUp(healthScore.score, 1500, dyn);
  const animEncoursDuree = useCountUp(Math.round((encours?.dureeTotaleARealiser || 0) / 60), 1400, dyn);
  const animEncoursMontant = useCountUp(Math.round(encours?.montantTotalAFacturer || 0), 1600, dyn);
  const animEncoursPatients = useCountUp(encours?.patientsEnCours || 0, 1200, dyn);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const colorMap = {
    primary: dark ? 'bg-primary-900/40 text-primary-400' : 'bg-primary-50 text-primary-600',
    blue: dark ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-blue-600',
    amber: dark ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-50 text-amber-600',
    purple: dark ? 'bg-purple-900/40 text-purple-400' : 'bg-purple-50 text-purple-600',
    green: dark ? 'bg-green-900/40 text-green-400' : 'bg-green-50 text-green-600',
    teal: dark ? 'bg-teal-900/40 text-teal-400' : 'bg-teal-50 text-teal-600',
  };

  return (
    <div>
      <Header
        title={`Bonjour, ${user?.name || user?.cabinetName || ''}`}
        subtitle={`Cabinet ${user?.cabinetName || user?.name || ''} — Tableau de bord`}
      />

      <div className="p-8">
        {/* KPI Cards — Animated */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {kpis.map((kpi, i) => {
            const animVal = animValues[i];
            let displayVal;
            if (kpi.format === 'money') displayVal = fmt(animVal);
            else if (kpi.format === 'hours') displayVal = `${animVal}h`;
            else if (kpi.format === 'eurh') displayVal = `${animVal}€/h`;
            else displayVal = animVal.toLocaleString('fr-FR');
            return (
              <div key={i} className="group bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg hover:shadow-gray-100/50 dark:hover:shadow-gray-900/30 transition-all duration-500 hover:-translate-y-1 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-50/50 dark:from-gray-700/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10 flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${colorMap[kpi.color]} group-hover:scale-110 transition-transform`}>
                    <kpi.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{displayVal}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{kpi.label}</p>
                  </div>
                </div>
                <div className="relative z-10 mt-3 w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                  <div className={`h-1.5 rounded-full bg-gradient-to-r from-primary-400 to-primary-600 ${isDynamic ? 'transition-all duration-[2000ms] ease-out' : ''}`} style={{ width: (!isDynamic || !loading) ? '100%' : '0%' }}></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-gray-700 p-6 transition-colors">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold dark:text-white">Chiffre d'Affaires</h3>
              <span className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full ${
                caInsight.trend === 'upward' ? 'text-green-600 bg-green-50 dark:bg-green-900/40 dark:text-green-400' :
                caInsight.trend === 'downward' ? 'text-red-600 bg-red-50 dark:bg-red-900/40 dark:text-red-400' :
                'text-gray-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-400'
              }`}>
                {caInsight.trend === 'upward' ? <FiTrendingUp className="w-3.5 h-3.5" /> : caInsight.trend === 'downward' ? <FiTrendingDown className="w-3.5 h-3.5" /> : <FiMinus className="w-3.5 h-3.5" />}
                {caInsight.trendLabel}
              </span>
            </div>
            <div className="h-[280px]">
              <Line data={barData} options={{
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                  legend: { position: 'bottom', labels: { color: chartTextColor, usePointStyle: true, pointStyle: 'circle', padding: 16, font: { size: 11 } } },
                  tooltip: {
                    backgroundColor: dark ? '#1e293b' : '#fff',
                    titleColor: dark ? '#fff' : '#1e293b',
                    bodyColor: dark ? '#94a3b8' : '#64748b',
                    borderColor: dark ? '#334155' : '#e2e8f0',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 10,
                    callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${fmt(ctx.parsed.y)}` },
                  },
                },
                scales: {
                  x: { grid: { display: false }, border: { display: false }, ticks: { color: chartTextColor, font: { size: 11 } } },
                  y: { beginAtZero: true, grid: { color: chartGridColor, drawBorder: false }, border: { display: false }, ticks: { color: chartTextColor, font: { size: 11 }, callback: v => `${(v/1000).toFixed(v >= 1000 ? 0 : 1)}k€`, maxTicksLimit: 6 } },
                },
              }} />
            </div>
            {/* AI Insight */}
            <div className="mt-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl p-3">
              {caInsight.parts.map((p, i) => <p key={i} className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">{p}</p>)}
              <div className="flex gap-3 mt-2">
                <span className="text-[10px] bg-white/60 dark:bg-white/10 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">Prévision M+1: {fmt(caForecastVals[0])}</span>
                <span className="text-[10px] bg-white/60 dark:bg-white/10 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">Prévision M+2: {fmt(caForecastVals[1])}</span>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-gray-700 p-6 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold dark:text-white">Taux d'Encaissement</h3>
            </div>
            <Doughnut ref={doughnutChartRef} data={doughnutData} plugins={isDynamic ? [streamingDoughnutPlugin] : []} options={{
              responsive: true,
              cutout: '70%',
              plugins: { legend: { position: 'bottom', labels: { color: chartTextColor } } },
            }} />
            <p className="text-center mt-4 text-3xl font-bold text-primary-600 tabular-nums">
              {animEncaissePct}%
            </p>
            {/* Health Score — Animated */}
            <div className="mt-3 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/30 rounded-xl border border-violet-100 dark:border-violet-800 p-3 text-center transition-colors">
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">Santé globale du cabinet</p>
              <p className={`text-2xl font-black tabular-nums ${healthScore.score >= 80 ? 'text-green-500' : healthScore.score >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                {animHealthScore}<span className="text-xs font-normal text-gray-400 dark:text-gray-500">/100</span>
              </p>
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 mt-2 overflow-hidden">
                <div className={`h-2 rounded-full ${isDynamic ? 'transition-all duration-[1800ms] ease-out' : ''} relative overflow-hidden`} style={{ 
                  width: (!isDynamic || !loading) ? `${healthScore.score}%` : '0%', 
                  background: healthScore.score >= 80 ? 'linear-gradient(90deg, #10b981, #34d399)' : healthScore.score >= 60 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #ef4444, #f87171)'
                }}>
                  {isDynamic && <div className="absolute inset-0 shimmer-bar"></div>}
                </div>
              </div>
              <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-1">{getSimpleHealthLabel(healthScore.score).emoji} {getSimpleHealthLabel(healthScore.score).label}</p>
              <p className="text-[8px] text-gray-400 dark:text-gray-500 mt-0.5">{getSimpleHealthLabel(healthScore.score).advice}</p>
            </div>
          </div>
        </div>

        {/* Encours — Animated */}
        {encours && Object.keys(encours).length > 0 && (
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-gray-700 p-6 transition-colors">
            <h3 className="text-lg font-semibold dark:text-white mb-4">En-cours</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="group p-4 bg-primary-50 dark:bg-primary-900/30 rounded-xl text-center hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                <p className="text-sm text-primary-700 dark:text-primary-400">Durée à réaliser</p>
                <p className="text-2xl font-bold text-primary-900 dark:text-white tabular-nums">{animEncoursDuree}h</p>
              </div>
              <div className="group p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-center hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                <p className="text-sm text-blue-700 dark:text-blue-400">Montant à facturer</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-white tabular-nums">{fmt(animEncoursMontant)}</p>
              </div>
              <div className="group p-4 bg-amber-50 dark:bg-amber-900/30 rounded-xl text-center hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                <p className="text-sm text-amber-700 dark:text-amber-400">Patients en cours</p>
                <p className="text-2xl font-bold text-amber-900 dark:text-white tabular-nums">{animEncoursPatients}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
