import { useState, useEffect, useRef } from 'react';
import Header from '../../components/Header';
import { getPractitionerStatistics } from '../../services/api';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { useAuth } from '../../context/AuthContext';
import { FiCpu, FiTrendingUp, FiTrendingDown, FiMinus } from 'react-icons/fi';
import { generateSimpleInsight } from '../../utils/aiModels';
import { useDynamic } from '../../context/DynamicContext';
import { useTheme } from '../../context/ThemeContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

const fmt = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v || 0);
const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

export default function MyStats() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isDynamic, dataAccessEnabled } = useDynamic();
  const showAI = dataAccessEnabled;
  const { dark } = useTheme();
  const chartTextColor = dark ? '#94a3b8' : '#64748b';
  const chartGridColor = dark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(226, 232, 240, 0.6)';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getPractitionerStatistics();
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
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const monthlyData = data?.monthlyKPI || [];

  const labels = monthlyData.map(d => {
    const mi = parseInt(d.mois.substring(4, 6)) - 1;
    return `${MONTHS[mi]} ${d.mois.substring(2, 4)}`;
  });

  const caFactureArr = monthlyData.map(d => d.caFacture || 0);
  const caEncaisseArr = monthlyData.map(d => d.caEncaisse || 0);
  const patientsArr = monthlyData.map(d => d.nbPatients || 0);
  const nouveauxArr = monthlyData.map(d => d.nbNouveauxPatients || 0);
  const rentaArr = monthlyData.map(d => d.rentabiliteHoraire || 0);

  // ═══ Insights simplifiés ═══
  const insightCA = generateSimpleInsight(caFactureArr, 'chiffre d\'affaires');
  const insightPatients = generateSimpleInsight(patientsArr, 'nombre de patients');
  const insightRenta = generateSimpleInsight(rentaArr, 'rentabilité horaire');

  // ═══ TOTAUX pour résumé ═══
  const totalCA = caFactureArr.reduce((s, v) => s + v, 0);
  const totalEnc = caEncaisseArr.reduce((s, v) => s + v, 0);
  const totalPatients = patientsArr.reduce((s, v) => s + v, 0);
  const totalNouveaux = nouveauxArr.reduce((s, v) => s + v, 0);
  const avgRenta = rentaArr.length > 0 ? rentaArr.reduce((s, v) => s + v, 0) / rentaArr.length : 0;

  // ═══ GRAPHIQUE CA — Courbe lisse avec remplissage ═══
  const caChartData = {
    labels,
    datasets: [
      {
        label: 'CA Facturé',
        data: caFactureArr,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        fill: true,
        tension: 0.4,
        pointRadius: caFactureArr.length <= 6 ? 6 : 4,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointHoverRadius: 8,
        borderWidth: 3,
      },
      {
        label: 'CA Encaissé',
        data: caEncaisseArr,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        fill: true,
        tension: 0.4,
        pointRadius: caEncaisseArr.length <= 6 ? 5 : 3,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointHoverRadius: 7,
        borderWidth: 2.5,
        borderDash: [6, 3],
      },
    ],
  };

  // ═══ GRAPHIQUE PATIENTS — Barres simples et lisibles ═══
  const patientsChartData = {
    labels,
    datasets: [
      {
        label: 'Patients vus',
        data: patientsArr,
        backgroundColor: dark ? 'rgba(13, 148, 136, 0.7)' : 'rgba(13, 148, 136, 0.75)',
        borderRadius: 8,
        borderSkipped: false,
        barPercentage: 0.6,
        categoryPercentage: 0.7,
      },
      {
        label: 'Nouveaux patients',
        data: nouveauxArr,
        backgroundColor: dark ? 'rgba(245, 158, 11, 0.7)' : 'rgba(245, 158, 11, 0.75)',
        borderRadius: 8,
        borderSkipped: false,
        barPercentage: 0.6,
        categoryPercentage: 0.7,
      },
    ],
  };

  // ═══ GRAPHIQUE RENTABILITÉ — Courbe lisse avec remplissage ═══
  const rentaChartData = {
    labels,
    datasets: [
      {
        label: 'Rentabilité (€/h)',
        data: rentaArr,
        borderColor: '#8b5cf6',
        backgroundColor: (ctx) => {
          const chart = ctx.chart;
          const { ctx: canvasCtx, chartArea } = chart;
          if (!chartArea) return 'rgba(139, 92, 246, 0.15)';
          const gradient = canvasCtx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(139, 92, 246, 0.25)');
          gradient.addColorStop(1, 'rgba(139, 92, 246, 0.02)');
          return gradient;
        },
        fill: true,
        tension: 0.4,
        pointRadius: rentaArr.length <= 6 ? 6 : 4,
        pointBackgroundColor: '#8b5cf6',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointHoverRadius: 8,
        borderWidth: 3,
      },
    ],
  };

  // Options communes pour les courbes
  const lineOptions = (yFormat, yLabel) => ({
    responsive: true,
    maintainAspectRatio: true,
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
        displayColors: true,
        callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${yFormat(ctx.parsed.y)}` },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: chartTextColor, font: { size: 11 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: chartGridColor, drawBorder: false },
        border: { display: false },
        ticks: {
          color: chartTextColor,
          font: { size: 11 },
          callback: (v) => yFormat(v),
          maxTicksLimit: 6,
        },
      },
    },
  });

  const barOptions = {
    responsive: true,
    maintainAspectRatio: true,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'bottom', labels: { color: chartTextColor, usePointStyle: true, pointStyle: 'rectRounded', padding: 16, font: { size: 11 } } },
      tooltip: {
        backgroundColor: dark ? '#1e293b' : '#fff',
        titleColor: dark ? '#fff' : '#1e293b',
        bodyColor: dark ? '#94a3b8' : '#64748b',
        borderColor: dark ? '#334155' : '#e2e8f0',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 10,
      },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: chartTextColor, font: { size: 11 } } },
      y: { beginAtZero: true, grid: { color: chartGridColor, drawBorder: false }, border: { display: false }, ticks: { color: chartTextColor, font: { size: 11 }, maxTicksLimit: 6, precision: 0 } },
    },
  };

  // Helper pour les badges de tendance
  const TrendBadge = ({ insight, color }) => {
    const Icon = insight.trend === 'upward' ? FiTrendingUp : insight.trend === 'downward' ? FiTrendingDown : FiMinus;
    const colors = {
      green: 'text-green-600 bg-green-50 dark:bg-green-900/40 dark:text-green-400',
      teal: 'text-teal-600 bg-teal-50 dark:bg-teal-900/40 dark:text-teal-400',
      violet: 'text-violet-600 bg-violet-50 dark:bg-violet-900/40 dark:text-violet-400',
    };
    return (
      <span className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full ${colors[color]}`}>
        <Icon className="w-3.5 h-3.5" />
        {insight.trendLabel}
      </span>
    );
  };

  return (
    <div>
      <Header title="Mes Statistiques" subtitle={`Cabinet ${user?.cabinetName || user?.name || ''} — Détails mensuels`} />

      <div className="p-8">
        {/* Résumé rapide */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'CA total facturé', value: fmt(totalCA), color: 'text-emerald-600' },
            { label: 'CA total encaissé', value: fmt(totalEnc), color: 'text-blue-600' },
            { label: 'Total patients', value: totalPatients.toLocaleString('fr-FR'), color: 'text-teal-600' },
            { label: 'Nouveaux patients', value: totalNouveaux.toLocaleString('fr-FR'), color: 'text-amber-600' },
            { label: 'Rentabilité moy.', value: `${avgRenta.toFixed(0)}€/h`, color: 'text-violet-600' },
          ].map((s, i) => (
            <div key={i} className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
              <p className={`text-xl font-bold ${s.color} tabular-nums`}>{s.value}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Graphiques */}
        {!showAI && (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-12 text-center mb-8">
            <FiCpu className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-400 dark:text-gray-500 mb-2">Modèles IA désactivés</h3>
            <p className="text-sm text-gray-400 dark:text-gray-500">Les graphiques et analyses IA sont temporairement indisponibles.<br/>Contactez l'administrateur pour réactiver les modèles.</p>
          </div>
        )}
        {showAI && <>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* CA */}
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-gray-700 p-6 transition-colors">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold dark:text-white">Chiffre d'Affaires</h3>
              <TrendBadge insight={insightCA} color="green" />
            </div>
            <div className="h-[280px]">
              <Line data={caChartData} options={{ ...lineOptions(v => `${(v/1000).toFixed(v >= 1000 ? 0 : 1)}k€`), maintainAspectRatio: false }} />
            </div>
            <div className="mt-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl p-3">
              {insightCA.parts.map((p, i) => <p key={i} className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">{p}</p>)}
            </div>
          </div>

          {/* Patients */}
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-gray-700 p-6 transition-colors">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold dark:text-white">Patients & Nouveaux Patients</h3>
              <TrendBadge insight={insightPatients} color="teal" />
            </div>
            <div className="h-[280px]">
              <Bar data={patientsChartData} options={{ ...barOptions, maintainAspectRatio: false }} />
            </div>
            <div className="mt-4 bg-gradient-to-r from-teal-50 to-amber-50 dark:from-teal-900/20 dark:to-amber-900/20 rounded-xl p-3">
              {insightPatients.parts.map((p, i) => <p key={i} className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">{p}</p>)}
            </div>
          </div>
        </div>

        {/* Rentabilité — pleine largeur */}
        <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-8 transition-colors">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold dark:text-white">Rentabilité Horaire</h3>
            <TrendBadge insight={insightRenta} color="violet" />
          </div>
          <div className="h-[260px]">
            <Line data={rentaChartData} options={{ ...lineOptions(v => `${v.toFixed(0)}€/h`), maintainAspectRatio: false }} />
          </div>
          <div className="mt-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl p-3">
            {insightRenta.parts.map((p, i) => <p key={i} className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">{p}</p>)}
          </div>
        </div>
        </>}

        {/* Tableau détaillé */}
        <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold dark:text-white">Détails Mensuels</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Mois</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">CA Facturé</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">CA Encaissé</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Patients</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Nvx Patients</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">RDV</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Heures</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">€/h</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {monthlyData.map((d, i) => {
                  const mi = parseInt(d.mois.substring(4, 6)) - 1;
                  return (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{MONTHS[mi]} {d.mois.substring(0, 4)}</td>
                      <td className="px-4 py-3 text-sm text-right dark:text-gray-300">{fmt(d.caFacture)}</td>
                      <td className="px-4 py-3 text-sm text-right dark:text-gray-300">{fmt(d.caEncaisse)}</td>
                      <td className="px-4 py-3 text-sm text-right dark:text-gray-300">{d.nbPatients}</td>
                      <td className="px-4 py-3 text-sm text-right dark:text-gray-300">{d.nbNouveauxPatients}</td>
                      <td className="px-4 py-3 text-sm text-right dark:text-gray-300">{d.nbRdv}</td>
                      <td className="px-4 py-3 text-sm text-right dark:text-gray-300">{(d.heuresTravaillees || 0).toFixed(1)}h</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-primary-700">
                        {d.rentabiliteHoraire > 0 ? `${d.rentabiliteHoraire.toFixed(0)}€/h` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
