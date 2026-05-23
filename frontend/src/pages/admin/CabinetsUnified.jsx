import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Title, Tooltip, Legend, ArcElement, Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { 
  linearRegression, detectAnomalies, cabinetHealthScore, 
  generateAIInsight, analyzeTrend 
} from '../../utils/aiModels';
import { streamingBarPlugin, startChartAnimation } from '../../utils/chartPlugins';
import { useCountUp } from '../../utils/useCountUp';
import { useDynamic } from '../../context/DynamicContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { isSuperAdmin } from '../../utils/permissions';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement, Filler);

const DOC_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function CabinetsUnified() {
  const navigate = useNavigate();
  const { dark } = useTheme();
  const { user } = useAuth();
  const isRayan = isSuperAdmin(user);
  const cardCls = isRayan ? 'bg-white border border-gray-200 shadow-sm' : 'bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-gray-700';
  const chartTextColor = (dark && !isRayan) ? '#94a3b8' : '#64748b';
  const chartGridColor = (dark && !isRayan) ? 'rgba(148, 163, 184, 0.1)' : 'rgba(226, 232, 240, 0.5)';
  
  const [activeTab, setActiveTab] = useState('analysis'); // 'analysis' | 'comparison'
  const [data, setData] = useState(null);
  const [practitioners, setPractitioners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState({ period: 'all_time' });
  const [expandedInsight, setExpandedInsight] = useState({ patients: false, activite: false });
  
  const { isDynamic: _isDynamic, dataAccessEnabled } = useDynamic();
  const isDynamic = isRayan || _isDynamic;
  const showAI = dataAccessEnabled || isRayan;
  
  // Refs pour les charts
  const patientsChartRef = useRef(null);
  const activiteChartRef = useRef(null);
  const barChartRef = useRef(null);
  const doughnutChartRef = useRef(null);
  const lineEvolutionRef = useRef(null);

  // Helper pour calculer les dates de début/fin basées sur la période
  const getPeriodDates = useCallback((periodObj) => {
    const now = new Date();
    let startDate, endDate;
    
    switch (periodObj?.period) {
      case 'all_time':
        startDate = new Date(2020, 0, 1);
        endDate = new Date(now.getFullYear() + 1, 11, 31);
        break;
      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case '3_months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case '6_months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'this_year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      case 'last_year':
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        endDate = new Date(now.getFullYear() - 1, 11, 31);
        break;
      case 'custom':
        startDate = periodObj.startDate ? new Date(periodObj.startDate) : new Date(now.getFullYear(), 0, 1);
        endDate = periodObj.endDate ? new Date(periodObj.endDate) : now;
        break;
      default:
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
    }
    return { startDate, endDate };
  }, []);

  // Filtrer les données par période (format mois: YYYY-MM ou YYYYMM ou YYYYMMDD)
  const filterByPeriod = useCallback((dataArray, periodObj, dateField = 'mois') => {
    if (!dataArray || !Array.isArray(dataArray)) return [];
    const { startDate, endDate } = getPeriodDates(periodObj);
    
    return dataArray.filter(item => {
      let moisStr = item[dateField] || item._id?.[dateField] || item._id?.mois;
      if (!moisStr) return true; // Garder si pas de date
      
      // Supporter les formats YYYY-MM, YYYYMM, YYYYMMDD
      let year, month;
      if (moisStr.includes('-')) {
        // Format YYYY-MM
        const parts = moisStr.split('-');
        year = parseInt(parts[0]);
        month = parseInt(parts[1]) - 1;
      } else {
        // Format YYYYMM ou YYYYMMDD
        year = parseInt(moisStr.substring(0, 4));
        month = parseInt(moisStr.substring(4, 6)) - 1;
      }
      const itemDate = new Date(year, month, 1);
      
      return itemDate >= startDate && itemDate <= endDate;
    });
  }, [getPeriodDates]);

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
  }, [period]); // Re-fetch quand la période change

  const fetchAllData = async () => {
    setLoading(true);
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
  // DONNÉES COMMUNES - Filtrées par période
  // ═══════════════════════════════════════════════════════════════════
  const rawCaMensuel = data?.dashboard?.caMensuel || [];
  const rawRdvMensuel = data?.dashboard?.rdvMensuel || [];
  const rawHeuresByP = data?.dashboard?.heuresByPractitioner || [];
  
  // Appliquer le filtre de période aux données mensuelles
  const caMensuelFiltered = useMemo(() => {
    return filterByPeriod(rawCaMensuel, period, '_id.mois');
  }, [rawCaMensuel, period, filterByPeriod]);

  // Agrégation mensuelle pour le graphe Évolution CA
  const fmtMoisLabel = (m) => {
    if (!m) return '';
    const months = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    return `${months[parseInt(m.substring(4,6))-1]} ${m.substring(2,4)}`;
  };

  const monthlyEvolution = useMemo(() => {
    const byMonth = {};
    caMensuelFiltered.forEach(item => {
      const mois = item._id?.mois;
      if (!mois) return;
      if (!byMonth[mois]) byMonth[mois] = { mois, facture: 0, encaisse: 0 };
      byMonth[mois].facture += item.totalFacture || 0;
      byMonth[mois].encaisse += item.totalEncaisse || 0;
    });
    return Object.values(byMonth).sort((a, b) => a.mois.localeCompare(b.mois));
  }, [caMensuelFiltered]);

  const evolutionLineData = useMemo(() => ({
    labels: monthlyEvolution.map(m => fmtMoisLabel(m.mois)),
    datasets: [
      {
        label: 'Facturé',
        data: monthlyEvolution.map(m => m.facture),
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139,92,246,0.12)',
        fill: true, tension: 0.4, borderWidth: 2.5,
        pointRadius: 4, pointBackgroundColor: '#fff', pointBorderColor: '#8b5cf6', pointBorderWidth: 2,
      },
      {
        label: 'Encaissé',
        data: monthlyEvolution.map(m => m.encaisse),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.08)',
        fill: true, tension: 0.4, borderWidth: 2.5,
        pointRadius: 4, pointBackgroundColor: '#fff', pointBorderColor: '#3b82f6', pointBorderWidth: 2,
      }
    ]
  }), [monthlyEvolution]);

  const evolutionLineOptions = {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'bottom', labels: { color: chartTextColor, usePointStyle: true, pointStyle: 'circle', font: { size: 11, weight: '500' }, padding: 20 } },
      tooltip: {
        backgroundColor: '#1e293b', titleColor: '#f8fafc', bodyColor: '#e2e8f0',
        cornerRadius: 10, padding: 14, displayColors: true, usePointStyle: true,
        callbacks: { label: (c) => ` ${c.dataset.label}: ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(c.raw || 0)}` }
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: chartTextColor, font: { size: 10 }, maxRotation: 45 }, border: { display: false } },
      y: { beginAtZero: true, grid: { color: chartGridColor }, ticks: { color: chartTextColor, font: { size: 10 }, callback: v => `${(v/1000).toFixed(0)}k€` }, border: { display: false } }
    }
  };
  
  const rdvMensuelFiltered = useMemo(() => {
    return filterByPeriod(rawRdvMensuel, period, '_id.mois');
  }, [rawRdvMensuel, period, filterByPeriod]);
  
  // Agréger les données CA filtrées par praticien
  const caByP = useMemo(() => {
    const byPrac = {};
    caMensuelFiltered.forEach(item => {
      const praticien = item._id?.praticien;
      if (!praticien) return;
      if (!byPrac[praticien]) {
        byPrac[praticien] = { _id: praticien, totalFacture: 0, totalEncaisse: 0, totalPatients: 0 };
      }
      byPrac[praticien].totalFacture += item.totalFacture || 0;
      byPrac[praticien].totalEncaisse += item.totalEncaisse || 0;
      byPrac[praticien].totalPatients += item.totalPatients || 0;
    });
    return Object.values(byPrac);
  }, [caMensuelFiltered]);
  
  // Agréger les données RDV filtrées par praticien
  const rdvByP = useMemo(() => {
    const byPrac = {};
    rdvMensuelFiltered.forEach(item => {
      const praticien = item._id?.praticien;
      if (!praticien) return;
      if (!byPrac[praticien]) {
        byPrac[praticien] = { _id: praticien, totalRdv: 0, totalPatients: 0, totalNouveaux: 0 };
      }
      byPrac[praticien].totalRdv += item.totalRdv || 0;
      byPrac[praticien].totalPatients += item.totalPatients || 0;
      byPrac[praticien].totalNouveaux += item.totalNouveaux || 0;
    });
    return Object.values(byPrac);
  }, [rdvMensuelFiltered]);
  
  const heuresByP = rawHeuresByP;
  const rdvMensuel = rdvMensuelFiltered;

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
    // Score calculé avec bonus +10% pour meilleure visibilité
    const baseScore = totalCA > 0 ? Math.round((totalEncaisse / totalCA) * 100) : 0;
    const score = Math.min(baseScore + 10, 100);

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

  // KPI cartes haut de page — Analyse globales
  const kpiCATotal = caByP.reduce((s, p) => s + (p.totalFacture || 0), 0);
  const kpiEncaisseTotal = caByP.reduce((s, p) => s + (p.totalEncaisse || 0), 0);
  const kpiPatientsTotal = caByP.reduce((s, p) => s + (p.totalPatients || 0), 0);
  const kpiRapports = data?.dashboard?.totalReports || 0;
  const kpiEmails = data?.dashboard?.reportsEnvoyes || 0;
  const kpiPerf = pracData.length > 0 ? Math.round(pracData.reduce((s, p) => s + (p.score || 0), 0) / pracData.length) : 0;

  // Label de période pour affichage
  const periodLabel = useMemo(() => {
    if (!period?.period) return 'Toute la durée';
    if (period.period === 'all_time') return 'Toute la durée (2024 → 2026)';
    if (period.period === 'this_month') return 'Ce mois';
    if (period.period === 'last_month') return 'Mois dernier';
    if (period.period === '3_months') return '3 derniers mois';
    if (period.period === '6_months') return '6 derniers mois';
    if (period.period === 'this_year') return `Année ${new Date().getFullYear()}`;
    if (period.period === 'last_year') return `Année ${new Date().getFullYear() - 1}`;
    if (period.period === 'custom' && period.startDate && period.endDate) {
      return `${new Date(period.startDate).toLocaleDateString('fr-FR', {month:'short',year:'numeric'})} → ${new Date(period.endDate).toLocaleDateString('fr-FR', {month:'short',year:'numeric'})}`;
    }
    return 'Période sélectionnée';
  }, [period]);

  // Label des années couvertes par les données filtrées
  const yearsLabel = useMemo(() => {
    const years = [...new Set(caMensuelFiltered.map(c => {
      const m = c._id?.mois || '';
      return m ? m.substring(0, 4) : null;
    }).filter(Boolean))].sort();
    if (years.length === 0) return 'Toutes années';
    if (years.length === 1) return years[0];
    return `${years[0]} → ${years[years.length - 1]}`;
  }, [caMensuelFiltered]);

  // Label des cabinets analysés (depuis les données de la période)
  const cabinetsLabel = useMemo(() => {
    const codes = caByP.filter(c => (c.totalFacture || 0) > 0).map(c => c._id);
    return codes.length > 0 ? codes.join(' · ') : (practitioners.map(p => p.code).join(' · ') || 'Tous');
  }, [caByP, practitioners]);

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
  const animKpiCA = useCountUp(Math.round(kpiCATotal), 2000, dyn);
  const animKpiEncaisse = useCountUp(Math.round(kpiEncaisseTotal), 2000, dyn);
  const animKpiPatients = useCountUp(kpiPatientsTotal, 1800, dyn);
  const animKpiRapports = useCountUp(kpiRapports, 1200, dyn);
  const animKpiPerf = useCountUp(kpiPerf, 1600, dyn);

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
      tooltip: { 
        backgroundColor: 'rgba(15, 23, 42, 0.95)', 
        titleColor: '#fff', 
        bodyColor: '#e2e8f0', 
        cornerRadius: 8,
        padding: 12,
        callbacks: {
          afterBody: (context) => {
            if (context.length === 0) return [];
            const dataIndex = context[0].dataIndex;
            const p = pracData[dataIndex];
            if (!p) return [];
            const total = p.presents + p.absents;
            const tauxPresence = total > 0 ? ((p.presents / total) * 100).toFixed(1) : 0;
            return [
              '',
              `📊 Taux présence: ${tauxPresence}%`,
              `📈 Score santé: ${p.health?.score || 0}/100`
            ];
          }
        }
      },
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

  // Options avancées pour le Doughnut avec tooltip détaillé par praticien
  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: chartTextColor, padding: 16 } },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = totalPresents + totalAbsents;
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${label}: ${value.toLocaleString()} (${percentage}%)`;
          },
          afterLabel: (context) => {
            // Afficher la répartition par praticien
            const isAbsents = context.dataIndex === 1;
            const lines = [];
            lines.push(''); // Ligne vide pour séparer
            lines.push('── Détail par cabinet ──');
            pracData.forEach(p => {
              const val = isAbsents ? p.absents : p.presents;
              if (val > 0) {
                lines.push(`  ${p.code}: ${val.toLocaleString()}`);
              }
            });
            return lines;
          }
        },
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(59, 130, 246, 0.3)',
        borderWidth: 1,
        padding: 12,
        bodySpacing: 4,
        displayColors: true,
      }
    }
  };

  const renderAnalysisView = () => (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="mb-1 px-0.5">
        <p className="text-xs text-gray-400">Indicateurs d'activité \u00b7 Dr. {cabinetsLabel} \u00b7 {periodLabel} ({yearsLabel})</p>
      </div>
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
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Patients par Cabinet</h3>
              <p className="text-xs text-gray-400 mt-0.5">Dr. {cabinetsLabel} · {periodLabel} ({yearsLabel})</p>
            </div>
          </div>
          <div className="h-72">
            <Bar ref={patientsChartRef} data={patientsBarData} options={barOptions} plugins={isDynamic ? [streamingBarPlugin] : []} />
          </div>
          {/* AI insight removed */}
        </div>

        <div className={`${cardCls} rounded-xl p-6`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Activité par Cabinet</h3>
              <p className="text-xs text-gray-400 mt-0.5">Consultations & heures · Dr. {cabinetsLabel} · {yearsLabel}</p>
            </div>
          </div>
          <div className="h-72">
            <Bar ref={activiteChartRef} data={activiteBarData} options={barOptions} plugins={isDynamic ? [streamingBarPlugin] : []} />
          </div>
          {/* AI insight removed */}
        </div>
      </div>

      {/* Health Scores Table */}
      <div className={`${cardCls} rounded-xl overflow-hidden`}>
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">Scores de Santé IA par Cabinet</h3>
          <p className="text-xs text-gray-400 mt-0.5">Calcul basé sur encaissement, absences & CA · Dr. {cabinetsLabel} · {periodLabel} ({yearsLabel})</p>
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
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Présences vs Absences par Cabinet</h3>
          <p className="text-xs text-gray-400 mb-4">RDV honorés vs manqués/annulés · Dr. {cabinetsLabel} · {periodLabel} ({yearsLabel})</p>
          <div className="h-72">
            <Bar ref={barChartRef} data={comparisonBarData} options={barOptions} plugins={isDynamic ? [streamingBarPlugin] : []} />
          </div>
        </div>

        <div className={`${cardCls} rounded-xl p-6`}>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Présence vs Absence — Répartition Globale</h3>
          <p className="text-xs text-gray-400 mb-4">Tous cabinets confondus · Dr. {cabinetsLabel} · {yearsLabel}</p>
          <div className="h-64">
            <Doughnut 
              ref={doughnutChartRef}
              data={doughnutData} 
              options={doughnutOptions} 
            />
          </div>
        </div>
      </div>


    </div>
  );

  const renderDashboardView = () => {
    const panierMoyenGlobal = kpiPatientsTotal > 0 ? Math.round(kpiCATotal / kpiPatientsTotal) : 0;
    const tauxEncGlobal = kpiCATotal > 0 ? Math.round((kpiEncaisseTotal / kpiCATotal) * 100) : 0;
    const rankedPracs = [...pracData].sort((a, b) => b.totalCA - a.totalCA);
    const fmtEur = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);

    const caBarData = {
      labels: monthlyEvolution.map((m) => fmtMoisLabel(m.mois)),
      datasets: [
        { label: 'CA Facturé', data: monthlyEvolution.map((m) => m.facture), backgroundColor: '#6366f1', borderRadius: 6 },
        { label: 'CA Encaissé', data: monthlyEvolution.map((m) => m.encaisse), backgroundColor: '#10b981', borderRadius: 6 },
      ],
    };

    const hBarData = {
      labels: pracData.map((p) => p.name),
      datasets: [{ label: 'CA Facturé', data: pracData.map((p) => p.totalCA), backgroundColor: pracData.map((p) => p.color), borderRadius: 4 }],
    };

    const tauxEncDoughnut = {
      labels: pracData.map((p) => p.code),
      datasets: [{ data: pracData.map((p) => p.totalEncaisse), backgroundColor: DOC_COLORS, borderWidth: 0 }],
    };

    const hBarOptions = {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: '#1e293b', callbacks: { label: (c) => ` ${fmtEur(c.raw)}` } },
      },
      scales: {
        x: { beginAtZero: true, grid: { color: chartGridColor }, ticks: { color: chartTextColor, font: { size: 10 }, callback: (v) => `${(v / 1000).toFixed(0)}k€` }, border: { display: false } },
        y: { ticks: { color: chartTextColor, font: { size: 11 } }, grid: { display: false }, border: { display: false } },
      },
    };

    const barCaOptions = {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: chartTextColor, usePointStyle: true, font: { size: 11 }, padding: 16 } },
        tooltip: { backgroundColor: '#1e293b', callbacks: { label: (c) => ` ${c.dataset.label}: ${fmtEur(c.raw)}` } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: chartTextColor, font: { size: 10 }, maxRotation: 45 }, border: { display: false } },
        y: { beginAtZero: true, grid: { color: chartGridColor }, ticks: { color: chartTextColor, callback: (v) => `${(v / 1000).toFixed(0)}k€` }, border: { display: false } },
      },
    };

    const doughnutSimpleOpts = {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: chartTextColor, font: { size: 10 }, padding: 10, usePointStyle: true } } },
    };

    const totalAbsRate = (totalPresents + totalAbsents) > 0 ? Math.round((totalAbsents / (totalPresents + totalAbsents)) * 100) : 0;
    const presenceRate = 100 - totalAbsRate;

    const insights = [];
    const topCA = rankedPracs[0];
    if (topCA) insights.push(`🏆 ${topCA.name} (${topCA.code}) génère le CA le plus élevé sur la période sélectionnée (${fmtEur(topCA.totalCA)}).`);
    insights.push(tauxEncGlobal >= 85
      ? `✅ Le taux d'encaissement global (${tauxEncGlobal}%) est excellent — au-dessus du seuil optimal de 85%.`
      : `⚠️ Le taux d'encaissement global (${tauxEncGlobal}%) est en dessous du seuil optimal de 85% — un suivi des impayés est recommandé.`);
    insights.push(totalAbsRate > 15
      ? `⚠️ Le taux d'absence (${totalAbsRate}%) dépasse 15% — renforcer la confirmation des RDV.`
      : `✅ Le taux de présence (${presenceRate}%) est maîtrisé et conforme aux standards du secteur.`);
    insights.push(panierMoyenGlobal >= 400
      ? `📈 Panier moyen de ${fmtEur(panierMoyenGlobal)} — au-dessus du seuil de 400 €, signe d'une bonne conversion des plans de traitement.`
      : `📉 Panier moyen de ${fmtEur(panierMoyenGlobal)} — en dessous du seuil de 400 €, potentiel d'amélioration sur la présentation des devis.`);
    if (rankedPracs.length > 1) {
      const lowest = rankedPracs[rankedPracs.length - 1];
      insights.push(`📊 Écart de performance entre cabinets: ${fmtEur(topCA.totalCA - lowest.totalCA)} entre le 1er (${topCA.code}) et le dernier (${lowest.code}).`);
    }

    return (
      <div className="space-y-5">
        {/* ── Bandeau contexte ───────────────────── */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1">
            <FiCalendar className="w-3.5 h-3.5" />
            {periodLabel} ({yearsLabel})
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1">
            <FiUsers className="w-3.5 h-3.5" />
            Dr. {cabinetsLabel}
          </span>
          <span className="text-xs text-gray-400">Tableau de bord exécutif — toutes les données sont filtrées selon la période et les cabinets actifs</span>
        </div>

        {/* ── Top 5 KPIs ─────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-indigo-600 rounded-2xl p-5 text-white">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold opacity-80 uppercase tracking-wider">CA Total</p>
              <FiDollarSign className="w-5 h-5 opacity-60" />
            </div>
            <p className="text-2xl font-bold tabular-nums">{fmtEur(kpiCATotal)}</p>
            <p className="text-xs opacity-70 mt-1">{practitioners.length} cabinets · {yearsLabel}</p>
          </div>
          <div className="bg-violet-600 rounded-2xl p-5 text-white">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold opacity-80 uppercase tracking-wider">Consultations</p>
              <FiCalendar className="w-5 h-5 opacity-60" />
            </div>
            <p className="text-2xl font-bold tabular-nums">{totalConsultations.toLocaleString('fr-FR')}</p>
            <p className="text-xs opacity-70 mt-1">{Math.round(totalConsultations / Math.max(practitioners.length, 1))} / cabinet</p>
          </div>
          <div className="bg-cyan-600 rounded-2xl p-5 text-white">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold opacity-80 uppercase tracking-wider">Panier Moyen</p>
              <FiTrendingUp className="w-5 h-5 opacity-60" />
            </div>
            <p className="text-2xl font-bold tabular-nums">{fmtEur(panierMoyenGlobal)}</p>
            <p className="text-xs opacity-70 mt-1">{panierMoyenGlobal >= 400 ? '✓ Objectif atteint' : '↗ Objectif: 400 €'}</p>
          </div>
          <div className="bg-emerald-600 rounded-2xl p-5 text-white">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold opacity-80 uppercase tracking-wider">Patients</p>
              <FiUsers className="w-5 h-5 opacity-60" />
            </div>
            <p className="text-2xl font-bold tabular-nums">{kpiPatientsTotal.toLocaleString('fr-FR')}</p>
            <p className="text-xs opacity-70 mt-1">traités · {yearsLabel}</p>
          </div>
          <div className={`rounded-2xl p-5 text-white ${tauxEncGlobal >= 85 ? 'bg-green-600' : tauxEncGlobal >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold opacity-80 uppercase tracking-wider">Taux Enc.</p>
              <FiBarChart2 className="w-5 h-5 opacity-60" />
            </div>
            <p className="text-2xl font-bold tabular-nums">{tauxEncGlobal}%</p>
            <p className="text-xs opacity-70 mt-1">{tauxEncGlobal >= 85 ? 'Excellent' : tauxEncGlobal >= 70 ? 'Correct' : 'À améliorer'}</p>
          </div>
        </div>

        {/* ── Évolution CA + CA par Praticien ─────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className={`${cardCls} rounded-2xl p-5 lg:col-span-2`}>
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Évolution CA — Facturé vs Encaissé</h3>
              <p className="text-xs text-gray-400 mt-0.5">Dr. {cabinetsLabel} · {periodLabel} ({yearsLabel})</p>
            </div>
            <div className="h-64">
              <Bar data={caBarData} options={barCaOptions} />
            </div>
          </div>
          <div className={`${cardCls} rounded-2xl p-5`}>
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">CA par Praticien</h3>
              <p className="text-xs text-gray-400 mt-0.5">CA facturé cumulé · {periodLabel} ({yearsLabel})</p>
            </div>
            <div style={{ height: `${Math.max(160, pracData.length * 54)}px` }}>
              <Bar data={hBarData} options={hBarOptions} />
            </div>
          </div>
        </div>

        {/* ── Donuts + Classement ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className={`${cardCls} rounded-2xl p-5`}>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">Répartition CA Encaissé</h3>
            <p className="text-xs text-gray-400 mb-1">Part d'encaissement par cabinet</p>
            <p className="text-xs text-indigo-400 mb-3 font-medium">Dr. {cabinetsLabel} · {periodLabel} ({yearsLabel})</p>
            <div className="h-52">
              <Doughnut data={tauxEncDoughnut} options={doughnutSimpleOpts} />
            </div>
          </div>
          <div className={`${cardCls} rounded-2xl p-5`}>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">Présence vs Absence (RDV)</h3>
            <p className="text-xs text-gray-400 mb-1">Répartition globale des rendez-vous</p>
            <p className="text-xs text-indigo-400 mb-3 font-medium">Dr. {cabinetsLabel} · {periodLabel} ({yearsLabel})</p>
            <div className="h-44">
              <Doughnut data={doughnutData} options={doughnutSimpleOpts} />
            </div>
            <div className="mt-3 flex justify-around text-center">
              <div>
                <p className="text-lg font-bold text-emerald-600">{presenceRate}%</p>
                <p className="text-xs text-gray-400">Présents</p>
              </div>
              <div>
                <p className="text-lg font-bold text-red-500">{totalAbsRate}%</p>
                <p className="text-xs text-gray-400">Absents</p>
              </div>
            </div>
          </div>
          <div className={`${cardCls} rounded-2xl p-5`}>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">Top Praticiens par CA</h3>
            <p className="text-xs text-gray-400 mb-1">Classement sur la période</p>
            <p className="text-xs text-indigo-400 mb-4 font-medium">{periodLabel} ({yearsLabel})</p>
            <div className="space-y-3">
              {rankedPracs.map((p, i) => (
                <div key={p.code} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-amber-700' : 'bg-gray-300 text-gray-600'}`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{p.name}</p>
                    <div className="mt-1 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                      <div className="h-1.5 rounded-full transition-all" style={{ width: `${rankedPracs[0]?.totalCA > 0 ? (p.totalCA / rankedPracs[0].totalCA) * 100 : 0}%`, backgroundColor: p.color }} />
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">{fmtEur(p.totalCA)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Insights IA + Synthèse ───────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-slate-800 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-2.5 mb-2">
              <FiCpu className="w-5 h-5 text-indigo-400" />
              <h3 className="font-semibold text-sm">Insights Clés</h3>
              <span className="ml-auto text-[10px] bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">IA</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">Analyse automatique · Dr. {cabinetsLabel} · {periodLabel} ({yearsLabel})</p>
            <ul className="space-y-3.5">
              {insights.map((ins, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                  <p className="text-sm text-slate-300 leading-relaxed">{ins}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className={`${cardCls} rounded-2xl overflow-hidden`}>
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Synthèse par Cabinet</h3>
              <p className="text-xs text-gray-400 mt-0.5">CA facturé, patients traités, encaissement & score santé \u00b7 Dr. {cabinetsLabel} \u00b7 {periodLabel} ({yearsLabel})</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Cabinet</th>
                    <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500 uppercase">CA</th>
                    <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500 uppercase">Patients</th>
                    <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500 uppercase">Taux Enc.</th>
                    <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500 uppercase">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {rankedPracs.map((p) => {
                    const tEnc = p.totalCA > 0 ? Math.round((p.totalEncaisse / p.totalCA) * 100) : 0;
                    return (
                      <tr key={p.code} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                            <span className="text-xs font-medium text-gray-800 dark:text-gray-200">{p.code}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right text-xs text-gray-700 dark:text-gray-300">{fmtEur(p.totalCA)}</td>
                        <td className="px-3 py-3 text-right text-xs text-gray-700 dark:text-gray-300">{p.patientsTraites}</td>
                        <td className="px-3 py-3 text-right">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${tEnc >= 85 ? 'bg-green-100 text-green-700' : tEnc >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{tEnc}%</span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${p.health.score >= 80 ? 'bg-blue-100 text-blue-700' : p.health.score >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{p.health.score}</span>
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
  };

  return (
    <div className={`min-h-screen ${isRayan ? 'bg-gray-50' : 'bg-gray-50 dark:bg-[#0f172a]'}`}>
      <Header title="Analyse & Comparaison des Cabinets" />
      
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">

        {/* ── Bandeau info période & cabinets ─────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 mb-3 px-1">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1">
            <FiCalendar className="w-3.5 h-3.5" />
            {periodLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-100 rounded-full px-3 py-1">
            <FiUsers className="w-3.5 h-3.5" />
            Cabinets analysés : {cabinetsLabel}
          </span>
        </div>

        {/* ── KPI Synthèse Globale ────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-blue-400 mb-0.5">{periodLabel} · {cabinetsLabel}</p>
                <p className="text-sm text-blue-600 font-medium">CA Total Facturé</p>
                <p className="text-2xl font-bold text-blue-700 mt-1 tabular-nums">
                  {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(animKpiCA)}
                </p>
                <p className="text-xs text-blue-500 mt-1">{practitioners.length} cabinets actifs</p>
              </div>
              <FiDollarSign className="w-6 h-6 text-blue-400 flex-shrink-0" />
            </div>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-emerald-400 mb-0.5">{periodLabel} · {cabinetsLabel}</p>
                <p className="text-sm text-emerald-600 font-medium">CA Encaissé</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1 tabular-nums">
                  {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(animKpiEncaisse)}
                </p>
                <p className="text-xs text-emerald-500 mt-1">
                  {kpiCATotal > 0 ? Math.round((kpiEncaisseTotal / kpiCATotal) * 100) : 0}% taux
                </p>
              </div>
              <FiTrendingUp className="w-6 h-6 text-emerald-400 flex-shrink-0" />
            </div>
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-purple-400 mb-0.5">{periodLabel} · {cabinetsLabel}</p>
                <p className="text-sm text-purple-600 font-medium">Patients Total</p>
                <p className="text-2xl font-bold text-purple-700 mt-1 tabular-nums">{animKpiPatients.toLocaleString('fr-FR')}</p>
                <p className="text-xs text-purple-500 mt-1">traités sur la période</p>
              </div>
              <FiUsers className="w-6 h-6 text-purple-400 flex-shrink-0" />
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-amber-400 mb-0.5">Tous cabinets · Toutes années</p>
                <p className="text-sm text-amber-600 font-medium">Rapports Générés</p>
                <p className="text-2xl font-bold text-amber-700 mt-1 tabular-nums">{animKpiRapports}</p>
                <p className="text-xs text-amber-500 mt-1">au total</p>
              </div>
              <FiBarChart2 className="w-6 h-6 text-amber-400 flex-shrink-0" />
            </div>
          </div>
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-rose-400 mb-0.5">{periodLabel} · {cabinetsLabel}</p>
                <p className="text-sm text-rose-600 font-medium">Performance Moy.</p>
                <p className="text-2xl font-bold text-rose-700 mt-1 tabular-nums">{animKpiPerf}%</p>
                <p className="text-xs text-rose-500 mt-1">score moyen cabinets</p>
              </div>
              <FiTrendingUp className="w-6 h-6 text-rose-400 flex-shrink-0" />
            </div>
          </div>
        </div>

        {/* ── Cartes Praticiens ──────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          {practitioners.map((p, idx) => {
            const ca = caByP.find(c => c._id === p.code);
            const heuresEntry = rawHeuresByP.find(h => h._id === p.code);
            const hTotal = heuresEntry ? (heuresEntry.totalMinutes / 60) : 0;
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
                  <div className="text-center p-3 bg-white/70 rounded-xl shadow-sm border border-white/50">
                    <p className={`text-base font-bold ${theme.accent}`}>
                      {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(ca?.totalFacture || 0)}
                    </p>
                    <p className="text-[10px] mt-0.5 text-gray-500">CA Total</p>
                  </div>
                  <div className="text-center p-3 bg-white/70 rounded-xl shadow-sm border border-white/50">
                    <p className="text-base font-bold text-blue-600">{ca?.totalPatients || 0}</p>
                    <p className="text-[10px] mt-0.5 text-gray-500">Patients</p>
                  </div>
                  <div className="text-center p-3 bg-white/70 rounded-xl shadow-sm border border-white/50">
                    <p className="text-base font-bold text-amber-600">{hTotal.toFixed(0)}h</p>
                    <p className="text-[10px] mt-0.5 text-gray-500">Heures</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tabs + Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          {/* Tabs */}
          <div className="flex bg-white dark:bg-gray-800 rounded-xl p-1 shadow-sm border border-gray-200 dark:border-gray-700 gap-1">
            <button
              onClick={() => setActiveTab('analysis')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'analysis'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <FiGrid className="w-4 h-4" />
              Analyse & Comparaison
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <FiBarChart2 className="w-4 h-4" />
              Tableau Exécutif
            </button>
          </div>

          {/* Period Filter */}
          <PeriodFilter value={period} onChange={setPeriod} />
        </div>

        {/* Évolution du CA — graphe déplacé depuis le Dashboard */}
        {activeTab === 'analysis' && showAI && monthlyEvolution.length > 0 && (
          <div className={`rounded-2xl p-6 shadow-sm mb-6 ${cardCls}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className={`text-base font-bold ${isRayan ? 'text-gray-900' : 'text-gray-900 dark:text-white'}`}>Évolution du Chiffre d'Affaires — Facturé vs Encaissé</h3>
                <p className={`text-xs mt-0.5 ${isRayan ? 'text-gray-500' : 'text-gray-400 dark:text-gray-500'}`}>
                  Praticiens : {cabinetsLabel} · Période : {periodLabel} ({yearsLabel})
                </p>
              </div>
            </div>
            <div style={{ height: '260px' }}>
              <Line ref={lineEvolutionRef} data={evolutionLineData} options={evolutionLineOptions} />
            </div>
          </div>
        )}

        {/* Content conditionnel selon onglet actif */}
        {activeTab === 'analysis' && (
          <>
            {renderAnalysisView()}
            {renderComparisonView()}
          </>
        )}
        {activeTab === 'dashboard' && renderDashboardView()}
      </div>
    </div>
  );
}
