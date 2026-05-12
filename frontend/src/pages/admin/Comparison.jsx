import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/Header';
import PeriodFilter from '../../components/PeriodFilter';
import { getAdminDashboard } from '../../services/api';
import { FiActivity, FiCalendar, FiCheckCircle, FiDollarSign, FiFileText, FiRefreshCw, FiTrendingUp, FiUsers, FiXCircle, FiBarChart2 } from 'react-icons/fi';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, Legend, LinearScale, Title, Tooltip } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

const DOC_COLORS = ['#38bdf8', '#22c55e', '#f59e0b', '#f97316', '#60a5fa', '#f43f5e', '#2dd4bf'];

const parseMonth = (mois) => {
  if (!mois) return null;
  const str = String(mois);
  if (str.includes('-')) {
    const [yy, mm] = str.split('-');
    return new Date(Number(yy), Number(mm) - 1, 1);
  }
  if (str.length >= 6) {
    return new Date(Number(str.slice(0, 4)), Number(str.slice(4, 6)) - 1, 1);
  }
  return null;
};

const inPeriod = (mois, period) => {
  const d = parseMonth(mois);
  if (!d) return true;
  const now = new Date();
  let start;
  let end;

  switch (period?.period) {
    case 'this_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case 'last_month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    case '3_months':
      start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case '6_months':
      start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case 'this_year':
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
      break;
    case 'custom':
      start = period?.startDate ? new Date(period.startDate) : new Date(now.getFullYear() - 1, 0, 1);
      end = period?.endDate ? new Date(period.endDate) : now;
      break;
    case 'last_year':
    default:
      start = new Date(now.getFullYear() - 1, 0, 1);
      end = new Date(now.getFullYear() - 1, 11, 31);
      break;
  }

  return d >= start && d <= end;
};

const toMap = (arr) => Object.fromEntries((arr || []).map((it) => [it._id, it]));

const sumActesHonoraires = (actes = {}) =>
  Object.entries(actes).reduce((acc, [key, value]) => {
    if (!key.endsWith('Honoraires')) return acc;
    return acc + (Number(value) || 0);
  }, 0);

export default function Comparison() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState({ period: 'last_year' });

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const res = await getAdminDashboard();
        setData(res.data);
        setError('');
      } catch (err) {
        setError("Impossible de charger la comparaison des cabinets.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [period]);

  const computed = useMemo(() => {
    const practitioners = data?.practitioners || [];
    const caMap = toMap(data?.caByPractitioner);
    const rdvMap = toMap(data?.rdvByPractitioner);
    const devisMap = toMap(data?.devisStats);
    const actesMap = toMap(data?.actesByPractitioner);
    const heuresMap = toMap(data?.heuresByPractitioner);

    const monthlyRdv = (data?.rdvMensuel || []).filter((row) => inPeriod(row?._id?.mois, period));
    const monthlyByDoctor = {};
    for (const row of monthlyRdv) {
      const code = row?._id?.praticien;
      if (!code) continue;
      if (!monthlyByDoctor[code]) {
        monthlyByDoctor[code] = {
          totalRdv: 0,
          totalRdvHonores: 0,
          totalRdvManques: 0,
          totalAnnulations: 0,
          totalReports: 0,
          totalRdvImportants: 0,
          totalPatients: 0
        };
      }
      monthlyByDoctor[code].totalRdv += Number(row.totalRdv) || 0;
      monthlyByDoctor[code].totalRdvHonores += Number(row.totalRdvHonores) || 0;
      monthlyByDoctor[code].totalRdvManques += Number(row.totalRdvManques) || 0;
      monthlyByDoctor[code].totalAnnulations += Number(row.totalAnnulations) || 0;
      monthlyByDoctor[code].totalReports += Number(row.totalReports) || 0;
      monthlyByDoctor[code].totalRdvImportants += Number(row.totalRdvImportants) || 0;
      monthlyByDoctor[code].totalPatients += Number(row.totalPatients) || 0;
    }

    const doctors = practitioners.map((p, idx) => {
      const ca = caMap[p.code] || {};
      const rdv = rdvMap[p.code] || {};
      const rdvPeriod = monthlyByDoctor[p.code] || rdv;
      const devis = devisMap[p.code] || {};
      const actes = actesMap[p.code] || {};
      const heures = heuresMap[p.code] || {};

      const totalRdv = Number(rdvPeriod.totalRdv) || 0;
      const totalPatients = Number(rdvPeriod.totalPatients ?? rdv.totalPatients) || 0;
      const absences = Math.max(0, totalRdv - totalPatients);
      const tauxAbsence = totalRdv > 0 ? (absences / totalRdv) * 100 : 0;
      const caFacture = Number(ca.totalFacture) || 0;
      const caEncaisse = Number(ca.totalEncaisse) || 0;
      const minutes = Number(heures.totalMinutes) || 0;
      const hours = minutes / 60;

      return {
        code: p.code,
        name: p.name,
        color: DOC_COLORS[idx % DOC_COLORS.length],
        caFacture,
        caEncaisse,
        nbPatients: Number(ca.totalPatients) || 0,
        nouveauxDossiers: Number(ca.totalNouveauxDossiers) || 0,
        reglementsAnnee: Number(ca.totalReglementsAnnee) || 0,
        totalRdv,
        totalPatients,
        rdvHonores: Number(rdvPeriod.totalRdvHonores ?? rdv.totalRdvHonores) || 0,
        rdvManques: Number(rdvPeriod.totalRdvManques ?? rdv.totalRdvManques) || 0,
        annulations: Number(rdvPeriod.totalAnnulations ?? rdv.totalAnnulations) || 0,
        reports: Number(rdvPeriod.totalReports ?? rdv.totalReports) || 0,
        rdvImportants: Number(rdvPeriod.totalRdvImportants ?? rdv.totalRdvImportants) || 0,
        rdvParJour: Number(rdv.avgRdvParJour) || 0,
        dureeMoyennePrevue: Number(rdv.avgDureeMoyennePrevue) || 0,
        totalDevis: Number(devis.totalDevis) || 0,
        devisAcceptes: Number(devis.totalAcceptes) || 0,
        montantAccepte: Number(devis.totalMontantAccepte) || 0,
        montantRealise: Number(devis.totalMontantRealise) || 0,
        tauxAcceptMontant: Number(devis.avgTauxAcceptationMontant) || 0,
        delaiMoyen: Number(devis.avgDelaiMoyenAcceptation) || 0,
        heuresTravaillees: hours,
        honorairesActes: sumActesHonoraires(actes),
        tauxAbsence
      };
    });

    const totals = {
      caFacture: doctors.reduce((s, d) => s + d.caFacture, 0),
      caEncaisse: doctors.reduce((s, d) => s + d.caEncaisse, 0),
      patients: doctors.reduce((s, d) => s + d.nbPatients, 0),
      nouveauxDossiers: doctors.reduce((s, d) => s + d.nouveauxDossiers, 0),
      rdv: doctors.reduce((s, d) => s + d.totalRdv, 0),
      rdvHonores: doctors.reduce((s, d) => s + d.rdvHonores, 0),
      rdvManques: doctors.reduce((s, d) => s + d.rdvManques, 0),
      annulations: doctors.reduce((s, d) => s + d.annulations, 0),
      reports: doctors.reduce((s, d) => s + d.reports, 0),
      devis: doctors.reduce((s, d) => s + d.totalDevis, 0),
      montantRealise: doctors.reduce((s, d) => s + d.montantRealise, 0),
      honorairesActes: doctors.reduce((s, d) => s + d.honorairesActes, 0)
    };

    return { doctors, totals };
  }, [data, period]);

  const doctors = computed.doctors;
  const totals = computed.totals;

  const barData = {
    labels: doctors.map((d) => d.code),
    datasets: [
      { label: 'RDV honorés', data: doctors.map((d) => d.rdvHonores), backgroundColor: '#22c55e', borderRadius: 6 },
      { label: 'RDV manqués', data: doctors.map((d) => d.rdvManques), backgroundColor: '#ef4444', borderRadius: 6 },
      { label: 'Annulations', data: doctors.map((d) => d.annulations), backgroundColor: '#f59e0b', borderRadius: 6 },
      { label: 'Reports', data: doctors.map((d) => d.reports), backgroundColor: '#38bdf8', borderRadius: 6 }
    ]
  };

  const doughnutData = {
    labels: doctors.map((d) => d.code),
    datasets: [
      {
        data: doctors.map((d) => d.caFacture),
        backgroundColor: doctors.map((d) => d.color),
        borderWidth: 0
      }
    ]
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-cyan-500" />
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

  return (
    <div>
      <Header title="Analyse & Comparaison des Cabinets" subtitle="Dashboard enrichi avec CA, RDV détaillés, devis et actes" />

      <div className="p-6">
        <div className="mb-6 rounded-3xl border border-slate-700 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 p-5 text-slate-100 shadow-2xl">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Pulse Board</p>
              <h2 className="text-xl font-black">Vue Consolidée des Performances</h2>
            </div>
            <PeriodFilter value={period} onChange={setPeriod} />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-4">
              <div className="mb-2 flex items-center gap-2 text-cyan-300"><FiDollarSign /> CA Facturé</div>
              <p className="text-2xl font-black">{totals.caFacture.toLocaleString('fr-FR')} €</p>
              <p className="text-xs text-slate-300">Encaissé: {totals.caEncaisse.toLocaleString('fr-FR')} €</p>
            </div>
            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4">
              <div className="mb-2 flex items-center gap-2 text-emerald-300"><FiUsers /> Patients</div>
              <p className="text-2xl font-black">{totals.patients.toLocaleString('fr-FR')}</p>
              <p className="text-xs text-slate-300">Nouveaux dossiers: {totals.nouveauxDossiers.toLocaleString('fr-FR')}</p>
            </div>
            <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4">
              <div className="mb-2 flex items-center gap-2 text-amber-300"><FiCalendar /> RDV détaillés</div>
              <p className="text-2xl font-black">{totals.rdv.toLocaleString('fr-FR')}</p>
              <p className="text-xs text-slate-300">Honorés: {totals.rdvHonores} | Manqués: {totals.rdvManques}</p>
            </div>
            <div className="rounded-2xl border border-fuchsia-400/30 bg-fuchsia-500/10 p-4">
              <div className="mb-2 flex items-center gap-2 text-fuchsia-300"><FiFileText /> Devis & Actes</div>
              <p className="text-2xl font-black">{totals.devis.toLocaleString('fr-FR')} devis</p>
              <p className="text-xs text-slate-300">Actes honoraires: {totals.honorairesActes.toLocaleString('fr-FR')} €</p>
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm xl:col-span-2">
            <h3 className="mb-1 text-sm font-extrabold uppercase tracking-wider text-gray-700">Rendez-vous par praticien</h3>
            <p className="mb-4 text-xs text-gray-500">Honorés, manqués, annulations et reports</p>
            <div className="h-[340px]">
              <Bar
                data={barData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'bottom', labels: { usePointStyle: true } }
                  },
                  scales: {
                    x: { grid: { display: false } },
                    y: { beginAtZero: true }
                  }
                }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-1 text-sm font-extrabold uppercase tracking-wider text-gray-700">Part de CA</h3>
            <p className="mb-4 text-xs text-gray-500">Répartition du CA facturé</p>
            <div className="mx-auto max-w-[260px]">
              <Doughnut
                data={doughnutData}
                options={{
                  cutout: '62%',
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => `${ctx.label}: ${(ctx.raw || 0).toLocaleString('fr-FR')} €`
                      }
                    }
                  }
                }}
              />
            </div>
            <div className="mt-4 space-y-2">
              {doctors.map((doc) => {
                const part = totals.caFacture > 0 ? Math.round((doc.caFacture / totals.caFacture) * 100) : 0;
                return (
                  <div key={doc.code} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-gray-600">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: doc.color }} />
                      {doc.name}
                    </span>
                    <span className="font-semibold text-gray-900">{part}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="grid grid-cols-1 gap-2 border-b border-gray-100 bg-gray-50 px-5 py-4 md:grid-cols-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500"><FiCheckCircle /> Honorés: {totals.rdvHonores}</div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500"><FiXCircle /> Manqués: {totals.rdvManques}</div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500"><FiRefreshCw /> Reports: {totals.reports}</div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-white text-[11px] uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Praticien</th>
                  <th className="px-4 py-3 text-right">CA Facturé</th>
                  <th className="px-4 py-3 text-right">CA Encaissé</th>
                  <th className="px-4 py-3 text-right">Patients</th>
                  <th className="px-4 py-3 text-right">RDV</th>
                  <th className="px-4 py-3 text-right">Absence %</th>
                  <th className="px-4 py-3 text-right">Devis</th>
                  <th className="px-4 py-3 text-right">Montant réalisé</th>
                  <th className="px-4 py-3 text-right">Actes honoraires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {doctors.map((doc) => (
                  <tr key={doc.code} className="hover:bg-sky-50/40">
                    <td className="px-4 py-3 font-semibold text-gray-800">{doc.name}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{doc.caFacture.toLocaleString('fr-FR')} €</td>
                    <td className="px-4 py-3 text-right text-emerald-600">{doc.caEncaisse.toLocaleString('fr-FR')} €</td>
                    <td className="px-4 py-3 text-right">{doc.nbPatients.toLocaleString('fr-FR')}</td>
                    <td className="px-4 py-3 text-right">{doc.totalRdv.toLocaleString('fr-FR')}</td>
                    <td className="px-4 py-3 text-right font-semibold" style={{ color: doc.tauxAbsence > 12 ? '#dc2626' : '#2563eb' }}>
                      {doc.tauxAbsence.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-right">{doc.totalDevis.toLocaleString('fr-FR')}</td>
                    <td className="px-4 py-3 text-right">{doc.montantRealise.toLocaleString('fr-FR')} €</td>
                    <td className="px-4 py-3 text-right">{doc.honorairesActes.toLocaleString('fr-FR')} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-gray-100 bg-gray-50 px-5 py-4 text-xs text-gray-600 md:grid-cols-5">
            <div className="rounded-lg bg-white px-3 py-2">Annulations: <strong>{totals.annulations}</strong></div>
            <div className="rounded-lg bg-white px-3 py-2">Reports: <strong>{totals.reports}</strong></div>
            <div className="rounded-lg bg-white px-3 py-2">RDV manqués: <strong>{totals.rdvManques}</strong></div>
            <div className="rounded-lg bg-white px-3 py-2">Montant réalisé: <strong>{totals.montantRealise.toLocaleString('fr-FR')} €</strong></div>
            <div className="rounded-lg bg-white px-3 py-2">Honoraires actes: <strong>{totals.honorairesActes.toLocaleString('fr-FR')} €</strong></div>
          </div>
        </div>
      </div>

      {/* ─── Lien vers Dashboard Analytique ─────────────────── */}
      <div className="px-6 pb-6">
        <Link
          to="/admin/analytics"
          className="flex items-center justify-between gap-4 p-4 bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl text-white hover:from-slate-700 hover:to-slate-600 transition-all duration-200 group shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <FiBarChart2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold">Dashboard Analytique</p>
              <p className="text-xs text-slate-300">KPI globaux · Tendances · Répartition par cabinet · Indicateurs RDV &amp; Devis</p>
            </div>
          </div>
          <span className="text-slate-300 group-hover:text-white text-sm font-semibold whitespace-nowrap">Voir →</span>
        </Link>
      </div>
    </div>
  );
}
