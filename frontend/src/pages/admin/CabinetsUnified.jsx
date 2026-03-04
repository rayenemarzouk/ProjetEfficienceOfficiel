import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import { getCabinetDetails, getAdminDashboard } from '../../services/api';
import PeriodFilter from '../../components/PeriodFilter';
import { 
  FiDollarSign, FiUsers, FiClock, FiTrendingUp, FiCpu, FiChevronDown, FiChevronUp, 
  FiExternalLink, FiArrowLeft, FiAlertTriangle, FiTrendingDown, FiCalendar, FiBarChart2, FiGrid
} from 'react-icons/fi';
import { 
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, 
  Title, Tooltip, Legend, ArcElement 
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { 
  linearRegression, detectAnomalies, cabinetHealthScore, 
  generateAIInsight, analyzeTrend 
} from '../../utils/aiModels';
import { streamingBarPlugin, startChartAnimation } from '../../utils/chartPlugins';
import { useCountUp } from '../../utils/useCountUp';
import { useDynamic } from '../../context/DynamicContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement);

const DOC_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function CabinetsUnified() {
  const navigate = useNavigate();
  const { dark } = useTheme();
  const { user } = useAuth();
  const isRayan = user?.email === 'maarzoukrayan3@gmail.com';
  const cardCls = isRayan ? 'bg-white border border-gray-200 shadow-sm' : 'bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-gray-700';
  const chartTextColor = (dark && !isRayan) ? '#94a3b8' : '#64748b';
  const chartGridColor = (dark && !isRayan) ? 'rgba(148, 163, 184, 0.1)' : 'rgba(226, 232, 240, 0.5)';
  
  const [activeTab, setActiveTab] = useState('analysis'); // 'analysis' | 'comparison'
  const [data, setData] = useState(null);
  const [practitioners, setPractitioners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState({ period: 'this_month' });
  const [expandedInsight, setExpandedInsight] = useState({ patients: false, activite: false });
  
  const { isDynamic: _isDynamic, dataAccessEnabled } = useDynamic();
  const isDynamic = isRayan || _isDynamic;
  const showAI = dataAccessEnabled || isRayan;
  
  // Refs pour les charts
  const patientsChartRef = useRef(null);
  const activiteChartRef = useRef(null);
  const barChartRef = useRef(null);
  const doughnutChartRef = useRef(null);

  // Animation loop
  useEffect(() => {
    if (!isDynamic) return;
    const stopPatients = startChartAnimation(patientsChartRef);
    const stopActivite = startChartAnimation(activiteChartRef);
    const stopBar = startChartAnimation(barChartRef);
    return () => { stopPatients?.(); stopActivite?.(); stopBar?.(); };
  }, [loading, isDynamic]);

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

  // ═══════════════════════════════════════════════════════════════════
  // DONNÉES COMMUNES
  // ═══════════════════════════════════════════════════════════════════
  const caByP = data?.dashboard?.caByPractitioner || [];
  const heuresByP = data?.dashboard?.heuresByPractitioner || [];
  const rdvByP = data?.dashboard?.rdvByPractitioner || [];
  const rdvMensuel = data?.dashboard?.rdvMensuel || [];

  // Calculate per-practitioner data
  const pracData = practitioners.map((p, idx) => {
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

    // Absences réelles
    const totalRdv = rdv?.totalRdv || 0;
    const totalPatients = rdv?.totalPatients || 0;
    const absents = Math.max(0, totalRdv - totalPatients);

    // Tendance absences
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

    // Health Score
    const tauxEnc = totalCA > 0 ? Math.round((totalEncaisse / totalCA) * 100) : 0;
    const tauxAbs = totalRdv > 0 ? (absents / totalRdv) * 100 : 0;
    const health = cabinetHealthScore({
      tauxEncaissement: tauxEnc,
      evolutionCA: tendance === 'Hausse' ? -5 : tendance === 'Baisse' ? 5 : 0,
      tauxAbsence: tauxAbs,
      productionHoraire: totalCA,
      tauxNouveauxPatients: 10,
    });

    return {
      code: p.code,
      name: p.name,
      patientsTraites,
      patientsRdv,
      consultations,
      heuresTravaillees,
      score,
      absents,
      presents: totalPatients,
      totalRdv,
      totalCA,
      totalEncaisse,
      tendance,
      health,
      color: DOC_COLORS[idx % DOC_COLORS.length]
    };
  });

  // Totaux
  const totalTraites = pracData.reduce((s, p) => s + p.patientsTraites, 0);
  const totalRdvPatients = pracData.reduce((s, p) => s + p.patientsRdv, 0);
  const totalConsultations = pracData.reduce((s, p) => s + p.consultations, 0);
  const totalHeures = pracData.reduce((s, p) => s + p.heuresTravaillees, 0);
  const totalAbsents = pracData.reduce((s, p) => s + p.absents, 0);
  const totalPresents = pracData.reduce((s, p) => s + p.presents, 0);
  const moyenneCabinet = practitioners.length > 0 ? Math.round(totalConsultations / practitioners.length) : 0;

  // ═══ MODÈLES IA ═══
  const patientsRdvArr = pracData.map(p => p.patientsRdv);
  const patientsTraitesArr = pracData.map(p => p.patientsTraites);
  const consultationsArr = pracData.map(p => p.consultations);
  const heuresArr = pracData.map(p => p.heuresTravaillees);
  const absentsArr = pracData.map(p => p.absents);

  const regPatients = linearRegression(patientsTraitesArr);
  const regConsultations = linearRegression(consultationsArr);
  const trendPatients = patientsTraitesArr.map((_, i) => regPatients.slope * i + regPatients.intercept);
  const trendConsultations = consultationsArr.map((_, i) => regConsultations.slope * i + regConsultations.intercept);
  const anomaliesPatients = detectAnomalies(patientsTraitesArr, 1.5);
  const anomaliesConsultations = detectAnomalies(consultationsArr, 1.5);
  const insightPatients = generateAIInsight(patientsTraitesArr, 'patients traités par cabinet');
  const insightActivite = generateAIInsight(consultationsArr, 'consultations par cabinet');
  
  // Convertir le résultat de analyzeTrend en label français
  const getTrendLabel = (trendResult) => {
    if (!trendResult || typeof trendResult === 'string') return trendResult || 'Stable';
    const map = { upward: 'Croissance', downward: 'Décroissance', stable: 'Stable', insufficient: 'Stable', disabled: 'Désactivé' };
    return map[trendResult.trend] || 'Stable';
  };
  const trendPatientsLabel = getTrendLabel(analyzeTrend(patientsTraitesArr));
  const trendConsultLabel = getTrendLabel(analyzeTrend(consultationsArr));

  // ═══ ANIMATED COUNTERS ═══
  const dyn = isDynamic && !loading;
  const animTotalTraites = useCountUp(totalTraites, 1800, dyn);
  const animTotalRdv = useCountUp(totalRdvPatients, 1800, dyn);
  const animTotalConsult = useCountUp(totalConsultations, 1600, dyn);
  const animTotalHeures = useCountUp(totalHeures, 1600, dyn);
  const animMoyenne = useCountUp(moyenneCabinet, 1400, dyn);
  const animAbsents = useCountUp(totalAbsents, 1500, dyn);
  const animPresents = useCountUp(totalPresents, 1500, dyn);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Chart Options
  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: chartTextColor, usePointStyle: true, padding: 16 },
      },
      tooltip: { backgroundColor: '#1e293b', titleColor: '#fff', bodyColor: '#e2e8f0', cornerRadius: 8 },
    },
    scales: {
      x: { ticks: { color: chartTextColor }, grid: { display: false } },
      y: { ticks: { color: chartTextColor }, grid: { color: chartGridColor } },
    },
  };

  // ═══════════════════════════════════════════════════════════════════
  // VUE ANALYSE
  // ═══════════════════════════════════════════════════════════════════
  const patientsBarData = {
    labels: pracData.map(p => p.code),
    datasets: [
      { label: 'Patients sur agenda (RDV)', data: patientsRdvArr, backgroundColor: '#10b981', borderRadius: 6 },
      { label: 'Patients traités', data: patientsTraitesArr, backgroundColor: '#3b82f6', borderRadius: 6 },
      {
        type: 'line', label: 'Tendance IA', data: trendPatients,
        borderColor: '#f59e0b', borderWidth: 2, borderDash: [6, 3], pointRadius: 0, fill: false, tension: 0, order: 0,
      },
    ]
  };

  const activiteBarData = {
    labels: pracData.map(p => p.code),
    datasets: [
      { label: 'Consultations', data: consultationsArr, backgroundColor: '#8b5cf6', borderRadius: 6 },
      { label: 'Heures travaillées', data: heuresArr, backgroundColor: '#f59e0b', borderRadius: 6 },
      {
        type: 'line', label: 'Tendance IA', data: trendConsultations,
        borderColor: '#ec4899', borderWidth: 2, borderDash: [6, 3], pointRadius: 0, fill: false, tension: 0, order: 0,
      },
    ]
  };

  // ═══════════════════════════════════════════════════════════════════
  // VUE COMPARAISON
  // ═══════════════════════════════════════════════════════════════════
  const comparisonBarData = {
    labels: pracData.map(p => p.code),
    datasets: [
      { label: 'Patients présents', data: pracData.map(p => p.presents), backgroundColor: '#10b981', borderRadius: 6 },
      { label: 'Patients absents', data: absentsArr, backgroundColor: '#ef4444', borderRadius: 6 },
    ]
  };

  const doughnutData = {
    labels: ['Présents', 'Absents'],
    datasets: [{
      data: [totalPresents, totalAbsents],
      backgroundColor: ['#10b981', '#ef4444'],
      borderWidth: 0,
    }]
  };

  const renderAnalysisView = () => (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className={`${cardCls} rounded-xl p-5`}>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1"><FiUsers /> Patients traités</div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{animTotalTraites.toLocaleString()}</p>
        </div>
        <div className={`${cardCls} rounded-xl p-5`}>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1"><FiUsers /> Sur agenda</div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{animTotalRdv.toLocaleString()}</p>
        </div>
        <div className={`${cardCls} rounded-xl p-5`}>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1"><FiCalendar /> Consultations</div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{animTotalConsult.toLocaleString()}</p>
        </div>
        <div className={`${cardCls} rounded-xl p-5`}>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1"><FiClock /> Heures</div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{animTotalHeures.toLocaleString()}h</p>
        </div>
        <div className={`${cardCls} rounded-xl p-5`}>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1"><FiTrendingUp /> Moyenne/Cabinet</div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{animMoyenne}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${cardCls} rounded-xl p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Patients par Cabinet</h3>
            {isRayan && trendPatientsLabel && (
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                trendPatientsLabel === 'Croissance' ? 'bg-green-100 text-green-700' :
                trendPatientsLabel === 'Décroissance' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
              }`}>
                <FiCpu className="inline mr-1" />{trendPatientsLabel}
              </span>
            )}
          </div>
          <div className="h-72">
            <Bar ref={patientsChartRef} data={patientsBarData} options={barOptions} plugins={isDynamic ? [streamingBarPlugin] : []} />
          </div>
          {isRayan && insightPatients?.text && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300 whitespace-pre-line"><FiCpu className="inline mr-1" />{insightPatients.text}</p>
            </div>
          )}
        </div>

        <div className={`${cardCls} rounded-xl p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Activité par Cabinet</h3>
            {isRayan && (
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                trendConsultLabel === 'Croissance' ? 'bg-green-100 text-green-700' :
                trendConsultLabel === 'Décroissance' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
              }`}>
                <FiCpu className="inline mr-1" />{trendConsultLabel}
              </span>
            )}
          </div>
          <div className="h-72">
            <Bar ref={activiteChartRef} data={activiteBarData} options={barOptions} plugins={isDynamic ? [streamingBarPlugin] : []} />
          </div>
          {isRayan && insightActivite?.text && (
            <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="text-sm text-purple-700 dark:text-purple-300 whitespace-pre-line"><FiCpu className="inline mr-1" />{insightActivite.text}</p>
            </div>
          )}
        </div>
      </div>

      {/* Health Scores Table */}
      <div className={`${cardCls} rounded-xl overflow-hidden`}>
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">Scores de Santé IA par Cabinet</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Cabinet</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Patients</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Consultations</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Heures</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Score Santé</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {pracData.map((p, i) => (
                <tr key={p.code} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="font-medium text-gray-900 dark:text-white">{p.name}</span>
                      <span className="text-xs text-gray-500">({p.code})</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{p.patientsTraites}</td>
                  <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{p.consultations}</td>
                  <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{p.heuresTravaillees}h</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                      p.health.score >= 80 ? 'bg-green-100 text-green-700' :
                      p.health.score >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {p.health.score}% - {p.health.label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderComparisonView = () => (
    <div className="space-y-6">
      {/* KPIs Comparaison */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`${cardCls} rounded-xl p-5`}>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1"><FiUsers /> Total Présents</div>
          <p className="text-2xl font-bold text-green-600">{animPresents.toLocaleString()}</p>
        </div>
        <div className={`${cardCls} rounded-xl p-5`}>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1"><FiAlertTriangle /> Total Absents</div>
          <p className="text-2xl font-bold text-red-500">{animAbsents.toLocaleString()}</p>
        </div>
        <div className={`${cardCls} rounded-xl p-5`}>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1"><FiTrendingUp /> Taux Présence</div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {totalPresents + totalAbsents > 0 ? Math.round((totalPresents / (totalPresents + totalAbsents)) * 100) : 0}%
          </p>
        </div>
        <div className={`${cardCls} rounded-xl p-5`}>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1"><FiBarChart2 /> Cabinets</div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{practitioners.length}</p>
        </div>
      </div>

      {/* Charts Comparaison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`${cardCls} rounded-xl p-6 lg:col-span-2`}>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Présences vs Absences par Cabinet</h3>
          <div className="h-72">
            <Bar ref={barChartRef} data={comparisonBarData} options={barOptions} plugins={isDynamic ? [streamingBarPlugin] : []} />
          </div>
        </div>

        <div className={`${cardCls} rounded-xl p-6`}>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Répartition Globale</h3>
          <div className="h-64">
            <Doughnut 
              ref={doughnutChartRef}
              data={doughnutData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom', labels: { color: chartTextColor, padding: 16 } }
                }
              }} 
            />
          </div>
        </div>
      </div>

      {/* Table Comparaison */}
      <div className={`${cardCls} rounded-xl overflow-hidden`}>
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">Détail par Praticien</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Praticien</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">RDV</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Présents</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Absents</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Taux Présence</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tendance</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Score IA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {pracData.map((p) => {
                const tauxPresence = p.totalRdv > 0 ? Math.round((p.presents / p.totalRdv) * 100) : 0;
                return (
                  <tr key={p.code} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="font-medium text-gray-900 dark:text-white">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{p.totalRdv}</td>
                    <td className="px-4 py-3 text-center text-green-600 font-medium">{p.presents}</td>
                    <td className="px-4 py-3 text-center text-red-500 font-medium">{p.absents}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${tauxPresence >= 80 ? 'bg-green-500' : tauxPresence >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${tauxPresence}%` }}
                          />
                        </div>
                        <span className="text-sm">{tauxPresence}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                        p.tendance === 'Baisse' ? 'text-green-600' :
                        p.tendance === 'Hausse' ? 'text-red-500' : 'text-gray-500'
                      }`}>
                        {p.tendance === 'Baisse' ? <FiTrendingDown /> : 
                         p.tendance === 'Hausse' ? <FiTrendingUp /> : '—'}
                        {p.tendance}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        p.health.score >= 80 ? 'bg-green-100 text-green-700' :
                        p.health.score >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {p.health.score}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen ${isRayan ? 'bg-gray-50' : 'bg-gray-50 dark:bg-[#0f172a]'}`}>
      <Header title="Analyse & Comparaison des Cabinets" />
      
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        {/* Tabs + Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          {/* Tabs */}
          <div className="flex bg-white dark:bg-gray-800 rounded-xl p-1 shadow-sm border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('analysis')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'analysis' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <FiGrid className="w-4 h-4" />
              Analyse
            </button>
            <button
              onClick={() => setActiveTab('comparison')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'comparison' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <FiBarChart2 className="w-4 h-4" />
              Comparaison
            </button>
          </div>

          {/* Period Filter */}
          <PeriodFilter value={period} onChange={setPeriod} />
        </div>

        {/* Content */}
        {activeTab === 'analysis' ? renderAnalysisView() : renderComparisonView()}
      </div>
    </div>
  );
}
