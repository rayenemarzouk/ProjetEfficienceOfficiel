import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { getReportsList, downloadReport } from '../../services/api';
import { FiFileText, FiDownload, FiCheck, FiClock } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

export default function MyReports() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getReportsList();
        // Filter only this practitioner's reports
        const praticienId = user?.practitionerCode || user?.name || user?.email;
        const myReports = res.data.filter(r => r.praticien === praticienId);
        setReports(myReports);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleDownload = async (id, praticien, mois) => {
    try {
      const res = await downloadReport(id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport_${praticien}_${mois}.html`;
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

  return (
    <div>
      <Header title="Mes Rapports" subtitle={`Cabinet ${user?.cabinetName || user?.name || ''} — Historique des rapports mensuels`} />

      <div className="p-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-gray-700 p-16 text-center transition-colors">
            <FiFileText className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Aucun rapport disponible</h3>
            <p className="text-gray-500 dark:text-gray-400">Les rapports sont générés automatiquement chaque fin de mois.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports.map((r) => (
              <div key={r._id} className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-primary-50 dark:bg-primary-900/30 rounded-xl">
                      <FiFileText className="w-6 h-6 text-primary-600" />
                    </div>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                      r.emailEnvoye ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                    }`}>
                      {r.emailEnvoye ? <><FiCheck className="w-3 h-3" /> Envoyé</> : <><FiClock className="w-3 h-3" /> En attente</>}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{formatMonth(r.mois)}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    CA : {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(r.contenu?.caMensuel || 0)}
                  </p>
                  {r.contenu && (
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Patients</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{r.contenu.nbPatients || 0}</p>
                      </div>
                      <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">€/h</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{r.contenu.productionHoraire?.toFixed(0) || '-'}</p>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => handleDownload(r._id, r.praticien, r.mois)}
                    className="w-full py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <FiDownload className="w-4 h-4" />
                    Télécharger
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
