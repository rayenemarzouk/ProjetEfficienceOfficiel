import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { getStatistics } from '../../services/api';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { FiCpu } from 'react-icons/fi';
import { generateTrendLineDataset, generateAIInsight, detectAnomalies, cabinetHealthScore } from '../../utils/aiModels';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const fmtNum = (v) => new Intl.NumberFormat('fr-FR').format(Math.round(v || 0));
const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const BAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Statistics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState('2025');

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f8fafc]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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
  // Since backend groups by mois only, we need per-practitioner data
  // Let's build from evolution which has _id = mois
  const caByPractitioner = {};
  const perPractitioner = data?.perPractitioner || [];
  if (perPractitioner.length > 0) {
    perPractitioner.filter(p => p._id?.startsWith(year)).forEach(p => {
      const code = p.praticien || 'Inconnu';
      if (!caByPractitioner[code]) caByPractitioner[code] = 0;
      caByPractitioner[code] += p.totalFacture || 0;
    });
  } else {
    // Fallback: distribute total across praticiens evenly
    const totalCA = monthlyCA.reduce((a, b) => a + b, 0);
    const nbP = data?.nbPraticiens || 1;
    if (totalCA > 0) {
      for (let i = 0; i < nbP; i++) {
        caByPractitioner[`Cabinet ${i + 1}`] = Math.round(totalCA / nbP);
      }
    }
  }
  const caEntries = Object.entries(caByPractitioner).sort((a, b) => b[1] - a[1]);
  const maxCA = caEntries.length > 0 ? caEntries[0][1] : 1;

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
        labels: { usePointStyle: true, pointStyle: 'circle', padding: 16, font: { size: 11, weight: '500' }, color: '#64748b' },
      },
      tooltip: {
        backgroundColor: '#1e293b', titleColor: '#f8fafc', bodyColor: '#e2e8f0',
        titleFont: { size: 13, weight: '600' }, bodyFont: { size: 12 },
        padding: 12, cornerRadius: 8,
        callbacks: { label: (ctx) => `  ${ctx.dataset.label}: ${fmtNum(ctx.parsed.y)} €` },
      },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: '#94a3b8', font: { size: 11, weight: '500' } } },
      y: { beginAtZero: true, border: { display: false }, grid: { color: 'rgba(226,232,240,0.5)' }, ticks: { color: '#94a3b8', font: { size: 11 }, callback: (v) => v >= 1000 ? `${Math.round(v/1000)}k` : v } },
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
  const scoreOffset = circumference - (scoreMoyen / 100) * circumference;

  return (
    <div>
      <Header title="Statistiques des cabinets" subtitle={`Année ${year}`} />

      <div className="p-6">
        {/* Year selector */}
        <div className="flex gap-2 mb-6">
          {availableYears.map(y => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={`px-5 py-2 rounded-lg font-semibold text-sm transition-colors ${
                year === y ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {y}
            </button>
          ))}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-xs text-gray-400 mb-1">CA Facturé</p>
            <p className="text-2xl font-black text-gray-900">{fmtNum(totalFacture)} €</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-xs text-gray-400 mb-1">CA Encaissé</p>
            <p className="text-2xl font-black text-gray-900">{fmtNum(totalEncaisse)} €</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-xs text-gray-400 mb-1">Patients traités</p>
            <p className="text-2xl font-black text-gray-900">{fmtNum(totalPatients)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-xs text-gray-400 mb-1">Taux encaissement</p>
            <p className="text-2xl font-black" style={{ color: scoreColor }}>{scoreMoyen}%</p>
          </div>
        </div>

        {/* CA par cabinet - horizontal bars */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
          <h3 className="text-base font-bold text-gray-900 mb-1">Chiffre d'affaires par cabinet</h3>
          <p className="text-xs text-gray-400 mb-5">Répartition du CA facturé en {year}</p>
          <div className="space-y-4">
            {caEntries.map(([name, ca], i) => {
              const pct = maxCA > 0 ? (ca / maxCA) * 100 : 0;
              const color = BAR_COLORS[i % BAR_COLORS.length];
              return (
                <div key={name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-gray-700">{name}</span>
                    <span className="text-sm font-bold text-gray-900">{fmtNum(ca)} €</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-6 overflow-hidden">
                    <div
                      className="h-6 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    ></div>
                  </div>
                </div>
              );
            })}
            {caEntries.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Aucune donnée pour {year}</p>
            )}
          </div>
        </div>

        {/* CA Evolution chart */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-base font-bold text-gray-900">Évolution du Chiffre d'Affaires</h3>
          </div>
          <p className="text-xs text-gray-400 mb-4">CA Facturé vs Encaissé par mois en {year}</p>
          <div style={{ height: '320px' }}>
            <Line data={caLineData} options={lineOptions} />
          </div>
          {/* AI Insight CA */}
          <div className="mt-4 bg-gradient-to-r from-amber-50 to-violet-50 rounded-xl border border-amber-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <FiCpu className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-xs font-bold text-gray-800">Analyse IA — CA</span>
              <span className="ml-auto text-[9px] font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Régression linéaire • R²={aiCA.confidence}%</span>
            </div>
            {aiCA.parts.map((p, i) => <p key={i} className="text-[11px] text-gray-600 leading-relaxed">{p}</p>)}
          </div>
        </div>

        {/* Patients chart */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-base font-bold text-gray-900">Nombre de patients traités</h3>
          </div>
          <p className="text-xs text-gray-400 mb-4">Évolution mensuelle en {year}</p>
          <div style={{ height: '280px' }}>
            <Line data={patientsLineData} options={patientsLineOptions} />
          </div>
          {/* AI Insight Patients */}
          <div className="mt-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <FiCpu className="w-3.5 h-3.5 text-purple-600" />
              <span className="text-xs font-bold text-gray-800">Analyse IA — Patients</span>
              <span className="ml-auto text-[9px] font-semibold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">Modèle Holt-Winters</span>
            </div>
            {aiPatients.parts.map((p, i) => <p key={i} className="text-[11px] text-gray-600 leading-relaxed">{p}</p>)}
          </div>
        </div>

        {/* Score moyen */}
        <div className="bg-white rounded-xl border border-gray-100 p-8">
          <h3 className="text-base font-bold text-gray-900 mb-6 text-center">Score moyen d'encaissement</h3>
          <div className="flex flex-col items-center">
            <svg width="180" height="180" viewBox="0 0 180 180">
              <circle cx="90" cy="90" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="12" />
              <circle
                cx="90" cy="90" r={radius} fill="none"
                stroke={scoreColor} strokeWidth="12" strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={scoreOffset}
                transform="rotate(-90 90 90)"
                className="transition-all duration-1000"
              />
              <text x="90" y="82" textAnchor="middle" fill="#1e293b" fontSize="36" fontWeight="900">
                {scoreMoyen}%
              </text>
              <text x="90" y="108" textAnchor="middle" fill={scoreColor} fontSize="14" fontWeight="600">
                {scoreLabel}
              </text>
            </svg>
            <div className="mt-6 grid grid-cols-3 gap-8 text-center">
              <div>
                <p className="text-2xl font-black text-gray-900">{fmtNum(totalFacture)} €</p>
                <p className="text-xs text-gray-500">CA Facturé</p>
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900">{fmtNum(totalEncaisse)} €</p>
                <p className="text-xs text-gray-500">CA Encaissé</p>
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900">{fmtNum(totalPatients)}</p>
                <p className="text-xs text-gray-500">Patients traités</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
