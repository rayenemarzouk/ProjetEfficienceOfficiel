import { useMemo, useRef, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { FiCalendar, FiUsers } from 'react-icons/fi';
import { startChartAnimation, streamingLinePlugin, streamingBarPlugin } from '../utils/chartPlugins';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler, streamingLinePlugin, streamingBarPlugin);

const fmt = (v) => new Intl.NumberFormat('fr-FR').format(Math.round(v || 0));

const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const formatMonthLabel = (id) => {
  if (!id) return '';
  const month = parseInt(id.substring(4, 6)) - 1;
  const year = id.substring(0, 4);
  return `${MONTHS_FR[month]} ${year}`;
};

export default function AnalyseAgenda({
  evolution = [],
  rdvEvolution = [],
  isDynamic = false,
  subtitle = ''
}) {
  const patientsNewRef = useRef(null);
  const patientsTotalRef = useRef(null);
  const rdvRef = useRef(null);
  const patientsAvgRef = useRef(null);

  const chartTextColor = '#64748b';
  const chartGridColor = 'rgba(226, 232, 240, 0.5)';

  // Animation dynamique - garder les stop functions pour cleanup
  useEffect(() => {
    if (!isDynamic) return;

    const stopFunctions = [];

    [patientsNewRef, patientsTotalRef, rdvRef, patientsAvgRef].forEach(ref => {
      if (ref?.current) {
        const stop = startChartAnimation(ref);
        if (typeof stop === 'function') {
          stopFunctions.push(stop);
        }
      }
    });

    return () => {
      stopFunctions.forEach(stop => stop());
    };
  }, [isDynamic]);

  // Données combinées pour tooltips détaillés
  const combinedData = useMemo(() => {
    const last12E = evolution.slice(-12);
    const last12R = rdvEvolution.slice(-12);

    return last12E.map((e, i) => {
      const r = last12R[i] || {};
      const patients = e.totalPatients || 0;
      const rdv = r.nbRdv || 0;
      const patientsParRdv = rdv > 0 ? patients / rdv : 0;

      return {
        _id: e._id,
        totalPatients: patients,
        totalFacture: e.totalFacture || 0,
        totalEncaisse: e.totalEncaisse || 0,
        nbRdv: rdv,
        nbNouveauxPatients: r.nbNouveauxPatients || 0,
        patientsParRdv
      };
    });
  }, [evolution, rdvEvolution]);

  // Statistiques KPI
  const stats = useMemo(() => {
    const totalNewPatients = combinedData.reduce((sum, m) => sum + (m.nbNouveauxPatients || 0), 0);
    const totalPatients = combinedData.reduce((sum, m) => sum + (m.totalPatients || 0), 0);
    const totalRdv = combinedData.reduce((sum, m) => sum + (m.nbRdv || 0), 0);
    const avgPatientsPerRdv = totalRdv > 0 ? (totalPatients / totalRdv).toFixed(1) : 0;

    return { totalNewPatients, totalPatients, totalRdv, avgPatientsPerRdv };
  }, [combinedData]);

  // Graphe 1: Patients nouveaux
  const patientsNouveauxData = useMemo(() => {
    return {
      labels: combinedData.map((m) => {
        if (!m._id) return '';
        const month = m._id.substring(4, 6);
        const year = m._id.substring(0, 4);
        return `${month}/${year}`;
      }),
      datasets: [
        {
          label: 'Nouveaux patients',
          data: combinedData.map((m) => m.nbNouveauxPatients || 0),
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 2,
          borderRadius: 6,
          barPercentage: 0.7
        }
      ]
    };
  }, [combinedData]);

  // Graphe 2: Patients traités
  const patientsTotauxData = useMemo(() => {
    return {
      labels: combinedData.map((m) => {
        if (!m._id) return '';
        const month = m._id.substring(4, 6);
        const year = m._id.substring(0, 4);
        return `${month}/${year}`;
      }),
      datasets: [
        {
          label: 'Patients traités',
          data: combinedData.map((m) => m.totalPatients || 0),
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 2,
          borderRadius: 6,
          barPercentage: 0.7
        }
      ]
    };
  }, [combinedData]);

  // Graphe 3: Rendez-vous
  const rdvData = useMemo(() => {
    return {
      labels: combinedData.map((m) => {
        if (!m._id) return '';
        const month = m._id.substring(4, 6);
        const year = m._id.substring(0, 4);
        return `${month}/${year}`;
      }),
      datasets: [
        {
          label: 'Rendez-vous',
          data: combinedData.map((m) => m.nbRdv || 0),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: 'rgb(34, 197, 94)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverRadius: 8
        }
      ]
    };
  }, [combinedData]);

  // Graphe 4: Patients par RDV
  const patientsParRdvData = useMemo(() => {
    return {
      labels: combinedData.map((m) => {
        if (!m._id) return '';
        const month = m._id.substring(4, 6);
        const year = m._id.substring(0, 4);
        return `${month}/${year}`;
      }),
      datasets: [
        {
          label: 'Patients/RDV',
          data: combinedData.map((m) => m.patientsParRdv.toFixed(2)),
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 2,
          borderRadius: 6,
          barPercentage: 0.7
        }
      ]
    };
  }, [combinedData]);

  // Tooltips détaillés
  const newPatientsTooltip = {
    title: (ctx) => {
      const idx = ctx[0].dataIndex;
      const item = combinedData[idx];
      return item?._id ? formatMonthLabel(item._id) : '';
    },
    label: (ctx) => {
      const idx = ctx.dataIndex;
      const item = combinedData[idx];
      return `Nouveaux patients: ${item?.nbNouveauxPatients || 0}`;
    },
    afterLabel: (ctx) => {
      const idx = ctx.dataIndex;
      const item = combinedData[idx];
      const pct = item?.totalPatients > 0 ? ((item.nbNouveauxPatients / item.totalPatients) * 100).toFixed(1) : 0;
      return [
        `Total patients: ${item?.totalPatients || 0}`,
        `% nouveaux: ${pct}%`,
        `RDV: ${item?.nbRdv || 0}`
      ];
    }
  };

  const totalPatientsTooltip = {
    title: (ctx) => {
      const idx = ctx[0].dataIndex;
      const item = combinedData[idx];
      return item?._id ? formatMonthLabel(item._id) : '';
    },
    label: (ctx) => {
      const idx = ctx.dataIndex;
      const item = combinedData[idx];
      return `Patients traités: ${item?.totalPatients || 0}`;
    },
    afterLabel: (ctx) => {
      const idx = ctx.dataIndex;
      const item = combinedData[idx];
      const panierMoyen = item?.totalPatients > 0 ? (item.totalFacture / item.totalPatients) : 0;
      return [
        `CA généré: ${fmt(item?.totalFacture || 0)} €`,
        `Panier moyen: ${fmt(panierMoyen)} €`,
        `Nouveaux: ${item?.nbNouveauxPatients || 0}`
      ];
    }
  };

  const rdvTooltip = {
    title: (ctx) => {
      const idx = ctx[0].dataIndex;
      const item = combinedData[idx];
      return item?._id ? formatMonthLabel(item._id) : '';
    },
    label: (ctx) => {
      const idx = ctx.dataIndex;
      const item = combinedData[idx];
      return `Rendez-vous: ${item?.nbRdv || 0}`;
    },
    afterLabel: (ctx) => {
      const idx = ctx.dataIndex;
      const item = combinedData[idx];
      return [
        `Patients traités: ${item?.totalPatients || 0}`,
        `Patients/RDV: ${(item?.patientsParRdv || 0).toFixed(2)}`,
        `Nouveaux patients: ${item?.nbNouveauxPatients || 0}`
      ];
    }
  };

  const patientsPerRdvTooltip = {
    title: (ctx) => {
      const idx = ctx[0].dataIndex;
      const item = combinedData[idx];
      return item?._id ? formatMonthLabel(item._id) : '';
    },
    label: (ctx) => {
      const idx = ctx.dataIndex;
      const item = combinedData[idx];
      return `Patients/RDV: ${(item?.patientsParRdv || 0).toFixed(2)}`;
    },
    afterLabel: (ctx) => {
      const idx = ctx.dataIndex;
      const item = combinedData[idx];
      return [
        `Total patients: ${item?.totalPatients || 0}`,
        `Total RDV: ${item?.nbRdv || 0}`,
        `Efficacité: ${item?.patientsParRdv >= 1 ? '✅ Bon' : '⚠️ À améliorer'}`
      ];
    }
  };

  const tooltipStyle = {
    backgroundColor: 'rgba(0,0,0,0.85)',
    titleColor: '#fff',
    bodyColor: '#fff',
    padding: 12,
    titleFont: { size: 12, weight: '700' },
    bodyFont: { size: 11 },
    cornerRadius: 8,
    displayColors: false
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 bg-green-50 px-4 py-3 rounded-lg">
          <FiCalendar className="w-5 h-5 text-green-600" />
          Analyse Agenda
          {isDynamic && <span className="ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full animate-pulse">LIVE</span>}
        </h3>
        {subtitle && <p className="text-xs text-gray-400 mt-1 px-4">{subtitle}</p>}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500 rounded-lg">
              <FiUsers className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-600">Nouveaux patients</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.totalNewPatients}</p>
          <p className="text-xs text-gray-500 mt-1">Total période</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500 rounded-lg">
              <FiUsers className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-600">Patients traités</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.totalPatients}</p>
          <p className="text-xs text-gray-500 mt-1">Total période</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500 rounded-lg">
              <FiCalendar className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-600">Rendez-vous</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.totalRdv}</p>
          <p className="text-xs text-gray-500 mt-1">Total période</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500 rounded-lg">
              <FiUsers className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-600">Patients/RDV</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.avgPatientsPerRdv}</p>
          <p className="text-xs text-gray-500 mt-1">Moyenne</p>
        </div>
      </div>

      {/* Charts Grid - 2x2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: Patients nouveaux */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <h4 className="text-xs font-bold text-gray-700 mb-3 uppercase">Nouveaux patients</h4>
          <Bar
            ref={patientsNewRef}
            data={patientsNouveauxData}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              animation: isDynamic ? false : { duration: 1000 },
              plugins: {
                legend: { display: false },
                tooltip: { ...tooltipStyle, callbacks: newPatientsTooltip }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: { color: chartGridColor, drawBorder: false },
                  ticks: { color: chartTextColor, font: { size: 9 }, callback: v => Math.round(v) }
                },
                x: {
                  grid: { display: false, drawBorder: false },
                  ticks: { color: chartTextColor, font: { size: 9 }, maxRotation: 45 }
                }
              }
            }}
          />
        </div>

        {/* Chart 2: Patients traités */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <h4 className="text-xs font-bold text-gray-700 mb-3 uppercase">Patients traités</h4>
          <Bar
            ref={patientsTotalRef}
            data={patientsTotauxData}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              animation: isDynamic ? false : { duration: 1000 },
              plugins: {
                legend: { display: false },
                tooltip: { ...tooltipStyle, callbacks: totalPatientsTooltip }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: { color: chartGridColor, drawBorder: false },
                  ticks: { color: chartTextColor, font: { size: 9 }, callback: v => Math.round(v) }
                },
                x: {
                  grid: { display: false, drawBorder: false },
                  ticks: { color: chartTextColor, font: { size: 9 }, maxRotation: 45 }
                }
              }
            }}
          />
        </div>

        {/* Chart 3: Rendez-vous */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <h4 className="text-xs font-bold text-gray-700 mb-3 uppercase">Rendez-vous</h4>
          <Line
            ref={rdvRef}
            data={rdvData}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              animation: isDynamic ? false : { duration: 1000 },
              plugins: {
                legend: { display: false },
                tooltip: { ...tooltipStyle, callbacks: rdvTooltip }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: { color: chartGridColor, drawBorder: false },
                  ticks: { color: chartTextColor, font: { size: 9 }, callback: v => Math.round(v) }
                },
                x: {
                  grid: { display: false, drawBorder: false },
                  ticks: { color: chartTextColor, font: { size: 9 }, maxRotation: 45 }
                }
              }
            }}
          />
        </div>

        {/* Chart 4: Patients par RDV */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <h4 className="text-xs font-bold text-gray-700 mb-3 uppercase">Patients par rendez-vous</h4>
          <Bar
            ref={patientsAvgRef}
            data={patientsParRdvData}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              animation: isDynamic ? false : { duration: 1000 },
              plugins: {
                legend: { display: false },
                tooltip: { ...tooltipStyle, callbacks: patientsPerRdvTooltip }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: { color: chartGridColor, drawBorder: false },
                  ticks: { color: chartTextColor, font: { size: 9 }, callback: v => v.toFixed(1) }
                },
                x: {
                  grid: { display: false, drawBorder: false },
                  ticks: { color: chartTextColor, font: { size: 9 }, maxRotation: 45 }
                }
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
