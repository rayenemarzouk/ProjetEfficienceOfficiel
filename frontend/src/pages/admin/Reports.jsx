import { useState, useEffect, useCallback } from 'react';
import Header from '../../components/Header';
import {
  getAvailableMonths, getReportKPIs,
  generateReport, generateAllReports,
  sendReportsNow, downloadReport,
  getReportsList, getAdminPractitioners, sendSingleReport, getReportsRecipient,
  requestDeleteReport, confirmDeleteReport
} from '../../services/api';
import {
  FiFileText, FiDownload, FiRefreshCw,
  FiCheck, FiAlertCircle, FiZap, FiCalendar,
  FiActivity, FiTrendingUp, FiClock, FiBarChart2, FiTrash2
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);
const pct = (n) => `${Number(n || 0).toFixed(1)}%`;

const MONTH_NAMES = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function formatMonth(m) {
  if (!m) return '';
  return `${MONTH_NAMES[parseInt(m.substring(4, 6)) - 1]} ${m.substring(0, 4)}`;
}

function KpiRow({ icon: Icon, color, label, value, sub }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
      <div className={`p-1.5 rounded-lg ${color}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 truncate">{label}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
      <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">{value}</span>
    </div>
  );
}

function CabinetCard({ cab, onGenerate, onDownload, generating }) {
  const { kpi, name, cabinetName, hasData, reportGenerated, reportSent, reportId, code } = cab;
  const isGenerating = generating === code;

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden shadow-sm flex flex-col transition-all ${hasData ? 'border-gray-200' : 'border-dashed border-gray-300 opacity-70'}`}>
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-white font-semibold text-sm leading-tight">{name}</p>
          <p className="text-slate-400 text-xs mt-0.5">{cabinetName} · {code}</p>
        </div>
        <div className="flex items-center gap-2">
          {reportSent && <span className="bg-green-500/20 text-green-300 text-xs px-2 py-0.5 rounded-full border border-green-500/30">✓ Envoyé</span>}
          {reportGenerated && !reportSent && <span className="bg-amber-500/20 text-amber-300 text-xs px-2 py-0.5 rounded-full border border-amber-500/30">⏳ Généré</span>}
          {!reportGenerated && <span className="bg-slate-500/20 text-slate-400 text-xs px-2 py-0.5 rounded-full border border-slate-500/30">Non généré</span>}
        </div>
      </div>

      <div className="px-5 py-3 flex-1">
        {!hasData ? (
          <p className="text-center text-gray-400 text-xs py-4">Aucune donnée pour ce mois</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-cyan-50 rounded-xl p-3 text-center">
                <p className="text-xs text-cyan-600 font-medium">CA Facturé</p>
                <p className="text-lg font-bold text-cyan-700 leading-tight">{fmt(kpi.caMensuel)}</p>
                <p className="text-xs text-cyan-500">{fmt(kpi.montantEncaisse)} encaissé</p>
                <p className="text-xs text-cyan-400">{pct(kpi.tauxEncaissement)} taux</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-xs text-emerald-600 font-medium">Patients</p>
                <p className="text-lg font-bold text-emerald-700 leading-tight">{kpi.nbPatients}</p>
                <p className="text-xs text-emerald-500">{kpi.nbNouveauxPatients} nouveaux</p>
                <p className="text-xs text-emerald-400">Panier {fmt(kpi.panierMoyen)}</p>
              </div>
            </div>
            <div>
              <KpiRow icon={FiActivity} color="bg-amber-100 text-amber-600" label="RDV" value={kpi.nbRdv}
                sub={`${kpi.rdvHonores} honorés · ${kpi.rdvManques} manqués · ${kpi.annulations} annulés`} />
              <KpiRow icon={FiClock} color="bg-violet-100 text-violet-600" label="Heures travaillées" value={`${kpi.heuresTravaillees}h`}
                sub={`${kpi.joursOuverts} jours · Prod. ${fmt(kpi.productionHoraire)}/h`} />
              <KpiRow icon={FiFileText} color="bg-rose-100 text-rose-600" label="Devis"
                value={`${kpi.nbDevisAcceptes}/${kpi.nbDevis}`}
                sub={`Taux ${pct(kpi.tauxAcceptationDevis)} · Réalisé ${fmt(kpi.montantDevisRealise)}`} />
              <KpiRow icon={FiTrendingUp} color="bg-indigo-100 text-indigo-600" label="Absence" value={pct(kpi.tauxAbsence)}
                sub={`${kpi.reportsRdv} reports · ${kpi.rdvImportants} importants`} />
            </div>
          </>
        )}
      </div>

      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-2">
        <button
          onClick={() => onGenerate(code)}
          disabled={isGenerating || !hasData}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary-600 text-white rounded-xl text-xs font-medium hover:bg-primary-700 disabled:opacity-40 transition-colors"
        >
          {isGenerating ? <FiRefreshCw className="animate-spin w-3.5 h-3.5" /> : <FiFileText className="w-3.5 h-3.5" />}
          Générer PDF
        </button>
        {reportGenerated && reportId && (
          <button
            onClick={() => onDownload(reportId, code)}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-medium hover:bg-red-100 transition-colors"
          >
            <FiDownload className="w-3.5 h-3.5" />
            PDF
          </button>
        )}
      </div>
    </div>
  );
}

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
  const { user: _user } = useAuth();
  const [availableMonths, setAvailableMonths] = useState([]);
  const [practitionersList, setPractitionersList] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedPractitioner, setSelectedPractitioner] = useState('all');
  const [kpisData, setKpisData] = useState(null);
  const [historyReports, setHistoryReports] = useState([]);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingKpis, setLoadingKpis] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [generating, setGenerating] = useState(null);
  const [sendingAll, setSendingAll] = useState(false);
  const [sendingOne, setSendingOne] = useState(null);
  const [message, setMessage] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null); // { reportId, label }
  const [deleteCode, setDeleteCode] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const [monthsRes, practitionersRes, recipientRes] = await Promise.all([
          getAvailableMonths(),
          getAdminPractitioners(),
          getReportsRecipient()
        ]);
        const months = monthsRes.data || [];
        setAvailableMonths(months);
        setPractitionersList(practitionersRes.data?.practitioners || []);
        setRecipientEmail(recipientRes.data?.recipientEmail || '');
        if (months.length > 0) {
          setSelectedMonth(months[0].value);
        } else {
          setKpisData({ practitioners: [] });
        }
      } catch (err) {
        console.error('Erreur initialisation rapports:', err);
        setKpisData({ practitioners: [] });
        showMessage('error', 'Le chargement des mois a pris trop de temps. Veuillez réessayer.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const loadHistory = useCallback(async (mois, praticien) => {
    if (!mois) {
      setHistoryReports([]);
      return;
    }
    setLoadingHistory(true);
    try {
      const res = await getReportsList(mois, praticien === 'all' ? '' : praticien);
      setHistoryReports(res.data || []);
    } catch (err) {
      console.error('Erreur historique rapports:', err);
      setHistoryReports([]);
      showMessage('error', 'Impossible de charger l\'historique des rapports.');
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const loadKPIs = useCallback(async (mois) => {
    if (!mois) return;
    setLoadingKpis(true);
    try {
      const res = await getReportKPIs(mois);
      setKpisData(res.data);
    } catch (err) {
      console.error('Erreur chargement KPIs:', err);
      setKpisData({ mois, practitioners: [] });
      showMessage('error', 'Le chargement des rapports est trop lent ou indisponible pour le moment.');
    } finally {
      setLoadingKpis(false);
    }
  }, []);

  useEffect(() => {
    if (selectedMonth) loadKPIs(selectedMonth);
  }, [selectedMonth, loadKPIs]);

  useEffect(() => {
    if (selectedMonth) loadHistory(selectedMonth, selectedPractitioner);
  }, [selectedMonth, selectedPractitioner, loadHistory]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleGenerate = async (code) => {
    setGenerating(code);
    try {
      await generateReport(code, selectedMonth);
      showMessage('success', `Rapport généré pour ${code}`);
      await loadKPIs(selectedMonth);
      await loadHistory(selectedMonth, selectedPractitioner);
    } catch (err) {
      showMessage('error', err.response?.data?.message || 'Erreur génération');
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateAll = async () => {
    setGenerating('__all__');
    try {
      const res = await generateAllReports(selectedMonth);
      showMessage('success', res.data.message);
      await loadKPIs(selectedMonth);
      await loadHistory(selectedMonth, selectedPractitioner);
    } catch (err) {
      showMessage('error', err.response?.data?.message || 'Erreur génération');
    } finally {
      setGenerating(null);
    }
  };

  const handleSendAll = async () => {
    setSendingAll(true);
    try {
      const res = await sendReportsNow(selectedMonth);
      showMessage('success', res.data.message);
      await loadKPIs(selectedMonth);
      await loadHistory(selectedMonth, selectedPractitioner);
    } catch (err) {
      showMessage('error', err.response?.data?.message || err.message || 'Erreur envoi');
    } finally {
      setSendingAll(false);
    }
  };

  const handleSendSingle = async (reportId) => {
    setSendingOne(reportId);
    try {
      const res = await sendSingleReport(reportId);
      showMessage('success', res.data.message || 'Rapport envoyé.');
      await loadKPIs(selectedMonth);
      await loadHistory(selectedMonth, selectedPractitioner);
    } catch (err) {
      showMessage('error', err.response?.data?.message || 'Erreur envoi rapport.');
    } finally {
      setSendingOne(null);
    }
  };

  const handleRequestDelete = async (report) => {
    setDeleteModal({ reportId: report._id, label: `${report.praticien} — ${formatMonth(report.mois)}` });
    setDeleteCode('');
    setDeleteStatus(null);
    try {
      await requestDeleteReport(report._id);
      setDeleteStatus({ type: 'success', text: 'Code envoyé à maarzoukrayan3@gmail.com' });
    } catch (err) {
      setDeleteStatus({ type: 'error', text: err.response?.data?.message || 'Erreur envoi du code.' });
    }
  };

  const handleConfirmDelete = async (e) => {
    e.preventDefault();
    if (!deleteModal || !deleteCode.trim()) return;
    setDeleting(true);
    try {
      const res = await confirmDeleteReport(deleteModal.reportId, deleteCode.trim());
      showMessage('success', res.data.message || 'Rapport supprimé.');
      setDeleteModal(null);
      setDeleteCode('');
      await loadHistory(selectedMonth, selectedPractitioner);
      await loadKPIs(selectedMonth);
    } catch (err) {
      setDeleteStatus({ type: 'error', text: err.response?.data?.message || 'Code incorrect ou expiré.' });
    } finally {
      setDeleting(false);
    }
  };

  const handleDownload = async (id, code) => {
    try {
      const res = await downloadReport(id);
      const contentType = res.headers['content-type'] || '';
      const ext = contentType.includes('pdf') ? 'pdf' : 'html';
      const url = window.URL.createObjectURL(new Blob([res.data], { type: contentType }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport_${code}_${selectedMonth}.${ext}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showMessage('error', 'Erreur téléchargement');
    }
  };

  const practitioners = kpisData?.practitioners || [];
  const filteredPractitioners = selectedPractitioner === 'all'
    ? practitioners
    : practitioners.filter((p) => p.code === selectedPractitioner);
  const withData = filteredPractitioners.filter(p => p.hasData);
  const generated = filteredPractitioners.filter(p => p.reportGenerated).length;
  const sent = filteredPractitioners.filter(p => p.reportSent).length;

  return (
    <div>
      <Header title="Rapports Mensuels" subtitle="Rapports par cabinet selon le mois sélectionné" />

      <div className="p-6 md:p-8">
        {/* Month selector + global actions */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-end gap-4 flex-wrap">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                <FiCalendar className="inline w-4 h-4 mr-1.5 text-gray-400" />
                Mois du rapport
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full md:w-64 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 bg-white"
              >
                {availableMonths.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Praticien inscrit</label>
              <select
                value={selectedPractitioner}
                onChange={(e) => setSelectedPractitioner(e.target.value)}
                className="w-full md:w-72 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="all">Tous les praticiens</option>
                {practitionersList.map((p) => (
                  <option key={p.practitionerCode} value={p.practitionerCode}>
                    {p.practitionerName} ({p.practitionerCode})
                  </option>
                ))}
              </select>
            </div>

            {kpisData && (
              <div className="flex items-center gap-6 text-sm text-gray-500 flex-wrap">
                <span className="flex items-center gap-1.5"><FiBarChart2 className="text-blue-500" />{withData.length} cabinets avec données</span>
                <span className="flex items-center gap-1.5"><FiFileText className="text-amber-500" />{generated} générés</span>
                <span className="flex items-center gap-1.5"><FiCheck className="text-green-500" />{sent} envoyés</span>
              </div>
            )}

            <div className="flex items-center gap-3 md:ml-auto">
              <button
                onClick={handleGenerateAll}
                disabled={!!generating || !selectedMonth}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {generating === '__all__' ? <FiRefreshCw className="animate-spin w-4 h-4" /> : <FiFileText className="w-4 h-4" />}
                Générer tout
              </button>
              <button
                onClick={handleSendAll}
                disabled={sendingAll || !selectedMonth}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {sendingAll ? <FiRefreshCw className="animate-spin w-4 h-4" /> : <FiZap className="w-4 h-4" />}
                Générer & Envoyer tout
              </button>
            </div>
          </div>

          {message && (
            <div className={`mt-4 p-3 rounded-xl flex items-center gap-2 text-sm border ${
              message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              {message.type === 'success' ? <FiCheck /> : <FiAlertCircle />}
              {message.text}
            </div>
          )}
        </div>

        {/* Cabinet cards */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
          </div>
        ) : filteredPractitioners.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <FiCalendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">Aucun praticien correspondant</p>
            <p className="text-sm mt-1">Ajustez le filtre praticien ou le mois sélectionné</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4 font-medium">
              Rapport du mois de <span className="text-gray-800 font-semibold">{formatMonth(selectedMonth)}</span>
              {' · '}{filteredPractitioners.length} cabinet{filteredPractitioners.length > 1 ? 's' : ''}
              {loadingKpis && <span className="ml-2 text-primary-600">(mise à jour...)</span>}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredPractitioners.map((cab) => (
                <CabinetCard
                  key={cab.code}
                  cab={cab}
                  onGenerate={handleGenerate}
                  onDownload={handleDownload}
                  generating={generating}
                />
              ))}
            </div>

            <div className="mt-8 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-800">Historique des rapports</h3>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <p className="text-xs text-gray-500">Téléchargement PDF et envoi email au destinataire configuré.</p>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                    Destinataire: {recipientEmail || 'Non configuré'}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold">Praticien</th>
                      <th className="text-left px-4 py-3 font-semibold">Mois</th>
                      <th className="text-left px-4 py-3 font-semibold">Statut</th>
                      <th className="text-left px-4 py-3 font-semibold">Dernière mise à jour</th>
                      <th className="text-right px-4 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingHistory ? (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-gray-500">Chargement de l'historique...</td>
                      </tr>
                    ) : historyReports.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-gray-500">Aucun rapport trouvé pour les filtres sélectionnés.</td>
                      </tr>
                    ) : historyReports.map((r) => (
                      <tr key={r._id} className="border-t border-gray-100">
                        <td className="px-4 py-3 text-gray-800 font-medium">{r.praticien}</td>
                        <td className="px-4 py-3 text-gray-600">{formatMonth(r.mois)}</td>
                        <td className="px-4 py-3">
                          {r.emailEnvoye
                            ? <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Envoyé</span>
                            : <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">Généré</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{new Date(r.updatedAt).toLocaleString('fr-FR')}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleDownload(r._id, r.praticien)}
                              className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-medium"
                            >
                              Télécharger
                            </button>
                            <button
                              onClick={() => handleSendSingle(r._id)}
                              disabled={sendingOne === r._id}
                              className="px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 text-xs font-medium"
                            >
                              {sendingOne === r._id ? 'Envoi...' : 'Envoyer mail'}
                            </button>
                            <button
                              onClick={() => handleRequestDelete(r)}
                              className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                              title="Supprimer ce rapport"
                            >
                              <FiTrash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Modal suppression rapport avec code 4 chiffres ── */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-sm w-full p-7">
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <FiTrash2 className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Supprimer le rapport</h3>
              <p className="text-sm text-gray-500 mt-1">Un code a été envoyé à <strong>maarzoukrayan3@gmail.com</strong></p>
              <p className="text-xs text-gray-400 mt-1">{deleteModal.label}</p>
            </div>
            {deleteStatus && (
              <div className={`mb-4 p-3 rounded-xl flex items-center gap-2 text-xs border ${
                deleteStatus.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
              }`}>
                {deleteStatus.type === 'success' ? <FiCheck /> : <FiAlertCircle />}
                {deleteStatus.text}
              </div>
            )}
            <form onSubmit={handleConfirmDelete} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Code de sécurité (4 chiffres)</label>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="0000"
                  value={deleteCode}
                  onChange={e => setDeleteCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center text-3xl font-bold tracking-widest px-4 py-3 border-2 border-red-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={deleting || deleteCode.length < 4}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-semibold rounded-xl text-sm transition"
                >
                  {deleting ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Suppression...</> : <><FiTrash2 className="w-4 h-4" />Supprimer</>}
                </button>
                <button
                  type="button"
                  onClick={() => { setDeleteModal(null); setDeleteCode(''); setDeleteStatus(null); }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-xl text-sm transition"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
