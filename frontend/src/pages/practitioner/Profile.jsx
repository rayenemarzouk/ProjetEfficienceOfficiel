import { useEffect, useState } from 'react';
import Header from '../../components/Header';
import { getPractitionerProfile } from '../../services/api';
import { FiUser, FiMail, FiHome, FiShield, FiDatabase, FiBarChart2, FiClock, FiCalendar, FiCheckCircle } from 'react-icons/fi';

const money = (value) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);

function InfoCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-2 text-gray-500">
        <Icon className="w-4 h-4" />
        <span className="text-xs uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <p className="text-lg font-bold text-gray-900">{value}</p>
    </div>
  );
}

export default function PractitionerProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getPractitionerProfile();
        setProfile(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Impossible de charger les informations praticien.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div>
        <Header title="Mon Profil Praticien" subtitle="Chargement des informations..." />
        <div className="px-8 py-8">
          <div className="flex items-center justify-center h-72 bg-white rounded-2xl border border-gray-200">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header title="Mon Profil Praticien" subtitle="Informations indisponibles" />
        <div className="px-8 py-8">
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-2xl p-4">{error}</div>
        </div>
      </div>
    );
  }

  const practitioner = profile?.practitioner || {};
  const totals = profile?.totals || {};
  const patientsFichier = totals?.patientsFichier || {};
  const encours = totals?.encours || {};
  const dataCoverage = profile?.dataCoverage || {};

  return (
    <div>
      <Header
        title="Mon Profil Praticien"
        subtitle={practitioner.hasImportedData ? 'Vos données ont été détectées dans la plateforme.' : 'Aucune donnée importée: les indicateurs sont à 0.'}
      />

      <div className="px-8 py-8 space-y-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-xl font-black text-gray-900 mb-4">Informations du compte</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <InfoCard icon={FiUser} label="Nom" value={practitioner.name || 'Non renseigné'} />
            <InfoCard icon={FiMail} label="Email" value={practitioner.email || 'Non renseigné'} />
            <InfoCard icon={FiHome} label="Cabinet" value={practitioner.cabinetName || 'Non renseigné'} />
            <InfoCard icon={FiShield} label="Code praticien" value={practitioner.practitionerCode || 'Non renseigné'} />
          </div>

          <div className={`mt-4 rounded-xl p-3 text-sm font-medium ${practitioner.hasImportedData ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
            {practitioner.hasImportedData
              ? 'Compte relié à des données analytiques (ex: DV déjà présent dans la base).'
              : 'Compte créé mais non relié à la data: tous les champs restent disponibles avec des valeurs à 0.'}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <InfoCard icon={FiBarChart2} label="CA facturé" value={money(totals.totalCAFacture)} />
          <InfoCard icon={FiCheckCircle} label="CA encaissé" value={money(totals.totalCAEncaisse)} />
          <InfoCard icon={FiCalendar} label="Rendez-vous" value={totals.totalRdv || 0} />
          <InfoCard icon={FiClock} label="Heures travaillées" value={`${(totals.totalHeuresTravaillees || 0).toFixed(1)} h`} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Patients</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <p>Total fichier: <span className="font-semibold text-gray-900">{patientsFichier.total || 0}</span></p>
              <p>Actifs: <span className="font-semibold text-gray-900">{patientsFichier.actifs || 0}</span></p>
              <p>Nouveaux: <span className="font-semibold text-gray-900">{patientsFichier.nouveaux || 0}</span></p>
              <p>Patients analysés: <span className="font-semibold text-gray-900">{totals.totalPatientsAnalyse || 0}</span></p>
              <p>Nouveaux patients (analyse RDV): <span className="font-semibold text-gray-900">{totals.totalNouveauxPatients || 0}</span></p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Encours et Devis</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <p>Montant devis proposés: <span className="font-semibold text-gray-900">{money(totals.totalMontantDevis)}</span></p>
              <p>Montant devis acceptés: <span className="font-semibold text-gray-900">{money(totals.totalMontantDevisAcceptes)}</span></p>
              <p>Encours à facturer: <span className="font-semibold text-gray-900">{money(encours.montantTotalAFacturer)}</span></p>
              <p>Durée encours à réaliser: <span className="font-semibold text-gray-900">{Math.round((encours.dureeTotaleARealiser || 0) / 60)} h</span></p>
              <p>Patients en cours: <span className="font-semibold text-gray-900">{encours.patientsEnCours || 0}</span></p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Couverture des données</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <InfoCard icon={FiDatabase} label="Réalisations" value={dataCoverage.realisationsCount || 0} />
            <InfoCard icon={FiDatabase} label="Rendez-vous" value={dataCoverage.rendezVousCount || 0} />
            <InfoCard icon={FiDatabase} label="Jours ouverts" value={dataCoverage.joursOuvertsCount || 0} />
            <InfoCard icon={FiDatabase} label="Devis" value={dataCoverage.devisCount || 0} />
            <InfoCard icon={FiCalendar} label="Mois détectés" value={dataCoverage.months?.length || 0} />
          </div>
        </div>
      </div>
    </div>
  );
}
