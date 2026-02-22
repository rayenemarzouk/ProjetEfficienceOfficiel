import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { getSettings, updateSettings } from '../../services/api';
import { FiUser, FiMail, FiShield, FiActivity, FiCalendar, FiCheck } from 'react-icons/fi';

export default function Settings() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoGeneration, setAutoGeneration] = useState(true);
  const [autoEmail, setAutoEmail] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getSettings();
        setUsers(res.data.users || []);
        if (res.data.appSettings) {
          setAutoGeneration(res.data.appSettings.autoGeneration);
          setAutoEmail(res.data.appSettings.autoEmail);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleToggle = async (field) => {
    const newVal = field === 'autoGeneration' ? !autoGeneration : !autoEmail;
    if (field === 'autoGeneration') setAutoGeneration(newVal);
    else setAutoEmail(newVal);

    setSaving(true);
    try {
      await updateSettings({ [field]: newVal });
      showToast(
        field === 'autoGeneration'
          ? `Génération automatique ${newVal ? 'activée' : 'désactivée'}`
          : `Envoi par email ${newVal ? 'activé' : 'désactivé'}`
      );
    } catch (err) {
      // revert on error
      if (field === 'autoGeneration') setAutoGeneration(!newVal);
      else setAutoEmail(!newVal);
      showToast('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Header title="Réglages" subtitle="Configuration du système et gestion des utilisateurs" />

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg animate-fade-in">
          <FiCheck className="w-4 h-4" />
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}

      <div className="p-8">

        {/* Users List */}
        <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-8 transition-colors">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold dark:text-white">Utilisateurs</h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">{users.length} utilisateur(s)</span>
          </div>
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {users.map((user) => (
                <div key={user._id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                      user.role === 'admin' ? 'bg-primary-600' : 'bg-blue-500'
                    }`}>
                      {user.name?.charAt(0) || user.email?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.name || user.email}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {user.practitionerCode && (
                      <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {user.practitionerCode}
                      </span>
                    )}
                    {user.cabinetName && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">{user.cabinetName}</span>
                    )}
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                      user.role === 'admin'
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    }`}>
                      <FiShield className="w-3 h-3" />
                      {user.role === 'admin' ? 'Administrateur' : 'Praticien'}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      user.isActive !== false ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}>
                      <FiActivity className="w-3 h-3" />
                      {user.isActive !== false ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-gray-700 p-6 transition-colors">
            <h3 className="text-lg font-semibold dark:text-white mb-4 flex items-center gap-2">
              <FiCalendar className="text-primary-600" /> Automatisation
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Génération automatique</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Rapports générés le dernier jour du mois</p>
                </div>
                <button
                  onClick={() => handleToggle('autoGeneration')}
                  disabled={saving}
                  className={`w-11 h-6 rounded-full relative transition-colors duration-200 focus:outline-none ${
                    autoGeneration ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-200 ${
                    autoGeneration ? 'translate-x-[22px]' : 'translate-x-1'
                  }`}></div>
                </button>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Envoi automatique par email</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Rapports envoyés après génération</p>
                </div>
                <button
                  onClick={() => handleToggle('autoEmail')}
                  disabled={saving}
                  className={`w-11 h-6 rounded-full relative transition-colors duration-200 focus:outline-none ${
                    autoEmail ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-200 ${
                    autoEmail ? 'translate-x-[22px]' : 'translate-x-1'
                  }`}></div>
                </button>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Heure de génération</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Planifié chaque dernier jour du mois</p>
                </div>
                <span className="text-sm font-mono font-bold text-primary-700">20:00</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-gray-700 p-6 transition-colors">
            <h3 className="text-lg font-semibold dark:text-white mb-4 flex items-center gap-2">
              <FiMail className="text-blue-600" /> Configuration Email
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Service</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Gmail SMTP</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Expéditeur</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Efficience Analytics</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Destinataire rapports</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">maarzoukrayan3@gmail.com</p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-100 dark:border-blue-800">
                <p className="text-xs font-medium text-blue-600">
                  💡 Nb rapports = Nb emails = Nb praticiens actifs
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
