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
  praticien: '', mois: '', caFacture: '', caEncaisse: '',
  nbPatients: '', nouveauxPatients: '', totalRdv: '', heuresTravaillees: ''
};

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
    <div className="space-y-6 max-w-2xl">
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
          <form onSubmit={handleSubmit} className="space-y-7">
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
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Chiffre d'Affaires</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="CA Facturé (€)" type="number" min="0" step="0.01" placeholder="0.00"
                  value={form.caFacture} onChange={e => handleChange('caFacture', e.target.value)} />
                <Field label="CA Encaissé (€)" type="number" min="0" step="0.01" placeholder="0.00"
                  value={form.caEncaisse} onChange={e => handleChange('caEncaisse', e.target.value)} />
              </div>
            </div>

            {/* Patients & RDV */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Patients & Rendez-vous</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Nb Patients" type="number" min="0" placeholder="0"
                  value={form.nbPatients} onChange={e => handleChange('nbPatients', e.target.value)} />
                <Field label="Nouveaux Patients" type="number" min="0" placeholder="0"
                  value={form.nouveauxPatients} onChange={e => handleChange('nouveauxPatients', e.target.value)} />
                <Field label="Total RDV" type="number" min="0" placeholder="0"
                  value={form.totalRdv} onChange={e => handleChange('totalRdv', e.target.value)} />
                <Field label="Heures Travaillées" type="number" min="0" step="0.5" placeholder="0"
                  value={form.heuresTravaillees} onChange={e => handleChange('heuresTravaillees', e.target.value)} />
              </div>
            </div>

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
                onClick={() => { setForm(EMPTY_FORM); setStatus(null); }}
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
