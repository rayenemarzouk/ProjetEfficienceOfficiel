import { useMemo, useRef, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { FiDollarSign, FiTrendingUp } from 'react-icons/fi';
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

export default function AnalyseChiffreAffaires({
  evolution = [],
  heuresEvolution = [],
  isDynamic = false,
  subtitle = ''
}) {
  const caLineRef = useRef(null);
  const caHoraireRef = useRef(null);
  const heuresBarRef = useRef(null);
  const heuresHPRef = useRef(null);

  const chartTextColor = '#64748b';
  const chartGridColor = 'rgba(226, 232, 240, 0.5)';

  // Animation dynamique - garder les stop functions et les appeler uniquement au cleanup
  useEffect(() => {
    if (!isDynamic) return;

    const stopFunctions = [];

    [caLineRef, caHoraireRef, heuresBarRef, heuresHPRef].forEach(ref => {
      if (ref?.current) {
        const stop = startChartAnimation(ref);
        if (typeof stop === 'function') {
          stopFunctions.push(stop);
        }
      }
    });

    // Cleanup: arrêter les animations quand isDynamic devient false ou unmount
    return () => {
      stopFunctions.forEach(stop => stop());
    };
  }, [isDynamic]);

  // Données combinées pour les tooltips
  const combinedData = useMemo(() => {
    const last12 = evolution.slice(-12);
    return last12.map((ca, i) => {
      const h = heuresEvolution[heuresEvolution.length - 12 + i] || {};
      const heures = h.nbHeures ? (h.nbHeures / 60) : 0;
      const caHoraire = heures > 0 ? ca.totalFacture / heures : 0;
      const heuresHP = heures * 0.25;
      return {
        ...ca,
        heures,
        caHoraire,
        heuresHP
      };
    });
  }, [evolution, heuresEvolution]);

  // Graphe 1: CA Evolution (12 derniers mois)
  const caEvolutionData = useMemo(() => {
    return {
      labels: combinedData.map((m) => {
        if (!m._id) return '';
        const month = m._id.substring(4, 6);
        const year = m._id.substring(0, 4);
        return `${month}/${year}`;
      }),
      datasets: [
        {
          label: 'Chiffre d\'affaires',
          data: combinedData.map((m) => m.totalFacture || 0),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: 'rgb(59, 130, 246)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverRadius: 8
        }
      ]
    };
  }, [combinedData]);

  // Graphe 2: CA Horaire Evolution
  const caHoraireData = useMemo(() => {
    return {
      labels: combinedData.map((m) => {
        if (!m._id) return '';
        const month = m._id.substring(4, 6);
        const year = m._id.substring(0, 4);
        return `${month}/${year}`;
      }),
      datasets: [
        {
          label: 'CA horaire',
          data: combinedData.map((m) => m.caHoraire || 0),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: 'rgb(59, 130, 246)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverRadius: 8
        }
      ]
    };
  }, [combinedData]);

  // Graphe 3: Heures travaillées
  const heuresTravailleesData = useMemo(() => {
    return {
      labels: combinedData.map((m) => {
        if (!m._id) return '';
        const month = m._id.substring(4, 6);
        const year = m._id.substring(0, 4);
        return `${month}/${year}`;
      }),
      datasets: [
        {
          label: 'Heures travaillées',
          data: combinedData.map((m) => m.heures || 0),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 2,
          borderRadius: 6,
          barPercentage: 0.7
        }
      ]
    };
  }, [combinedData]);

  // Graphe 4: Heures HP
  const heuresHPData = useMemo(() => {
    return {
      labels: combinedData.map((m) => {
        if (!m._id) return '';
        const month = m._id.substring(4, 6);
        const year = m._id.substring(0, 4);
        return `${month}/${year}`;
      }),
      datasets: [
        {
          label: 'Heures HP',
          data: combinedData.map((m) => m.heuresHP || 0),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 2,
          borderRadius: 6,
          barPercentage: 0.7
        }
      ]
    };
  }, [combinedData]);

  // Tooltip détaillé pour CA
  const caTooltipCallback = {
    title: (ctx) => {
      const idx = ctx[0].dataIndex;
      const item = combinedData[idx];
      return item?._id ? formatMonthLabel(item._id) : '';
    },
    label: (ctx) => {
      const idx = ctx.dataIndex;
      const item = combinedData[idx];
      return `CA: ${fmt(item?.totalFacture || 0)} €`;
    },
    afterLabel: (ctx) => {
      const idx = ctx.dataIndex;
      const item = combinedData[idx];
      return [
        `Encaissé: ${fmt(item?.totalEncaisse || 0)} €`,
        `Patients: ${item?.totalPatients || 0}`,
        `Heures: ${(item?.heures || 0).toFixed(0)}h`,
        `CA/h: ${fmt(item?.caHoraire || 0)} €`
      ];
    }
  };

  // Tooltip détaillé pour CA Horaire
  const caHoraireTooltipCallback = {
    title: (ctx) => {
      const idx = ctx[0].dataIndex;
      const item = combinedData[idx];
      return item?._id ? formatMonthLabel(item._id) : '';
    },
    label: (ctx) => {
      const idx = ctx.dataIndex;
      const item = combinedData[idx];
      return `CA horaire: ${fmt(item?.caHoraire || 0)} €/h`;
    },
    afterLabel: (ctx) => {
      const idx = ctx.dataIndex;
      const item = combinedData[idx];
      return [
        `CA total: ${fmt(item?.totalFacture || 0)} €`,
        `Heures travaillées: ${(item?.heures || 0).toFixed(0)}h`
      ];
    }
  };

  // Tooltip détaillé pour Heures
  const heuresWorkTooltipCallback = {
    title: (ctx) => {
      const idx = ctx[0].dataIndex;
      const item = combinedData[idx];
      return item?._id ? formatMonthLabel(item._id) : '';
    },
    label: (ctx) => {
      const idx = ctx.dataIndex;
      const item = combinedData[idx];
      return `Heures travaillées: ${(item?.heures || 0).toFixed(0)}h`;
    },
    afterLabel: (ctx) => {
      const idx = ctx.dataIndex;
      const item = combinedData[idx];
      return [
        `CA total: ${fmt(item?.totalFacture || 0)} €`,
        `CA/heure: ${fmt(item?.caHoraire || 0)} €`,
        `Patients: ${item?.totalPatients || 0}`
      ];
    }
  };

  // Tooltip détaillé pour Heures HP
  const heuresHPTooltipCallback = {
    title: (ctx) => {
      const idx = ctx[0].dataIndex;
      const item = combinedData[idx];
      return item?._id ? formatMonthLabel(item._id) : '';
    },
    label: (ctx) => {
      const idx = ctx.dataIndex;
      const item = combinedData[idx];
      return `Heures HP: ${(item?.heuresHP || 0).toFixed(0)}h`;
    },
    afterLabel: (ctx) => {
      const idx = ctx.dataIndex;
      const item = combinedData[idx];
      return [
        `Heures totales: ${(item?.heures || 0).toFixed(0)}h`,
        `% HP: 25%`
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
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 bg-blue-50 px-4 py-3 rounded-lg">
          <FiDollarSign className="w-5 h-5 text-blue-600" />
          Analyse Chiffre d'Affaires
          {isDynamic && <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full animate-pulse">LIVE</span>}
        </h3>
        {subtitle && <p className="text-xs text-gray-400 mt-1 px-4">{subtitle}</p>}
      </div>

      {/* Charts Grid - 2x2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: CA Evolution */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <h4 className="text-xs font-bold text-gray-700 mb-3 uppercase">Chiffre d'affaires</h4>
          <Line
            ref={caLineRef}
            data={caEvolutionData}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              animation: isDynamic ? false : { duration: 1000 },
              plugins: {
                legend: { display: true, position: 'top', labels: { color: chartTextColor, font: { size: 10 }, padding: 15 } },
                tooltip: { ...tooltipStyle, callbacks: caTooltipCallback }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: { color: chartGridColor, drawBorder: false },
                  ticks: { color: chartTextColor, font: { size: 9 }, callback: v => `${(v/1000).toFixed(0)}k€` }
                },
                x: {
                  grid: { display: false, drawBorder: false },
                  ticks: { color: chartTextColor, font: { size: 9 }, maxRotation: 45 }
                }
              }
            }}
          />
        </div>

        {/* Chart 2: CA Horaire */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <h4 className="text-xs font-bold text-gray-700 mb-3 uppercase">Chiffre d'affaires horaire</h4>
          <Line
            ref={caHoraireRef}
            data={caHoraireData}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              animation: isDynamic ? false : { duration: 1000 },
              plugins: {
                legend: { display: true, position: 'top', labels: { color: chartTextColor, font: { size: 10 }, padding: 15 } },
                tooltip: { ...tooltipStyle, callbacks: caHoraireTooltipCallback }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: { color: chartGridColor, drawBorder: false },
                  ticks: { color: chartTextColor, font: { size: 9 }, callback: v => `${v.toFixed(0)}€` }
                },
                x: {
                  grid: { display: false, drawBorder: false },
                  ticks: { color: chartTextColor, font: { size: 9 }, maxRotation: 45 }
                }
              }
            }}
          />
        </div>

        {/* Chart 3: Heures travaillées */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <h4 className="text-xs font-bold text-gray-700 mb-3 uppercase">Nombre d'heures travaillées</h4>
          <Bar
            ref={heuresBarRef}
            data={heuresTravailleesData}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              animation: isDynamic ? false : { duration: 1000 },
              plugins: {
                legend: { display: false },
                tooltip: { ...tooltipStyle, callbacks: heuresWorkTooltipCallback }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: { color: chartGridColor, drawBorder: false },
                  ticks: { color: chartTextColor, font: { size: 9 }, callback: v => `${v}h` }
                },
                x: {
                  grid: { display: false, drawBorder: false },
                  ticks: { color: chartTextColor, font: { size: 9 }, maxRotation: 45 }
                }
              }
            }}
          />
        </div>

        {/* Chart 4: Heures HP */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <h4 className="text-xs font-bold text-gray-700 mb-3 uppercase">Nombre d'heures HP</h4>
          <Bar
            ref={heuresHPRef}
            data={heuresHPData}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              animation: isDynamic ? false : { duration: 1000 },
              plugins: {
                legend: { display: false },
                tooltip: { ...tooltipStyle, callbacks: heuresHPTooltipCallback }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: { color: chartGridColor, drawBorder: false },
                  ticks: { color: chartTextColor, font: { size: 9 }, callback: v => `${v}h` }
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
