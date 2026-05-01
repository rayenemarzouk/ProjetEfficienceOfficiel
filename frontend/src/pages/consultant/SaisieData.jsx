import { useState, useEffect } from 'react';
import { getConsultantClients, consultantManualEntry } from '../../services/api';
import { CheckCircleIcon, ExclamationCircleIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

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

const EMPTY_ACTE = { nombre: '', dents: '', honoraires: '', honorairesNR: '' };

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
  soinsConservateurs: { ...EMPTY_ACTE },
  prothesesFixes: { ...EMPTY_ACTE },
  prothesesAmovibles: { ...EMPTY_ACTE },
  prothesesMaxilloFaciales: { ...EMPTY_ACTE },
  chirurgie: { ...EMPTY_ACTE },
  odf: { ...EMPTY_ACTE },
  consultations: { ...EMPTY_ACTE },
  prophylaxie: { ...EMPTY_ACTE },
  endodontie: { ...EMPTY_ACTE },
  radiographie: { ...EMPTY_ACTE },
  parodontologie: { ...EMPTY_ACTE },
  implantologie: { ...EMPTY_ACTE },
  implantologieChirurgicale: { ...EMPTY_ACTE },
  implantologieProthetique: { ...EMPTY_ACTE },
  occlusodontie: { ...EMPTY_ACTE },
  esthetique: { ...EMPTY_ACTE }
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
        {open ? <ChevronDownIcon className="w-4 h-4 text-gray-400" /> : <ChevronRightIcon className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="p-5 space-y-5">{children}</div>}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export default function SaisieData() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
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

  const handleActeChange = (acteKey, subField, value) => {
    setForm(f => ({
      ...f,
      [acteKey]: { ...f[acteKey], [subField]: value }
    }));
    setStatus(null);
  };

  const inputCls = "w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
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
      await consultantManualEntry(form);
      setStatus('success');
      setForm(f => ({
        ...EMPTY_FORM,
        praticien: f.praticien,
        mois: f.mois
      }));
      setTimeout(() => setStatus(null), 2500);
    } catch (err) {
      console.error(err);
      setStatus('error');
      setTimeout(() => setStatus(null), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">📋 Saisie de Données Mensuelles</h1>
        <p className="text-gray-600 mt-2">Enregistrez tous les détails des activités du praticien</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Praticien + Mois */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-blue-50 p-4 rounded-lg">
              <Field label={<>Praticien <span className="text-red-500">*</span></>}>
                <select
                  required
                  value={form.praticien}
                  onChange={e => handleChange('praticien', e.target.value)}
                  className={inputCls + ' bg-white'}
                >
                  <option value="">-- Sélectionner --</option>
                  {clients.map(c => (
                    <option key={c.practitionerCode} value={c.practitionerCode}>
                      {c.practitionerName || c.practitionerCode}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={<>Mois <span className="text-red-500">*</span></>}>
                <select
                  required
                  value={form.mois}
                  onChange={e => handleChange('mois', e.target.value)}
                  className={inputCls + ' bg-white'}
                >
                  {monthOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
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
                📌 Remplissez: Nombre d'actes | Dents traitées | Honoraires | Honoraires dont NR
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

            {status === 'success' && (
              <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border-2 border-green-300 rounded-xl text-green-700 text-sm font-medium">
                <CheckCircleIcon className="w-5 h-5" />
                ✅ Données enregistrées avec succès !
              </div>
            )}
            {status === 'error' && (
              <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border-2 border-red-300 rounded-xl text-red-700 text-sm font-medium">
                <ExclamationCircleIcon className="w-5 h-5" />
                ❌ Erreur lors de l'enregistrement
              </div>
            )}

            <button
              type="submit"
              disabled={saving || !form.praticien || !form.mois}
              className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all text-base shadow-md hover:shadow-lg"
            >
              {saving ? '⏳ En cours...' : '✅ Enregistrer les données'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
