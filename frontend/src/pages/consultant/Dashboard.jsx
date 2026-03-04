import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getConsultantDashboard } from '../../services/api';
import PeriodFilter from '../../components/PeriodFilter';
import CabinetFilter from '../../components/CabinetFilter';
import {
  BuildingOfficeIcon,
  UsersIcon,
  ChartBarIcon,
  UserPlusIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const KpiCard = ({ title, value, icon: Icon, color, trend, trendValue }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    yellow: 'bg-amber-50 text-amber-600 border-amber-100',
    pink: 'bg-pink-50 text-pink-600 border-pink-100',
    green: 'bg-green-50 text-green-600 border-green-100'
  };

  return (
    <div className={`rounded-xl p-5 border ${colorClasses[color] || colorClasses.blue}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${trend === 'up' ? 'text-green-600' : 'text-red-500'}`}>
              {trend === 'up' ? (
                <ArrowTrendingUpIcon className="w-4 h-4" />
              ) : (
                <ArrowTrendingDownIcon className="w-4 h-4" />
              )}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className="w-12 h-12 rounded-xl bg-white/50 flex items-center justify-center">
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

export default function ConsultantDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState({ period: 'this_month' });
  const [selectedCabinets, setSelectedCabinets] = useState([]);
  const [cabinets, setCabinets] = useState([]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const params = {
        period: period.period,
        ...(period.startDate && { startDate: period.startDate }),
        ...(period.endDate && { endDate: period.endDate }),
        ...(selectedCabinets.length > 0 && { cabinets: selectedCabinets.join(',') })
      };
      
      const response = await getConsultantDashboard(params);
      setData(response.data);
      
      // Extract cabinets list from cabinetPerformance
      if (response.data.cabinetPerformance) {
        setCabinets(response.data.cabinetPerformance.map(c => ({
          code: c.practitionerCode,
          nom: c.practitionerName
        })));
      }
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [period, selectedCabinets]);

  // Chart configurations
  const evolutionChartData = {
    labels: data?.monthlyEvolution?.map(m => m.month) || [],
    datasets: [
      {
        label: 'CA Réalisé',
        data: data?.monthlyEvolution?.map(m => m.totalCA) || [],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Objectif',
        data: data?.monthlyEvolution?.map(m => m.totalObjectif) || [],
        borderColor: '#10b981',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0.4
      }
    ]
  };

  const cabinetBarData = {
    labels: data?.cabinetPerformance?.slice(0, 10).map(c => c.practitionerName) || [],
    datasets: [{
      label: 'Taux de réalisation (%)',
      data: data?.cabinetPerformance?.slice(0, 10).map(c => c.tauxRealisation) || [],
      backgroundColor: data?.cabinetPerformance?.slice(0, 10).map(c => 
        c.tauxRealisation >= 100 ? '#10b981' : 
        c.tauxRealisation >= 80 ? '#3b82f6' : 
        c.tauxRealisation >= 60 ? '#f59e0b' : '#ef4444'
      ) || []
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { usePointStyle: true, padding: 20 }
      }
    },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
      x: { grid: { display: false } }
    }
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
          <h1 className="text-2xl font-bold text-gray-900">
            Bonjour {user?.prenom || 'Consultant'} 👋
          </h1>
          <p className="text-gray-500">Vue d'ensemble de vos cabinets</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <PeriodFilter value={period} onChange={setPeriod} />
          <CabinetFilter 
            cabinets={cabinets}
            value={selectedCabinets}
            onChange={setSelectedCabinets}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Cabinets Filtrés"
          value={data?.globalMetrics?.totalCabinets || 0}
          icon={BuildingOfficeIcon}
          color="blue"
        />
        <KpiCard
          title="Praticiens"
          value={data?.globalMetrics?.totalPraticiens || 0}
          icon={UsersIcon}
          color="purple"
        />
        <KpiCard
          title="Taux Moyen"
          value={`${(data?.globalMetrics?.tauxMoyenRealisation || 0).toFixed(1)}%`}
          icon={ChartBarIcon}
          color="yellow"
          trend={data?.globalMetrics?.tauxMoyenRealisation >= 80 ? 'up' : 'down'}
          trendValue={data?.globalMetrics?.tauxMoyenRealisation >= 80 ? 'Bon' : 'À améliorer'}
        />
        <KpiCard
          title="Nouveaux Patients"
          value={data?.globalMetrics?.totalNouveauxPatients || 0}
          icon={UserPlusIcon}
          color="pink"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolution Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Évolution du CA</h3>
          <div className="h-72">
            <Line data={evolutionChartData} options={chartOptions} />
          </div>
        </div>

        {/* Cabinet Performance */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance par Cabinet</h3>
          <div className="h-72">
            <Bar data={cabinetBarData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Cabinet List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Détail des Cabinets</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Cabinet</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">CA Réalisé</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Objectif</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Taux</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Nouveaux Patients</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Performance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.cabinetPerformance?.map((cabinet, index) => (
                <tr key={cabinet.practitionerCode} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{cabinet.practitionerName}</p>
                      <p className="text-xs text-gray-500">{cabinet.practitionerCode}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {(cabinet.caRealise || 0).toLocaleString('fr-FR')} €
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {(cabinet.objectif || 0).toLocaleString('fr-FR')} €
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            cabinet.tauxRealisation >= 100 ? 'bg-green-500' :
                            cabinet.tauxRealisation >= 80 ? 'bg-blue-500' :
                            cabinet.tauxRealisation >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(cabinet.tauxRealisation, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{(cabinet.tauxRealisation || 0).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {cabinet.nouveauxPatients || 0}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`
                      inline-flex px-2.5 py-1 rounded-full text-xs font-medium
                      ${cabinet.tauxRealisation >= 100 ? 'bg-green-100 text-green-700' :
                        cabinet.tauxRealisation >= 80 ? 'bg-blue-100 text-blue-700' :
                        cabinet.tauxRealisation >= 60 ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-red-100 text-red-700'}
                    `}>
                      {cabinet.tauxRealisation >= 100 ? 'Excellent' :
                       cabinet.tauxRealisation >= 80 ? 'Bon' :
                       cabinet.tauxRealisation >= 60 ? 'Moyen' : 'À surveiller'}
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
}
