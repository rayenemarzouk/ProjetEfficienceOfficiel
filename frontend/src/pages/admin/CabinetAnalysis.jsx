import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import { getAdminDashboard } from '../../services/api';
import { FiBarChart2, FiCalendar, FiClock, FiDollarSign, FiFileText, FiTarget, FiTrendingUp, FiUsers } from 'react-icons/fi';
import { Chart as ChartJS, BarElement, CategoryScale, Legend, LinearScale, Title, Tooltip } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

const MONTHS = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];

const toMap = (arr) => Object.fromEntries((arr || []).map((it) => [it._id, it]));

const parseMoisLabel = (mois) => {
  if (!mois) return '';
  const raw = String(mois);
  const year = raw.slice(0, 4);
  const month = Number(raw.slice(4, 6)) - 1;
  return `${MONTHS[month] || '--'} ${year}`;
};

export default function CabinetAnalysis() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await getAdminDashboard();
        setData(res.data);
        setError('');
      } catch (err) {
        setError("Impossible de charger les analyses des cabinets.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const computed = useMemo(() => {
    const practitioners = data?.practitioners || [];
    const caMap = toMap(data?.caByPractitioner);
    const rdvMap = toMap(data?.rdvByPractitioner);
    const devisMap = toMap(data?.devisStats);
    const heuresMap = toMap(data?.heuresByPractitioner);

    const doctors = practitioners.map((p) => {
      const ca = caMap[p.code] || {};
      const rdv = rdvMap[p.code] || {};
      const devis = devisMap[p.code] || {};
      const heures = heuresMap[p.code] || {};

      const totalFacture = Number(ca.totalFacture) || 0;
      const totalEncaisse = Number(ca.totalEncaisse) || 0;
      const totalRdv = Number(rdv.totalRdv) || 0;
      const totalPatients = Number(rdv.totalPatients) || 0;
      const rdvHonores = Number(rdv.totalRdvHonores) || 0;
      const rdvManques = Number(rdv.totalRdvManques) || 0;
      const totalMinutes = Number(heures.totalMinutes) || 0;
      const totalHours = totalMinutes / 60;
      const tauxEncaissement = totalFacture > 0 ? (totalEncaisse / totalFacture) * 100 : 0;
      const tauxAbsence = totalRdv > 0 ? ((totalRdv - totalPatients) / totalRdv) * 100 : 0;
      const productivite = totalHours > 0 ? totalFacture / totalHours : 0;

      return {
        code: p.code,
        name: p.name,
        totalFacture,
        totalEncaisse,
        totalPatients: Number(ca.totalPatients) || 0,
        nouveauxDossiers: Number(ca.totalNouveauxDossiers) || 0,
        reglementsAnnee: Number(ca.totalReglementsAnnee) || 0,
        totalRdv,
        totalPatientsRdv: totalPatients,
        rdvHonores,
        rdvManques,
        annulations: Number(rdv.totalAnnulations) || 0,
        reports: Number(rdv.totalReports) || 0,
        rdvImportants: Number(rdv.totalRdvImportants) || 0,
        dureeMoyennePrevue: Number(rdv.avgDureeMoyennePrevue) || 0,
        rdvParJour: Number(rdv.avgRdvParJour) || 0,
        totalDevis: Number(devis.totalDevis) || 0,
        devisAcceptes: Number(devis.totalAcceptes) || 0,
        montantAccepte: Number(devis.totalMontantAccepte) || 0,
        montantRealise: Number(devis.totalMontantRealise) || 0,
        tauxAcceptNombre: Number(devis.avgTauxAcceptationNombre) || 0,
        tauxAcceptMontant: Number(devis.avgTauxAcceptationMontant) || 0,
        delaiMoyen: Number(devis.avgDelaiMoyenAcceptation) || 0,
        heuresTravaillees: totalHours,
        tauxEncaissement,
        tauxAbsence,
        productivite
      };
    });

    const totals = {
      caFacture: doctors.reduce((s, d) => s + d.totalFacture, 0),
      caEncaisse: doctors.reduce((s, d) => s + d.totalEncaisse, 0),
      patients: doctors.reduce((s, d) => s + d.totalPatients, 0),
      nouveauxDossiers: doctors.reduce((s, d) => s + d.nouveauxDossiers, 0),
      reglementsAnnee: doctors.reduce((s, d) => s + d.reglementsAnnee, 0),
      rdv: doctors.reduce((s, d) => s + d.totalRdv, 0),
      rdvHonores: doctors.reduce((s, d) => s + d.rdvHonores, 0),
      rdvManques: doctors.reduce((s, d) => s + d.rdvManques, 0),
      annulations: doctors.reduce((s, d) => s + d.annulations, 0),
      reports: doctors.reduce((s, d) => s + d.reports, 0),
      devis: doctors.reduce((s, d) => s + d.totalDevis, 0),
      montantRealise: doctors.reduce((s, d) => s + d.montantRealise, 0),
      heures: doctors.reduce((s, d) => s + d.heuresTravaillees, 0)
    };

    return { doctors, totals };
  }, [data]);

  const monthly = useMemo(() => {
    const rows = data?.caMensuel || [];
    const byMois = {};
    for (const row of rows) {
      const mois = row?._id?.mois;
      if (!mois) continue;
      if (!byMois[mois]) byMois[mois] = { facture: 0, encaisse: 0, patients: 0 };
      byMois[mois].facture += Number(row.totalFacture) || 0;
      byMois[mois].encaisse += Number(row.totalEncaisse) || 0;
      byMois[mois].patients += Number(row.totalPatients) || 0;
    }

    const months = Object.keys(byMois).sort().slice(-8);
    return {
      labels: months.map(parseMoisLabel),
      facture: months.map((m) => byMois[m].facture),
      encaisse: months.map((m) => byMois[m].encaisse),
      patients: months.map((m) => byMois[m].patients)
    };
  }, [data]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="mb-3 text-sm font-semibold text-red-600">{error}</p>
          <button onClick={() => window.location.reload()} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white">
            Recharger
          </button>
        </div>
      </div>
    );
  }

  const doctors = computed.doctors;
  const totals = computed.totals;

  return (
    <div>
      <Header title="Analyse des Cabinets" subtitle="Vue enrichie des performances financières, patients, RDV et devis" />

      <div className="p-6">
        <div className="mb-6 rounded-3xl border border-slate-700 bg-gradient-to-br from-[#081026] via-[#0f1d3d] to-[#12335f] p-5 text-slate-100 shadow-2xl">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Cabinet Intelligence</p>
              <h2 className="text-2xl font-black">Board d'Analyse Mensuelle</h2>
            </div>
            <button
              onClick={() => navigate('/admin/comparison')}
              className="rounded-lg border border-cyan-400/40 bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30"
            >
              Ouvrir comparaison
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-500/10 p-4">
              <div className="mb-2 flex items-center gap-2 text-cyan-300"><FiDollarSign /> CA</div>
              <p className="text-2xl font-black">{totals.caFacture.toLocaleString('fr-FR')} €</p>
              <p className="text-xs text-slate-300">Encaissé: {totals.caEncaisse.toLocaleString('fr-FR')} €</p>
            </div>
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-4">
              <div className="mb-2 flex items-center gap-2 text-emerald-300"><FiUsers /> Patients</div>
              <p className="text-2xl font-black">{totals.patients.toLocaleString('fr-FR')}</p>
              <p className="text-xs text-slate-300">Nouveaux dossiers: {totals.nouveauxDossiers}</p>
            </div>
            <div className="rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4">
              <div className="mb-2 flex items-center gap-2 text-amber-300"><FiCalendar /> RDV détaillés</div>
              <p className="text-2xl font-black">{totals.rdv.toLocaleString('fr-FR')}</p>
              <p className="text-xs text-slate-300">Honorés: {totals.rdvHonores} | Manqués: {totals.rdvManques}</p>
            </div>
            <div className="rounded-2xl border border-violet-300/20 bg-violet-500/10 p-4">
              <div className="mb-2 flex items-center gap-2 text-violet-300"><FiFileText /> Devis</div>
              <p className="text-2xl font-black">{totals.devis.toLocaleString('fr-FR')}</p>
              <p className="text-xs text-slate-300">Montant réalisé: {totals.montantRealise.toLocaleString('fr-FR')} €</p>
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm xl:col-span-2">
            <h3 className="mb-1 text-sm font-extrabold uppercase tracking-wider text-gray-700">Tendance CA / Patients</h3>
            <p className="mb-4 text-xs text-gray-500">8 derniers mois consolidés</p>
            <div className="h-[320px]">
              <Bar
                data={{
                  labels: monthly.labels,
                  datasets: [
                    { label: 'CA facturé', data: monthly.facture, backgroundColor: '#0ea5e9', borderRadius: 5 },
                    { label: 'CA encaissé', data: monthly.encaisse, backgroundColor: '#22c55e', borderRadius: 5 },
                    { label: 'Patients', data: monthly.patients, backgroundColor: '#f59e0b', borderRadius: 5 }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'bottom', labels: { usePointStyle: true } } },
                  scales: { x: { grid: { display: false } }, y: { beginAtZero: true } }
                }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wider text-gray-700">Pulse KPI</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-lg bg-cyan-50 px-3 py-2">
                <span className="flex items-center gap-2 text-cyan-700"><FiTrendingUp /> Taux encaissement</span>
                <strong>{totals.caFacture > 0 ? ((totals.caEncaisse / totals.caFacture) * 100).toFixed(1) : '0.0'}%</strong>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-rose-50 px-3 py-2">
                <span className="flex items-center gap-2 text-rose-700"><FiTarget /> Taux absence</span>
                <strong>{totals.rdv > 0 ? (((totals.rdv - totals.patients) / totals.rdv) * 100).toFixed(1) : '0.0'}%</strong>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2">
                <span className="flex items-center gap-2 text-amber-700"><FiClock /> Heures travaillées</span>
                <strong>{totals.heures.toFixed(1)} h</strong>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-violet-50 px-3 py-2">
                <span className="flex items-center gap-2 text-violet-700"><FiBarChart2 /> Règlements année</span>
                <strong>{totals.reglementsAnnee.toLocaleString('fr-FR')} €</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="grid grid-cols-2 gap-2 border-b border-gray-100 bg-gray-50 px-5 py-4 text-xs text-gray-600 md:grid-cols-6">
            <div>RDV honorés: <strong>{totals.rdvHonores}</strong></div>
            <div>RDV manqués: <strong>{totals.rdvManques}</strong></div>
            <div>Annulations: <strong>{totals.annulations}</strong></div>
            <div>Reports: <strong>{totals.reports}</strong></div>
            <div>Devis: <strong>{totals.devis}</strong></div>
            <div>Montant réalisé: <strong>{totals.montantRealise.toLocaleString('fr-FR')} €</strong></div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-white text-[11px] uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Praticien</th>
                  <th className="px-4 py-3 text-right">CA facturé</th>
                  <th className="px-4 py-3 text-right">Encaissé</th>
                  <th className="px-4 py-3 text-right">Patients</th>
                  <th className="px-4 py-3 text-right">RDV</th>
                  <th className="px-4 py-3 text-right">RDV/Jour</th>
                  <th className="px-4 py-3 text-right">Devis</th>
                  <th className="px-4 py-3 text-right">Taux accept. montant</th>
                  <th className="px-4 py-3 text-right">Prod €/h</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {doctors.map((doc) => (
                  <tr key={doc.code} className="hover:bg-sky-50/30">
                    <td className="px-4 py-3 font-semibold text-gray-800">{doc.name}</td>
                    <td className="px-4 py-3 text-right">{doc.totalFacture.toLocaleString('fr-FR')} €</td>
                    <td className="px-4 py-3 text-right text-emerald-600">{doc.totalEncaisse.toLocaleString('fr-FR')} €</td>
                    <td className="px-4 py-3 text-right">{doc.totalPatients.toLocaleString('fr-FR')}</td>
                    <td className="px-4 py-3 text-right">{doc.totalRdv.toLocaleString('fr-FR')}</td>
                    <td className="px-4 py-3 text-right">{doc.rdvParJour.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right">{doc.totalDevis}</td>
                    <td className="px-4 py-3 text-right">{doc.tauxAcceptMontant.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-right font-semibold text-indigo-600">{doc.productivite.toFixed(0)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
