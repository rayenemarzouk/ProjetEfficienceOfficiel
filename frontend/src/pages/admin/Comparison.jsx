import { useState, useEffect, useRef, useCallback } from 'react';
import Header from '../../components/Header';
import { getAdminDashboard } from '../../services/api';
import { FiArrowLeft, FiAlertTriangle, FiUsers, FiTrendingDown, FiCalendar, FiCpu } from 'react-icons/fi';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { cabinetHealthScore, analyzeTrend, generateAIInsight } from '../../utils/aiModels';
import { streamingBarPlugin, startChartAnimation } from '../../utils/chartPlugins';
import { useDynamic } from '../../context/DynamicContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const DOC_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Comparison() {
  const { dark } = useTheme();
  const { user } = useAuth();
  const isRayan = user?.email === 'maarzoukrayan3@gmail.com';
  const cardCls = isRayan ? 'bg-white border border-gray-200 shadow-sm' : 'bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-gray-700';
  const chartTextColor = (dark && !isRayan) ? '#94a3b8' : '#64748b';
  const chartGridColor = (dark && !isRayan) ? 'rgba(148, 163, 184, 0.1)' : 'rgba(226, 232, 240, 0.5)';
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const barChartRef = useRef(null);
  const doughnutChartRef = useRef(null);
  const { isDynamic: _isDynamic, dataAccessEnabled } = useDynamic();
  const isDynamic = isRayan || _isDynamic; // Rayan toujours dynamique
  const showAI = dataAccessEnabled || isRayan;

  // Animation loop pour rafraîchir les charts (effet streaming)
  useEffect(() => {
    if (!isDynamic) return;
    const stopBar = startChartAnimation(barChartRef);
    return () => { stopBar(); };
  }, [loading, isDynamic]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const res = await getAdminDashboard();
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Build doctors dynamically from actual practitioners + their RDV data (REAL absences)
  const practitioners = data?.practitioners || [];
  const rdvByP = data?.rdvByPractitioner || [];
  const caByP = data?.caByPractitioner || [];
  const rdvMensuel = data?.rdvMensuel || [];

  const doctors = practitioners.map((p, idx) => {
    const rdvData = rdvByP.find(r => r._id === p.code);
    const caData = caByP.find(c => c._id === p.code);
    const totalRdv = rdvData?.totalRdv || 0;
    const totalPatients = rdvData?.totalPatients || 0;
    const absents = Math.max(0, totalRdv - totalPatients); // REAL absences
    const presents = totalPatients;
    const totalCA = caData?.totalFacture || 0;
    const totalEncaisse = caData?.totalEncaisse || 0;

    // Compute real tendance from last 2 months of RDV data
    const moisForP = rdvMensuel
      .filter(r => r._id?.praticien === p.code)
      .sort((a, b) => (a._id?.mois || '').localeCompare(b._id?.mois || ''));
    let tendance = 'Stable';
    if (moisForP.length >= 2) {
      const lastAbsences = (moisForP[moisForP.length - 1]?.totalRdv || 0) - (moisForP[moisForP.length - 1]?.totalPatients || 0);
      const prevAbsences = (moisForP[moisForP.length - 2]?.totalRdv || 0) - (moisForP[moisForP.length - 2]?.totalPatients || 0);
      if (prevAbsences > 0) {
        const diff = ((lastAbsences - prevAbsences) / prevAbsences) * 100;
        tendance = diff > 10 ? 'Hausse' : diff < -10 ? 'Baisse' : 'Stable';
      } else if (lastAbsences > 0) {
        tendance = 'Hausse';
      }
    }

    // IA: Health score multi-KPI
    const tauxEnc = totalCA > 0 ? Math.round((totalEncaisse / totalCA) * 100) : 0;
    const tauxAbs = totalRdv > 0 ? (absents / totalRdv) * 100 : 0;
    const prodHoraire = totalCA; // proxy
    const health = cabinetHealthScore({
      tauxEncaissement: tauxEnc,
      evolutionCA: tendance === 'Hausse' ? -5 : tendance === 'Baisse' ? 5 : 0,
      tauxAbsence: tauxAbs,
      productionHoraire: prodHoraire,
      tauxNouveauxPatients: 10,
    });

    // IA: Absence monthly trend
    const monthlyAbsences = moisForP.map(m => Math.max(0, (m.totalRdv || 0) - (m.totalPatients || 0)));
    const absenceTrend = analyzeTrend(monthlyAbsences);

    return {
      name: p.name,
      code: p.code,
      totalRdv,
      presents,
      absents,
      tendance,
      color: DOC_COLORS[idx % DOC_COLORS.length],
      totalCA,
      totalEncaisse,
      healthScore: health.score,
      healthLabel: health.label,
      absenceTrend,
      monthlyAbsences,
    };
  });

  const totalAbsences = doctors.reduce((s, d) => s + d.absents, 0);
  const totalPresences = doctors.reduce((s, d) => s + d.presents, 0);
  const totalRdv = doctors.reduce((s, d) => s + d.totalRdv, 0);
  const tauxAbsence = totalRdv > 0 ? ((totalAbsences / totalRdv) * 100).toFixed(1) : 0;
  const cabinetsEnAlerte = doctors.filter(d => d.totalRdv > 0 && (d.absents / d.totalRdv) > 0.08).length;

  // Presences vs Absences bar chart
  const barData = {
    labels: doctors.map(d => `Dr. ${d.name}`),
    datasets: [
      {
        label: 'Présents',
        data: doctors.map(d => d.presents),
        backgroundColor: 'rgba(37, 99, 235, 0.85)',
        hoverBackgroundColor: '#2563eb',
        borderRadius: 6,
        borderSkipped: false,
        barPercentage: 0.5,
        categoryPercentage: 0.7,
      },
      {
        label: 'Absents',
        data: doctors.map(d => d.absents),
        backgroundColor: 'rgba(239, 68, 68, 0.75)',
        hoverBackgroundColor: '#ef4444',
        borderRadius: 6,
        borderSkipped: false,
        barPercentage: 0.5,
        categoryPercentage: 0.7,
      },
    ],
  };

  const barOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 16,
          font: { size: 11, weight: '500' },
          color: chartTextColor,
        },
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        titleFont: { size: 13, weight: '600' },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => {
            const total = doctors[ctx.dataIndex]?.totalRdv || 0;
            const pct = total > 0 ? ((ctx.parsed.x / total) * 100).toFixed(1) : '0';
            return `  ${ctx.dataset.label}: ${ctx.parsed.x} (${pct}%)`;
          },
        },
      },
    },
    scales: {
      x: {
        stacked: false,
        beginAtZero: true,
        border: { display: false },
        grid: { color: chartGridColor, drawBorder: false },
        ticks: { color: chartTextColor, font: { size: 11 }, padding: 4 },
      },
      y: {
        stacked: false,
        border: { display: false },
        grid: { display: false },
        ticks: { color: chartTextColor, font: { size: 12, weight: '600' }, padding: 8 },
      },
    },
  };

  // CA comparison doughnut per practitioner
  const caDoughnut = {
    labels: doctors.map(d => d.code),
    datasets: [{
      data: doctors.map(d => d.totalCA),
      backgroundColor: doctors.map(d => d.color),
      borderWidth: 0,
    }],
  };
  const totalCAAll = doctors.reduce((s, d) => s + d.totalCA, 0);

  return (
    <div>
      <Header title="Statistiques et comparaison des cabinets" subtitle="Suivi détaillé des absences par cabinet" />
      
      <div className="p-6">
        {/* Alert badge */}
        <div className="flex justify-between items-center mb-6">
          <button className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            <FiArrowLeft className="w-4 h-4" />
          </button>
          {cabinetsEnAlerte > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-full">
              <FiAlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-sm font-semibold text-red-600">{cabinetsEnAlerte} cabinet(s) en alerte</span>
            </div>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className={`${cardCls} rounded-2xl p-5 transition-colors`}>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/30"><FiUsers className="w-5 h-5 text-red-500" /></div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Absences</p>
                <p className="text-3xl font-black text-gray-900 dark:text-white">{totalAbsences}</p>
              </div>
            </div>
          </div>
          <div className={`${cardCls} rounded-2xl p-5 transition-colors`}>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/30"><FiUsers className="w-5 h-5 text-green-500" /></div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Présences</p>
                <p className="text-3xl font-black text-gray-900 dark:text-white">{totalPresences}</p>
              </div>
            </div>
          </div>
          <div className={`${cardCls} rounded-2xl p-5 transition-colors`}>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/30"><FiTrendingDown className="w-5 h-5 text-amber-500" /></div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Taux d'absence global</p>
                <p className="text-3xl font-black text-gray-900 dark:text-white">{tauxAbsence}%</p>
              </div>
            </div>
          </div>
          <div className={`${cardCls} rounded-2xl p-5 transition-colors`}>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/30"><FiCalendar className="w-5 h-5 text-blue-500" /></div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total RDV</p>
                <p className="text-3xl font-black text-gray-900 dark:text-white">{totalRdv}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Detail Table */}
        <div className={`${cardCls} rounded-2xl overflow-hidden mb-6 transition-colors`}>
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Détail par Cabinet</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Cabinet</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Total RDV</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Présents</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Absents</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Taux d'absence</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Tendance</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {doctors.map((doc, i) => {
                  const taux = doc.totalRdv > 0 ? ((doc.absents / doc.totalRdv) * 100).toFixed(1) : '0.0';
                  const isOk = true;
                  return (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: doc.color }}>
                            {doc.code}
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{doc.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-center text-sm text-gray-700 dark:text-gray-300">{doc.totalRdv}</td>
                      <td className="px-6 py-3 text-center text-sm font-semibold text-green-600">{doc.presents}</td>
                      <td className="px-6 py-3 text-center text-sm font-semibold text-red-500">{doc.absents}</td>
                      <td className="px-6 py-3 text-center text-sm text-gray-700 dark:text-gray-300">{taux}%</td>
                      <td className="px-6 py-3 text-center">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          doc.tendance === 'Hausse' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                          doc.tendance === 'Baisse' ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                          'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}>
                          {doc.tendance === 'Hausse' ? '↑ Hausse' : doc.tendance === 'Baisse' ? '↓ Baisse' : '→ Stable'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                          isOk ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                        }`}>
                          {isOk ? '✅ OK' : '⚠️ À surveiller'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Charts Row: Presences vs Absences + Raisons Global */}
        {!showAI && (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-12 text-center mb-6">
            <FiCpu className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-400 dark:text-gray-500 mb-2">Modèles IA désactivés</h3>
            <p className="text-sm text-gray-400 dark:text-gray-500">Les graphiques et analyses IA sont temporairement indisponibles.<br/>Contactez l'administrateur pour réactiver les modèles.</p>
          </div>
        )}
        {showAI && <>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          <div className={`${cardCls} rounded-2xl p-6 transition-colors`}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Comparaison Présences et Absences des Patients</h3>
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                <span className="relative flex h-2 w-2"><span className={`${isDynamic ? 'animate-ping' : ''} absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75`}></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span>
                Temps réel
              </span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Répartition par cabinet dentaire</p>
            <div style={{ height: `${Math.max(200, doctors.length * 80)}px` }}>
              <div className={isRayan ? 'bg-white rounded-xl p-3' : ''}>
                <Bar ref={barChartRef} data={barData} options={barOptions} plugins={isDynamic ? [streamingBarPlugin] : []} />
              </div>
            </div>
            <div className="flex gap-4 mt-3 pt-3 border-t border-gray-50 dark:border-gray-700">
              {doctors.map((doc, i) => {
                const taux = doc.totalRdv > 0 ? ((doc.absents / doc.totalRdv) * 100).toFixed(1) : '0';
                return (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: doc.color }}></span>
                    <span>{doc.code}: <span className="font-semibold text-gray-700 dark:text-gray-300">{taux}%</span> absence</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className={`${cardCls} rounded-2xl p-6 transition-colors`}>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Répartition du CA par Cabinet</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Part de chaque cabinet</p>
            <div className="max-w-xs mx-auto">
              <div className={isRayan ? 'bg-white rounded-xl p-3' : ''}>
                <Doughnut ref={doughnutChartRef} data={caDoughnut} options={{
                responsive: true,
                cutout: '55%',
                plugins: {
                  legend: { display: false },
                  tooltip: { callbacks: { label: (c) => `${c.label}: ${(c.raw || 0).toLocaleString('fr-FR')} €` } },
                },
              }} />
              </div>
            </div>
            <div className="flex flex-wrap gap-3 justify-center mt-4">
              {doctors.map((doc, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: doc.color }}></span>
                  <span className="text-gray-600 dark:text-gray-400">{doc.code} {totalCAAll > 0 ? Math.round((doc.totalCA / totalCAAll) * 100) : 0}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Performance par Cabinet: CA Facturé vs Encaissé + AI Health Score */}
        <div className={`${cardCls} rounded-2xl p-6 mb-6 transition-colors`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="text-lg">📊</span>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Performance par Cabinet</h3>
            </div>
            <span className="flex items-center gap-1 text-[9px] font-bold text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full">
              <FiCpu className="w-3 h-3" /> Modèle IA — Score Santé Multi-KPI
            </span>
          </div>
          <div className={`grid gap-6 ${doctors.length <= 2 ? 'grid-cols-1 md:grid-cols-2 max-w-2xl mx-auto' : 'grid-cols-1 md:grid-cols-3'}`}>
            {doctors.map((doc, i) => {
              const tauxEnc = doc.totalCA > 0 ? Math.round((doc.totalEncaisse / doc.totalCA) * 100) : 0;
              return (
                <div key={i} className="border border-gray-100 dark:border-gray-700 rounded-xl p-4 text-center">
                  <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center text-white text-xs font-bold mb-2" style={{ backgroundColor: doc.color }}>
                    {doc.code}
                  </div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">{doc.name}</p>
                  <div className="space-y-2 text-left">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">CA Facturé</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{doc.totalCA.toLocaleString('fr-FR')} €</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">Encaissé</span>
                      <span className="font-semibold text-green-600">{doc.totalEncaisse.toLocaleString('fr-FR')} €</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">Taux encaissement</span>
                      <span className={`font-bold ${tauxEnc >= 85 ? 'text-green-600' : tauxEnc >= 70 ? 'text-amber-500' : 'text-red-500'}`}>{tauxEnc}%</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                      <div className="h-1.5 rounded-full" style={{ width: `${Math.min(tauxEnc, 100)}%`, backgroundColor: doc.color }}></div>
                    </div>
                    {/* IA Health Score */}
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1"><FiCpu className="w-3 h-3 text-violet-500" /> Score Santé IA</span>
                        <span className={`font-black text-lg ${
                          doc.healthScore >= 80 ? 'text-green-500' :
                          doc.healthScore >= 60 ? 'text-amber-500' : 'text-red-500'
                        }`}>{doc.healthScore}<span className="text-xs font-normal text-gray-400 dark:text-gray-500">/100</span></span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 mt-1">
                        <div className="h-2 rounded-full transition-all" style={{ 
                          width: `${doc.healthScore}%`, 
                          background: doc.healthScore >= 80 ? 'linear-gradient(90deg, #10b981, #34d399)' : doc.healthScore >= 60 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #ef4444, #f87171)'
                        }}></div>
                      </div>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{doc.healthLabel} • Tendance absences: {doc.absenceTrend?.trend === 'upward' ? '↑ Hausse' : doc.absenceTrend?.trend === 'downward' ? '↓ Baisse' : doc.absenceTrend?.trend === 'stable' ? '→ Stable' : 'Données insuffisantes'}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* IA Insight Panel - Analyse Comparative */}
        <div className="bg-gradient-to-r from-violet-50 via-blue-50 to-amber-50 dark:from-violet-900/30 dark:via-blue-900/30 dark:to-amber-900/30 rounded-2xl border border-violet-100 dark:border-violet-800 p-6 mb-6 transition-colors">
          <div className="flex items-center gap-2 mb-4">
            <FiCpu className="w-4 h-4 text-violet-600" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Analyse IA — Comparaison des Cabinets</h3>
            <span className="ml-auto text-[9px] font-semibold text-violet-600 bg-white/60 dark:bg-white/10 px-2.5 py-1 rounded-full">Régression + Score Multi-KPI</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {doctors.map((doc, i) => {
              const absInsight = generateAIInsight(doc.monthlyAbsences, `absences de ${doc.name}`);
              return (
                <div key={i} className="bg-white/60 dark:bg-white/10 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold" style={{ backgroundColor: doc.color }}>{doc.code}</div>
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{doc.name}</span>
                    <span className={`ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      doc.healthScore >= 80 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                      doc.healthScore >= 60 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}>{doc.healthScore}/100</span>
                  </div>
                  {absInsight.parts.map((p, j) => <p key={j} className="text-[10px] text-gray-600 dark:text-gray-400 leading-relaxed">{p}</p>)}
                </div>
              );
            })}
          </div>
        </div>
        </>}
      </div>
    </div>
  );
}
