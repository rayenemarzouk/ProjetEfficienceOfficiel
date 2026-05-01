import { useState, useEffect } from 'react';
import { getAdminPractitioners, adminManualEntry, addPractitioner, deletePractitioner } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  CheckCircleIcon, ExclamationCircleIcon, PencilSquareIcon,
  UserPlusIcon, ChevronDownIcon, ChevronUpIcon, TrashIcon
} from '@heroicons/react/24/outline';

const generateMonthOptions = () => {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 36; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    options.push({ value: `${yyyy}${mm}`, label: `${months[d.getMonth()]} ${yyyy}` });
  }
  return options;
};

const EMPTY_FORM = {
  praticien: '',
  mois: '',
  caFacture: '',
  caEncaisse: '',
  nbPatients: '',
  nouveauxPatients: '',
  nouveauxDossiers: '',
  reglementsPourAnnee: '',
  totalRdv: '',
  heuresTravaillees: '',
  rdvHonores: '',
  rdvManques: '',
  annulations: '',
  reports: '',
  dureeMoyennePrevue: '',
  rdvParJour: '',
  rdvImportants: '',
  nbDevis: '',
  montantTotalPresente: '',
  montantMoyenPresente: '',
  nbDevisAcceptes: '',
  tauxAcceptationNombre: '',
  montantTotalAccepte: '',
  montantMoyenAccepte: '',
  tauxAcceptationMontant: '',
  delaiMoyenAcceptation: '',
  montantTotalRealise: '',
  montantMoyenRealise: '',
  soinsConservateurs: { nombre: '', dents: '', honoraires: '', honorairesNR: '' },
  prothesesFixes: { nombre: '', dents: '', honoraires: '', honorairesNR: '' },
  prothesesAmovibles: { nombre: '', dents: '', honoraires: '', honorairesNR: '' },
  prothesesMaxilloFaciales: { nombre: '', dents: '', honoraires: '', honorairesNR: '' },
  chirurgie: { nombre: '', dents: '', honoraires: '', honorairesNR: '' },
  odf: { nombre: '', dents: '', honoraires: '', honorairesNR: '' },
  consultations: { nombre: '', dents: '', honoraires: '', honorairesNR: '' },
  prophylaxie: { nombre: '', dents: '', honoraires: '', honorairesNR: '' },
  endodontie: { nombre: '', dents: '', honoraires: '', honorairesNR: '' },
  radiographie: { nombre: '', dents: '', honoraires: '', honorairesNR: '' },
  parodontologie: { nombre: '', dents: '', honoraires: '', honorairesNR: '' },
  implantologie: { nombre: '', dents: '', honoraires: '', honorairesNR: '' },
  implantologieChirurgicale: { nombre: '', dents: '', honoraires: '', honorairesNR: '' },
  implantologieProthetique: { nombre: '', dents: '', honoraires: '', honorairesNR: '' },
  occlusodontie: { nombre: '', dents: '', honoraires: '', honorairesNR: '' },
  esthetique: { nombre: '', dents: '', honoraires: '', honorairesNR: '' }
};

const ACTES_LIST = [
  { key: 'soinsConservateurs', label: 'Soins conservateurs' },
  { key: 'prothesesFixes', label: 'Prothèses fixes' },
  { key: 'prothesesAmovibles', label: 'Prothèses amovibles' },
  { key: 'prothesesMaxilloFaciales', label: 'Prothèses maxillo-faciales' },
  { key: 'chirurgie', label: 'Chirurgie' },
  { key: 'odf', label: 'ODF' },
  { key: 'consultations', label: 'Consultations' },
  { key: 'prophylaxie', label: 'Prophylaxie' },
  { key: 'endodontie', label: 'Endodontie' },
  { key: 'radiographie', label: 'Radiographie' },
  { key: 'parodontologie', label: 'Parodontologie' },
  { key: 'implantologie', label: 'Implantologie' },
  { key: 'implantologieChirurgicale', label: 'Implantologie chirurgicale' },
  { key: 'implantologieProthetique', label: 'Implantologie prothétique' },
  { key: 'occlusodontie', label: 'Occlusodontie' },
  { key: 'esthetique', label: 'Esthétique' }
];

const EMPTY_NEW_PRAT = {
  name: '', practitionerCode: '', cabinetName: '', email: '', password: ''
};

const Field = ({ label, required, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
      {...props}
    />
  </div>
);

const Alert = ({ type, message }) => (
  <div className={`flex items-center gap-3 p-4 rounded-xl border text-sm font-medium ${
    type === 'success'
      ? 'bg-green-50 border-green-200 text-green-700'
      : 'bg-red-50 border-red-200 text-red-700'
  }`}>
    {type === 'success'
      ? <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
      : <ExclamationCircleIcon className="w-5 h-5 flex-shrink-0" />
    }
    {message}
  </div>
);

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-600 uppercase tracking-wider">{title}</span>
        {open ? <ChevronDownIcon className="w-4 h-4 text-gray-400" /> : <ChevronUpIcon className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="p-5 space-y-5">{children}</div>}
    </div>
  );
}

export default function AdminSaisieData() {
  const { user } = useAuth();
  const isRayan = user?.email === 'maarzoukrayan3@gmail.com';

  const [practitioners, setPractitioners] = useState([]);
  const [loading, setLoading] = useState(true);

  // Formulaire saisie données
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  // Formulaire nouveau praticien
  const [showAddPrat, setShowAddPrat] = useState(false);
  const [newPrat, setNewPrat] = useState(EMPTY_NEW_PRAT);
  const [addingPrat, setAddingPrat] = useState(false);
  const [addPratStatus, setAddPratStatus] = useState(null);

  // Formulaire suppression praticien
  const [showDelPrat, setShowDelPrat] = useState(false);
  const [delCode, setDelCode] = useState('');
  const [delConfirm, setDelConfirm] = useState(false);
  const [deletingPrat, setDeletingPrat] = useState(false);
  const [delStatus, setDelStatus] = useState(null);

  const monthOptions = generateMonthOptions();

  const loadPractitioners = async () => {
    try {
      const res = await getAdminPractitioners();
      const list = res.data.practitioners || [];
      setPractitioners(list);
      return list;
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  useEffect(() => {
    const init = async () => {
      const list = await loadPractitioners();
      if (list.length > 0) {
        setForm(f => ({
          ...f,
          praticien: list[0].practitionerCode,
          mois: monthOptions[1]?.value || ''
        }));
      }
      setLoading(false);
    };
    init();
  }, []);

  const handleChange = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    setStatus(null);
  };

  const handleActeChange = (acteKey, subField, value) => {
    setForm(f => ({
      ...f,
      [acteKey]: { ...f[acteKey], [subField]: value }
    }));
    setStatus(null);
  };

  const inputCls = 'w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
  const numInput = (field, placeholder = '0', step = '1') => (
    <input
      type="number" min="0" step={step} placeholder={placeholder}
      value={form[field]}
      onChange={e => handleChange(field, e.target.value)}
      className={inputCls}
    />
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await adminManualEntry(form);
      setStatus({ type: 'success', message: 'Données enregistrées avec succès !' });
      setForm(f => ({ ...EMPTY_FORM, praticien: f.praticien, mois: f.mois }));
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: "Erreur lors de l'enregistrement. Vérifiez les données." });
    } finally {
      setSaving(false);
    }
  };

  const handleNewPratChange = (field, value) => {
    setNewPrat(p => ({ ...p, [field]: value }));
    setAddPratStatus(null);
  };

  const handleAddPraticien = async (e) => {
    e.preventDefault();
    try {
      setAddingPrat(true);
      const res = await addPractitioner(newPrat);
      const created = res.data.practitioner;
      await loadPractitioners();
      setForm(f => ({ ...f, praticien: created.practitionerCode }));
      setAddPratStatus({ type: 'success', message: `Praticien « ${created.practitionerName} » ajouté et sélectionné !` });
      setNewPrat(EMPTY_NEW_PRAT);
      setTimeout(() => { setShowAddPrat(false); setAddPratStatus(null); }, 2500);
    } catch (err) {
      const msg = err.response?.data?.message || 'Erreur lors de la création du praticien.';
      setAddPratStatus({ type: 'error', message: msg });
    } finally {
      setAddingPrat(false);
    }
  };

  const handleDeletePraticien = async (e) => {
    e.preventDefault();
    if (!delCode || !delConfirm) return;
    try {
      setDeletingPrat(true);
      const res = await deletePractitioner(delCode);
      const updatedList = await loadPractitioners();
      if (form.praticien === delCode) {
        setForm(f => ({ ...f, praticien: updatedList[0]?.practitionerCode || '' }));
      }
      setDelStatus({ type: 'success', message: res.data.message });
      setDelCode('');
      setDelConfirm(false);
      setTimeout(() => { setShowDelPrat(false); setDelStatus(null); }, 2500);
    } catch (err) {
      const msg = err.response?.data?.message || 'Erreur lors de la suppression.';
      setDelStatus({ type: 'error', message: msg });
    } finally {
      setDeletingPrat(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <PencilSquareIcon className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Saisie de Données</h1>
          <p className="text-gray-500 text-sm mt-0.5">Enregistrez les données mensuelles d'un praticien</p>
        </div>
      </div>

      {/* ── Bloc ajout praticien ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <button
          type="button"
          onClick={() => { setShowAddPrat(v => !v); setAddPratStatus(null); }}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <UserPlusIcon className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-800">Ajouter un nouveau praticien</p>
              <p className="text-xs text-gray-500">Créez un compte praticien — il apparaîtra dans les filtres et graphes</p>
            </div>
          </div>
          {showAddPrat
            ? <ChevronUpIcon className="w-4 h-4 text-gray-400" />
            : <ChevronDownIcon className="w-4 h-4 text-gray-400" />
          }
        </button>

        {showAddPrat && (
          <div className="border-t border-gray-100 px-6 pb-6 pt-5">
            {addPratStatus && <div className="mb-5"><Alert type={addPratStatus.type} message={addPratStatus.message} /></div>}
            <form onSubmit={handleAddPraticien} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Nom complet" required placeholder="Dr. Jean Dupont"
                  value={newPrat.name} onChange={e => handleNewPratChange('name', e.target.value)} />
                <Field label="Code praticien" required placeholder="ex: JD"
                  value={newPrat.practitionerCode}
                  onChange={e => handleNewPratChange('practitionerCode', e.target.value.toUpperCase())} />
                <Field label="Nom du cabinet" placeholder="Cabinet Dentaire Paris"
                  value={newPrat.cabinetName} onChange={e => handleNewPratChange('cabinetName', e.target.value)} />
                <Field label="Email" required type="email" placeholder="jean.dupont@exemple.fr"
                  value={newPrat.email} onChange={e => handleNewPratChange('email', e.target.value)} />
              </div>
              <Field label="Mot de passe" required type="password" placeholder="Mot de passe du compte"
                value={newPrat.password} onChange={e => handleNewPratChange('password', e.target.value)} />
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={addingPrat || !newPrat.name || !newPrat.practitionerCode || !newPrat.email || !newPrat.password}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-semibold rounded-xl text-sm transition"
                >
                  {addingPrat ? (
                    <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Création...</>
                  ) : (
                    <><UserPlusIcon className="w-4 h-4" />Créer le praticien</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setNewPrat(EMPTY_NEW_PRAT); setAddPratStatus(null); }}
                  className="px-5 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-xl text-sm transition"
                >
                  Réinitialiser
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* ── Bloc suppression praticien (Rayan only) ──────────────── */}
      {isRayan && (
        <div className="bg-white rounded-2xl shadow-sm border border-rose-100 overflow-hidden">
          <button
            type="button"
            onClick={() => { setShowDelPrat(v => !v); setDelStatus(null); }}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-rose-50 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center">
                <TrashIcon className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-rose-800">Supprimer un praticien</p>
                <p className="text-xs text-rose-500">Désactive le compte — les données existantes sont conservées</p>
              </div>
            </div>
            {showDelPrat
              ? <ChevronUpIcon className="w-4 h-4 text-rose-400" />
              : <ChevronDownIcon className="w-4 h-4 text-rose-400" />
            }
          </button>

          {showDelPrat && (
            <div className="border-t border-rose-100 px-6 pb-6 pt-5">
              {delStatus && <div className="mb-5"><Alert type={delStatus.type} message={delStatus.message} /></div>}
              <form onSubmit={handleDeletePraticien} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Praticien à désactiver <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={delCode}
                    onChange={e => { setDelCode(e.target.value); setDelConfirm(false); }}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white"
                  >
                    <option value="">-- Sélectionner --</option>
                    {practitioners.map(p => (
                      <option key={p.practitionerCode} value={p.practitionerCode}>
                        {p.practitionerName || p.practitionerCode}
                        {p.cabinetName ? ` — ${p.cabinetName}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {delCode && (
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={delConfirm}
                      onChange={e => setDelConfirm(e.target.checked)}
                      className="mt-0.5 accent-rose-600"
                    />
                    <span className="text-sm text-rose-700">
                      Je confirme vouloir désactiver le praticien <strong>{practitioners.find(p => p.practitionerCode === delCode)?.practitionerName || delCode}</strong>. Cette action est réversible par un admin.
                    </span>
                  </label>
                )}

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={deletingPrat || !delCode || !delConfirm}
                    className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white font-semibold rounded-xl text-sm transition"
                  >
                    {deletingPrat ? (
                      <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Suppression...</>
                    ) : (
                      <><TrashIcon className="w-4 h-4" />Désactiver le praticien</>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDelCode(''); setDelConfirm(false); setDelStatus(null); }}
                    className="px-5 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-xl text-sm transition"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ── Formulaire saisie données ────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {status && <Alert type={status.type} message={status.message} />}

            {/* Praticien + Mois */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Praticien <span className="text-red-500">*</span>
                </label>
                <select
                  required value={form.praticien}
                  onChange={e => handleChange('praticien', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="">-- Sélectionner --</option>
                  {practitioners.map(p => (
                    <option key={p.practitionerCode} value={p.practitionerCode}>
                      {p.practitionerName || p.practitionerCode}
                      {p.cabinetName ? ` — ${p.cabinetName}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Mois <span className="text-red-500">*</span>
                </label>
                <select
                  required value={form.mois}
                  onChange={e => handleChange('mois', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  {monthOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Chiffre d'affaires */}
            <Section title="📊 Chiffre d'Affaires">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="CA Facturé (€)">{numInput('caFacture', '0.00', '0.01')}</Field>
                <Field label="CA Encaissé (€)">{numInput('caEncaisse', '0.00', '0.01')}</Field>
              </div>
            </Section>

            {/* Patients */}
            <Section title="👥 Patients">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Field label="Nb Patients">{numInput('nbPatients')}</Field>
                <Field label="Nouveaux">{numInput('nouveauxPatients')}</Field>
                <Field label="Nouveaux Dossiers">{numInput('nouveauxDossiers')}</Field>
                <Field label="Règlements Année (€)">{numInput('reglementsPourAnnee', '0.00', '0.01')}</Field>
              </div>
            </Section>

            {/* RDV */}
            <Section title="📅 Rendez-vous Détaillés">
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-3 bg-green-50 rounded-lg">
                  <Field label="Total RDV">{numInput('totalRdv')}</Field>
                  <Field label="RDV Honorés">{numInput('rdvHonores')}</Field>
                  <Field label="RDV Manqués">{numInput('rdvManques')}</Field>
                  <Field label="RDV Importants">{numInput('rdvImportants')}</Field>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-3 bg-orange-50 rounded-lg">
                  <Field label="Annulations">{numInput('annulations')}</Field>
                  <Field label="Reports">{numInput('reports')}</Field>
                  <Field label="Durée moy (min)">{numInput('dureeMoyennePrevue')}</Field>
                  <Field label="RDV/Jour">{numInput('rdvParJour', '0', '0.1')}</Field>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <Field label="Heures Travaillées">{numInput('heuresTravaillees', '0', '0.5')}</Field>
                </div>
              </div>
            </Section>

            {/* Devis */}
            <Section title="💼 Analyse Devis & Propositions" defaultOpen={false}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-purple-50 rounded-lg">
                  <Field label="Nb Devis">{numInput('nbDevis')}</Field>
                  <Field label="Montant Total (€)">{numInput('montantTotalPresente', '0.00', '0.01')}</Field>
                  <Field label="Montant Moyen (€)">{numInput('montantMoyenPresente', '0.00', '0.01')}</Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-pink-50 rounded-lg">
                  <Field label="Devis Acceptés">{numInput('nbDevisAcceptes')}</Field>
                  <Field label="Taux Accept. Nombre (%)">{numInput('tauxAcceptationNombre', '0', '0.1')}</Field>
                  <Field label="Délai Moyen (j)">{numInput('delaiMoyenAcceptation', '0', '0.5')}</Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-indigo-50 rounded-lg">
                  <Field label="Montant Accept. (€)">{numInput('montantTotalAccepte', '0.00', '0.01')}</Field>
                  <Field label="Montant Moyen Accept. (€)">{numInput('montantMoyenAccepte', '0.00', '0.01')}</Field>
                  <Field label="Taux Accept. Montant (%)">{numInput('tauxAcceptationMontant', '0', '0.1')}</Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-red-50 rounded-lg">
                  <Field label="Montant Réalisé (€)">{numInput('montantTotalRealise', '0.00', '0.01')}</Field>
                  <Field label="Montant Moyen Réalisé (€)">{numInput('montantMoyenRealise', '0.00', '0.01')}</Field>
                </div>
              </div>
            </Section>

            {/* Actes */}
            <Section title="🦷 Actes Réalisés (Détails)" defaultOpen={false}>
              <div className="text-xs text-gray-600 mb-3 p-2 bg-gray-50 rounded">
                Remplissez: Nombre d'actes | Dents traitées | Honoraires | Honoraires dont NR
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                      <th className="text-left px-3 py-2 font-semibold border border-blue-700 min-w-[200px]">Acte</th>
                      <th className="px-3 py-2 font-semibold border border-blue-700 w-20">Nombre</th>
                      <th className="px-3 py-2 font-semibold border border-blue-700 w-20">Dents</th>
                      <th className="px-3 py-2 font-semibold border border-blue-700 w-28">Honoraires (€)</th>
                      <th className="px-3 py-2 font-semibold border border-blue-700 w-28">dont NR (€)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ACTES_LIST.map(({ key, label }, idx) => (
                      <tr key={key} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2 border border-gray-200 font-medium text-gray-800">{label}</td>
                        {['nombre', 'dents', 'honoraires', 'honorairesNR'].map(sub => (
                          <td key={sub} className="px-2 py-1 border border-gray-200">
                            <input
                              type="number" min="0"
                              step={sub === 'honoraires' || sub === 'honorairesNR' ? '0.01' : '1'}
                              placeholder="0"
                              value={form[key][sub]}
                              onChange={e => handleActeChange(key, sub, e.target.value)}
                              className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            {/* Submit */}
            <div className="flex items-center gap-4 pt-2">
              <button
                type="submit"
                disabled={saving || !form.praticien || !form.mois}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-xl text-sm transition"
              >
                {saving ? (
                  <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Enregistrement...</>
                ) : (
                  <><PencilSquareIcon className="w-4 h-4" />Enregistrer</>
                )}
              </button>
              <button
                type="button"
                onClick={() => { setForm(f => ({ ...EMPTY_FORM, praticien: f.praticien, mois: f.mois })); setStatus(null); }}
                className="px-6 py-3 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-xl text-sm transition"
              >
                Réinitialiser
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
