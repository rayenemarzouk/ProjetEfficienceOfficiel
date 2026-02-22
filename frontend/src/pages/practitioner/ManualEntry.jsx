import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { submitManualEntry, getManualEntry, updateProfile } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { FiEdit3, FiCheck, FiAlertCircle, FiCalendar, FiDollarSign, FiUsers, FiClock, FiFileText, FiLoader, FiSave, FiRefreshCw, FiShield } from 'react-icons/fi';

const fmt = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v || 0);

// Générer les options de mois (12 derniers mois)
function generateMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const label = `${months[d.getMonth()]} ${d.getFullYear()}`;
    options.push({ value, label });
  }
  return options;
}

const dataTypes = [
  {
    value: 'realisation',
    label: 'Réalisation',
    icon: FiDollarSign,
    desc: 'CA facturé, CA encaissé, nombre de patients',
    color: 'primary',
    fields: [
      { key: 'nbPatients', label: 'Nombre de patients', type: 'number', icon: FiUsers, placeholder: 'Ex: 45' },
      { key: 'montantFacture', label: 'Montant facturé (€)', type: 'number', icon: FiDollarSign, placeholder: 'Ex: 12500', step: '0.01' },
      { key: 'montantEncaisse', label: 'Montant encaissé (€)', type: 'number', icon: FiDollarSign, placeholder: 'Ex: 11200', step: '0.01' },
    ]
  },
  {
    value: 'rendez-vous',
    label: 'Rendez-vous',
    icon: FiCalendar,
    desc: 'RDV, durée totale, patients, nouveaux patients',
    color: 'blue',
    fields: [
      { key: 'nbRdv', label: 'Nombre de RDV', type: 'number', icon: FiCalendar, placeholder: 'Ex: 120' },
      { key: 'dureeTotaleRdv', label: 'Durée totale RDV (minutes)', type: 'number', icon: FiClock, placeholder: 'Ex: 3600' },
      { key: 'nbPatients', label: 'Nombre de patients', type: 'number', icon: FiUsers, placeholder: 'Ex: 45' },
      { key: 'nbNouveauxPatients', label: 'Nouveaux patients', type: 'number', icon: FiUsers, placeholder: 'Ex: 8' },
    ]
  },
  {
    value: 'jours-ouverts',
    label: 'Jours Ouverts',
    icon: FiClock,
    desc: 'Heures travaillées par mois',
    color: 'purple',
    fields: [
      { key: 'nbHeures', label: 'Heures travaillées (en minutes)', type: 'number', icon: FiClock, placeholder: 'Ex: 9600' },
    ]
  },
  {
    value: 'devis',
    label: 'Devis',
    icon: FiFileText,
    desc: 'Nb devis, montants proposés/acceptés',
    color: 'amber',
    fields: [
      { key: 'nbDevis', label: 'Nombre de devis', type: 'number', icon: FiFileText, placeholder: 'Ex: 15' },
      { key: 'montantPropositions', label: 'Montant proposé (€)', type: 'number', icon: FiDollarSign, placeholder: 'Ex: 25000', step: '0.01' },
      { key: 'nbDevisAcceptes', label: 'Devis acceptés', type: 'number', icon: FiCheck, placeholder: 'Ex: 10' },
      { key: 'montantAccepte', label: 'Montant accepté (€)', type: 'number', icon: FiDollarSign, placeholder: 'Ex: 18000', step: '0.01' },
    ]
  },
  {
    value: 'encours',
    label: 'En-cours',
    icon: FiRefreshCw,
    desc: 'Travaux en cours — durée, montant, rentabilité',
    color: 'teal',
    fields: [
      { key: 'dureeTotaleARealiser', label: 'Durée à réaliser (minutes)', type: 'number', icon: FiClock, placeholder: 'Ex: 4800' },
      { key: 'montantTotalAFacturer', label: 'Montant à facturer (€)', type: 'number', icon: FiDollarSign, placeholder: 'Ex: 35000', step: '0.01' },
      { key: 'rentabiliteHoraire', label: 'Rentabilité horaire (€/h)', type: 'number', icon: FiDollarSign, placeholder: 'Ex: 250', step: '0.01' },
      { key: 'rentabiliteJoursTravailles', label: 'Rentabilité jours travaillés (€/j)', type: 'number', icon: FiDollarSign, placeholder: 'Ex: 1800', step: '0.01' },
      { key: 'patientsEnCours', label: 'Patients en cours', type: 'number', icon: FiUsers, placeholder: 'Ex: 22' },
    ]
  },
];

export default function ManualEntry() {
  const { user, updateUser } = useAuth();
  const monthOptions = generateMonthOptions();
  const [selectedType, setSelectedType] = useState('realisation');
  const [selectedMois, setSelectedMois] = useState(monthOptions[0].value);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [message, setMessage] = useState(null);
  const [codeInput, setCodeInput] = useState('');
  const [savingCode, setSavingCode] = useState(false);

  const hasPractitionerCode = !!user?.practitionerCode;

  const handleSaveCode = async () => {
    if (!codeInput.trim()) return;
    setSavingCode(true);
    try {
      const res = await updateProfile({ practitionerCode: codeInput.trim().toUpperCase() });
      updateUser(res.data.user);
      setMessage({ type: 'success', text: `Code praticien "${res.data.user.practitionerCode}" enregistr\u00e9 avec succ\u00e8s !` });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur lors de la mise \u00e0 jour du code.' });
    } finally {
      setSavingCode(false);
    }
  };

  const currentType = dataTypes.find(d => d.value === selectedType);

  // Charger les données existantes quand on change de type ou mois
  useEffect(() => {
    const fetchExisting = async () => {
      setLoadingExisting(true);
      setMessage(null);
      try {
        const res = await getManualEntry(selectedType, selectedMois);
        if (res.data.data) {
          const existing = {};
          currentType.fields.forEach(f => {
            existing[f.key] = res.data.data[f.key] || '';
          });
          setFormData(existing);
        } else {
          // Aucune donnée existante — formulaire vide
          const empty = {};
          currentType.fields.forEach(f => { empty[f.key] = ''; });
          setFormData(empty);
        }
      } catch {
        const empty = {};
        currentType.fields.forEach(f => { empty[f.key] = ''; });
        setFormData(empty);
      } finally {
        setLoadingExisting(false);
      }
    };
    fetchExisting();
  }, [selectedType, selectedMois]);

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await submitManualEntry(selectedType, selectedMois, formData);
      setMessage({ type: 'success', text: res.data.message || 'Données enregistrées avec succès.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur lors de l\'enregistrement.' });
    } finally {
      setSaving(false);
    }
  };

  // Calculs automatiques en direct
  const computedStats = [];
  if (selectedType === 'realisation') {
    const facture = parseFloat(formData.montantFacture) || 0;
    const encaisse = parseFloat(formData.montantEncaisse) || 0;
    const patients = parseFloat(formData.nbPatients) || 0;
    if (facture > 0) {
      computedStats.push({ label: 'Taux encaissement', value: `${((encaisse / facture) * 100).toFixed(1)}%` });
    }
    if (patients > 0) {
      computedStats.push({ label: 'Panier moyen', value: fmt(facture / patients) });
    }
    if (facture > 0) {
      computedStats.push({ label: 'Reste à encaisser', value: fmt(facture - encaisse) });
    }
  }
  if (selectedType === 'devis') {
    const nbDevis = parseFloat(formData.nbDevis) || 0;
    const nbAcceptes = parseFloat(formData.nbDevisAcceptes) || 0;
    const montantProp = parseFloat(formData.montantPropositions) || 0;
    const montantAcc = parseFloat(formData.montantAccepte) || 0;
    if (nbDevis > 0) {
      computedStats.push({ label: 'Taux acceptation', value: `${((nbAcceptes / nbDevis) * 100).toFixed(1)}%` });
    }
    if (montantProp > 0) {
      computedStats.push({ label: 'Taux montant accepté', value: `${((montantAcc / montantProp) * 100).toFixed(1)}%` });
    }
  }
  if (selectedType === 'rendez-vous') {
    const nbRdv = parseFloat(formData.nbRdv) || 0;
    const duree = parseFloat(formData.dureeTotaleRdv) || 0;
    if (nbRdv > 0 && duree > 0) {
      computedStats.push({ label: 'Durée moy. / RDV', value: `${(duree / nbRdv).toFixed(0)} min` });
    }
    const nbPat = parseFloat(formData.nbPatients) || 0;
    const nbNew = parseFloat(formData.nbNouveauxPatients) || 0;
    if (nbPat > 0) {
      computedStats.push({ label: 'Taux nouveaux patients', value: `${((nbNew / nbPat) * 100).toFixed(1)}%` });
    }
  }

  const colorMap = {
    primary: { bg: 'bg-primary-50 dark:bg-primary-900/30', text: 'text-primary-600 dark:text-primary-400', border: 'border-primary-200 dark:border-primary-800', ring: 'ring-primary-500' },
    blue: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', ring: 'ring-blue-500' },
    purple: { bg: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800', ring: 'ring-purple-500' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', ring: 'ring-amber-500' },
    teal: { bg: 'bg-teal-50 dark:bg-teal-900/30', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800', ring: 'ring-teal-500' },
  };

  const colors = colorMap[currentType.color] || colorMap.primary;

  return (
    <div>
      <Header title="Saisie Manuelle" subtitle={`Cabinet ${user?.cabinetName || user?.name || ''} — Entrez vos données mensuelles`} />

      <div className="p-8">
        <div className="max-w-4xl mx-auto">

          {/* Type Selection */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
            {dataTypes.map(dt => {
              const Icon = dt.icon;
              const isActive = selectedType === dt.value;
              const c = colorMap[dt.color];
              return (
                <button
                  key={dt.value}
                  onClick={() => setSelectedType(dt.value)}
                  className={`p-4 rounded-2xl text-center transition-all duration-300 border-2 ${
                    isActive
                      ? `${c.bg} ${c.border} shadow-lg scale-[1.02]`
                      : 'bg-white dark:bg-[#1e293b] border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Icon className={`w-6 h-6 mx-auto mb-2 ${isActive ? c.text : 'text-gray-400'}`} />
                  <p className={`text-xs font-bold ${isActive ? c.text : 'text-gray-600 dark:text-gray-400'}`}>{dt.label}</p>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-gray-700 p-8 transition-colors">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${colors.bg}`}>
                      <FiEdit3 className={`w-5 h-5 ${colors.text}`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold dark:text-white">{currentType.label}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{currentType.desc}</p>
                    </div>
                  </div>
                  {loadingExisting && (
                    <FiLoader className="w-5 h-5 text-gray-400 animate-spin" />
                  )}
                </div>

                {/* Practitioner code warning & setup */}
                {!hasPractitionerCode && (
                  <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-start gap-3">
                      <FiAlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">Code praticien manquant</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">Renseignez votre code praticien LogosW (ex: JC, DV) pour associer correctement vos donn\u00e9es. Sans ce code, vos donn\u00e9es seront enregistr\u00e9es sous votre nom.</p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={codeInput}
                            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                            placeholder="Ex: JC"
                            maxLength={10}
                            className="flex-1 px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-mono uppercase focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          />
                          <button
                            onClick={handleSaveCode}
                            disabled={savingCode || !codeInput.trim()}
                            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                          >
                            {savingCode ? <FiLoader className="w-3.5 h-3.5 animate-spin" /> : <FiShield className="w-3.5 h-3.5" />}
                            Enregistrer
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Month selector */}
                <div className="mb-6">
                  <label className="flex text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 items-center gap-2">
                    <FiCalendar className="w-4 h-4" />
                    Mois
                  </label>
                  <select
                    value={selectedMois}
                    onChange={(e) => setSelectedMois(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  >
                    {monthOptions.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                {message && (
                  <div className={`mb-6 p-4 rounded-xl flex items-center gap-2 text-sm ${
                    message.type === 'success'
                      ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                  }`}>
                    {message.type === 'success' ? <FiCheck className="flex-shrink-0" /> : <FiAlertCircle className="flex-shrink-0" />}
                    {message.text}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    {currentType.fields.map(field => {
                      const Icon = field.icon;
                      return (
                        <div key={field.key}>
                          <label className="flex text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5 text-gray-400" />
                            {field.label}
                          </label>
                          <input
                            type={field.type}
                            step={field.step || '1'}
                            min="0"
                            value={formData[field.key] || ''}
                            onChange={(e) => handleChange(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                          />
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="mt-8 w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-primary-600 to-blue-600 text-white font-bold text-sm hover:from-primary-700 hover:to-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/20 hover:shadow-primary-500/40"
                  >
                    {saving ? (
                      <>
                        <FiLoader className="w-4 h-4 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <FiSave className="w-4 h-4" />
                        Enregistrer les données
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Side Panel — Computed Stats */}
            <div className="space-y-6">
              {/* Computed KPIs */}
              {computedStats.length > 0 && (
                <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-gray-700 p-6 transition-colors">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <FiRefreshCw className="w-4 h-4 text-primary-500" />
                    Calculs automatiques
                  </h4>
                  <div className="space-y-3">
                    {computedStats.map((stat, i) => (
                      <div key={i} className={`p-3 rounded-xl ${colors.bg} border ${colors.border}`}>
                        <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{stat.label}</p>
                        <p className={`text-lg font-black ${colors.text} tabular-nums`}>{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Guide */}
              <div className="bg-gradient-to-br from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 rounded-2xl border border-primary-100 dark:border-primary-800 p-6 transition-colors">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <FiEdit3 className="w-4 h-4 text-primary-500" />
                  Guide de saisie
                </h4>
                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-2 leading-relaxed">
                  <p>• Sélectionnez le <strong>type de données</strong> et le <strong>mois</strong> concerné.</p>
                  <p>• Si des données existent déjà pour ce mois, elles seront pré-remplies.</p>
                  <p>• Les données enregistrées <strong>remplacent</strong> les valeurs existantes pour ce mois.</p>
                  <p>• Les <strong>calculs automatiques</strong> s'affichent en temps réel pendant la saisie.</p>
                  <p>• Les montants sont en <strong>euros</strong>, les durées en <strong>minutes</strong>.</p>
                </div>
              </div>

              {/* Info praticien */}
              <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-gray-700 p-6 transition-colors">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Votre cabinet</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Praticien</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{user?.name || '—'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Cabinet</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{user?.cabinetName || '—'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Mois sélectionné</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{monthOptions.find(m => m.value === selectedMois)?.label || '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
