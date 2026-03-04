import { useState, useEffect } from 'react';
import { getConsultantAnalyses } from '../../services/api';
import PeriodFilter from '../../components/PeriodFilter';
import CabinetFilter from '../../components/CabinetFilter';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Radar, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const ScoreBadge = ({ score }) => {
  const getScoreStyle = (score) => {
    if (score >= 90) return { bg: 'bg-green-100', text: 'text-green-700', label: 'Excellent' };
    if (score >= 75) return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Bon' };
    if (score >= 50) return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Moyen' };
    return { bg: 'bg-red-100', text: 'text-red-700', label: 'À surveiller' };
  };

  const style = getScoreStyle(score);

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      <span className="font-bold">{score?.toFixed(0) || 0}</span>
      <span>• {style.label}</span>
    </span>
  );
};

export default function ConsultantAnalyses() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState({ period: 'this_month' });
  const [selectedCabinets, setSelectedCabinets] = useState([]);
  const [cabinets, setCabinets] = useState([]);
  const [selectedComparison, setSelectedComparison] = useState([]);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'

  const fetchAnalyses = async () => {
    try {
      setLoading(true);
      const params = {
        period: period.period,
        ...(period.startDate && { startDate: period.startDate }),
        ...(period.endDate && { endDate: period.endDate }),
        ...(selectedCabinets.length > 0 && { cabinets: selectedCabinets.join(',') })
      };

      const response = await getConsultantAnalyses(params);
      setData(response.data);

      // Extract cabinets list
      if (response.data.cabinetAnalyses) {
        setCabinets(response.data.cabinetAnalyses.map(c => ({
          code: c.practitionerCode,
          nom: c.practitionerName
        })));
      }
    } catch (error) {
      console.error('Erreur chargement analyses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyses();
  }, [period, selectedCabinets]);

  const toggleComparison = (code) => {
    if (selectedComparison.includes(code)) {
      setSelectedComparison(prev => prev.filter(c => c !== code));
    } else if (selectedComparison.length < 4) {
      setSelectedComparison(prev => [...prev, code]);
    }
  };

  // Radar chart for comparison
  const comparisonCabinets = data?.cabinetAnalyses?.filter(c => 
    selectedComparison.includes(c.practitionerCode)
  ) || [];

  const radarData = {
    labels: ['Taux Réalisation', 'Nouveaux Patients', 'RDV', 'Jours Ouverts', 'Devis Acceptés'],
    datasets: comparisonCabinets.map((cabinet, index) => {
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
      return {
        label: cabinet.practitionerName,
        data: [
          cabinet.metrics?.tauxRealisation || 0,
          Math.min((cabinet.metrics?.nouveauxPatients || 0) * 2, 100),
          Math.min((cabinet.metrics?.rdv || 0) / 5, 100),
          Math.min((cabinet.metrics?.joursOuverts || 0) * 5, 100),
          cabinet.metrics?.tauxAcceptationDevis || 0
        ],
        backgroundColor: `${colors[index]}33`,
        borderColor: colors[index],
        pointBackgroundColor: colors[index]
      };
    })
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: { stepSize: 20 }
      }
    },
    plugins: {
      legend: { position: 'bottom' }
    }
  };

  // Evolution comparison chart
  const evolutionData = {
    labels: data?.monthlyComparison?.months || [],
    datasets: comparisonCabinets.map((cabinet, index) => {
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
      const cabinetData = data?.monthlyComparison?.data?.[cabinet.practitionerCode] || [];
      return {
        label: cabinet.practitionerName,
        data: cabinetData.map(m => m.tauxRealisation || 0),
        borderColor: colors[index],
        backgroundColor: 'transparent',
        tension: 0.4
      };
    })
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analyses Globales</h1>
          <p className="text-gray-500">Analyse comparative de vos cabinets</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <PeriodFilter value={period} onChange={setPeriod} />
          <CabinetFilter 
            cabinets={cabinets}
            value={selectedCabinets}
            onChange={setSelectedCabinets}
          />
        </div>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500">Moyenne Globale</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {(data?.globalStats?.averageTauxRealisation || 0).toFixed(1)}%
          </p>
          <div className="mt-2">
            <ScoreBadge score={data?.globalStats?.averageTauxRealisation || 0} />
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500">Meilleur Cabinet</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {data?.globalStats?.bestCabinet?.name || '-'}
          </p>
          <p className="text-sm text-green-600 mt-1">
            {(data?.globalStats?.bestCabinet?.taux || 0).toFixed(1)}% de réalisation
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500">À Surveiller</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {data?.globalStats?.toWatch?.name || '-'}
          </p>
          <p className="text-sm text-red-600 mt-1">
            {(data?.globalStats?.toWatch?.taux || 0).toFixed(1)}% de réalisation
          </p>
        </div>
      </div>

      {/* Comparison Selection */}
      {selectedComparison.length > 0 && (
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-medium text-blue-900">Comparaison sélectionnée</p>
              <p className="text-sm text-blue-600">{selectedComparison.length}/4 cabinets</p>
            </div>
            <button
              onClick={() => setSelectedComparison([])}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Réinitialiser
            </button>
          </div>

          {/* Comparison Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-4">Comparaison Radar</h4>
              <div className="h-64">
                <Radar data={radarData} options={radarOptions} />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-4">Évolution Mensuelle</h4>
              <div className="h-64">
                <Line 
                  data={evolutionData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } },
                    scales: {
                      y: { beginAtZero: true, max: 120 }
                    }
                  }} 
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cabinet Analysis Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Performance des Cabinets</h3>
          <p className="text-sm text-gray-500">Cliquez pour comparer (max 4)</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Cabinet</th>
                <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Score Global</th>
                <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">CA Réalisé</th>
                <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Taux Réal.</th>
                <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Nvx Patients</th>
                <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">RDV</th>
                <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Tendance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.cabinetAnalyses?.map((cabinet) => (
                <tr 
                  key={cabinet.practitionerCode}
                  onClick={() => toggleComparison(cabinet.practitionerCode)}
                  className={`
                    cursor-pointer transition-colors
                    ${selectedComparison.includes(cabinet.practitionerCode) 
                      ? 'bg-blue-50 hover:bg-blue-100' 
                      : 'hover:bg-gray-50'}
                  `}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                        ${selectedComparison.includes(cabinet.practitionerCode)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600'}
                      `}>
                        {cabinet.practitionerName?.charAt(0) || 'C'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{cabinet.practitionerName}</p>
                        <p className="text-xs text-gray-500">{cabinet.practitionerCode}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <ScoreBadge score={cabinet.scoreGlobal} />
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-medium text-gray-900">
                    {(cabinet.metrics?.caRealise || 0).toLocaleString('fr-FR')} €
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            cabinet.metrics?.tauxRealisation >= 100 ? 'bg-green-500' :
                            cabinet.metrics?.tauxRealisation >= 80 ? 'bg-blue-500' :
                            cabinet.metrics?.tauxRealisation >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(cabinet.metrics?.tauxRealisation || 0, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm">{(cabinet.metrics?.tauxRealisation || 0).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-700">
                    {cabinet.metrics?.nouveauxPatients || 0}
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-700">
                    {cabinet.metrics?.rdv || 0}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {cabinet.trend === 'up' ? (
                      <ArrowTrendingUpIcon className="w-5 h-5 text-green-500 mx-auto" />
                    ) : cabinet.trend === 'down' ? (
                      <ArrowTrendingDownIcon className="w-5 h-5 text-red-500 mx-auto" />
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
