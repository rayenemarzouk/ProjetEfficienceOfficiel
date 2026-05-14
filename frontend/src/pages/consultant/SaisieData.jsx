import { useEffect, useMemo, useState } from 'react';
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
  montantDevisEnAttente: '',
  nbPatientsEnCours: '',
  dureeTotaleARealiser: '',
  montantTotalAFacturer: '',
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

const parseNumber = (value) => {
  if (value === '' || value === null || value === undefined) return 0;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

const divide = (numerator, denominator) => (denominator > 0 ? numerator / denominator : 0);

const formatCount = (value, decimals = 0) => new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: decimals,
  maximumFractionDigits: decimals
}).format(value || 0);

const formatCurrency = (value) => new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0
}).format(value || 0);

const formatPercent = (value) => `${formatCount(value, 1)}%`;

function InsightCard({ label, value, tone = 'slate', helper }) {
  const toneClasses = {
    slate: 'bg-slate-50 border-slate-200 text-slate-900',
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    green: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    amber: 'bg-amber-50 border-amber-200 text-amber-900'
  };

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClasses[tone] || toneClasses.slate}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      {helper ? <p className="mt-1 text-xs opacity-75">{helper}</p> : null}
    </div>
  );
}

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

  const selectedClient = useMemo(
    () => clients.find((client) => client.code === form.praticien || client.practitionerCode === form.praticien),
    [clients, form.praticien]
  );

  const derived = useMemo(() => {
    const caFacture = parseNumber(form.caFacture);
    const caEncaisse = parseNumber(form.caEncaisse);
    const nbPatients = parseNumber(form.nbPatients);
    const totalRdv = parseNumber(form.totalRdv);
    const rdvHonores = parseNumber(form.rdvHonores);
    const nbDevis = parseNumber(form.nbDevis);
    const nbDevisAcceptes = parseNumber(form.nbDevisAcceptes);
    const montantTotalPresente = parseNumber(form.montantTotalPresente);
    const montantTotalAccepte = parseNumber(form.montantTotalAccepte);
    const montantTotalRealise = parseNumber(form.montantTotalRealise);
    const heuresTravaillees = parseNumber(form.heuresTravaillees);
    const montantTotalAFacturer = parseNumber(form.montantTotalAFacturer);
    const dureeTotaleARealiser = parseNumber(form.dureeTotaleARealiser);

    return {
      tauxEncaissement: divide(caEncaisse * 100, caFacture),
      panierMoyen: divide(caFacture, nbPatients),
      tauxPresence: divide(rdvHonores * 100, totalRdv),
      rdvManquesAuto: Math.max(totalRdv - rdvHonores, 0),
      caHoraire: divide(caFacture, heuresTravaillees),
      montantMoyenPresenteAuto: divide(montantTotalPresente, nbDevis),
      tauxAcceptationNombreAuto: divide(nbDevisAcceptes * 100, nbDevis),
      montantMoyenAccepteAuto: divide(montantTotalAccepte, nbDevisAcceptes),
      tauxAcceptationMontantAuto: divide(montantTotalAccepte * 100, montantTotalPresente),
      montantMoyenRealiseAuto: divide(montantTotalRealise, nbDevisAcceptes),
      rentabiliteHoraireEnCours: divide(montantTotalAFacturer, dureeTotaleARealiser)
    };
  }, [form]);

  const buildSubmitPayload = () => ({
    ...form,
    rdvManques: form.rdvManques === '' ? String(Math.round(derived.rdvManquesAuto)) : form.rdvManques,
    montantMoyenPresente: form.montantMoyenPresente === '' ? derived.montantMoyenPresenteAuto.toFixed(2) : form.montantMoyenPresente,
    tauxAcceptationNombre: form.tauxAcceptationNombre === '' ? derived.tauxAcceptationNombreAuto.toFixed(1) : form.tauxAcceptationNombre,
    montantMoyenAccepte: form.montantMoyenAccepte === '' ? derived.montantMoyenAccepteAuto.toFixed(2) : form.montantMoyenAccepte,
    tauxAcceptationMontant: form.tauxAcceptationMontant === '' ? derived.tauxAcceptationMontantAuto.toFixed(1) : form.tauxAcceptationMontant,
    montantMoyenRealise: form.montantMoyenRealise === '' ? derived.montantMoyenRealiseAuto.toFixed(2) : form.montantMoyenRealise
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await consultantManualEntry(buildSubmitPayload());
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
    <div className="space-y-6 max-w-6xl">
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

            <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4">
              <div className="rounded-3xl bg-slate-900 text-white p-6 shadow-lg">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">Cabinet sélectionné</p>
                <div className="mt-3 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold">{selectedClient?.name || selectedClient?.practitionerName || 'Praticien à sélectionner'}</h2>
                    <p className="mt-2 text-sm text-slate-300">
                      {selectedClient?.cabinetName || 'Cabinet non renseigné'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/10 px-4 py-2 text-right">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Code</p>
                    <p className="text-lg font-semibold">{form.praticien || '—'}</p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-200">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Email</p>
                    <p className="mt-1 font-medium break-all">{selectedClient?.email || 'Non disponible'}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Mois de saisie</p>
                    <p className="mt-1 font-medium">{monthOptions.find((option) => option.value === form.mois)?.label || 'À sélectionner'}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InsightCard
                  label="Taux d'encaissement"
                  value={formatPercent(derived.tauxEncaissement)}
                  tone="blue"
                  helper="Calculé à partir du CA facturé et encaissé"
                />
                <InsightCard
                  label="Panier moyen"
                  value={formatCurrency(derived.panierMoyen)}
                  tone="green"
                  helper="CA facturé / nombre de patients"
                />
                <InsightCard
                  label="Présence RDV"
                  value={formatPercent(derived.tauxPresence)}
                  tone="amber"
                  helper="Basé sur total RDV et RDV honorés"
                />
                <InsightCard
                  label="Acceptation devis"
                  value={formatPercent(form.tauxAcceptationNombre === '' ? derived.tauxAcceptationNombreAuto : parseNumber(form.tauxAcceptationNombre))}
                  tone="slate"
                  helper="Automatique si le champ taux est laissé vide"
                />
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
            <Section title="👥 Patients & Activité">
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-3 bg-blue-50 rounded-lg">
                  <Field label="Nb Patients">{numInput('nbPatients')}</Field>
                  <Field label="Nouveaux">{numInput('nouveauxPatients')}</Field>
                  <Field label="Nouveaux Dossiers">{numInput('nouveauxDossiers')}</Field>
                  <Field label="Règlements Année (€)">{numInput('reglementsPourAnnee', '0.00', '0.01')}</Field>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-3 bg-green-50 rounded-lg">
                  <Field label="Total RDV">{numInput('totalRdv')}</Field>
                  <Field label="Durée totale RDV (h)">{numInput('dureeMoyennePrevue', '0', '0.5')}</Field>
                  <Field label="Heures Travaillées">{numInput('heuresTravaillees', '0', '0.5')}</Field>
                </div>
              </div>
            </Section>

            {/* Devis */}
            <Section title="💼 Devis" defaultOpen={false}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-purple-50 rounded-lg">
                  <Field label="Nb Devis">{numInput('nbDevis')}</Field>
                  <Field label="Montant total présenté (€)">{numInput('montantTotalPresente', '0.00', '0.01')}</Field>
                  <Field label="Montant devis en attente (€)">{numInput('montantDevisEnAttente', '0.00', '0.01')}</Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-pink-50 rounded-lg">
                  <Field label="Devis Acceptés">{numInput('nbDevisAcceptes')}</Field>
                  <Field label="Taux Accept. Nombre (%)">
                    <div className="space-y-1.5">
                      {numInput('tauxAcceptationNombre', '0', '0.1')}
                      <p className="text-xs text-gray-500">Auto: {formatPercent(derived.tauxAcceptationNombreAuto)}</p>
                    </div>
                  </Field>
                  <Field label="Taux Accept. Montant (%)">
                    <div className="space-y-1.5">
                      {numInput('tauxAcceptationMontant', '0', '0.1')}
                      <p className="text-xs text-gray-500">Auto: {formatPercent(derived.tauxAcceptationMontantAuto)}</p>
                    </div>
                  </Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-indigo-50 rounded-lg">
                  <Field label="Montant Moyen Accepté (€)">
                    <div className="space-y-1.5">
                      {numInput('montantMoyenAccepte', '0.00', '0.01')}
                      <p className="text-xs text-gray-500">Auto: {formatCurrency(derived.montantMoyenAccepteAuto)}</p>
                    </div>
                  </Field>
                  <Field label="Montant Total Accepté (€)">{numInput('montantTotalAccepte', '0.00', '0.01')}</Field>
                </div>
              </div>
            </Section>

            {/* En Cours */}
            <Section title="📋 En Cours" defaultOpen={false}>
              <div className="space-y-4">
                <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-2 text-sm text-amber-800">
                  Plans de traitement acceptés en cours de réalisation au cabinet.
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-orange-50 rounded-lg">
                  <Field label="Nb Patients en cours">{numInput('nbPatientsEnCours')}</Field>
                  <Field label="Durée totale à réaliser (h)">{numInput('dureeTotaleARealiser', '0', '0.5')}</Field>
                  <Field label="Montant total à facturer (€)">{numInput('montantTotalAFacturer', '0.00', '0.01')}</Field>
                </div>
                {derived.rentabiliteHoraireEnCours > 0 && (
                  <div className="p-3 bg-green-50 rounded-lg text-sm text-green-800">
                    Rentabilité horaire estimée : <strong>{formatCurrency(derived.rentabiliteHoraireEnCours)}/h</strong>
                  </div>
                )}
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
