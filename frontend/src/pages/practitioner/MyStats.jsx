import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { getPractitionerStatistics } from '../../services/api';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';
import { useAuth } from '../../context/AuthContext';
import { FiCpu } from 'react-icons/fi';
import { linearRegression, generateAIInsight, detectAnomalies, analyzeTrend, forecast as aiForecast } from '../../utils/aiModels';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

const fmt = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v || 0);
const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

export default function MyStats() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const caFactureArr = monthlyData.map(d => d.caFacture);
  const caEncaisseArr = monthlyData.map(d => d.caEncaisse);
  const patientsArr = monthlyData.map(d => d.nbPatients);
  const rentaArr = monthlyData.map(d => d.rentabiliteHoraire || 0);

  // ═══ MODÈLES IA ═══
  const regCA = linearRegression(caFactureArr);
  const regPatients = linearRegression(patientsArr);
  const regRenta = linearRegression(rentaArr);
  const trendCA = caFactureArr.map((_, i) => regCA.slope * i + regCA.intercept);
  const trendPatients = patientsArr.map((_, i) => regPatients.slope * i + regPatients.intercept);
  const trendRenta = rentaArr.map((_, i) => regRenta.slope * i + regRenta.intercept);
  const insightCA = generateAIInsight(caFactureArr, 'CA facturé');
  const insightPatients = generateAIInsight(patientsArr, 'nombre de patients');
  const insightRenta = generateAIInsight(rentaArr, 'rentabilité horaire');
  const anomaliesCA = detectAnomalies(caFactureArr, 1.5);
  const anomaliesRenta = detectAnomalies(rentaArr, 1.5);
  const trendLabelCA = analyzeTrend(caFactureArr);
  const trendLabelPatients = analyzeTrend(patientsArr);
  const trendLabelRenta = analyzeTrend(rentaArr);

  const caBarData = {
    labels,
    datasets: [
      {
        label: 'CA Facturé',
        data: caFactureArr,
        backgroundColor: 'rgba(16, 185, 129, 0.85)',
        borderRadius: 4,
        barPercentage: 0.7,
        categoryPercentage: 0.8,
      },
      {
        label: 'CA Encaissé',
        data: caEncaisseArr,
        backgroundColor: 'rgba(59, 130, 246, 0.85)',
        borderRadius: 4,
        barPercentage: 0.7,
        categoryPercentage: 0.8,
      },
      {
        type: 'line',
        label: 'Tendance IA',
        data: trendCA,
        borderColor: '#f59e0b',
        borderWidth: 2,
        borderDash: [6, 3],
        pointRadius: 0,
        fill: false,
        tension: 0,
        order: 0,
      },
      {
        type: 'line',
        label: 'Anomalies',
        data: caFactureArr.map((v, i) => anomaliesCA[i]?.isAnomaly ? v : null),
        borderColor: 'transparent',
        backgroundColor: '#ef4444',
        pointRadius: caFactureArr.map((_, i) => anomaliesCA[i]?.isAnomaly ? 8 : 0),
        pointStyle: 'crossRot',
        pointBorderColor: '#ef4444',
        pointBorderWidth: 3,
        showLine: false,
        fill: false,
        order: 0,
      },
    ],
  };

  const patientsBarData = {
    labels,
    datasets: [
      { label: 'Patients', data: patientsArr, backgroundColor: 'rgba(13, 148, 136, 0.8)', borderRadius: 6 },
      { label: 'Nouveaux Patients', data: monthlyData.map(d => d.nbNouveauxPatients), backgroundColor: 'rgba(245, 158, 11, 0.8)', borderRadius: 6 },
      {
        type: 'line',
        label: 'Tendance IA',
        data: trendPatients,
        borderColor: '#ec4899',
        borderWidth: 2,
        borderDash: [6, 3],
        pointRadius: 0,
        fill: false,
        tension: 0,
        order: 0,
      },
    ],
  };

  const rentaBarData = {
    labels,
    datasets: [
      {
        label: 'Rentabilité Horaire (€/h)',
        data: rentaArr,
        backgroundColor: 'rgba(139, 92, 246, 0.85)',
        borderRadius: 4,
        barPercentage: 0.6,
        categoryPercentage: 0.8,
      },
      {
        type: 'line',
        label: 'Tendance IA',
        data: trendRenta,
        borderColor: '#f59e0b',
        borderWidth: 2,
        borderDash: [6, 3],
        pointRadius: 0,
        fill: false,
        tension: 0,
        order: 0,
      },
      {
        type: 'line',
        label: 'Anomalies',
        data: rentaArr.map((v, i) => anomaliesRenta[i]?.isAnomaly ? v : null),
        borderColor: 'transparent',
        backgroundColor: '#ef4444',
        pointRadius: rentaArr.map((_, i) => anomaliesRenta[i]?.isAnomaly ? 8 : 0),
        pointStyle: 'crossRot',
        pointBorderColor: '#ef4444',
        pointBorderWidth: 3,
        showLine: false,
        fill: false,
        order: 0,
      },
    ],
  };

  return (
    <div>
      <Header title="Mes Statistiques" subtitle={`Cabinet ${user?.practitionerCode || ''} — Détails mensuels`} />

      <div className="p-8">
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Évolution du Chiffre d'Affaires</h3>
              <span className="flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                <FiCpu className="w-3 h-3" /> Régression • R²={regCA.r2.toFixed(2)}
              </span>
            </div>
            <Bar data={caBarData} options={{
              responsive: true,
              plugins: { legend: { position: 'bottom' } },
              scales: {
                x: { grid: { display: false }, border: { display: false } },
                y: { beginAtZero: true, grid: { color: 'rgba(226, 232, 240, 0.4)', drawBorder: false }, border: { display: false }, ticks: { callback: v => `${(v / 1000).toFixed(0)}k€` } },
              },
            }} />
            <div className="mt-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-100 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <FiCpu className="w-3 h-3 text-green-600" />
                <span className="text-[10px] font-bold text-gray-800">Analyse IA — CA</span>
                <span className="ml-auto text-[8px] font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Tendance: {trendLabelCA.trend === 'upward' ? '↑ Hausse' : trendLabelCA.trend === 'downward' ? '↓ Baisse' : '→ Stable'}</span>
              </div>
              {insightCA.parts.map((p, i) => <p key={i} className="text-[10px] text-gray-600 leading-relaxed">{p}</p>)}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Patients & Nouveaux Patients</h3>
              <span className="flex items-center gap-1 text-[9px] font-bold text-pink-600 bg-pink-50 px-2.5 py-1 rounded-full">
                <FiCpu className="w-3 h-3" /> Régression • R²={regPatients.r2.toFixed(2)}
              </span>
            </div>
            <Bar data={patientsBarData} options={{
              responsive: true,
              plugins: { legend: { position: 'bottom' } },
              scales: { y: { beginAtZero: true } },
            }} />
            <div className="mt-3 bg-gradient-to-r from-teal-50 to-amber-50 rounded-xl border border-teal-100 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <FiCpu className="w-3 h-3 text-teal-600" />
                <span className="text-[10px] font-bold text-gray-800">Analyse IA — Patients</span>
                <span className="ml-auto text-[8px] font-semibold text-teal-600 bg-teal-100 px-2 py-0.5 rounded-full">Tendance: {trendLabelPatients.trend === 'upward' ? '↑ Hausse' : trendLabelPatients.trend === 'downward' ? '↓ Baisse' : '→ Stable'}</span>
              </div>
              {insightPatients.parts.map((p, i) => <p key={i} className="text-[10px] text-gray-600 leading-relaxed">{p}</p>)}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Rentabilité Horaire</h3>
            <span className="flex items-center gap-1 text-[9px] font-bold text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full">
              <FiCpu className="w-3 h-3" /> Régression • R²={regRenta.r2.toFixed(2)}
            </span>
          </div>
          <Bar data={rentaBarData} options={{
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { display: false }, border: { display: false } },
              y: { beginAtZero: true, grid: { color: 'rgba(226, 232, 240, 0.4)', drawBorder: false }, border: { display: false }, ticks: { callback: v => `${v.toFixed(0)}€/h` } },
            },
          }} />
          <div className="mt-3 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl border border-violet-100 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <FiCpu className="w-3 h-3 text-violet-600" />
              <span className="text-[10px] font-bold text-gray-800">Analyse IA — Rentabilité</span>
              <span className="ml-auto text-[8px] font-semibold text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">Tendance: {trendLabelRenta.trend === 'upward' ? '↑ Hausse' : trendLabelRenta.trend === 'downward' ? '↓ Baisse' : '→ Stable'}</span>
            </div>
            {insightRenta.parts.map((p, i) => <p key={i} className="text-[10px] text-gray-600 leading-relaxed">{p}</p>)}
          </div>
        </div>

        {/* Detail Table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold">Détails Mensuels</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mois</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">CA Facturé</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">CA Encaissé</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Patients</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Nvx Patients</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">RDV</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Heures</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">€/h</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {monthlyData.map((d, i) => {
                  const mi = parseInt(d.mois.substring(4, 6)) - 1;
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{MONTHS[mi]} {d.mois.substring(0, 4)}</td>
                      <td className="px-4 py-3 text-sm text-right">{fmt(d.caFacture)}</td>
                      <td className="px-4 py-3 text-sm text-right">{fmt(d.caEncaisse)}</td>
                      <td className="px-4 py-3 text-sm text-right">{d.nbPatients}</td>
                      <td className="px-4 py-3 text-sm text-right">{d.nbNouveauxPatients}</td>
                      <td className="px-4 py-3 text-sm text-right">{d.nbRdv}</td>
                      <td className="px-4 py-3 text-sm text-right">{(d.heuresTravaillees || 0).toFixed(1)}h</td>
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
