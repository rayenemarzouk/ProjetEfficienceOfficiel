import { useState, useEffect, useMemo } from 'react';
import Header from '../../components/Header';
import { getStatistics, getAdminDashboard } from '../../services/api';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, Title, Tooltip, Legend, ArcElement, Filler
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  FiTrendingUp, FiTrendingDown, FiUsers, FiDollarSign, FiActivity,
  FiCalendar, FiFileText, FiClock, FiAward, FiRefreshCw, FiBarChart2
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { isSuperAdmin } from '../../utils/permissions';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  Title, Tooltip, Legend, ArcElement, Filler
);

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const PRACT_COLORS = ['#1e3a5f', '#2e7d32', '#f59e0b', '#c62828', '#6a1b9a', '#00838f'];
const PRACT_COLORS_LIGHT = ['#3b82f6', '#22c55e', '#fbbf24', '#ef4444', '#a78bfa', '#06b6d4'];

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);
const fmtNum = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0));
const pct = (n, decimals = 1) => `${Number(n || 0).toFixed(decimals)}%`;

function KpiCard({ icon: Icon, iconBg, label, value, sub, trend, trendValue }) {
  const isUp = trend === 'up';
  const isDown = trend === 'down';
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {(isUp || isDown) && (
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${isUp ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
            {isUp ? <FiTrendingUp className="w-3 h-3" /> : <FiTrendingDown className="w-3 h-3" />}
            {trendValue}
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        <p className="text-xs font-medium text-gray-500 mt-0.5">{label}</p>
      </div>
      {sub && <p className="text-xs text-gray-400 leading-tight">{sub}</p>}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3 flex items-center gap-2">
      <span className="w-1 h-4 rounded-full bg-primary-600 inline-block" />
      {children}
    </h2>
  );
}

export default function AnalyticsDashboard() {
  const { user } = useAuth();
  const [statsData, setStatsData] = useState(null);
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState('2025');
  const [metricView, setMetricView] = useState('ca'); // 'ca' | 'patients' | 'rdv'
  const isRayan = isSuperAdmin(user);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [s, d] = await Promise.all([getStatistics(), getAdminDashboard()]);
        setStatsData(s.data);
        setDashData(d.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // ─── données brutes ───────────────────────────────────────────────
  const evolution = statsData?.evolutionMensuelle || [];
  const globalRdvDetail = statsData?.globalRdvDetail || {};
  const globalDevis = statsData?.globalDevis || {};
  const perPractitioner = statsData?.perPractitioner || [];
  const perPractitionerSummary = statsData?.perPractitionerSummary || [];
  const practitioners = dashData?.practitioners || [];

  // ─── filtre par année ─────────────────────────────────────────────
  const evoYear = evolution.filter(e => e._id && e._id.startsWith(year));
  const prevYearStr = String(Number(year) - 1);
  const evoYearPrev = evolution.filter(e => e._id && e._id.startsWith(prevYearStr));

  const monthlyCA = new Array(12).fill(0);
  const monthlyEnc = new Array(12).fill(0);
  const monthlyPat = new Array(12).fill(0);
  evoYear.forEach(e => {
    const mi = parseInt(e._id.substring(4, 6)) - 1;
    monthlyCA[mi] += e.totalFacture || 0;
    monthlyEnc[mi] += e.totalEncaisse || 0;
    monthlyPat[mi] += e.totalPatients || 0;
  });

  const prevCA = new Array(12).fill(0);
  const prevEnc = new Array(12).fill(0);
  evoYearPrev.forEach(e => {
    const mi = parseInt(e._id.substring(4, 6)) - 1;
    prevCA[mi] += e.totalFacture || 0;
    prevEnc[mi] += e.totalEncaisse || 0;
  });

  // ─── totaux ───────────────────────────────────────────────────────
  const totalCA = monthlyCA.reduce((a, b) => a + b, 0);
  const totalEnc = monthlyEnc.reduce((a, b) => a + b, 0);
  const totalPat = monthlyPat.reduce((a, b) => a + b, 0);
  const totalCAPrev = prevCA.reduce((a, b) => a + b, 0);
  const totalEncPrev = prevEnc.reduce((a, b) => a + b, 0);
  const tauxEnc = totalCA > 0 ? (totalEnc / totalCA) * 100 : 0;
  const panierMoyen = totalPat > 0 ? Math.round(totalCA / totalPat) : 0;
  const totalRdv = globalRdvDetail.totalRdv || 0;
  const totalHonores = globalRdvDetail.totalHonores || 0;
  const totalManques = globalRdvDetail.totalManques || 0;
  const tauxAbsence = totalRdv > 0 ? ((totalManques / totalRdv) * 100) : 0;
  const totalNbDevis = globalDevis.totalNbDevis || 0;
  const totalNbAcceptes = globalDevis.totalNbAcceptes || 0;
  const tauxDevis = totalNbDevis > 0 ? Math.round((totalNbAcceptes / totalNbDevis) * 100) : 0;
  const totalHeures = (statsData?.globalHeures?.totalMinutes || 0) / 60;
  const prodHoraire = totalHeures > 0 ? Math.round(totalCA / totalHeures) : 0;

  // variation vs année précédente
  const variCA = totalCAPrev > 0 ? (((totalCA - totalCAPrev) / totalCAPrev) * 100).toFixed(1) : null;
  const variEnc = totalEncPrev > 0 ? (((totalEnc - totalEncPrev) / totalEncPrev) * 100).toFixed(1) : null;

  // ─── par praticien ────────────────────────────────────────────────
  const caByDoc = {};
  const encByDoc = {};
  const patByDoc = {};
  perPractitioner.filter(p => p._id?.startsWith(year)).forEach(p => {
    const c = p.praticien || '?';
    caByDoc[c] = (caByDoc[c] || 0) + (p.totalFacture || 0);
    encByDoc[c] = (encByDoc[c] || 0) + (p.totalEncaisse || 0);
    patByDoc[c] = (patByDoc[c] || 0) + (p.totalPatients || 0);
  });
  const docEntries = Object.entries(caByDoc).sort((a, b) => b[1] - a[1]);
  const topDoc = docEntries[0];
  const topDocName = topDoc
    ? (practitioners.find(p => p.practitionerCode === topDoc[0])?.name || topDoc[0])
    : '—';

  // ─── noms praticiens ──────────────────────────────────────────────
  const docName = (code) => practitioners.find(p => p.practitionerCode === code)?.name || `Dr. ${code}`;

  // ─── available years ──────────────────────────────────────────────
  const availableYears = useMemo(() => {
    const yrs = [...new Set(evolution.map(e => e._id?.substring(0, 4)).filter(Boolean))].sort();
    ['2024', '2025', '2026'].forEach(y => { if (!yrs.includes(y)) yrs.push(y); });
    return yrs.sort();
  }, [evolution]);

  // ─── Chart: tendance mensuelle CA + Encaissé ──────────────────────
  const trendChartData = {
    labels: MONTHS,
    datasets: [
      {
        label: `CA Facturé ${year}`,
        data: monthlyCA,
        borderColor: '#1e3a5f',
        backgroundColor: 'rgba(30,58,95,0.08)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#1e3a5f',
        borderWidth: 2,
      },
      {
        label: `CA Encaissé ${year}`,
        data: monthlyEnc,
        borderColor: '#22c55e',
        backgroundColor: 'transparent',
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: '#22c55e',
        borderWidth: 2,
        borderDash: [4, 3],
      },
    ],
  };

  const trendChartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top', labels: { font: { size: 11 }, boxWidth: 14, color: '#64748b' } },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${fmt(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: { grid: { color: 'rgba(226,232,240,0.4)' }, ticks: { color: '#94a3b8', font: { size: 10 } } },
      y: {
        grid: { color: 'rgba(226,232,240,0.4)' },
        ticks: { color: '#94a3b8', font: { size: 10 }, callback: (v) => `${Math.round(v / 1000)}k€` },
      },
    },
  };

  // ─── Chart: Donut CA par praticien ────────────────────────────────
  const donutData = {
    labels: docEntries.map(([c]) => docName(c)),
    datasets: [{
      data: docEntries.map(([, v]) => v),
      backgroundColor: PRACT_COLORS_LIGHT.slice(0, docEntries.length),
      borderWidth: 2,
      borderColor: '#fff',
    }],
  };
  const donutOpts = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => ` ${fmt(ctx.parsed)}` } },
    },
  };

  // ─── Chart: Bar par praticien (metric switch) ─────────────────────
  const barMetricData = metricView === 'ca' ? caByDoc : metricView === 'patients' ? patByDoc : {};
  const barEntries = Object.entries(barMetricData).sort((a, b) => b[1] - a[1]);
  const barChartData = {
    labels: barEntries.map(([c]) => docName(c)),
    datasets: [{
      label: metricView === 'ca' ? 'CA Facturé' : 'Patients',
      data: barEntries.map(([, v]) => v),
      backgroundColor: PRACT_COLORS_LIGHT.slice(0, barEntries.length),
      borderRadius: 6,
      borderSkipped: false,
    }],
  };
  const barChartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => metricView === 'ca' ? ` ${fmt(ctx.parsed.x)}` : ` ${fmtNum(ctx.parsed.x)} patients`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(226,232,240,0.4)' },
        ticks: {
          color: '#94a3b8', font: { size: 10 },
          callback: (v) => metricView === 'ca' ? `${Math.round(v / 1000)}k€` : fmtNum(v),
        },
      },
      y: { grid: { display: false }, ticks: { color: '#374151', font: { size: 11, weight: '500' } } },
    },
  };

  // ─── Chart: Revenus vs Encaissements (Bar grouped) ────────────────
  const revVsEncData = {
    labels: MONTHS,
    datasets: [
      {
        label: 'CA Facturé',
        data: monthlyCA,
        backgroundColor: '#1e3a5f',
        borderRadius: 4,
        borderSkipped: false,
      },
      {
        label: 'CA Encaissé',
        data: monthlyEnc,
        backgroundColor: '#22c55e',
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  };
  const revVsEncOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top', labels: { font: { size: 11 }, boxWidth: 14, color: '#64748b' } },
      tooltip: { callbacks: { label: (ctx) => ` ${fmt(ctx.parsed.y)}` } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } },
      y: {
        grid: { color: 'rgba(226,232,240,0.4)' },
        ticks: { color: '#94a3b8', font: { size: 10 }, callback: (v) => `${Math.round(v / 1000)}k€` },
      },
    },
  };

  if (loading) {
    return (
      <div className="flex-1 overflow-auto bg-gray-50">
        <Header title="Dashboard Analytique" subtitle="Vue d'ensemble performance" />
        <div className="flex items-center justify-center h-64">
          <FiRefreshCw className="w-6 h-6 animate-spin text-primary-500" />
          <span className="ml-2 text-gray-500">Chargement des données…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-gray-50 min-h-screen">
      <Header title="Dashboard Analytique" subtitle="Performance globale des cabinets dentaires" />

      <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-6">

        {/* ─── Barre de contrôle ─────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Période analysée</p>
            <div className="flex gap-1 mt-1">
              {availableYears.map(y => (
                <button
                  key={y}
                  onClick={() => setYear(y)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    year === y
                      ? 'bg-slate-800 text-white shadow'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-slate-400'
                  }`}
                >{y}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400 bg-white border border-gray-100 rounded-lg px-3 py-2 shadow-sm">
            <FiRefreshCw className="w-3 h-3" />
            Données en temps réel · {practitioners.length} cabinets actifs
          </div>
        </div>

        {/* ─── KPI Cards (ligne 1) ───────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            icon={FiDollarSign}
            iconBg="bg-slate-800"
            label="CA Total Facturé"
            value={fmt(totalCA)}
            sub={`${fmt(totalEnc)} encaissé`}
            trend={variCA !== null ? (Number(variCA) >= 0 ? 'up' : 'down') : null}
            trendValue={variCA !== null ? `${variCA > 0 ? '+' : ''}${variCA}% vs ${prevYearStr}` : null}
          />
          <KpiCard
            icon={FiTrendingUp}
            iconBg="bg-green-600"
            label="Taux d'Encaissement"
            value={pct(tauxEnc)}
            sub={`Panier moyen ${fmt(panierMoyen)}`}
            trend={tauxEnc >= 80 ? 'up' : 'down'}
            trendValue={tauxEnc >= 80 ? 'Bon niveau' : 'À améliorer'}
          />
          <KpiCard
            icon={FiUsers}
            iconBg="bg-amber-500"
            label="Patients Total"
            value={fmtNum(totalPat)}
            sub={`Sur ${availableYears.length > 0 ? year : '—'}`}
            trend={null}
          />
          <KpiCard
            icon={FiAward}
            iconBg="bg-blue-600"
            label="Top Cabinet"
            value={topDocName}
            sub={topDoc ? `${fmt(topDoc[1])} CA` : '—'}
            trend={null}
          />
        </div>

        {/* ─── KPI Cards (ligne 2) ───────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            icon={FiActivity}
            iconBg="bg-indigo-600"
            label="Total RDV"
            value={fmtNum(totalRdv)}
            sub={`${fmtNum(totalHonores)} honorés`}
            trend={tauxAbsence < 15 ? 'up' : 'down'}
            trendValue={`Absence ${pct(tauxAbsence)}`}
          />
          <KpiCard
            icon={FiFileText}
            iconBg="bg-rose-600"
            label="Taux Acceptation Devis"
            value={`${tauxDevis}%`}
            sub={`${fmtNum(totalNbAcceptes)} / ${fmtNum(totalNbDevis)} devis`}
            trend={tauxDevis >= 50 ? 'up' : 'down'}
            trendValue={tauxDevis >= 50 ? 'Bon' : 'Faible'}
          />
          <KpiCard
            icon={FiClock}
            iconBg="bg-teal-600"
            label="Production Horaire"
            value={`${fmt(prodHoraire)}/h`}
            sub={`${Math.round(totalHeures)}h travaillées`}
            trend={prodHoraire >= 250 ? 'up' : 'down'}
            trendValue={prodHoraire >= 300 ? 'Excellent' : prodHoraire >= 250 ? 'Bon' : 'Moyen'}
          />
          <KpiCard
            icon={FiBarChart2}
            iconBg="bg-purple-600"
            label="Cabinets Actifs"
            value={practitioners.length}
            sub={`${docEntries.length} avec données ${year}`}
            trend={null}
          />
        </div>

        {/* ─── LIGNE 2 : Trend + Donut ──────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Tendance mensuelle CA */}
          <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <SectionTitle>Tendance Mensuelle CA — {year}</SectionTitle>
            <div className="h-52">
              <Line data={trendChartData} options={trendChartOpts} />
            </div>
          </div>

          {/* Répartition CA par cabinet (donut) */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-col">
            <SectionTitle>Répartition CA par Cabinet</SectionTitle>
            <div className="flex-1 flex items-center justify-center" style={{ minHeight: 160 }}>
              {docEntries.length > 0 ? (
                <div className="relative w-full h-40">
                  <Doughnut data={donutData} options={donutOpts} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-lg font-bold text-gray-900">{fmt(totalCA)}</p>
                    <p className="text-xs text-gray-400">CA total</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400">Aucune donnée</p>
              )}
            </div>
            {/* Légende */}
            <div className="mt-3 space-y-1.5">
              {docEntries.map(([code, ca], i) => {
                const pctVal = totalCA > 0 ? ((ca / totalCA) * 100).toFixed(0) : 0;
                return (
                  <div key={code} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: PRACT_COLORS_LIGHT[i] }} />
                      <span className="text-gray-700 font-medium truncate max-w-[100px]">{docName(code)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">{fmt(ca)}</span>
                      <span className="text-gray-400 w-8 text-right">{pctVal}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── LIGNE 3 : Top Praticiens + Revenus vs Encaissements ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Top praticiens (barre horizontale avec switch métrique) */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <SectionTitle>Performance par Cabinet</SectionTitle>
              <div className="flex gap-1">
                {[{ key: 'ca', label: 'CA' }, { key: 'patients', label: 'Patients' }].map(m => (
                  <button
                    key={m.key}
                    onClick={() => setMetricView(m.key)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      metricView === m.key ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >{m.label}</button>
                ))}
              </div>
            </div>
            <div className="h-48">
              {barEntries.length > 0 ? (
                <Bar data={barChartData} options={barChartOpts} />
              ) : (
                <p className="text-xs text-gray-400 pt-8 text-center">Aucune donnée pour {year}</p>
              )}
            </div>
          </div>

          {/* Revenus vs Encaissements (grouped bar) */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <SectionTitle>CA Facturé vs CA Encaissé — {year}</SectionTitle>
            <div className="h-56">
              <Bar data={revVsEncData} options={revVsEncOpts} />
            </div>
          </div>
        </div>

        {/* ─── LIGNE 4 : Tableau récapitulatif par praticien ────── */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-800">Récapitulatif par Cabinet — {year}</h2>
              <p className="text-xs text-gray-400 mt-0.5">Tous les indicateurs clés par praticien</p>
            </div>
            <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full border">{docEntries.length} cabinets</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-gray-500 uppercase tracking-wide text-[10px]">
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Cabinet</th>
                  <th className="px-4 py-3 text-right">CA Facturé</th>
                  <th className="px-4 py-3 text-right">CA Encaissé</th>
                  <th className="px-4 py-3 text-right">Taux enc.</th>
                  <th className="px-4 py-3 text-right">Patients</th>
                  <th className="px-4 py-3 text-right">Panier Moy.</th>
                  <th className="px-4 py-3 text-left">Perf.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {docEntries.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Aucune donnée pour {year}</td></tr>
                ) : docEntries.map(([code, ca], i) => {
                  const enc = encByDoc[code] || 0;
                  const pat = patByDoc[code] || 0;
                  const tEnc = ca > 0 ? (enc / ca) * 100 : 0;
                  const panier = pat > 0 ? Math.round(ca / pat) : 0;
                  const pctCA = totalCA > 0 ? (ca / totalCA) * 100 : 0;
                  const perfColor = tEnc >= 85 ? 'bg-green-500' : tEnc >= 70 ? 'bg-amber-400' : 'bg-red-400';
                  return (
                    <tr key={code} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-gray-400 font-medium">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                            style={{ backgroundColor: PRACT_COLORS_LIGHT[i % PRACT_COLORS_LIGHT.length] }}>
                            {code.charAt(0)}
                          </span>
                          <div>
                            <p className="font-semibold text-gray-800">{docName(code)}</p>
                            <p className="text-gray-400 text-[10px]">Cabinet {code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">{fmt(ca)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{fmt(enc)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-white text-[10px] font-medium ${perfColor}`}>
                          {pct(tEnc, 0)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">{fmtNum(pat)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{fmt(panier)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden" style={{ width: 60 }}>
                            <div className="h-full rounded-full bg-slate-700 transition-all" style={{ width: `${pctCA}%` }} />
                          </div>
                          <span className="text-gray-400 text-[10px] w-8">{pct(pctCA, 0)}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {docEntries.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-800 text-white font-semibold">
                    <td className="px-4 py-3" colSpan={2}>TOTAL</td>
                    <td className="px-4 py-3 text-right">{fmt(totalCA)}</td>
                    <td className="px-4 py-3 text-right">{fmt(totalEnc)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px]">{pct(tauxEnc, 0)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">{fmtNum(totalPat)}</td>
                    <td className="px-4 py-3 text-right">{fmt(panierMoyen)}</td>
                    <td className="px-4 py-3" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* ─── LIGNE 5 : Indicateurs RDV + Devis ───────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* RDV */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <SectionTitle>Indicateurs RDV — Toutes périodes</SectionTitle>
            <div className="space-y-3 mt-2">
              {[
                { label: 'RDV Honorés', value: totalHonores, total: totalRdv, color: '#22c55e' },
                { label: 'RDV Manqués', value: totalManques, total: totalRdv, color: '#f59e0b' },
                { label: 'Annulations', value: globalRdvDetail.totalAnnulations || 0, total: totalRdv, color: '#ef4444' },
              ].map(r => {
                const p = totalRdv > 0 ? (r.value / totalRdv) * 100 : 0;
                return (
                  <div key={r.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700">{r.label}</span>
                      <span className="text-gray-500">{fmtNum(r.value)} <span className="text-gray-400">({pct(p, 0)})</span></span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${p}%`, backgroundColor: r.color }} />
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-500">Total RDV</span>
                <span className="font-bold text-gray-800">{fmtNum(totalRdv)}</span>
              </div>
            </div>
          </div>

          {/* Devis */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <SectionTitle>Indicateurs Devis — Toutes périodes</SectionTitle>
            <div className="space-y-3 mt-2">
              {[
                { label: 'Devis Présentés', value: totalNbDevis, color: '#3b82f6', pctVal: 100 },
                { label: 'Devis Acceptés', value: totalNbAcceptes, color: '#22c55e', pctVal: totalNbDevis > 0 ? (totalNbAcceptes / totalNbDevis) * 100 : 0 },
                { label: 'Montant Réalisé', value: null, color: '#8b5cf6', pctVal: totalNbDevis > 0 ? (totalNbAcceptes / totalNbDevis) * 100 : 0, isAmount: true, amount: globalDevis.totalMontantRealise || 0 },
              ].map(r => (
                <div key={r.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-gray-700">{r.label}</span>
                    <span className="text-gray-500">
                      {r.isAmount ? fmt(r.amount) : fmtNum(r.value)}
                      {!r.isAmount && r.pctVal < 100 && <span className="text-gray-400 ml-1">({pct(r.pctVal, 0)})</span>}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(r.pctVal, 100)}%`, backgroundColor: r.color }} />
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-500">Taux d'acceptation global</span>
                <span className={`font-bold ${tauxDevis >= 50 ? 'text-green-600' : 'text-amber-600'}`}>{tauxDevis}%</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
