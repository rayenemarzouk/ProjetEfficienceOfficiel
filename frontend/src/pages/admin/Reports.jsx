import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { getReportsList, generateReport, generateAllReports, sendReports, sendReportsNow, downloadReport, getAdminDashboard, getAvailableMonths } from '../../services/api';
import { FiFileText, FiSend, FiDownload, FiRefreshCw, FiCheck, FiAlertCircle, FiZap } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

export default function Reports() {
  const { user } = useAuth();
  const isRayan = user?.email === 'maarzoukrayan3@gmail.com';
  const cardCls = isRayan ? 'bg-[#111d30] border border-[#1e3a5f]/50' : 'bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-700';
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

  // Stats — filtrées par le mois sélectionné
  const reportsForMonth = selectedMonth ? reports.filter(r => r.mois === selectedMonth) : reports;
  const totalGeneres = reportsForMonth.length;
  const totalEnvoyes = reportsForMonth.filter(r => r.emailEnvoye).length;

  return (
    <div>
      <Header title="Rapports Mensuels" subtitle="Générer et envoyer les rapports aux cabinets" />

      <div className="p-8">
        {/* Stats rapports */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className={`${cardCls} rounded-2xl p-6 transition-colors`}>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary-50 dark:bg-primary-900/30 rounded-xl"><FiFileText className="w-6 h-6 text-primary-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalGeneres}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Rapports Générés</p>
              </div>
            </div>
          </div>
          <div className={`${cardCls} rounded-2xl p-6 transition-colors`}>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-xl"><FiSend className="w-6 h-6 text-green-600" /></div>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mois</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-white"
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
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-white"
              >
                <option value="">Tous les praticiens</option>
                {practitioners.map(p => (
                  <option key={p.code} value={p.code}>{p.name} ({p.code})</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-3">
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {generating ? <FiRefreshCw className="animate-spin" /> : <FiFileText />}
                Générer
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sending ? <FiRefreshCw className="animate-spin" /> : <FiSend />}
                Envoyer
              </button>
              <button
                onClick={handleSendNow}
                disabled={sendingNow}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sendingNow ? <FiRefreshCw className="animate-spin" /> : <FiZap />}
                Générer & Envoyer
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            💡 Nb rapports générés = Nb emails envoyés = Nb praticiens actifs ({practitioners.length})
          </p>
        </div>

        {/* Liste des rapports */}
        <div className={`${cardCls} rounded-2xl overflow-hidden transition-colors`}>
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold dark:text-white">Historique des Rapports</h3>
          </div>
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
              <FiFileText className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p>Aucun rapport généré pour le moment.</p>
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
                  {reports.map((r) => (
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
