import React from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { ArrowTrendingUpIcon, UserGroupIcon, CreditCardIcon, ClockIcon } from '@heroicons/react/24/outline';

export default function ExecutiveDashboard({ data }) {
  if (!data) return <div className="p-6 text-center text-gray-500">Chargement des données...</div>;

  const {
    totalPatients = 0,
    totalCA = 0,
    totalRdv = 0,
    totalHeures = 0,
    totalNouveauxPatients = 0,
    avgCAParPatient = 0,
    tauxEncaissement = 0,
    caByPractitioner = [],
    rdvByPractitioner = [],
    caMensuel = [],
    practitionerStats = []
  } = data;

  // Préparer les données pour le graphique mensuel
  const monthlyChartData = caMensuel
    .reduce((acc, item) => {
      const existing = acc.find(m => m.month === item._id.mois);
      if (existing) {
        existing.ca += item.totalFacture;
        existing.patients += item.totalPatients;
      } else {
        acc.push({
          month: item._id.mois,
          ca: item.totalFacture,
          patients: item.totalPatients
        });
      }
      return acc;
    }, [])
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12);

  // Préparer les données pour les graphiques circulaires
  const caByPractitionerChart = caByPractitioner.map(p => ({
    name: p._id || 'Global',
    value: parseFloat(p.totalFacture.toFixed(2))
  }));

  const rdvByDepartmentChart = rdvByPractitioner.map(p => ({
    name: p._id || 'Global',
    value: p.totalRdv
  }));

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

  // KPIs
  const kpis = [
    {
      title: 'Total Patients',
      value: totalPatients.toLocaleString(),
      icon: UserGroupIcon,
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-500'
    },
    {
      title: 'CA Total',
      value: `${(totalCA / 1000).toFixed(1)}k€`,
      icon: CreditCardIcon,
      bgColor: 'bg-green-100',
      textColor: 'text-green-700',
      borderColor: 'border-green-500'
    },
    {
      title: 'Total RDV',
      value: totalRdv.toLocaleString(),
      icon: ClockIcon,
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-700',
      borderColor: 'border-purple-500'
    },
    {
      title: 'Heures Travaillées',
      value: totalHeures.toFixed(1),
      icon: ArrowTrendingUpIcon,
      bgColor: 'bg-amber-100',
      textColor: 'text-amber-700',
      borderColor: 'border-amber-500'
    },
    {
      title: 'Nouveaux Patients',
      value: totalNouveauxPatients.toLocaleString(),
      icon: UserGroupIcon,
      bgColor: 'bg-pink-100',
      textColor: 'text-pink-700',
      borderColor: 'border-pink-500'
    },
    {
      title: 'Taux Encaissement',
      value: `${tauxEncaissement.toFixed(1)}%`,
      icon: CreditCardIcon,
      bgColor: 'bg-cyan-100',
      textColor: 'text-cyan-700',
      borderColor: 'border-cyan-500'
    }
  ];

  return (
    <div className="w-full space-y-6 p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold">📊 Tableau Exécutif</h1>
        <p className="text-blue-100 mt-2">Analyse globale - Vue synthétique de l'ensemble des cabinets</p>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div 
              key={idx} 
              className={`bg-white rounded-lg shadow-md p-4 border-l-4 ${kpi.borderColor} hover:shadow-lg transition transform hover:scale-105`}
            >
              <div className={`${kpi.bgColor} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}>
                <Icon className={`${kpi.textColor} w-6 h-6`} />
              </div>
              <p className="text-gray-600 text-xs font-medium uppercase tracking-wide">{kpi.title}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CA Mensuel Trend */}
        <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-blue-500">
          <h3 className="text-lg font-bold text-gray-900 mb-4">💰 CA Mensuel (Tendance)</h3>
          {monthlyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  formatter={(value) => `${(value / 1000).toFixed(1)}k€`}
                  contentStyle={{ backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="ca" 
                  stroke="#3b82f6" 
                  name="CA (€)" 
                  strokeWidth={3} 
                  dot={{ r: 5, fill: '#3b82f6' }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-12">Aucune donnée disponible</p>
          )}
        </div>

        {/* Patients Mensuels */}
        <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-green-500">
          <h3 className="text-lg font-bold text-gray-900 mb-4">👥 Patients Mensuels</h3>
          {monthlyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip contentStyle={{ backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px' }} />
                <Legend />
                <Bar dataKey="patients" fill="#10b981" name="Patients" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-12">Aucune donnée disponible</p>
          )}
        </div>

        {/* CA par Cabinet */}
        <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-purple-500">
          <h3 className="text-lg font-bold text-gray-900 mb-4">🏥 CA par Cabinet</h3>
          {caByPractitionerChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={caByPractitionerChart}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${(value / 1000).toFixed(0)}k€`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {caByPractitionerChart.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${(value / 1000).toFixed(1)}k€`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-12">Aucune donnée disponible</p>
          )}
        </div>

        {/* RDV par Cabinet */}
        <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-amber-500">
          <h3 className="text-lg font-bold text-gray-900 mb-4">📅 RDV par Cabinet</h3>
          {rdvByDepartmentChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={rdvByDepartmentChart}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {rdvByDepartmentChart.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-12">Aucune donnée disponible</p>
          )}
        </div>
      </div>

      {/* Key Insights */}
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
        <h3 className="text-lg font-bold text-gray-900 mb-4">🔍 Points Clés</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-gray-600 text-sm">CA moyen par patient</p>
            <p className="text-xl font-bold text-blue-700">{avgCAParPatient.toFixed(2)}€</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-gray-600 text-sm">Taux d'encaissement</p>
            <p className="text-xl font-bold text-green-700">{tauxEncaissement.toFixed(1)}%</p>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg">
            <p className="text-gray-600 text-sm">Cabinets actifs</p>
            <p className="text-xl font-bold text-purple-700">{caByPractitioner.length}</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg">
            <p className="text-gray-600 text-sm">Production horaire</p>
            <p className="text-xl font-bold text-amber-700">{(totalCA / (totalHeures || 1)).toFixed(0)}€/h</p>
          </div>
        </div>
      </div>
    </div>
  );
}
