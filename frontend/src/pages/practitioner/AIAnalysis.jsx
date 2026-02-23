import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { getPractitionerStatistics } from '../../services/api';
import { FiCpu, FiTrendingUp, FiTrendingDown, FiAlertTriangle, FiCheckCircle, FiTarget, FiActivity, FiBarChart2, FiZap, FiHeart, FiUsers, FiDollarSign, FiCalendar } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useDynamic } from '../../context/DynamicContext';
import {
  linearRegression,
  forecast as aiForecast,
  analyzeTrend,
  detectAnomalies,
  cabinetHealthScore,
  generateSimpleInsight,
  getSimpleHealthLabel,
} from '../../utils/aiModels';

export default function AIAnalysis() {
  const { user } = useAuth();
  const { dataAccessEnabled } = useDynamic();
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

  if (!dataAccessEnabled) {
    return (
      <div>
        <Header title="Analyse du Cabinet" subtitle="Bilan et prévisions" />
        <div className="p-8">
          <div className="max-w-3xl mx-auto">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-16 text-center">
              <FiCpu className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-6" />
              <h3 className="text-xl font-bold text-gray-400 dark:text-gray-500 mb-3">Modèles IA désactivés</h3>
              <p className="text-sm text-gray-400 dark:text-gray-500">Les analyses IA sont temporairement indisponibles.<br/>Contactez l'administrateur pour réactiver les modèles.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const monthlyData = data?.monthlyKPI || [];
  const fmt = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v || 0);

  // ═══ EXTRACT TIME SERIES ═══
  const caArray = monthlyData.map(d => d.caFacture || 0);
  const encaisseArray = monthlyData.map(d => d.caEncaisse || 0);
  const patientsArray = monthlyData.map(d => d.nbPatients || 0);
  const rentaArray = monthlyData.map(d => d.productionHoraire || d.rentabiliteHoraire || 0);

  // ═══ ANALYSES SIMPLIFIÉES ═══
  const caRegression = linearRegression(caArray);
  const caForecastValues = aiForecast(caArray, 3);
  const patientsForecast = aiForecast(patientsArray, 3);
  const caTrend = analyzeTrend(caArray);
  const patientsTrend = analyzeTrend(patientsArray);
  const rentaTrend = analyzeTrend(rentaArray);
  const caAnomalies = detectAnomalies(caArray, 1.5);
  const patientsAnomalies = detectAnomalies(patientsArray, 1.5);
  const anomalyCount = caAnomalies.filter(a => a.isAnomaly).length + patientsAnomalies.filter(a => a.isAnomaly).length;

  const lastMonth = monthlyData[monthlyData.length - 1] || {};
  const tauxEnc = lastMonth.caFacture > 0 ? (lastMonth.caEncaisse / lastMonth.caFacture) * 100 : 0;
  const tauxAbs = lastMonth.nbRdv > 0 ? ((lastMonth.nbRdv - lastMonth.nbPatients) / lastMonth.nbRdv) * 100 : 0;
  const health = cabinetHealthScore({
    tauxEncaissement: tauxEnc,
    evolutionCA: caRegression.slope,
    tauxAbsence: tauxAbs,
    productionHoraire: rentaArray[rentaArray.length - 1] || 0,
    tauxNouveauxPatients: lastMonth.nbNouveauxPatients || 0,
  });
  const healthLabel = getSimpleHealthLabel(health.score);

  const caInsight = generateSimpleInsight(caArray, 'chiffre d\'affaires');
  const patientsInsight = generateSimpleInsight(patientsArray, 'nombre de patients');

  const avgCA = caArray.length > 0 ? caArray.reduce((s, v) => s + v, 0) / caArray.length : 0;
  const avgRenta = rentaArray.length > 0 ? rentaArray.reduce((s, v) => s + v, 0) / rentaArray.length : 0;

  // ═══ CARTES D'ANALYSE SIMPLIFIÉES ═══
  const analyses = [
    {
      icon: FiDollarSign,
      title: 'Évolution du Chiffre d\'Affaires',
      subtitle: caInsight.trendLabel,
      emoji: caInsight.trendIcon,
      parts: caInsight.parts,
      extras: [
        { label: 'CA moyen mensuel', value: fmt(avgCA) },
        { label: 'Prévision mois prochain', value: fmt(caForecastValues[0]) },
        { label: 'Prévision M+2', value: fmt(caForecastValues[1]) },
        { label: 'Prévision M+3', value: fmt(caForecastValues[2]) },
      ],
      type: caTrend.trend === 'upward' ? 'positive' : caTrend.trend === 'downward' ? 'warning' : 'neutral',
    },
    {
      icon: FiUsers,
      title: 'Évolution de la Patientèle',
      subtitle: patientsInsight.trendLabel,
      emoji: patientsInsight.trendIcon,
      parts: patientsInsight.parts,
      extras: [
        { label: 'Patients par mois (moy.)', value: `${Math.round(patientsArray.reduce((s,v) => s+v, 0) / Math.max(1, patientsArray.length))}` },
        { label: 'Prévision mois prochain', value: `${Math.round(patientsForecast[0])} patients` },
        { label: 'Prévision M+2', value: `${Math.round(patientsForecast[1])} patients` },
      ],
      type: patientsTrend.trend === 'upward' ? 'positive' : patientsTrend.trend === 'downward' ? 'warning' : 'neutral',
    },
    {
      icon: FiActivity,
      title: 'Mois Inhabituels Détectés',
      subtitle: anomalyCount === 0 ? 'Aucun' : `${anomalyCount} mois`,
      emoji: anomalyCount === 0 ? '✅' : '⚠️',
      parts: anomalyCount > 0
        ? [`${anomalyCount} mois présentent des variations inhabituelles dans votre activité.`, 'Cela peut être lié à des congés, des travaux dans le cabinet ou un événement exceptionnel.', 'Ces mois sont mis en évidence dans vos graphiques pour les identifier facilement.']
        : ['Votre activité est régulière, sans variation anormale détectée.', 'C\'est un bon signe de stabilité pour votre cabinet.'],
      extras: [],
      type: anomalyCount === 0 ? 'positive' : anomalyCount <= 2 ? 'neutral' : 'warning',
    },
    {
      icon: FiHeart,
      title: 'Santé Globale du Cabinet',
      subtitle: `${healthLabel.label} — ${health.score}/100`,
      emoji: healthLabel.emoji,
      parts: [
        healthLabel.advice,
        `Taux d'encaissement : ${tauxEnc.toFixed(0)}% — ${tauxEnc >= 80 ? 'Très bien' : tauxEnc >= 60 ? 'Correct, peut être amélioré' : 'À améliorer'}.`,
        `Taux d'absence : ${tauxAbs.toFixed(1)}% — ${tauxAbs <= 5 ? 'Excellent' : tauxAbs <= 15 ? 'Acceptable' : 'Réfléchir à réduire les absences'}.`,
        `Productivité moyenne : ${avgRenta.toFixed(0)}€/h.`,
      ],
      extras: [
        { label: 'Encaissement', value: `${tauxEnc.toFixed(0)}%` },
        { label: 'Absences', value: `${tauxAbs.toFixed(1)}%` },
        { label: 'Productivité', value: `${avgRenta.toFixed(0)}€/h` },
      ],
      type: health.score >= 80 ? 'positive' : health.score >= 60 ? 'neutral' : 'warning',
    },
    {
      icon: FiTarget,
      title: 'Tendance Générale',
      subtitle: rentaTrend.trend === 'upward' ? 'En hausse' : rentaTrend.trend === 'downward' ? 'En baisse' : 'Stable',
      emoji: rentaTrend.trend === 'upward' ? '📈' : rentaTrend.trend === 'downward' ? '📉' : '➡️',
      parts: [
        (() => {
          if (caTrend.trend === 'upward' && patientsTrend.trend === 'upward') return 'Bonne nouvelle : le chiffre d\'affaires et le nombre de patients sont tous les deux en hausse. Le cabinet est en croissance.';
          if (caTrend.trend === 'upward' && patientsTrend.trend !== 'upward') return 'Le chiffre d\'affaires augmente mais le nombre de patients est stable. Cela peut indiquer des soins de plus grande valeur par patient.';
          if (caTrend.trend === 'downward') return 'Le chiffre d\'affaires montre une baisse. Il serait utile d\'identifier les causes pour agir.';
          return 'L\'activité du cabinet est globalement stable. Pour croître, cherchez de nouveaux leviers (communication, nouveaux soins, etc.).';
        })(),
        `Analyse réalisée sur ${monthlyData.length} mois de données.`,
      ],
      extras: [
        { label: 'CA', value: caTrend.trend === 'upward' ? '↑ Hausse' : caTrend.trend === 'downward' ? '↓ Baisse' : '→ Stable' },
        { label: 'Patients', value: patientsTrend.trend === 'upward' ? '↑ Hausse' : patientsTrend.trend === 'downward' ? '↓ Baisse' : '→ Stable' },
        { label: 'Rentabilité', value: rentaTrend.trend === 'upward' ? '↑ Hausse' : rentaTrend.trend === 'downward' ? '↓ Baisse' : '→ Stable' },
      ],
      type: caTrend.trend === 'upward' ? 'positive' : caTrend.trend === 'downward' ? 'warning' : 'neutral',
    },
  ];

  const typeColors = {
    positive: { bg: 'bg-green-50 dark:bg-green-900/30', border: 'border-green-200 dark:border-green-800', icon: 'text-green-600', badge: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' },
    warning: { bg: 'bg-amber-50 dark:bg-amber-900/30', border: 'border-amber-200 dark:border-amber-800', icon: 'text-amber-600', badge: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300' },
    neutral: { bg: 'bg-blue-50 dark:bg-blue-900/30', border: 'border-blue-200 dark:border-blue-800', icon: 'text-blue-600', badge: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' },
  };

  return (
    <div>
      <Header title="Analyse du Cabinet" subtitle={`Cabinet ${user?.cabinetName || user?.name || ''} — Bilan et prévisions`} />

      <div className="p-8">
        <div className="max-w-3xl mx-auto">
          {/* Header simplifié */}
          <div className="bg-gradient-to-r from-violet-600 via-blue-600 to-indigo-700 rounded-2xl p-8 text-white mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full -ml-12 -mb-12"></div>
            <div className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <FiCpu className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Bilan Intelligent du Cabinet</h2>
                  <p className="text-violet-200 text-sm">Analyse automatique de votre activité</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black">{monthlyData.length}</p>
                  <p className="text-[10px] text-violet-200 uppercase">Mois analysés</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black">{healthLabel.emoji} {health.score}</p>
                  <p className="text-[10px] text-violet-200 uppercase">Santé Cabinet</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black">{caInsight.trendIcon}</p>
                  <p className="text-[10px] text-violet-200 uppercase">Tendance CA</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black">{anomalyCount === 0 ? '✅' : `⚠️ ${anomalyCount}`}</p>
                  <p className="text-[10px] text-violet-200 uppercase">{anomalyCount === 0 ? 'Activité régulière' : 'Mois inhabituels'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Insight Panels simplifiés */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-gradient-to-br from-violet-50 to-blue-50 dark:from-violet-900/30 dark:to-blue-900/30 rounded-2xl border border-violet-100 dark:border-violet-800 p-5">
              <div className="flex items-center gap-2 mb-3">
                <FiDollarSign className="w-4 h-4 text-violet-600" />
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">Résumé — Chiffre d'Affaires</span>
                <span className="ml-auto text-[9px] font-semibold text-violet-600 bg-violet-100 dark:bg-violet-900/50 px-2 py-0.5 rounded-full">{caInsight.trendIcon} {caInsight.trendLabel}</span>
              </div>
              {caInsight.parts.map((p, i) => <p key={i} className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed mb-1">{p}</p>)}
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl border border-blue-100 dark:border-blue-800 p-5">
              <div className="flex items-center gap-2 mb-3">
                <FiUsers className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">Résumé — Patients</span>
                <span className="ml-auto text-[9px] font-semibold text-blue-600 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded-full">{patientsInsight.trendIcon} {patientsInsight.trendLabel}</span>
              </div>
              {patientsInsight.parts.map((p, i) => <p key={i} className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed mb-1">{p}</p>)}
            </div>
          </div>

          {/* Analysis Cards simplifiées */}
          <div className="space-y-6">
            {analyses.map((a, i) => {
              const colors = typeColors[a.type];
              return (
                <div key={i} className={`rounded-2xl border ${colors.border} overflow-hidden`}>
                  <div className={`${colors.bg} px-6 py-4 flex items-center gap-3`}>
                    <a.icon className={`w-6 h-6 ${colors.icon}`} />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{a.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{a.emoji} {a.subtitle}</p>
                    </div>
                    <div className="ml-auto">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors.badge}`}>
                        {a.type === 'positive' ? '✅ Positif' : a.type === 'warning' ? '⚠️ À surveiller' : 'ℹ️ Neutre'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-[#1e293b] px-6 py-4">
                    {a.parts.map((p, j) => <p key={j} className="text-sm text-gray-700 dark:text-gray-300 mb-2 leading-relaxed">{p}</p>)}
                    {a.extras.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        {a.extras.map((e, j) => (
                          <span key={j} className="text-[10px] bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-3 py-1.5 rounded-lg font-medium">
                            {e.label}: <span className="font-bold text-gray-800 dark:text-gray-200">{e.value}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
