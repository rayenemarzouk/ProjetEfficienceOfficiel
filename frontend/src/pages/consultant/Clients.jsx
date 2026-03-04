import { useState, useEffect } from 'react';
import { getConsultantClients, getConsultantClientDetail } from '../../services/api';
import PeriodFilter from '../../components/PeriodFilter';
import {
  MagnifyingGlassIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  XMarkIcon,
  ChartBarIcon,
  CalendarIcon,
  CurrencyEuroIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { Line, Bar } from 'react-chartjs-2';

const ClientCard = ({ client, isSelected, onClick }) => {
  const getStatusColor = (taux) => {
    if (taux >= 100) return 'bg-green-500';
    if (taux >= 80) return 'bg-blue-500';
    if (taux >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div
      onClick={onClick}
      className={`
        p-4 rounded-xl border cursor-pointer transition-all
        ${isSelected 
          ? 'bg-blue-50 border-blue-300 shadow-md' 
          : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'}
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`
          w-10 h-10 rounded-full flex items-center justify-center text-white font-bold
          ${getStatusColor(client.tauxRealisation)}
        `}>
          {client.practitionerName?.charAt(0) || 'C'}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">{client.practitionerName}</h4>
          <p className="text-xs text-gray-500">{client.practitionerCode}</p>
        </div>
      </div>
      
      <div className="mt-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">Taux de réalisation</p>
          <p className="text-lg font-bold text-gray-900">{(client.tauxRealisation || 0).toFixed(1)}%</p>
        </div>
        <div className={`
          w-3 h-3 rounded-full
          ${getStatusColor(client.tauxRealisation)}
        `} />
      </div>
    </div>
  );
};

export default function ConsultantClients() {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientDetail, setClientDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [period, setPeriod] = useState({ period: 'this_month' });

  const fetchClients = async () => {
    try {
      setLoading(true);
      const params = {
        search: searchQuery || undefined,
        period: period.period,
        ...(period.startDate && { startDate: period.startDate }),
        ...(period.endDate && { endDate: period.endDate })
      };
      const response = await getConsultantClients(params);
      setClients(response.data.clients || []);
    } catch (error) {
      console.error('Erreur chargement clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientDetail = async (code) => {
    try {
      setDetailLoading(true);
      const params = {
        period: period.period,
        ...(period.startDate && { startDate: period.startDate }),
        ...(period.endDate && { endDate: period.endDate })
      };
      const response = await getConsultantClientDetail(code, params);
      setClientDetail(response.data);
    } catch (error) {
      console.error('Erreur chargement détail client:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [searchQuery, period]);

  useEffect(() => {
    if (selectedClient) {
      fetchClientDetail(selectedClient);
    }
  }, [selectedClient, period]);

  const handleClientSelect = (code) => {
    setSelectedClient(code === selectedClient ? null : code);
    if (code !== selectedClient) {
      setClientDetail(null);
    }
  };

  // Chart data
  const evolutionChartData = {
    labels: clientDetail?.monthlyData?.map(m => m.month) || [],
    datasets: [
      {
        label: 'CA Réalisé',
        data: clientDetail?.monthlyData?.map(m => m.caRealise) || [],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Objectif',
        data: clientDetail?.monthlyData?.map(m => m.objectif) || [],
        borderColor: '#10b981',
        borderDash: [5, 5],
        backgroundColor: 'transparent',
        tension: 0.4
      }
    ]
  };

  const metricsChartData = {
    labels: ['RDV', 'Nvx Patients', 'Jours Ouverts', 'Devis'],
    datasets: [{
      label: 'Valeurs',
      data: [
        clientDetail?.summary?.rdvMois || 0,
        clientDetail?.summary?.nouveauxPatients || 0,
        clientDetail?.summary?.joursOuverts || 0,
        clientDetail?.summary?.devis || 0
      ],
      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']
    }]
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion Clients</h1>
          <p className="text-gray-500">Vue détaillée de vos cabinets</p>
        </div>

        <div className="flex items-center gap-3">
          <PeriodFilter value={period} onChange={setPeriod} />
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Search */}
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher un cabinet..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* List */}
            <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : clients.length === 0 ? (
                <p className="text-center text-gray-500 py-12">Aucun cabinet trouvé</p>
              ) : (
                clients.map((client) => (
                  <ClientCard
                    key={client.practitionerCode}
                    client={client}
                    isSelected={selectedClient === client.practitionerCode}
                    onClick={() => handleClientSelect(client.practitionerCode)}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Client Detail */}
        <div className="lg:col-span-2">
          {selectedClient ? (
            detailLoading ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
              </div>
            ) : clientDetail ? (
              <div className="space-y-6">
                {/* Client Header */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-blue-100 flex items-center justify-center">
                        <BuildingOfficeIcon className="w-8 h-8 text-blue-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">
                          {clientDetail.info?.practitionerName}
                        </h2>
                        <p className="text-gray-500">{clientDetail.info?.practitionerCode}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          {clientDetail.info?.email && (
                            <span className="flex items-center gap-1">
                              <EnvelopeIcon className="w-4 h-4" />
                              {clientDetail.info.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedClient(null)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <XMarkIcon className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 text-blue-600 mb-2">
                      <CurrencyEuroIcon className="w-5 h-5" />
                      <span className="text-xs font-medium">CA Réalisé</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {(clientDetail.summary?.caRealise || 0).toLocaleString('fr-FR')} €
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 text-green-600 mb-2">
                      <ChartBarIcon className="w-5 h-5" />
                      <span className="text-xs font-medium">Taux Réal.</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {(clientDetail.summary?.tauxRealisation || 0).toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 text-purple-600 mb-2">
                      <UserGroupIcon className="w-5 h-5" />
                      <span className="text-xs font-medium">Nvx Patients</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {clientDetail.summary?.nouveauxPatients || 0}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 text-amber-600 mb-2">
                      <CalendarIcon className="w-5 h-5" />
                      <span className="text-xs font-medium">RDV / Mois</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {clientDetail.summary?.rdvMois || 0}
                    </p>
                  </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                    <h3 className="font-semibold text-gray-900 mb-4">Évolution CA</h3>
                    <div className="h-64">
                      <Line 
                        data={evolutionChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { legend: { position: 'bottom' } },
                          scales: { y: { beginAtZero: true } }
                        }}
                      />
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                    <h3 className="font-semibold text-gray-900 mb-4">Métriques</h3>
                    <div className="h-64">
                      <Bar 
                        data={metricsChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { legend: { display: false } },
                          scales: { y: { beginAtZero: true } }
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Recent Data Table */}
                {clientDetail.recentData && clientDetail.recentData.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                      <h3 className="font-semibold text-gray-900">Données Récentes</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Mois</th>
                            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">CA</th>
                            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Objectif</th>
                            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Taux</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {clientDetail.recentData.slice(0, 6).map((row, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">{row.mois}</td>
                              <td className="px-4 py-3 text-sm text-gray-700 text-right">
                                {(row.caRealise || 0).toLocaleString('fr-FR')} €
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 text-right">
                                {(row.objectif || 0).toLocaleString('fr-FR')} €
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className={`
                                  inline-flex px-2 py-0.5 rounded text-xs font-medium
                                  ${row.tauxRealisation >= 100 ? 'bg-green-100 text-green-700' :
                                    row.tauxRealisation >= 80 ? 'bg-blue-100 text-blue-700' :
                                    row.tauxRealisation >= 60 ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'}
                                `}>
                                  {(row.tauxRealisation || 0).toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : null
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center text-center h-96">
              <BuildingOfficeIcon className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Sélectionnez un cabinet</h3>
              <p className="text-gray-500 mt-1">
                Cliquez sur un cabinet dans la liste pour voir ses détails
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
