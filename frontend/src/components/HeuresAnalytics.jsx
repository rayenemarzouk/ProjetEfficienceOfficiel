import { useMemo, useRef, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { FiClock, FiTrendingUp, FiBarChart2 } from 'react-icons/fi';
import { startChartAnimation } from '../utils/chartPlugins';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler);

const fmt = (v) => new Intl.NumberFormat('fr-FR').format(Math.round(v || 0));

export default function HeuresAnalytics({
  nbHeures = 0,
  productionHoraire = 0,
  heuresVariation = 0,
  caMonth = 0,
  patientsMonth = 0,
  historique = [],
  isDynamic = false,
  subtitle = ''
}) {
  const chartRef = useRef(null);
  const lineRef = useRef(null);

  const chartTextColor = '#64748b';
  const chartGridColor = 'rgba(226, 232, 240, 0.5)';

  useEffect(() => {
    if (isDynamic && chartRef.current) {
      const stop = startChartAnimation(chartRef);
      return stop;
    }
  }, [isDynamic]);

  // Calculer la productivité par heure
  const productiviteParHeure = nbHeures > 0 ? (caMonth / nbHeures).toFixed(0) : 0;

  // Graphe 1: Heures travaillées
  const heuresData = useMemo(() => ({
    labels: ['Heures\ntravaillées'],
    datasets: [
      {
        label: 'Heures (h)',
        data: [nbHeures],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
        ],
        borderColor: [
          'rgb(59, 130, 246)',
        ],
        borderWidth: 2,
        borderRadius: 8,
        barPercentage: 0.4,
      }
    ]
  }), [nbHeures]);

  // Graphe 2: Production horaire
  const productionData = useMemo(() => ({
    labels: ['Production\nhoraire'],
    datasets: [
      {
        label: 'Production (€/h)',
        data: [productionHoraire],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
        ],
        borderColor: [
          'rgb(34, 197, 94)',
        ],
        borderWidth: 2,
        borderRadius: 8,
        barPercentage: 0.4,
      }
    ]
  }), [productionHoraire]);

  // Graphe 3: Répartition CA et heures
  const repartitionData = useMemo(() => ({
    labels: ['CA généré', 'Heures travaillées'],
    datasets: [
      {
        label: 'Valeur normalisée',
        data: [
          caMonth > 0 ? 100 : 0,
          Math.min((nbHeures / 160) * 100, 100) // 160h = mois standard
        ],
        backgroundColor: [
          'rgba(168, 85, 247, 0.8)',
          'rgba(59, 130, 246, 0.8)',
        ],
        borderColor: [
          'rgb(168, 85, 247)',
          'rgb(59, 130, 246)',
        ],
        borderWidth: 2,
        borderRadius: 8,
        barPercentage: 0.6,
      }
    ]
  }), [caMonth, nbHeures]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <FiClock className="w-5 h-5 text-blue-600" />
          Analyse des heures travaillées
        </h3>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500 rounded-lg">
              <FiClock className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-600">Heures travaillées</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{nbHeures}</p>
          <p className="text-xs text-gray-500 mt-1">
            {heuresVariation >= 0 ? '📈' : '📉'} {Math.abs(heuresVariation).toFixed(1)}% vs mois précédent
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500 rounded-lg">
              <FiTrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-600">Production horaire</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{fmt(productionHoraire)} €/h</p>
          <p className="text-xs text-gray-500 mt-1">
            {productionHoraire >= 300 ? '✅ Excellent' : productionHoraire >= 180 ? '⚠️ Bon' : '❌ À améliorer'}
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500 rounded-lg">
              <FiBarChart2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-600">Efficacité</span>
          </div>
          <p className="text-2xl font-bold text-purple-600">{fmt(productiviteParHeure)} €/h</p>
          <p className="text-xs text-gray-500 mt-1">
            CA généré par heure
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart 1: Heures travaillées */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <h4 className="text-xs font-bold text-gray-700 mb-3 uppercase">Heures travaillées</h4>
          <Bar
            ref={chartRef}
            data={heuresData}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              indexAxis: 'x',
              plugins: {
                legend: { display: true, position: 'top', labels: { color: chartTextColor, usePointStyle: true, font: { size: 10 }, padding: 15 } },
                tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', titleColor: '#fff', bodyColor: '#fff', padding: 10, titleFont: { size: 12, weight: '600' }, bodyFont: { size: 11 }, cornerRadius: 6, callbacks: { label: (ctx) => `${Math.round(ctx.parsed.y)} h` } }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: { color: chartGridColor, drawBorder: false },
                  ticks: { color: chartTextColor, font: { size: 10 }, callback: v => `${Math.round(v)}h` }
                },
                x: {
                  grid: { display: false, drawBorder: false },
                  ticks: { color: chartTextColor, font: { size: 10 } }
                }
              }
            }}
          />
        </div>

        {/* Chart 2: Production horaire */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <h4 className="text-xs font-bold text-gray-700 mb-3 uppercase">Production horaire</h4>
          <Bar
            data={productionData}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              indexAxis: 'x',
              plugins: {
                legend: { display: true, position: 'top', labels: { color: chartTextColor, usePointStyle: true, font: { size: 10 }, padding: 15 } },
                tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', titleColor: '#fff', bodyColor: '#fff', padding: 10, titleFont: { size: 12, weight: '600' }, bodyFont: { size: 11 }, cornerRadius: 6, callbacks: { label: (ctx) => `${fmt(ctx.parsed.y)} €/h` } }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: { color: chartGridColor, drawBorder: false },
                  ticks: { color: chartTextColor, font: { size: 10 }, callback: v => `${(v/100).toFixed(0)}00€` }
                },
                x: {
                  grid: { display: false, drawBorder: false },
                  ticks: { color: chartTextColor, font: { size: 10 } }
                }
              }
            }}
          />
        </div>

        {/* Chart 3: Heures vs CA */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <h4 className="text-xs font-bold text-gray-700 mb-3 uppercase">Performance</h4>
          <Bar
            data={repartitionData}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              indexAxis: 'y',
              plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', titleColor: '#fff', bodyColor: '#fff', padding: 10, titleFont: { size: 12, weight: '600' }, bodyFont: { size: 11 }, cornerRadius: 6, callbacks: { label: (ctx) => `${ctx.parsed.x.toFixed(0)}%` } }
              },
              scales: {
                x: {
                  beginAtZero: true,
                  max: 100,
                  grid: { color: chartGridColor, drawBorder: false },
                  ticks: { color: chartTextColor, font: { size: 10 }, callback: v => `${v}%` }
                },
                y: {
                  grid: { display: false, drawBorder: false },
                  ticks: { color: chartTextColor, font: { size: 10 } }
                }
              }
            }}
          />
        </div>
      </div>

      {/* Détails */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-900"><strong>ℹ️ Production:</strong> Chiffre d'affaires généré par heure travaillée. Plus la valeur est élevée, plus le cabinet est productif.</p>
      </div>
    </div>
  );
}
