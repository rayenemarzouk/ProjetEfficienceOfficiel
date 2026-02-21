import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { getCabinetDetails, getAdminDashboard } from '../../services/api';
import { FiDollarSign, FiUsers, FiClock, FiTrendingUp, FiCpu } from 'react-icons/fi';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { linearRegression, detectAnomalies, cabinetHealthScore, generateAIInsight, analyzeTrend } from '../../utils/aiModels';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

export default function CabinetAnalysis() {
  const [data, setData] = useState(null);
  const [practitioners, setPractitioners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const dashRes = await getAdminDashboard();
      const pracs = dashRes.data.practitioners || [];
      setPractitioners(pracs);

      const allData = {};
      for (const p of pracs) {
        try {
          const res = await getCabinetDetails(p.code);
          allData[p.code] = res.data;
        } catch (e) {
          allData[p.code] = null;
        }
      }
      setData({ dashboard: dashRes.data, cabinets: allData });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const caByP = data?.dashboard?.caByPractitioner || [];
  const heuresByP = data?.dashboard?.heuresByPractitioner || [];
  const rdvByP = data?.dashboard?.rdvByPractitioner || [];

  // Calculate per-practitioner data
  const pracData = practitioners.map(p => {
    const ca = caByP.find(c => c._id === p.code);
    const heures = heuresByP.find(h => h._id === p.code);
    const rdv = rdvByP.find(r => r._id === p.code);
    const totalCA = ca?.totalFacture || 0;
    const totalEncaisse = ca?.totalEncaisse || 0;
    const patientsTraites = ca?.totalPatients || 0;
    const patientsRdv = rdv?.totalPatients || 0;
    const consultations = rdv?.totalRdv || 0;
    const heuresTravaillees = heures ? Math.round(heures.totalMinutes / 60) : 0;
    const score = totalCA > 0 ? Math.min(Math.round((totalEncaisse / totalCA) * 100), 100) : 0;

    return {
      code: p.code,
      name: p.name,
      patientsTraites,
      patientsRdv,
      consultations,
      heuresTravaillees,
      score,
    };
  });

  const totalTraites = pracData.reduce((s, p) => s + p.patientsTraites, 0);
  const totalRdvPatients = pracData.reduce((s, p) => s + p.patientsRdv, 0);
  const totalPatients = totalTraites + totalRdvPatients;
  const totalConsultations = pracData.reduce((s, p) => s + p.consultations, 0);
  const totalHeures = pracData.reduce((s, p) => s + p.heuresTravaillees, 0);
  const moyenneCabinet = practitioners.length > 0 ? Math.round(totalConsultations / practitioners.length) : 0;

  // ═══ MODÈLES IA ═══
  const patientsRdvArr = pracData.map(p => p.patientsRdv);
  const patientsTraitesArr = pracData.map(p => p.patientsTraites);
  const consultationsArr = pracData.map(p => p.consultations);
  const heuresArr = pracData.map(p => p.heuresTravaillees);

  // Régression linéaire sur les patients traités
  const regPatients = linearRegression(patientsTraitesArr);
  const regConsultations = linearRegression(consultationsArr);

  // Lignes de tendance IA
  const trendPatients = patientsTraitesArr.map((_, i) => regPatients.slope * i + regPatients.intercept);
  const trendConsultations = consultationsArr.map((_, i) => regConsultations.slope * i + regConsultations.intercept);

  // Anomalies
  const anomaliesPatients = detectAnomalies(patientsTraitesArr, 1.5);
  const anomaliesConsultations = detectAnomalies(consultationsArr, 1.5);

  // AI Insight
  const insightPatients = generateAIInsight(patientsTraitesArr, 'patients traités par cabinet');
  const insightActivite = generateAIInsight(consultationsArr, 'consultations par cabinet');
  const trendPatientsLabel = analyzeTrend(patientsTraitesArr);
  const trendConsultLabel = analyzeTrend(consultationsArr);

  // Health Score IA par praticien
  const pracHealthScores = pracData.map(p => {
    const hs = cabinetHealthScore({
      tauxEncaissement: p.score,
      evolutionCA: 0,
      tauxAbsence: p.consultations > 0 ? Math.max(0, ((p.consultations - p.patientsTraites) / p.consultations) * 100) : 0,
      productionHoraire: p.heuresTravaillees > 0 ? p.patientsTraites / p.heuresTravaillees * 100 : 0,
      tauxNouveauxPatients: 10,
    });
    return hs;
  });

  // Patients par Cabinet chart — enrichi IA
  const patientsBarData = {
    labels: pracData.map(p => p.code),
    datasets: [
      {
        label: 'Patients sur agenda (RDV)',
        data: patientsRdvArr,
        backgroundColor: '#10b981',
        borderRadius: 6,
      },
      {
        label: 'Patients traités',
        data: patientsTraitesArr,
        backgroundColor: '#3b82f6',
        borderRadius: 6,
      },
      {
        type: 'line',
        label: 'Tendance IA (Régression)',
        data: trendPatients,
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
        label: 'Anomalies IA',
        data: patientsTraitesArr.map((v, i) => anomaliesPatients[i]?.isAnomaly ? v : null),
        borderColor: 'transparent',
        backgroundColor: '#ef4444',
        pointRadius: patientsTraitesArr.map((_, i) => anomaliesPatients[i]?.isAnomaly ? 8 : 0),
        pointStyle: 'crossRot',
        pointBorderColor: '#ef4444',
        pointBorderWidth: 3,
        showLine: false,
        fill: false,
        order: 0,
      },
    ]
  };

  // Activité par Cabinet chart — enrichi IA
  const activiteBarData = {
    labels: pracData.map(p => p.code),
    datasets: [
      {
        label: 'Consultations',
        data: consultationsArr,
        backgroundColor: '#8b5cf6',
        borderRadius: 6,
      },
      {
        label: 'Heures travaillées',
        data: heuresArr,
        backgroundColor: '#f59e0b',
        borderRadius: 6,
      },
      {
        type: 'line',
        label: 'Tendance IA (Régression)',
        data: trendConsultations,
        borderColor: '#ec4899',
        borderWidth: 2,
        borderDash: [6, 3],
        pointRadius: 0,
        fill: false,
        tension: 0,
        order: 0,
      },
      {
        type: 'line',
        label: 'Anomalies IA',
        data: consultationsArr.map((v, i) => anomaliesConsultations[i]?.isAnomaly ? v : null),
        borderColor: 'transparent',
        backgroundColor: '#ef4444',
        pointRadius: consultationsArr.map((_, i) => anomaliesConsultations[i]?.isAnomaly ? 8 : 0),
        pointStyle: 'crossRot',
        pointBorderColor: '#ef4444',
        pointBorderWidth: 3,
        showLine: false,
        fill: false,
        order: 0,
      },
    ]
  };

  const barOptions = {
    responsive: true,
    plugins: { legend: { position: 'bottom' } },
    scales: { y: { beginAtZero: true } },
  };

  return (
    <div>
      <Header title="Analyse des Cabinets" subtitle="Détails et performances par cabinet" />
      
      <div className="p-6">
        {/* Charts: Patients + Activité side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <FiUsers className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-gray-900">Patients par Cabinet</h3>
              </div>
              <span className="flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                <FiCpu className="w-3 h-3" /> Régression OLS • R²={regPatients.r2.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-4">Patients traités vs patients sur agenda — Tendance: <span className={`font-semibold ${trendPatientsLabel.trend === 'upward' ? 'text-green-600' : trendPatientsLabel.trend === 'downward' ? 'text-red-500' : 'text-gray-600'}`}>{trendPatientsLabel.trend === 'upward' ? '↑ Hausse' : trendPatientsLabel.trend === 'downward' ? '↓ Baisse' : '→ Stable'}</span></p>
            <Bar data={patientsBarData} options={barOptions} />
            {/* AI Insight */}
            <div className="mt-3 bg-gradient-to-r from-blue-50 to-violet-50 rounded-xl border border-blue-100 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <FiCpu className="w-3 h-3 text-blue-600" />
                <span className="text-[10px] font-bold text-gray-800">Analyse IA — Patients</span>
                <span className="ml-auto text-[8px] font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Confiance {insightPatients.confidence}%</span>
              </div>
              {insightPatients.parts.map((p, i) => <p key={i} className="text-[10px] text-gray-600 leading-relaxed">{p}</p>)}
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-500">
                <p className="text-xl font-black text-blue-700">{totalTraites}</p>
                <p className="text-[10px] text-gray-500">Total traités</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 border-l-4 border-green-500">
                <p className="text-xl font-black text-green-700">{totalRdvPatients}</p>
                <p className="text-[10px] text-gray-500">Total sur agenda</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 border-l-4 border-red-400">
                <p className="text-xl font-black text-red-600">{totalConsultations}</p>
                <p className="text-[10px] text-gray-500">Total RDV</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <FiClock className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-bold text-gray-900">Activité par Cabinet (par mois)</h3>
              </div>
              <span className="flex items-center gap-1 text-[9px] font-bold text-pink-600 bg-pink-50 px-2.5 py-1 rounded-full">
                <FiCpu className="w-3 h-3" /> Régression OLS • R²={regConsultations.r2.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-4">Consultations et heures — Tendance: <span className={`font-semibold ${trendConsultLabel.trend === 'upward' ? 'text-green-600' : trendConsultLabel.trend === 'downward' ? 'text-red-500' : 'text-gray-600'}`}>{trendConsultLabel.trend === 'upward' ? '↑ Hausse' : trendConsultLabel.trend === 'downward' ? '↓ Baisse' : '→ Stable'}</span></p>
            <Bar data={activiteBarData} options={barOptions} />
            {/* AI Insight */}
            <div className="mt-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <FiCpu className="w-3 h-3 text-purple-600" />
                <span className="text-[10px] font-bold text-gray-800">Analyse IA — Activité</span>
                <span className="ml-auto text-[8px] font-semibold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">Confiance {insightActivite.confidence}%</span>
              </div>
              {insightActivite.parts.map((p, i) => <p key={i} className="text-[10px] text-gray-600 leading-relaxed">{p}</p>)}
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="bg-purple-50 rounded-lg p-3 border-l-4 border-purple-500">
                <p className="text-xl font-black text-purple-700">{totalConsultations}</p>
                <p className="text-[10px] text-gray-500">Total consultations</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 border-l-4 border-amber-500">
                <p className="text-xl font-black text-amber-700">{totalHeures}h</p>
                <p className="text-[10px] text-gray-500">Total heures</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-500">
                <p className="text-xl font-black text-blue-700">{moyenneCabinet}</p>
                <p className="text-[10px] text-gray-500">Moyenne/cabinet</p>
              </div>
            </div>
          </div>
        </div>

        {/* Scoring Performance — IA Health Score */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-gray-900">Scoring Performance</h3>
            <span className="flex items-center gap-1 text-[9px] font-bold text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full">
              <FiCpu className="w-3 h-3" /> Score Multi-KPI Pondéré
            </span>
          </div>
          <div className="space-y-4">
            {pracData.map((p, i) => {
              const hs = pracHealthScores[i];
              return (
                <div key={i} className="flex items-center gap-4">
                  <span className="text-sm font-bold text-gray-700 w-12">{p.code}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] text-gray-400">Encaissement: {p.score}%</span>
                      <span className="text-[10px] text-gray-400">•</span>
                      <span className="text-[10px] text-gray-400">Score IA: <span className={`font-bold ${hs.score >= 80 ? 'text-green-600' : hs.score >= 60 ? 'text-amber-500' : 'text-red-500'}`}>{hs.score}/100</span></span>
                      <span className="text-[10px] text-gray-400">•</span>
                      <span className="text-[10px] text-gray-400">{hs.label}</span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-4 relative">
                      <div
                        className="h-4 rounded-full transition-all duration-700"
                        style={{
                          width: `${hs.score}%`,
                          background: hs.score >= 80 ? 'linear-gradient(90deg, #10b981, #34d399)' : hs.score >= 60 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #ef4444, #f87171)',
                        }}
                      ></div>
                    </div>
                  </div>
                  <span className={`text-sm font-black w-16 text-right ${hs.score >= 80 ? 'text-green-600' : hs.score >= 60 ? 'text-amber-500' : 'text-red-500'}`}>{hs.score}/100</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Répartition des Scores */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-base font-bold text-gray-900 mb-4">Répartition des Scores</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pracData.map((p, i) => (
              <div key={i} className="text-center">
                <div className="relative w-28 h-28 mx-auto mb-3">
                  <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke="#e5e7eb" strokeWidth="3"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={p.score >= 90 ? '#10b981' : p.score >= 75 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="3"
                      strokeDasharray={`${p.score}, 100`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-black text-gray-900">{p.score}%</span>
                  </div>
                </div>
                <p className="text-sm font-bold text-gray-900">{p.name}</p>
                <p className="text-xs text-gray-400">({p.code})</p>
              </div>
            ))}
          </div>
        </div>

        {/* AI Global Insight Panel */}
        <div className="bg-gradient-to-r from-violet-50 via-blue-50 to-amber-50 rounded-2xl border border-violet-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <FiCpu className="w-4 h-4 text-violet-600" />
            <h3 className="text-sm font-bold text-gray-900">Analyse IA Globale — Cabinets</h3>
            <span className="ml-auto text-[9px] font-semibold text-violet-600 bg-white/60 px-2.5 py-1 rounded-full">5 modèles ML exécutés</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pracData.map((p, i) => {
              const hs = pracHealthScores[i];
              return (
                <div key={i} className="bg-white/60 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold ${hs.score >= 80 ? 'bg-green-500' : hs.score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}>{p.code}</div>
                    <span className="text-xs font-bold text-gray-800">{p.name}</span>
                    <span className={`ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full ${hs.score >= 80 ? 'bg-green-100 text-green-700' : hs.score >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{hs.score}/100</span>
                  </div>
                  <p className="text-[10px] text-gray-600">Patients: {p.patientsTraites} traités / {p.patientsRdv} agenda • Consultations: {p.consultations} • Heures: {p.heuresTravaillees}h</p>
                  <p className="text-[10px] text-gray-500 mt-1">{hs.label} — Encaissement {p.score}%</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
