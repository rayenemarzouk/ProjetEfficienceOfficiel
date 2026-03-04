import { useState, useEffect } from 'react';
import { getConsultantReports, downloadReport } from '../../services/api';
import PeriodFilter from '../../components/PeriodFilter';
import CabinetFilter from '../../components/CabinetFilter';
import {
  DocumentTextIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

const StatusBadge = ({ status }) => {
  const statusConfig = {
    sent: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircleIcon, label: 'Envoyé' },
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: ClockIcon, label: 'En attente' },
    failed: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircleIcon, label: 'Échec' },
    generated: { bg: 'bg-blue-100', text: 'text-blue-700', icon: DocumentTextIcon, label: 'Généré' }
  };

  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
};

export default function ConsultantReports() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [period, setPeriod] = useState({ period: 'this_month' });
  const [selectedCabinets, setSelectedCabinets] = useState([]);
  const [cabinets, setCabinets] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [downloading, setDownloading] = useState(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = {
        period: period.period,
        ...(period.startDate && { startDate: period.startDate }),
        ...(period.endDate && { endDate: period.endDate }),
        ...(selectedCabinets.length > 0 && { cabinets: selectedCabinets.join(',') }),
        ...(searchQuery && { search: searchQuery }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      };

      const response = await getConsultantReports(params);
      setReports(response.data.reports || []);
      
      // Extract unique cabinets
      const uniqueCabinets = [];
      const seen = new Set();
      (response.data.reports || []).forEach(r => {
        if (!seen.has(r.practitionerCode)) {
          seen.add(r.practitionerCode);
          uniqueCabinets.push({
            code: r.practitionerCode,
            nom: r.practitionerName
          });
        }
      });
      setCabinets(uniqueCabinets);
    } catch (error) {
      console.error('Erreur chargement rapports:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [period, selectedCabinets, searchQuery, statusFilter]);

  const handleDownload = async (reportId, filename) => {
    try {
      setDownloading(reportId);
      const response = await downloadReport(reportId);
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename || `rapport_${reportId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur téléchargement:', error);
    } finally {
      setDownloading(null);
    }
  };

  // Group reports by month
  const groupedReports = reports.reduce((acc, report) => {
    const month = report.mois || 'Non défini';
    if (!acc[month]) acc[month] = [];
    acc[month].push(report);
    return acc;
  }, {});

  // Stats
  const stats = {
    total: reports.length,
    sent: reports.filter(r => r.status === 'sent').length,
    pending: reports.filter(r => r.status === 'pending' || r.status === 'generated').length,
    failed: reports.filter(r => r.status === 'failed').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapports</h1>
          <p className="text-gray-500">Consultez et téléchargez les rapports de vos cabinets</p>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500">Total Rapports</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-100">
          <p className="text-sm text-green-600">Envoyés</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{stats.sent}</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
          <p className="text-sm text-yellow-600">En attente</p>
          <p className="text-2xl font-bold text-yellow-700 mt-1">{stats.pending}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border border-red-100">
          <p className="text-sm text-red-600">Échecs</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{stats.failed}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un rapport..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="sent">Envoyés</option>
              <option value="generated">Générés</option>
              <option value="pending">En attente</option>
              <option value="failed">Échecs</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <DocumentTextIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Aucun rapport trouvé</h3>
          <p className="text-gray-500 mt-1">
            Modifiez vos filtres pour voir plus de résultats
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedReports).sort((a, b) => b[0].localeCompare(a[0])).map(([month, monthReports]) => (
            <div key={month} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">{month}</h3>
                <p className="text-sm text-gray-500">{monthReports.length} rapport(s)</p>
              </div>
              
              <div className="divide-y divide-gray-100">
                {monthReports.map((report) => (
                  <div key={report._id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                          <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{report.practitionerName}</h4>
                          <p className="text-sm text-gray-500">{report.practitionerCode}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <StatusBadge status={report.status} />
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDownload(report._id, report.filename)}
                            disabled={downloading === report._id}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Télécharger"
                          >
                            {downloading === report._id ? (
                              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <ArrowDownTrayIcon className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Report Details */}
                    <div className="mt-3 flex items-center gap-6 text-sm text-gray-500">
                      <span>
                        Créé le {new Date(report.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                      {report.sentAt && (
                        <span>
                          Envoyé le {new Date(report.sentAt).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                      {report.aiAnalysis && (
                        <span className="text-purple-600">Avec analyse IA</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
