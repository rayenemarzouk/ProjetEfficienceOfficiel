import { useState, useEffect } from 'react';
import { getConsultantClients, consultantManualEntry } from '../../services/api';
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

const generateMonthOptions = () => {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
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

export default function SaisieData() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // 'success' | 'error'
  const [form, setForm] = useState(EMPTY_FORM);
  const monthOptions = generateMonthOptions();

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await getConsultantClients({});
        const list = res.data.clients || [];
        setClients(list);
        if (list.length > 0) {
          setForm(f => ({
            ...f,
            praticien: list[0].practitionerCode,
            mois: monthOptions[0]?.value || ''
          }));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, []);

  const handleChange = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    setStatus(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await consultantManualEntry(form);
      setStatus('success');
      setForm(f => ({
        ...EMPTY_FORM,
        praticien: f.praticien,
        mois: f.mois
      }));
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Saisie de Données</h1>
        <p className="text-gray-500 mt-1">Enregistrez les données mensuelles d'un praticien</p>
      </div>

      {/* Formulaire */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-7">

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
                  {clients.map(c => (
                    <option key={c.practitionerCode} value={c.practitionerCode}>
                      {c.practitionerName || c.practitionerCode}
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
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Chiffre d'Affaires</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">CA Facturé (€)</label>
                  <input
                    type="number" min="0" step="0.01" placeholder="0"
                    value={form.caFacture}
                    onChange={e => handleChange('caFacture', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">CA Encaissé (€)</label>
                  <input
                    type="number" min="0" step="0.01" placeholder="0"
                    value={form.caEncaisse}
                    onChange={e => handleChange('caEncaisse', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Patients & RDV */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Patients & RDV</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nb Patients</label>
                  <input
                    type="number" min="0" placeholder="0"
                    value={form.nbPatients}
                    onChange={e => handleChange('nbPatients', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nouveaux Patients</label>
                  <input
                    type="number" min="0" placeholder="0"
                    value={form.nouveauxPatients}
                    onChange={e => handleChange('nouveauxPatients', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Total RDV</label>
                  <input
                    type="number" min="0" placeholder="0"
                    value={form.totalRdv}
                    onChange={e => handleChange('totalRdv', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Heures Travaillées</label>
                  <input
                    type="number" min="0" step="0.5" placeholder="0"
                    value={form.heuresTravaillees}
                    onChange={e => handleChange('heuresTravaillees', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Feedback */}
            {status === 'success' && (
              <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
                <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
                Données enregistrées avec succès !
              </div>
            )}
            {status === 'error' && (
              <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                <ExclamationCircleIcon className="w-5 h-5 flex-shrink-0" />
                Erreur lors de l'enregistrement. Réessayez.
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={saving || !form.praticien || !form.mois}
              className="w-full py-3 px-6 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer les données'}
            </button>

          </form>
        )}
      </div>
    </div>
  );
}
