import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import { getSettings, updateSettings, impersonateUser, deactivateSendCode, deactivateConfirm, aiToggleSendCode, aiToggleConfirm } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useAppSettings } from '../../context/AppSettingsContext';
import { useDynamic } from '../../context/DynamicContext';
import { setAIEnabled } from '../../utils/aiModels';
import { FiUser, FiMail, FiShield, FiActivity, FiCalendar, FiCheck, FiLogIn, FiX, FiAlertCircle, FiLoader, FiTool, FiCpu, FiDatabase, FiAlertTriangle, FiTrash2, FiLock, FiZap, FiClock, FiSend, FiKey } from 'react-icons/fi';

export default function Settings() {
  const navigate = useNavigate();
  const { loginUser } = useAuth();
  const { refreshSettings } = useAppSettings();
  const { isDynamic, refreshDynamic } = useDynamic();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoGeneration, setAutoGeneration] = useState(true);
  const [autoEmail, setAutoEmail] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [aiModelsEnabled, setAiModelsEnabled] = useState(true);
  const [importEnabled, setImportEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // ═══ Impersonation state ═══
  const [impModal, setImpModal] = useState(null); // { user, step: 'confirm' | 'switching' }
  const [impError, setImpError] = useState(null);

  // ═══ Deactivation state ═══
  const [deactModal, setDeactModal] = useState(null); // { user, step: 'confirm' | 'sending' | 'code' | 'verifying' | 'done' }
  const [deactCode, setDeactCode] = useState('');
  const [deactError, setDeactError] = useState(null);

  // ═══ AI Toggle state ═══
  const [aiModal, setAiModal] = useState(null); // { targetState, step: 'code' | 'sending' | 'verifying' | 'done' }
  const [aiAdminCode, setAiAdminCode] = useState('');     // code fixe admin
  const [aiEmailCode, setAiEmailCode] = useState('');     // code reçu par email
  const [aiEmailSent, setAiEmailSent] = useState(false);  // email envoyé ?
  const [aiError, setAiError] = useState(null);
  const [dynamicExpiresAt, setDynamicExpiresAt] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getSettings();
        setUsers(res.data.users || []);
        if (res.data.appSettings) {
          setAutoGeneration(res.data.appSettings.autoGeneration);
          setAutoEmail(res.data.appSettings.autoEmail);
          setMaintenanceMode(res.data.appSettings.maintenanceMode || false);
          setAiModelsEnabled(res.data.appSettings.aiModelsEnabled !== false);
          setImportEnabled(res.data.appSettings.importEnabled !== false);
          setDynamicExpiresAt(res.data.appSettings.dynamicExpiresAt || null);
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
    const stateMap = { autoGeneration, autoEmail, maintenanceMode, importEnabled };
    const setterMap = {
      autoGeneration: setAutoGeneration,
      autoEmail: setAutoEmail,
      maintenanceMode: setMaintenanceMode,
      importEnabled: setImportEnabled
    };
    const labelMap = {
      autoGeneration: (v) => `Génération automatique ${v ? 'activée' : 'désactivée'}`,
      autoEmail: (v) => `Envoi par email ${v ? 'activé' : 'désactivé'}`,
      maintenanceMode: (v) => `Mode maintenance ${v ? 'ACTIVÉ — site bloqué pour les praticiens' : 'désactivé'}`,
      importEnabled: (v) => `Import de données ${v ? 'autorisé' : 'BLOQUÉ'}`,
    };

    const newVal = !stateMap[field];
    setterMap[field](newVal);

    setSaving(true);
    try {
      await updateSettings({ [field]: newVal });
      showToast(labelMap[field](newVal));
      refreshSettings();
    } catch (err) {
      setterMap[field](!newVal);
      showToast('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  // ═══ AI Toggle functions (2 méthodes : code admin fixe OU code email) ═══
  const handleAiToggleClick = () => {
    const targetState = !aiModelsEnabled;
    setAiModal({ targetState, step: 'code' });
    setAiAdminCode('');
    setAiEmailCode('');
    setAiEmailSent(false);
    setAiError(null);
    // Préparer la session côté backend
    aiToggleSendCode(targetState).catch(() => {});
  };

  // Méthode 1 : Code admin permanent
  const handleAdminCodeConfirm = async () => {
    if (!aiAdminCode.trim()) {
      setAiError('Veuillez entrer votre code administrateur.');
      return;
    }
    setAiModal(prev => ({ ...prev, step: 'verifying' }));
    setAiError(null);
    try {
      const res = await aiToggleConfirm(aiAdminCode.trim(), 'admin');
      setAiModal(prev => ({ ...prev, step: 'done' }));
      const newState = res.data.aiModelsEnabled;
      setAiModelsEnabled(newState);
      setAIEnabled(newState);
      setDynamicExpiresAt(res.data.dynamicExpiresAt || null);
      refreshSettings();
      refreshDynamic();
    } catch (err) {
      setAiError(err.response?.data?.message || 'Code admin incorrect');
      setAiModal(prev => ({ ...prev, step: 'code' }));
    }
  };

  // Méthode 2 : Envoyer code par email
  const handleSendEmailCode = async () => {
    setAiError(null);
    setAiModal(prev => ({ ...prev, step: 'sending' }));
    try {
      await aiToggleSendCode(aiModal.targetState, true); // sendEmail = true
      setAiEmailSent(true);
      setAiModal(prev => ({ ...prev, step: 'code' }));
    } catch (err) {
      setAiError(err.response?.data?.message || 'Erreur lors de l\'envoi du code');
      setAiModal(prev => ({ ...prev, step: 'code' }));
    }
  };

  // Méthode 2 : Confirmer code reçu par email
  const handleEmailCodeConfirm = async () => {
    if (!aiEmailCode.trim()) {
      setAiError('Veuillez entrer le code reçu par email.');
      return;
    }
    setAiModal(prev => ({ ...prev, step: 'verifying' }));
    setAiError(null);
    try {
      const res = await aiToggleConfirm(aiEmailCode.trim(), 'email');
      setAiModal(prev => ({ ...prev, step: 'done' }));
      const newState = res.data.aiModelsEnabled;
      setAiModelsEnabled(newState);
      setAIEnabled(newState);
      setDynamicExpiresAt(res.data.dynamicExpiresAt || null);
      refreshSettings();
      refreshDynamic();
    } catch (err) {
      setAiError(err.response?.data?.message || 'Code email incorrect ou expiré');
      setAiModal(prev => ({ ...prev, step: 'code' }));
    }
  };

  const closeAiModal = () => {
    setAiModal(null);
    setAiAdminCode('');
    setAiEmailCode('');
    setAiEmailSent(false);
    setAiError(null);
  };

  // ═══ Impersonation functions ═══
  const handleImpersonateClick = (user) => {
    if (user.role === 'admin') return;
    setImpModal({ user, step: 'confirm' });
    setImpError(null);
  };

  const handleImpersonate = async () => {
    setImpModal(prev => ({ ...prev, step: 'switching' }));
    setImpError(null);
    try {
      const res = await impersonateUser(impModal.user._id);
      loginUser(res.data.user, res.data.token);
      setImpModal(null);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setImpError(err.response?.data?.message || 'Erreur lors de la connexion');
      setImpModal(prev => ({ ...prev, step: 'confirm' }));
    }
  };

  const closeImpModal = () => {
    setImpModal(null);
    setImpError(null);
  };

  // ═══ Deactivation functions ═══
  const handleDeactivateClick = (e, user) => {
    e.stopPropagation(); // prevent impersonation click
    if (user.role === 'admin') return;
    setDeactModal({ user, step: 'confirm' });
    setDeactCode('');
    setDeactError(null);
  };

  const handleSendDeactivateCode = async () => {
    setDeactModal(prev => ({ ...prev, step: 'sending' }));
    setDeactError(null);
    try {
      await deactivateSendCode(deactModal.user._id);
      setDeactModal(prev => ({ ...prev, step: 'code' }));
    } catch (err) {
      setDeactError(err.response?.data?.message || 'Erreur lors de l\'envoi du code');
      setDeactModal(prev => ({ ...prev, step: 'confirm' }));
    }
  };

  const handleConfirmDeactivation = async () => {
    if (!deactCode.trim()) {
      setDeactError('Veuillez entrer le code de vérification.');
      return;
    }
    setDeactModal(prev => ({ ...prev, step: 'verifying' }));
    setDeactError(null);
    try {
      await deactivateConfirm(deactModal.user._id, deactCode.trim());
      setDeactModal(prev => ({ ...prev, step: 'done' }));
      // Retirer l'utilisateur de la liste (supprimé définitivement)
      setUsers(prev => prev.filter(u => u._id !== deactModal.user._id));
    } catch (err) {
      setDeactError(err.response?.data?.message || 'Code incorrect ou expiré');
      setDeactModal(prev => ({ ...prev, step: 'code' }));
    }
  };

  const closeDeactModal = () => {
    setDeactModal(null);
    setDeactCode('');
    setDeactError(null);
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
                <div
                  key={user._id}
                  className={`px-6 py-4 flex items-center justify-between transition-colors ${
                    user.role !== 'admin'
                      ? 'hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer group'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                  onClick={() => handleImpersonateClick(user)}
                  title={user.role !== 'admin' ? `Se connecter en tant que ${user.name}` : undefined}
                >                  <div className="flex items-center gap-4">
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
                    {user.role !== 'admin' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <FiLogIn className="w-3 h-3" /> Se connecter
                      </span>
                    )}
                    {user.role !== 'admin' && (
                      <button
                        onClick={(e) => handleDeactivateClick(e, user)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors opacity-0 group-hover:opacity-100"
                        title={`Supprimer le compte de ${user.name}`}
                      >
                        <FiTrash2 className="w-3 h-3" /> Supprimer
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ═══ Production Controls — Kill Switches ═══ */}
        <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-8 transition-colors">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-red-50 to-amber-50 dark:from-red-900/20 dark:to-amber-900/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg">
                <FiAlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Contrôle Production</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Stopper les données, modèles IA et accès en un clic</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {/* Maintenance Mode */}
            <div className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
              maintenanceMode
                ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                : 'bg-gray-50 dark:bg-gray-800 border-transparent'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${maintenanceMode ? 'bg-red-100 dark:bg-red-900/40' : 'bg-gray-200 dark:bg-gray-700'}`}>
                  <FiTool className={`w-5 h-5 ${maintenanceMode ? 'text-red-600' : 'text-gray-500'}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Mode Maintenance</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {maintenanceMode
                      ? '🔴 Site bloqué — seul l\'admin peut accéder'
                      : 'Bloquer l\'accès au site pour tous les praticiens'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleToggle('maintenanceMode')}
                disabled={saving}
                className={`w-11 h-6 rounded-full relative transition-colors duration-200 focus:outline-none ${
                  maintenanceMode ? 'bg-red-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-200 ${
                  maintenanceMode ? 'translate-x-[22px]' : 'translate-x-1'
                }`}></div>
              </button>
            </div>

            {/* AI Models + Mode Dynamique — vérification par email */}
            <div className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
              !aiModelsEnabled
                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
                : isDynamic
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700'
                  : 'bg-gray-50 dark:bg-gray-800 border-transparent'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  isDynamic ? 'bg-emerald-100 dark:bg-emerald-900/40' :
                  !aiModelsEnabled ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-gray-200 dark:bg-gray-700'
                }`}>
                  <FiZap className={`w-5 h-5 ${
                    isDynamic ? 'text-emerald-600' :
                    !aiModelsEnabled ? 'text-amber-600' : 'text-gray-500'
                  }`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Modèles IA & Mode Dynamique</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {isDynamic
                      ? `✅ Actif — expire le ${new Date(dynamicExpiresAt).toLocaleDateString('fr-FR')}`
                      : aiModelsEnabled
                        ? '⏳ En attente d\'activation dynamique'
                        : '⚠️ Désactivé — graphiques statiques'}
                  </p>
                  {isDynamic && (
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                      <FiClock className="w-3 h-3" />
                      Renouvellement automatique par email tous les 15 jours
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleAiToggleClick}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  isDynamic
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
                    : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50'
                }`}
              >
                <FiLock className="w-3 h-3" />
                {isDynamic ? 'Désactiver' : 'Activer'}
              </button>
            </div>

            {/* Import Data */}
            <div className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
              !importEnabled
                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
                : 'bg-gray-50 dark:bg-gray-800 border-transparent'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${!importEnabled ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-gray-200 dark:bg-gray-700'}`}>
                  <FiDatabase className={`w-5 h-5 ${!importEnabled ? 'text-amber-600' : 'text-gray-500'}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Import de données</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {importEnabled
                      ? 'Les imports de fichiers TSV/CSV sont autorisés'
                      : '⚠️ Aucune nouvelle donnée ne peut être importée'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleToggle('importEnabled')}
                disabled={saving}
                className={`w-11 h-6 rounded-full relative transition-colors duration-200 focus:outline-none ${
                  importEnabled ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-200 ${
                  importEnabled ? 'translate-x-[22px]' : 'translate-x-1'
                }`}></div>
              </button>
            </div>

            {/* Warning banner */}
            {(maintenanceMode || !aiModelsEnabled || !importEnabled) && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
                <FiAlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-red-600 dark:text-red-400 leading-relaxed">
                  <strong>Attention :</strong> Des fonctionnalités sont désactivées.
                  {maintenanceMode && <span className="block mt-1">• Les praticiens ne peuvent plus accéder au site.</span>}
                  {!aiModelsEnabled && <span className="block mt-1">• Les analyses IA (tendances, anomalies, prévisions, scoring) sont stoppées sur toutes les pages.</span>}
                  {!importEnabled && <span className="block mt-1">• L'import de nouvelles données est bloqué.</span>}
                </div>
              </div>
            )}
          </div>
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

      {/* ═══ Modal Impersonation ═══ */}
      {impModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeImpModal}>
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl w-full max-w-md shadow-2xl transition-all" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <FiLogIn className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Connexion praticien</h2>
                  <p className="text-blue-200 text-xs">{impModal.user.name} ({impModal.user.practitionerCode})</p>
                </div>
              </div>
              <button onClick={closeImpModal} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <FiX className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="p-6">
              {/* Step: Confirm */}
              {impModal.step === 'confirm' && (
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                    <FiLogIn className="w-7 h-7 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Basculer vers ce compte</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Vous allez vous connecter au compte de
                  </p>
                  <p className="text-base font-bold text-gray-900 dark:text-white mb-1">{impModal.user.name}</p>
                  <p className="text-xs text-gray-400 mb-6">{impModal.user.email} — {impModal.user.practitionerCode}</p>
                  {impError && (
                    <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 flex items-center gap-2">
                      <FiAlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <p className="text-xs text-red-600 dark:text-red-400">{impError}</p>
                    </div>
                  )}
                  <button
                    onClick={handleImpersonate}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <FiLogIn className="w-4 h-4" /> Se connecter
                  </button>
                  <button onClick={closeImpModal} className="mt-3 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors">
                    Annuler
                  </button>
                </div>
              )}

              {/* Step: Switching */}
              {impModal.step === 'switching' && (
                <div className="text-center py-6">
                  <div className="w-12 h-12 mx-auto mb-4">
                    <FiLoader className="w-12 h-12 text-blue-600 animate-spin" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Connexion en cours…</p>
                  <p className="text-xs text-gray-400 mt-1">Basculement vers le compte de {impModal.user.name}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Modal Désactivation Compte ═══ */}
      {deactModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeDeactModal}>
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl w-full max-w-md shadow-2xl transition-all" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-red-600 to-red-500 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <FiTrash2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Désactivation du compte</h2>
                  <p className="text-red-200 text-xs">{deactModal.user.name} ({deactModal.user.practitionerCode || deactModal.user.email})</p>
                </div>
              </div>
              <button onClick={closeDeactModal} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <FiX className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="p-6">
              {/* Step: Confirm */}
              {deactModal.step === 'confirm' && (
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
                    <FiAlertTriangle className="w-7 h-7 text-red-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Supprimer ce compte ?</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Vous allez supprimer définitivement le compte de
                  </p>
                  <p className="text-base font-bold text-gray-900 dark:text-white mb-1">{deactModal.user.name}</p>
                  <p className="text-xs text-gray-400 mb-2">{deactModal.user.email}</p>
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 mb-6">
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      <strong>⚠️ Attention :</strong> Cette action est irréversible. Le compte et toutes ses données seront supprimés. Un code de vérification sera envoyé à votre email.
                    </p>
                  </div>
                  {deactError && (
                    <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 flex items-center gap-2">
                      <FiAlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <p className="text-xs text-red-600 dark:text-red-400">{deactError}</p>
                    </div>
                  )}
                  <button
                    onClick={handleSendDeactivateCode}
                    className="w-full py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <FiSend className="w-4 h-4" /> Envoyer le code de vérification
                  </button>
                  <button onClick={closeDeactModal} className="mt-3 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors">
                    Annuler
                  </button>
                </div>
              )}

              {/* Step: Sending code */}
              {deactModal.step === 'sending' && (
                <div className="text-center py-6">
                  <div className="w-12 h-12 mx-auto mb-4">
                    <FiLoader className="w-12 h-12 text-red-600 animate-spin" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Envoi du code en cours…</p>
                  <p className="text-xs text-gray-400 mt-1">Vérifiez votre boîte email</p>
                </div>
              )}

              {/* Step: Enter code */}
              {deactModal.step === 'code' && (
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                    <FiLock className="w-7 h-7 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Entrez le code de vérification</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Un code à 6 chiffres a été envoyé à votre email
                  </p>
                  {deactError && (
                    <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 flex items-center gap-2">
                      <FiAlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <p className="text-xs text-red-600 dark:text-red-400">{deactError}</p>
                    </div>
                  )}
                  <input
                    type="text"
                    value={deactCode}
                    onChange={e => setDeactCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="w-full text-center text-3xl font-mono font-bold tracking-[12px] py-4 px-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500 mb-6"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && deactCode.length === 6 && handleConfirmDeactivation()}
                  />
                  <button
                    onClick={handleConfirmDeactivation}
                    disabled={deactCode.length !== 6}
                    className={`w-full py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
                      deactCode.length === 6
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <FiTrash2 className="w-4 h-4" /> Confirmer la suppression
                  </button>
                  <button onClick={closeDeactModal} className="mt-3 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors">
                    Annuler
                  </button>
                </div>
              )}

              {/* Step: Verifying */}
              {deactModal.step === 'verifying' && (
                <div className="text-center py-6">
                  <div className="w-12 h-12 mx-auto mb-4">
                    <FiLoader className="w-12 h-12 text-red-600 animate-spin" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Vérification en cours…</p>
                  <p className="text-xs text-gray-400 mt-1">Suppression du compte</p>
                </div>
              )}

              {/* Step: Done */}
              {deactModal.step === 'done' && (
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
                    <FiCheck className="w-7 h-7 text-green-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Compte supprimé</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Le compte de <strong>{deactModal.user.name}</strong> a été supprimé définitivement.
                  </p>
                  <p className="text-xs text-gray-400 mb-6">Toutes les données associées ont été supprimées.</p>
                  <button
                    onClick={closeDeactModal}
                    className="w-full py-3 bg-gray-800 dark:bg-gray-600 text-white rounded-xl font-semibold hover:bg-gray-900 dark:hover:bg-gray-500 transition-colors"
                  >
                    Fermer
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ AI Toggle Modal (vérification email) ═══ */}
      {aiModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className={`px-6 py-4 flex items-center justify-between ${
              aiModal.targetState
                ? 'bg-gradient-to-r from-emerald-600 to-green-600'
                : 'bg-gradient-to-r from-red-600 to-orange-600'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <FiZap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Modèles IA & Dynamisme</p>
                  <p className="text-white/70 text-xs">{aiModal.targetState ? 'Activation' : 'Désactivation'}</p>
                </div>
              </div>
              <button onClick={closeAiModal} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <FiX className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="p-6">
              {/* Step: Two methods - admin code OR email code */}
              {aiModal.step === 'code' && (
                <div>
                  <h3 className="text-center text-lg font-bold text-gray-900 dark:text-white mb-1">
                    {aiModal.targetState ? 'Activer le mode dynamique' : 'Désactiver le mode dynamique'}
                  </h3>
                  <p className="text-center text-xs text-gray-400 mb-5">
                    {aiModal.targetState
                      ? 'Activez les graphiques dynamiques et les analyses IA pour tous les utilisateurs (15 jours).'
                      : 'Le site repassera en mode statique pour tous les utilisateurs.'}
                  </p>

                  {aiError && (
                    <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 flex items-center gap-2">
                      <FiAlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <p className="text-xs text-red-600 dark:text-red-400">{aiError}</p>
                    </div>
                  )}

                  {/* ── Méthode 1 : Code Admin Permanent ── */}
                  <div className="mb-5 p-4 rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                        <FiKey className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">Code Administrateur</p>
                        <p className="text-[10px] text-gray-400">Code permanent — activation instantanée</p>
                      </div>
                    </div>
                    <input
                      type="password"
                      value={aiAdminCode}
                      onChange={e => setAiAdminCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="••••••"
                      maxLength={6}
                      className="w-full text-center text-2xl font-mono font-bold tracking-[10px] py-3 px-4 rounded-xl border-2 border-blue-200 dark:border-blue-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3"
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && aiAdminCode.length === 6 && handleAdminCodeConfirm()}
                    />
                    <button
                      onClick={handleAdminCodeConfirm}
                      disabled={aiAdminCode.length !== 6}
                      className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${
                        aiAdminCode.length === 6
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <FiZap className="w-4 h-4" /> Activer maintenant
                    </button>
                  </div>

                  {/* ── Séparateur ── */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">ou</span>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                  </div>

                  {/* ── Méthode 2 : Code par Email ── */}
                  <div className="p-4 rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center">
                        <FiMail className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">Vérification par Email</p>
                        <p className="text-[10px] text-gray-400">Un code temporaire sera envoyé à votre email</p>
                      </div>
                    </div>

                    {!aiEmailSent ? (
                      <button
                        onClick={handleSendEmailCode}
                        className="w-full py-2.5 rounded-xl font-semibold text-sm bg-amber-500 text-white hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <FiSend className="w-4 h-4" /> Envoyer le code par email
                      </button>
                    ) : (
                      <>
                        <p className="text-xs text-green-600 dark:text-green-400 mb-3 flex items-center gap-1">
                          <FiCheck className="w-3 h-3" /> Code envoyé ! Vérifiez votre boîte email
                        </p>
                        <input
                          type="text"
                          value={aiEmailCode}
                          onChange={e => setAiEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="000000"
                          maxLength={6}
                          className="w-full text-center text-2xl font-mono font-bold tracking-[10px] py-3 px-4 rounded-xl border-2 border-amber-200 dark:border-amber-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 mb-3"
                          onKeyDown={e => e.key === 'Enter' && aiEmailCode.length === 6 && handleEmailCodeConfirm()}
                        />
                        <button
                          onClick={handleEmailCodeConfirm}
                          disabled={aiEmailCode.length !== 6}
                          className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${
                            aiEmailCode.length === 6
                              ? 'bg-amber-500 text-white hover:bg-amber-600'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          <FiCheck className="w-4 h-4" /> Confirmer le code email
                        </button>
                      </>
                    )}
                  </div>

                  <button onClick={closeAiModal} className="w-full mt-4 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors text-center">
                    Annuler
                  </button>
                </div>
              )}

              {/* Step: Sending email */}
              {aiModal.step === 'sending' && (
                <div className="text-center py-6">
                  <div className="w-12 h-12 mx-auto mb-4">
                    <FiLoader className="w-12 h-12 text-amber-500 animate-spin" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Envoi du code par email…</p>
                  <p className="text-xs text-gray-400 mt-1">Veuillez patienter</p>
                </div>
              )}

              {/* Step: Verifying */}
              {aiModal.step === 'verifying' && (
                <div className="text-center py-6">
                  <div className="w-12 h-12 mx-auto mb-4">
                    <FiLoader className="w-12 h-12 text-emerald-600 animate-spin" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Vérification en cours…</p>
                  <p className="text-xs text-gray-400 mt-1">{aiModal.targetState ? 'Activation' : 'Désactivation'} des modèles IA</p>
                </div>
              )}

              {/* Step: Done */}
              {aiModal.step === 'done' && (
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
                    <FiCheck className="w-7 h-7 text-green-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    {aiModal.targetState ? '✅ Mode dynamique activé !' : '⏸️ Mode dynamique désactivé'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    {aiModal.targetState
                      ? 'Tous les graphiques et analyses IA sont maintenant dynamiques pour tous les utilisateurs.'
                      : 'Le site est repassé en mode statique.'}
                  </p>
                  {aiModal.targetState && dynamicExpiresAt && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-2 flex items-center justify-center gap-1">
                      <FiClock className="w-3 h-3" />
                      Expire le {new Date(dynamicExpiresAt).toLocaleDateString('fr-FR')} — renouvellement automatique par email
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mb-6">
                    {aiModal.targetState
                      ? 'Un nouveau code sera envoyé automatiquement à votre email dans 15 jours pour le renouvellement.'
                      : 'Vous pouvez le réactiver à tout moment.'}
                  </p>
                  <button
                    onClick={closeAiModal}
                    className="w-full py-3 bg-gray-800 dark:bg-gray-600 text-white rounded-xl font-semibold hover:bg-gray-900 dark:hover:bg-gray-500 transition-colors"
                  >
                    Fermer
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
