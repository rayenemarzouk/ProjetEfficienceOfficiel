import { useState, useEffect } from 'react';
import { getAdminPractitioners, adminManualEntry } from '../../services/api';
import { CheckCircleIcon, ExclamationCircleIcon, PencilSquareIcon } from '@heroicons/react/24/outline';

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
  totalRdv: '',
  heuresTravaillees: ''
};

const Field = ({ label, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
    <input
      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
      {...props}
    />
  </div>
);

export default function AdminSaisieData() {
  const [practitioners, setPractitioners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // 'success' | 'error'
  const [form, setForm] = useState(EMPTY_FORM);
  const monthOptions = generateMonthOptions();

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getAdminPractitioners();
        const list = res.data.practitioners || [];
        setPractitioners(list);
        if (list.length > 0) {
          setForm(f => ({
            ...f,
            praticien: list[0].practitionerCode,
            mois: monthOptions[1]?.value || ''
          }));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
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
      setStatus('success');
      setForm(f => ({ ...EMPTY_FORM, praticien: f.praticien, mois: f.mois }));
    } catch (err) {
      console.error(err);
      setStatus('error');
    } finally {
      setSaving(false);
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

      {/* Formulaire */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-7">

            {/* Feedback */}
            {status === 'success' && (
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700">
                <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">Données enregistrées avec succès !</span>
              </div>
            )}
            {status === 'error' && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                <ExclamationCircleIcon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">Erreur lors de l'enregistrement. Vérifiez les données.</span>
              </div>
            )}

            {/* Praticien + Mois */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Praticien <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={form.praticien}
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
                  required
                  value={form.mois}
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
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <PencilSquareIcon className="w-4 h-4" />
                    Enregistrer
                  </>
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
