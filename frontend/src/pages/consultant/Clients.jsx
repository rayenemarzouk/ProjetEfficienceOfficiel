import { useState, useEffect } from 'react';
import { getConsultantClients, getConsultantClientDetail, consultantManualEntry } from '../../services/api';
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
  UserGroupIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

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
  const [period, setPeriod] = useState({ period: 'this_year' });

  // Modal saisie manuelle
  const [showModal, setShowModal] = useState(false);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalSuccess, setModalSuccess] = useState(false);
  const [formData, setFormData] = useState({
    praticien: '',
    mois: '',
    caFacture: '',
    caEncaisse: '',
    nbPatients: '',
    nouveauxPatients: '',
    totalRdv: '',
    heuresTravaillees: ''
  });

  // Générer la liste des 24 derniers mois
  const generateMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
      options.push({ value: `${yyyy}${mm}`, label: `${months[d.getMonth()]} ${yyyy}` });
    }
    return options;
  };
  const monthOptions = generateMonthOptions();

  const handleOpenModal = () => {
    setFormData({
      praticien: clients[0]?.practitionerCode || '',
      mois: monthOptions[0]?.value || '',
      caFacture: '',
      caEncaisse: '',
      nbPatients: '',
      nouveauxPatients: '',
      totalRdv: '',
      heuresTravaillees: ''
    });
    setModalSuccess(false);
    setShowModal(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    try {
      setModalSaving(true);
      await consultantManualEntry(formData);
      setModalSuccess(true);
      fetchClients();
      if (selectedClient === formData.praticien) {
        fetchClientDetail(formData.praticien);
      }
      setTimeout(() => setShowModal(false), 1200);
    } catch (err) {
      console.error('Erreur saisie manuelle:', err);
    } finally {
      setModalSaving(false);
    }
  };

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

  const metricsItems = [
    { label: 'Nouveaux Patients', value: clientDetail?.summary?.nouveauxPatients || 0, max: 50, color: '#3b82f6', bg: '#dbeafe' },
    { label: 'Patients Traités',  value: clientDetail?.summary?.patientsTraites || clientDetail?.summary?.nouveauxPatients || 0, max: 200, color: '#10b981', bg: '#d1fae5' },
    { label: 'RDV / Mois',       value: clientDetail?.summary?.rdvMois || 0, max: 200, color: '#8b5cf6', bg: '#ede9fe' },
    { label: 'Patients / RDV',   value: clientDetail?.summary?.rdvMois > 0 ? Math.round(((clientDetail?.summary?.nouveauxPatients || 0) / clientDetail.summary.rdvMois) * 100) : 0, max: 100, color: '#f59e0b', bg: '#fef3c7', isPercent: true },
  ];

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
          <button
            onClick={handleOpenModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <PlusIcon className="w-4 h-4" />
            Saisie Mensuelle
          </button>
        </div>
      </div>

      {/* Modal Saisie Mensuelle */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Saisie Mensuelle</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="p-6 space-y-5">
              {/* Praticien + Mois */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Praticien *</label>
                  <select
                    required
                    value={formData.praticien}
                    onChange={e => setFormData(f => ({ ...f, praticien: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Choisir --</option>
                    {clients.map(c => (
                      <option key={c.practitionerCode} value={c.practitionerCode}>
                        {c.practitionerName || c.practitionerCode}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mois *</label>
                  <select
                    required
                    value={formData.mois}
                    onChange={e => setFormData(f => ({ ...f, mois: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {monthOptions.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Chiffre d'Affaires */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Chiffre d'Affaires</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">CA Facturé (€)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={formData.caFacture}
                      onChange={e => setFormData(f => ({ ...f, caFacture: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">CA Encaissé (€)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={formData.caEncaisse}
                      onChange={e => setFormData(f => ({ ...f, caEncaisse: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Patients & RDV */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Patients & RDV</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Nb Patients</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.nbPatients}
                      onChange={e => setFormData(f => ({ ...f, nbPatients: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Nouveaux Patients</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.nouveauxPatients}
                      onChange={e => setFormData(f => ({ ...f, nouveauxPatients: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Total RDV</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.totalRdv}
                      onChange={e => setFormData(f => ({ ...f, totalRdv: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Heures Travaillées</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="0"
                      value={formData.heuresTravaillees}
                      onChange={e => setFormData(f => ({ ...f, heuresTravaillees: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={modalSaving}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors ${
                    modalSuccess ? 'bg-green-500' : 'bg-gray-900 hover:bg-gray-800'
                  }`}
                >
                  {modalSaving ? 'Enregistrement...' : modalSuccess ? '✓ Enregistré !' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                    <h3 className="font-semibold text-gray-900 mb-4">Métriques clés</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {metricsItems.map((item) => {
                        const pct = Math.min(Math.round((item.value / item.max) * 100), 100);
                        const doughnutData = {
                          datasets: [{ data: [pct, 100 - pct], backgroundColor: [item.color, item.bg], borderWidth: 0, cutout: '72%' }]
                        };
                        return (
                          <div key={item.label} className="flex flex-col items-center">
                            <div className="relative w-24 h-24">
                              <Doughnut data={doughnutData} options={{ plugins: { legend: { display: false }, tooltip: { enabled: false } }, animation: false }} />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-sm font-bold" style={{ color: item.color }}>
                                  {item.isPercent ? `${item.value}%` : item.value}
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 text-center">{item.label}</p>
                          </div>
                        );
                      })}
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
