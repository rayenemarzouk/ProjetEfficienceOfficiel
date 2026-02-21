import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { getPractitionerDashboard } from '../../services/api';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';
import { FiDollarSign, FiUsers, FiClock, FiTrendingUp, FiCalendar, FiCpu } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { linearRegression, generateAIInsight, forecast as aiForecast, analyzeTrend, cabinetHealthScore } from '../../utils/aiModels';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, Title, Tooltip, Legend);

const fmt = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v || 0);

export default function PractitionerDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const realisations = data?.realisations || [];
  const rdvs = data?.rendezVous || [];
  const joursOuverts = data?.joursOuverts || [];
  const encours = data?.encours || {};

  // KPIs
  const totalCA = realisations.reduce((s, r) => s + (r.montantFacture || 0), 0);
  const totalEncaisse = realisations.reduce((s, r) => s + (r.montantEncaisse || 0), 0);
  const totalPatients = realisations.reduce((s, r) => s + (r.nbPatients || 0), 0);
  const totalRdv = rdvs.reduce((s, r) => s + (r.nbRdv || 0), 0);
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
  const caInsight = generateAIInsight(caValues, 'CA facturé');
  const caTrend = analyzeTrend(caValues);
  const caForecastVals = aiForecast(caValues, 2);
  const healthScore = cabinetHealthScore({
    tauxEncaissement: totalCA > 0 ? (totalEncaisse / totalCA) * 100 : 0,
    evolutionCA: regCA.slope,
    tauxAbsence: totalRdv > 0 ? Math.max(0, ((totalRdv - totalPatients) / totalRdv) * 100) : 0,
    productionHoraire: rentaHoraire,
    tauxNouveauxPatients: 10,
  });

  const barData = {
    labels: monthLabels,
    datasets: [
      { label: 'Facturé', data: caValues, backgroundColor: 'rgba(13, 148, 136, 0.8)', borderRadius: 6 },
      { label: 'Encaissé', data: encValues, backgroundColor: 'rgba(59, 130, 246, 0.8)', borderRadius: 6 },
      {
        type: 'line',
        label: 'Tendance IA (Régression)',
        data: trendLine,
        borderColor: '#f59e0b',
        borderWidth: 2,
        borderDash: [6, 3],
        pointRadius: 0,
        fill: false,
        tension: 0,
        order: 0,
      },
    ],
  };

  const doughnutData = {
    labels: ['Encaissé', 'Non encaissé'],
    datasets: [{
      data: [totalEncaisse, Math.max(0, totalCA - totalEncaisse)],
      backgroundColor: ['#0d9488', '#e5e7eb'],
      borderWidth: 0,
    }],
  };

  const kpis = [
    { icon: FiDollarSign, label: 'CA Facturé', value: fmt(totalCA), color: 'primary' },
    { icon: FiUsers, label: 'Patients', value: totalPatients.toLocaleString('fr-FR'), color: 'blue' },
    { icon: FiCalendar, label: 'Rendez-vous', value: totalRdv.toLocaleString('fr-FR'), color: 'amber' },
    { icon: FiClock, label: 'Heures Travaillées', value: `${totalHeures.toFixed(0)}h`, color: 'purple' },
    { icon: FiTrendingUp, label: 'Renta. Horaire', value: `${rentaHoraire.toFixed(0)}€/h`, color: 'green' },
    { icon: FiDollarSign, label: 'Encaissé', value: fmt(totalEncaisse), color: 'teal' },
  ];

  const colorMap = {
    primary: 'bg-primary-50 text-primary-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
    teal: 'bg-teal-50 text-teal-600',
  };

  return (
    <div>
      <Header
        title={`Bonjour, ${user?.name || user?.cabinetName || ''}`}
        subtitle={`Cabinet ${user?.practitionerCode || ''} — Tableau de bord`}
      />

      <div className="p-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {kpis.map((kpi, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${colorMap[kpi.color]}`}>
                  <kpi.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                  <p className="text-sm text-gray-500">{kpi.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Évolution du Chiffre d'Affaires</h3>
              <span className="flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                <FiCpu className="w-3 h-3" /> Régression OLS • R²={regCA.r2.toFixed(2)}
              </span>
            </div>
            <Bar data={barData} options={{
              responsive: true,
              plugins: { legend: { position: 'bottom' } },
              scales: { y: { beginAtZero: true, ticks: { callback: v => `${(v/1000).toFixed(0)}k€` } } },
            }} />
            {/* AI Insight */}
            <div className="mt-4 bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl border border-teal-100 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <FiCpu className="w-3 h-3 text-teal-600" />
                <span className="text-[10px] font-bold text-gray-800">Analyse IA — CA</span>
                <span className="ml-auto text-[8px] font-semibold text-teal-600 bg-teal-100 px-2 py-0.5 rounded-full">Confiance {caInsight.confidence}%</span>
              </div>
              {caInsight.parts.map((p, i) => <p key={i} className="text-[10px] text-gray-600 leading-relaxed">{p}</p>)}
              <div className="flex gap-3 mt-2">
                <span className="text-[9px] bg-white/60 text-gray-600 px-2 py-0.5 rounded-full">Tendance: {caTrend.trend === 'upward' ? '↑ Hausse' : caTrend.trend === 'downward' ? '↓ Baisse' : '→ Stable'}</span>
                <span className="text-[9px] bg-white/60 text-gray-600 px-2 py-0.5 rounded-full">Prévision M+1: {fmt(caForecastVals[0])}</span>
                <span className="text-[9px] bg-white/60 text-gray-600 px-2 py-0.5 rounded-full">Prévision M+2: {fmt(caForecastVals[1])}</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Taux d'Encaissement</h3>
              <span className="flex items-center gap-1 text-[9px] font-bold text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full">
                <FiCpu className="w-3 h-3" /> Score Santé IA
              </span>
            </div>
            <Doughnut data={doughnutData} options={{
              responsive: true,
              cutout: '70%',
              plugins: { legend: { position: 'bottom' } },
            }} />
            <p className="text-center mt-4 text-3xl font-bold text-primary-600">
              {totalCA > 0 ? ((totalEncaisse / totalCA) * 100).toFixed(1) : 0}%
            </p>
            {/* Health Score */}
            <div className="mt-3 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl border border-violet-100 p-3 text-center">
              <p className="text-[10px] text-gray-500 mb-1">Score Santé Cabinet IA</p>
              <p className={`text-2xl font-black ${healthScore.score >= 80 ? 'text-green-500' : healthScore.score >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                {healthScore.score}<span className="text-xs font-normal text-gray-400">/100</span>
              </p>
              <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
                <div className="h-2 rounded-full" style={{ 
                  width: `${healthScore.score}%`, 
                  background: healthScore.score >= 80 ? 'linear-gradient(90deg, #10b981, #34d399)' : healthScore.score >= 60 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #ef4444, #f87171)'
                }}></div>
              </div>
              <p className="text-[9px] text-gray-400 mt-1">{healthScore.label}</p>
            </div>
          </div>
        </div>

        {/* Encours */}
        {encours && Object.keys(encours).length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">En-cours</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-primary-50 rounded-xl text-center">
                <p className="text-sm text-primary-700">Durée à réaliser</p>
                <p className="text-2xl font-bold text-primary-900">{((encours.dureeTotaleARealiser || 0) / 60).toFixed(0)}h</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl text-center">
                <p className="text-sm text-blue-700">Montant à facturer</p>
                <p className="text-2xl font-bold text-blue-900">{fmt(encours.montantTotalAFacturer)}</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-xl text-center">
                <p className="text-sm text-amber-700">Patients en cours</p>
                <p className="text-2xl font-bold text-amber-900">{encours.patientsEnCours || 0}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
