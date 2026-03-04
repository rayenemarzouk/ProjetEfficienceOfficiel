import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { getReportsList, generateReport, generateAllReports, sendReports, sendReportsNow, downloadReport, getAdminDashboard, getAvailableMonths } from '../../services/api';
import { FiFileText, FiSend, FiDownload, FiRefreshCw, FiCheck, FiAlertCircle, FiZap, FiFilter, FiCalendar, FiUsers } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useDynamic } from '../../context/DynamicContext';

// Options de période pour le filtre
const periodOptions = [
  { value: 'all', label: 'Toutes les périodes' },
  { value: 'this_month', label: 'Ce mois' },
  { value: 'last_month', label: 'Mois dernier' },
  { value: '3_months', label: '3 derniers mois' },
  { value: '6_months', label: '6 derniers mois' },
  { value: 'this_year', label: 'Cette année' },
  { value: 'last_year', label: 'Année dernière' },
];

export default function Reports() {
  const { user } = useAuth();
  const { isDynamic: _isDynamic } = useDynamic();
  const isRayan = user?.email === 'maarzoukrayan3@gmail.com';
  const isDynamic = isRayan || _isDynamic;
  const cardCls = isRayan ? 'bg-white border border-gray-200 shadow-sm' : 'bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-700';
  const [reports, setReports] = useState([]);
  const [practitioners, setPractitioners] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedPractitioner, setSelectedPractitioner] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingNow, setSendingNow] = useState(false);
  const [message, setMessage] = useState(null);
  
  // Nouveaux filtres pour la liste des rapports
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [filterCabinet, setFilterCabinet] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [reportsRes, dashRes, monthsRes] = await Promise.all([
        getReportsList(),
        getAdminDashboard(),
        getAvailableMonths()
      ]);
      setReports(reportsRes.data);
      setPractitioners(dashRes.data.practitioners || []);
      const months = monthsRes.data || [];
      setAvailableMonths(months);
      if (months.length > 0 && !selectedMonth) {
        setSelectedMonth(months[0].value);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setMessage(null);
    try {
      if (selectedPractitioner) {
        await generateReport(selectedPractitioner, selectedMonth);
        setMessage({ type: 'success', text: `Rapport généré pour ${selectedPractitioner}` });
      } else {
        const res = await generateAllReports(selectedMonth);
        setMessage({ type: 'success', text: res.data.message });
      }
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur' });
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async () => {
    setSending(true);
    setMessage(null);
    try {
      const res = await sendReports(selectedMonth);
      setMessage({ type: 'success', text: res.data.message });
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur' });
    } finally {
      setSending(false);
    }
  };

  const handleSendNow = async () => {
    setSendingNow(true);
    setMessage(null);
    try {
      const res = await sendReportsNow(selectedMonth);
      setMessage({ type: 'success', text: res.data.message });
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur lors de l\'envoi' });
    } finally {
      setSendingNow(false);
    }
  };

  const handleDownload = async (id, praticien, mois) => {
    try {
      const res = await downloadReport(id);
      const contentType = res.headers['content-type'] || '';
      const isPdf = contentType.includes('application/pdf');
      const ext = isPdf ? 'pdf' : 'html';
      const url = window.URL.createObjectURL(new Blob([res.data], { type: contentType }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport_${praticien}_${mois}.${ext}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  const formatMonth = (m) => {
    if (!m) return '';
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    return `${months[parseInt(m.substring(4, 6)) - 1]} ${m.substring(0, 4)}`;
  };

  // Fonction pour vérifier si un mois est dans la période sélectionnée
  const isInPeriod = (mois) => {
    if (filterPeriod === 'all') return true;
    if (!mois) return false;
    
    const now = new Date();
    const year = parseInt(mois.substring(0, 4));
    const month = parseInt(mois.substring(4, 6)) - 1; // 0-indexed
    const reportDate = new Date(year, month, 1);
    
    switch (filterPeriod) {
      case 'this_month': {
        return year === now.getFullYear() && month === now.getMonth();
      }
      case 'last_month': {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return year === lastMonth.getFullYear() && month === lastMonth.getMonth();
      }
      case '3_months': {
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        return reportDate >= threeMonthsAgo;
      }
      case '6_months': {
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        return reportDate >= sixMonthsAgo;
      }
      case 'this_year': {
        return year === now.getFullYear();
      }
      case 'last_year': {
        return year === now.getFullYear() - 1;
      }
      default:
        return true;
    }
  };

  // Filtrer les rapports selon les critères sélectionnés
  const filteredReports = reports.filter(r => {
    const matchesCabinet = filterCabinet === 'all' || r.praticien === filterCabinet;
    const matchesPeriod = isInPeriod(r.mois);
    return matchesCabinet && matchesPeriod;
  });

  // Stats — basées sur les rapports filtrés
  const totalGeneres = filteredReports.length;
  const totalEnvoyes = filteredReports.filter(r => r.emailEnvoye).length;

  return (
    <div>
      <Header title="Rapports Mensuels" subtitle="Générer et envoyer les rapports aux cabinets" />

      <div className="p-8">
        {/* Stats rapports */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 ${isDynamic ? 'animate-fade-in' : ''}`}>
          <div className={`${cardCls} rounded-2xl p-6 transition-colors ${isDynamic ? 'animate-fade-in-up hover-lift card-shine' : ''}`} style={isDynamic ? { animationDelay: '0.1s' } : {}}>
            <div className="flex items-center gap-3">
              <div className={`p-3 bg-primary-50 dark:bg-primary-900/30 rounded-xl ${isDynamic ? 'animate-float-soft' : ''}`}><FiFileText className="w-6 h-6 text-primary-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalGeneres}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Rapports Générés</p>
              </div>
            </div>
          </div>
          <div className={`${cardCls} rounded-2xl p-6 transition-colors ${isDynamic ? 'animate-fade-in-up hover-lift card-shine' : ''}`} style={isDynamic ? { animationDelay: '0.2s' } : {}}>
            <div className="flex items-center gap-3">
              <div className={`p-3 bg-green-50 dark:bg-green-900/30 rounded-xl ${isDynamic ? 'animate-float-soft' : ''}`}><FiSend className="w-6 h-6 text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalEnvoyes}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Emails Envoyés</p>
              </div>
            </div>
          </div>
          <div className={`${cardCls} rounded-2xl p-6 transition-colors`}>
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${totalGeneres === totalEnvoyes && totalGeneres > 0 ? 'bg-green-50 dark:bg-green-900/30' : 'bg-amber-50 dark:bg-amber-900/30'}`}>
                <FiCheck className={`w-6 h-6 ${totalGeneres === totalEnvoyes && totalGeneres > 0 ? 'text-green-600' : 'text-amber-600'}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {totalGeneres === totalEnvoyes && totalGeneres > 0 ? '✅' : '⏳'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {totalGeneres === totalEnvoyes && totalGeneres > 0 ? 'Tout envoyé' : 'En attente'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className={`${cardCls} rounded-2xl p-6 mb-8 transition-colors`}>
          <h3 className="text-lg font-semibold dark:text-white mb-4">Générer & Envoyer des Rapports</h3>
          
          {message && (
            <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
              message.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/30 text-red-700 border border-red-200 dark:border-red-800'
            }`}>
              {message.type === 'success' ? <FiCheck /> : <FiAlertCircle />}
              {message.text}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mois</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-white text-sm"
              >
                {availableMonths.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Praticien (optionnel)</label>
              <select
                value={selectedPractitioner}
                onChange={(e) => setSelectedPractitioner(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-white text-sm"
              >
                <option value="">Tous les praticiens</option>
                {practitioners.map(p => (
                  <option key={p.code} value={p.code}>{p.name} ({p.code})</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-3 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 text-sm"
            >
              {generating ? <FiRefreshCw className="animate-spin w-4 h-4" /> : <FiFileText className="w-4 h-4" />}
              Générer
            </button>
            <button
              onClick={handleSend}
              disabled={sending}
              className="px-3 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 text-sm"
            >
              {sending ? <FiRefreshCw className="animate-spin w-4 h-4" /> : <FiSend className="w-4 h-4" />}
              Envoyer
            </button>
            <button
              onClick={handleSendNow}
              disabled={sendingNow}
              className="px-3 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 text-sm whitespace-nowrap"
            >
              {sendingNow ? <FiRefreshCw className="animate-spin w-4 h-4" /> : <FiZap className="w-4 h-4" />}
              Générer & Envoyer
            </button>
          </div>
        </div>

        {/* Liste des rapports */}
        <div className={`${cardCls} rounded-2xl overflow-hidden transition-colors`}>
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h3 className="text-lg font-semibold dark:text-white flex items-center gap-2">
              <FiFilter className="w-5 h-5 text-gray-400" />
              Historique des Rapports
            </h3>
            
            {/* Filtres */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <FiCalendar className="w-4 h-4 text-gray-400" />
                <select
                  value={filterPeriod}
                  onChange={(e) => setFilterPeriod(e.target.value)}
                  className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-white"
                >
                  {periodOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <FiUsers className="w-4 h-4 text-gray-400" />
                <select
                  value={filterCabinet}
                  onChange={(e) => setFilterCabinet(e.target.value)}
                  className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-white"
                >
                  <option value="all">Tous les cabinets</option>
                  {practitioners.map(p => (
                    <option key={p.code} value={p.code}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>
              
              {(filterPeriod !== 'all' || filterCabinet !== 'all') && (
                <button
                  onClick={() => { setFilterPeriod('all'); setFilterCabinet('all'); }}
                  className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  Réinitialiser
                </button>
              )}
            </div>
          </div>
          
          {/* Indicateur de filtres actifs */}
          {(filterPeriod !== 'all' || filterCabinet !== 'all') && (
            <div className="px-6 py-2 bg-primary-50 dark:bg-primary-900/20 border-b border-primary-100 dark:border-primary-800 text-sm text-primary-700 dark:text-primary-300">
              {filteredReports.length} rapport(s) trouvé(s)
              {filterPeriod !== 'all' && ` • Période: ${periodOptions.find(o => o.value === filterPeriod)?.label}`}
              {filterCabinet !== 'all' && ` • Cabinet: ${filterCabinet}`}
            </div>
          )}
          
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
              <FiFileText className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p>{reports.length === 0 ? 'Aucun rapport généré pour le moment.' : 'Aucun rapport ne correspond aux filtres sélectionnés.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Praticien</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Mois</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">CA</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date envoi</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredReports.map((r) => (
                    <tr key={r._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-3 text-sm font-medium text-gray-900 dark:text-white">{r.praticien}</td>
                      <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">{formatMonth(r.mois)}</td>
                      <td className="px-6 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(r.contenu?.caMensuel || 0)}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          r.emailEnvoye ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                        }`}>
                          {r.emailEnvoye ? '✅ Envoyé' : '⏳ En attente'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {r.dateEnvoi ? new Date(r.dateEnvoi).toLocaleDateString('fr-FR') : '-'}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <button
                          onClick={() => handleDownload(r._id, r.praticien, r.mois)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors text-sm font-medium"
                          title="Télécharger le PDF"
                        >
                          <FiDownload className="w-4 h-4" />
                          PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
