import { useMemo, useRef, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler } from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { FiFileText, FiCheckCircle, FiTrendingUp } from 'react-icons/fi';
import { startChartAnimation } from '../utils/chartPlugins';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler);

const fmt = (v) => new Intl.NumberFormat('fr-FR').format(Math.round(v || 0));

export default function DevisAnalytics({
  nbDevis = 0,
  nbDevisAcceptes = 0,
  tauxAcceptation = 0,
  montantMoyenDevis = 0,
  montantMoyenAcceptes = 0,
  historique = [],
  isDynamic = false,
  subtitle = ''
}) {
  const chartRef = useRef(null);
  const doughnutRef = useRef(null);

  const chartTextColor = '#64748b';
  const chartGridColor = 'rgba(226, 232, 240, 0.5)';

  useEffect(() => {
    if (isDynamic && chartRef.current) {
      const stop = startChartAnimation(chartRef);
      return stop;
    }
  }, [isDynamic]);

  const tauxRejet = 100 - tauxAcceptation;

  // Graphe 1: Nombre de devis proposés vs acceptés
  const devisData = useMemo(() => ({
    labels: ['Proposés', 'Acceptés'],
    datasets: [
      {
        label: 'Nombre de devis',
        data: [nbDevis, nbDevisAcceptes],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(34, 197, 94)',
        ],
        borderWidth: 2,
        borderRadius: 8,
        barPercentage: 0.6,
      }
    ]
  }), [nbDevis, nbDevisAcceptes]);

  // Graphe 2: Taux d'acceptation (Doughnut)
  const acceptationData = useMemo(() => ({
    labels: [`Acceptés (${tauxAcceptation.toFixed(1)}%)`, `Rejetés (${tauxRejet.toFixed(1)}%)`],
    datasets: [
      {
        data: [tauxAcceptation, tauxRejet],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(239, 68, 68)',
        ],
        borderWidth: 2,
      }
    ]
  }), [tauxAcceptation, tauxRejet]);

  // Graphe 3: Montants moyens
  const montantsData = useMemo(() => ({
    labels: ['Montant moyen\nproposé', 'Montant moyen\naccepté'],
    datasets: [
      {
        label: 'Montant (€)',
        data: [montantMoyenDevis, montantMoyenAcceptes],
        backgroundColor: [
          'rgba(168, 85, 247, 0.8)',
          'rgba(34, 197, 94, 0.8)',
        ],
        borderColor: [
          'rgb(168, 85, 247)',
          'rgb(34, 197, 94)',
        ],
        borderWidth: 2,
        borderRadius: 8,
        barPercentage: 0.6,
      }
    ]
  }), [montantMoyenDevis, montantMoyenAcceptes]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <FiFileText className="w-5 h-5 text-blue-600" />
          Analyse des devis
        </h3>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500 rounded-lg">
              <FiFileText className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-600">Devis proposés</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{nbDevis}</p>
          <p className="text-xs text-gray-500 mt-1">Nombre total</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500 rounded-lg">
              <FiCheckCircle className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-600">Devis acceptés</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{nbDevisAcceptes}</p>
          <p className="text-xs text-gray-500 mt-1">
            {nbDevis > 0 ? `${((nbDevisAcceptes / nbDevis) * 100).toFixed(1)}% du total` : 'N/A'}
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500 rounded-lg">
              <FiTrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-600">Taux d'acceptation</span>
          </div>
          <p className="text-2xl font-bold text-purple-600">{tauxAcceptation.toFixed(1)}%</p>
          <p className="text-xs text-gray-500 mt-1">
            {tauxAcceptation >= 60 ? '✅ Excellent' : tauxAcceptation >= 40 ? '⚠️ Bon' : '❌ À améliorer'}
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart 1: Nombre de devis */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <h4 className="text-xs font-bold text-gray-700 mb-3 uppercase">Comparaison devis</h4>
          <Bar
            ref={chartRef}
            data={devisData}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              indexAxis: 'x',
              plugins: {
                legend: { display: true, position: 'top', labels: { color: chartTextColor, usePointStyle: true, font: { size: 10 }, padding: 15 } },
                tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', titleColor: '#fff', bodyColor: '#fff', padding: 10, titleFont: { size: 12, weight: '600' }, bodyFont: { size: 11 }, cornerRadius: 6 }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: { color: chartGridColor, drawBorder: false },
                  ticks: { color: chartTextColor, font: { size: 10 }, callback: v => Math.round(v) }
                },
                x: {
                  grid: { display: false, drawBorder: false },
                  ticks: { color: chartTextColor, font: { size: 10 } }
                }
              }
            }}
          />
        </div>

        {/* Chart 2: Taux d'acceptation */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <h4 className="text-xs font-bold text-gray-700 mb-3 uppercase">Taux d'acceptation</h4>
          <Doughnut
            ref={doughnutRef}
            data={acceptationData}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              plugins: {
                legend: { display: true, position: 'bottom', labels: { color: chartTextColor, usePointStyle: true, font: { size: 10 }, padding: 15 } },
                tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', titleColor: '#fff', bodyColor: '#fff', padding: 10, titleFont: { size: 12, weight: '600' }, bodyFont: { size: 11 }, cornerRadius: 6, callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed}%` } }
              }
            }}
          />
        </div>

        {/* Chart 3: Montants */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <h4 className="text-xs font-bold text-gray-700 mb-3 uppercase">Montants moyens</h4>
          <Bar
            data={montantsData}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              indexAxis: 'y',
              plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', titleColor: '#fff', bodyColor: '#fff', padding: 10, titleFont: { size: 12, weight: '600' }, bodyFont: { size: 11 }, cornerRadius: 6, callbacks: { label: (ctx) => `${fmt(ctx.parsed.x)} €` } }
              },
              scales: {
                x: {
                  beginAtZero: true,
                  grid: { color: chartGridColor, drawBorder: false },
                  ticks: { color: chartTextColor, font: { size: 10 }, callback: v => `${(v/1000).toFixed(0)}k€` }
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
    </div>
  );
}
