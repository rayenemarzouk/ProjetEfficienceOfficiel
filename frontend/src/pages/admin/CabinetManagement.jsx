import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminDashboard, getCabinetDetails } from '../../services/api';
import { FiBriefcase, FiCheckCircle, FiAlertTriangle, FiAlertCircle, FiSearch, FiEye, FiFileText, FiTrendingUp, FiX, FiUsers, FiClock, FiDollarSign, FiCalendar } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import ComportementCabinet, { calcVariation } from '../../components/ComportementCabinet';

const fmt = (v) => new Intl.NumberFormat('fr-FR').format(Math.round(v || 0));

// Options pour le filtre de mois
const getMonthOptions = () => {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const label = `${months[d.getMonth()]} ${d.getFullYear()}`;
    options.push({ value, label });
  }
  return options;
};

// Options pour le filtre d'année
const getYearOptions = () => {
  const options = [{ value: 'all', label: 'Toutes les années' }];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= currentYear - 5; y--) {
    options.push({ value: String(y), label: String(y) });
  }
  return options;
};

export default function CabinetManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const cardCls = 'bg-white border border-gray-100 shadow-sm';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [detailModal, setDetailModal] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  
  // Filtres par période
  const [selectedMonth, setSelectedMonth] = useState(getMonthOptions()[0]?.value || '');
  const [selectedYear, setSelectedYear] = useState('all');

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getAdminDashboard();
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const handleViewDetails = async (cab) => {
    setDetailLoading(true);
    setDetailModal({ cab, details: null });
    try {
      const res = await getCabinetDetails(cab.code);
      const d = res.data;
      
      // Trouver les données du mois sélectionné
      const monthData = d.realisation?.find(r => r._id === selectedMonth);
      const prevMonthValue = parseInt(selectedMonth.substring(4, 6)) - 1;
      const prevMonthYear = prevMonthValue === 0 
        ? `${parseInt(selectedMonth.substring(0, 4)) - 1}12`
        : `${selectedMonth.substring(0, 4)}${String(prevMonthValue).padStart(2, '0')}`;
      const prevMonth = d.realisation?.find(r => r._id === prevMonthYear);
      
      const rdvMonth = d.rdv?.find(r => r._id === selectedMonth);
      const prevRdvMonth = d.rdv?.find(r => r._id === prevMonthYear);
      
      const heuresMonth = d.heures?.find(r => r._id === selectedMonth);
      const prevHeuresMonth = d.heures?.find(r => r._id === prevMonthYear);
      
      const devisMonth = d.devis?.find(r => r._id === selectedMonth);

      const heuresTrav = heuresMonth ? (heuresMonth.nbHeures / 60).toFixed(0) : 0;
      const prevHeuresTrav = prevHeuresMonth ? (prevHeuresMonth.nbHeures / 60).toFixed(0) : 0;
      const caMonth = monthData?.totalFacture || 0;
      const patientsMonth = monthData?.totalPatients || 0;
      const rdvCount = rdvMonth?.nbRdv || 0;
      const nouveauxPatients = rdvMonth?.nbNouveauxPatients || 0;

      setDetailModal({
        cab,
        details: {
          evolution: d.realisation || [],
          moisSelectionne: {
            ca: caMonth,
            caVariation: calcVariation(caMonth, prevMonth?.totalFacture),
            encaisse: monthData?.totalEncaisse || 0,
            patients: patientsMonth,
            patientsVariation: calcVariation(patientsMonth, prevMonth?.totalPatients),
            rdv: rdvCount,
            rdvVariation: calcVariation(rdvCount, prevRdvMonth?.nbRdv),
            nouveauxPatients: nouveauxPatients,
            heures: heuresTrav,
            heuresVariation: calcVariation(heuresTrav, prevHeuresTrav),
            productionHoraire: heuresTrav > 0 ? (caMonth / heuresTrav).toFixed(0) : 0,
            panierMoyen: patientsMonth > 0 ? (caMonth / patientsMonth).toFixed(0) : 0,
            nbDevis: devisMonth?.nbDevis || 0,
            nbDevisAcceptes: devisMonth?.nbDevisAcceptes || 0,
            tauxAcceptation: devisMonth && devisMonth.nbDevis > 0 ? ((devisMonth.nbDevisAcceptes / devisMonth.nbDevis) * 100).toFixed(1) : 0
          },
          totalMois: d.realisation?.length || 0
        }
      });
    } catch (err) {
      console.error(err);
      setDetailModal(prev => ({ ...prev, details: 'error' }));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleViewReport = (cabCode) => {
    navigate('/admin/reports');
  };

  const practitioners = data?.practitioners || [];
  const caByP = data?.caByPractitioner || [];
  const rdvByP = data?.rdvByPractitioner || [];
  const caMensuel = data?.caMensuel || [];

  // Filtrer les données par mois sélectionné
  const getDataForMonth = (praticienCode, mois) => {
    return caMensuel.find(c => c._id?.praticien === praticienCode && c._id?.mois === mois);
  };

  const cabinets = practitioners.map((p) => {
    // Données du mois sélectionné
    const monthData = getDataForMonth(p.code, selectedMonth);
    const prevMonthValue = parseInt(selectedMonth.substring(4, 6)) - 1;
    const prevMonthYear = prevMonthValue === 0 
      ? `${parseInt(selectedMonth.substring(0, 4)) - 1}12`
      : `${selectedMonth.substring(0, 4)}${String(prevMonthValue).padStart(2, '0')}`;
    const prevData = getDataForMonth(p.code, prevMonthYear);
    
    const totalCA = monthData?.totalFacture || 0;
    const totalEncaisse = monthData?.totalEncaisse || 0;
    const patients = monthData?.totalPatients || 0;
    const score = totalCA > 0 ? Math.round((totalEncaisse / totalCA) * 100) : 0;

    // Tendance basée sur variation vs mois précédent
    let tendance = 'Stable';
    let tendanceValue = null;
    if (prevData?.totalFacture) {
      const diff = ((totalCA - prevData.totalFacture) / prevData.totalFacture) * 100;
      tendance = diff > 5 ? 'Hausse' : diff < -5 ? 'Baisse' : 'Stable';
      tendanceValue = diff.toFixed(1);
    }

    let status = 'performant';
    if (score < 30) status = 'verifier';
    else if (score < 40) status = 'surveiller';

    return {
      code: p.code, name: p.name, email: p.email,
      ca: totalCA, encaisse: totalEncaisse, score,
      patients, status, tendance, tendanceValue
    };
  });

  const performants = cabinets.filter(c => c.status === 'performant').length;
  const surveiller = cabinets.filter(c => c.status === 'surveiller').length;
  const verifier = cabinets.filter(c => c.status === 'verifier').length;

  const filtered = cabinets.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  // Formater le mois sélectionné pour affichage
  const formatSelectedMonth = () => {
    const opt = getMonthOptions().find(o => o.value === selectedMonth);
    return opt?.label || selectedMonth;
  };

  return (
    <div className="space-y-6">
      {/* Header avec filtres */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des cabinets</h1>
          <p className="text-gray-500">Suivi et analyse des performances</p>
        </div>

        {/* Filtres période */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg shadow-sm">
            <FiCalendar className="w-5 h-5 text-gray-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-sm text-gray-700 bg-transparent border-none focus:ring-0 cursor-pointer"
            >
              {getMonthOptions().map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg shadow-sm">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="text-sm text-gray-700 bg-transparent border-none focus:ring-0 cursor-pointer"
            >
              {getYearOptions().map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`${cardCls} rounded-xl p-5 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-lg"><FiBriefcase className="w-5 h-5 text-blue-600" /></div>
            <span className="text-sm text-gray-600">Cabinets suivis</span>
          </div>
          <span className="text-2xl font-black text-blue-600">{practitioners.length}</span>
        </div>
        <div className={`${cardCls} rounded-xl p-5 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-50 rounded-lg"><FiCheckCircle className="w-5 h-5 text-green-600" /></div>
            <span className="text-sm text-gray-600">Performants</span>
          </div>
          <span className="text-2xl font-black text-green-600">{performants}</span>
        </div>
        <div className={`${cardCls} rounded-xl p-5 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 rounded-lg"><FiAlertTriangle className="w-5 h-5 text-amber-600" /></div>
            <span className="text-sm text-gray-600">À surveiller</span>
          </div>
          <span className="text-2xl font-black text-amber-600">{surveiller}</span>
        </div>
        <div className={`${cardCls} rounded-xl p-5 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-50 rounded-lg"><FiAlertCircle className="w-5 h-5 text-red-600" /></div>
            <span className="text-sm text-gray-600">À vérifier</span>
          </div>
          <span className="text-2xl font-black text-red-600">{verifier}</span>
        </div>
      </div>

      {/* Search */}
      <div className={`${cardCls} rounded-xl p-4 flex items-center gap-3`}>
        <div className="flex-1 relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un cabinet..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
          Filtrer
        </button>
      </div>

      {/* Cabinet Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filtered.map((cab, i) => (
          <div key={i} className={`${cardCls} rounded-xl p-6 hover:shadow-md transition-all`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{cab.code}</h3>
                <p className="text-xs text-gray-400">{cab.email || `${cab.code.toLowerCase()}@cabinet.fr`}</p>
              </div>
              <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{cab.score}%</span>
            </div>

            {/* CA & Encaissé */}
            <div className="border border-gray-100 rounded-lg p-3 mb-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase">CA {formatSelectedMonth()}</p>
                  <p className="text-base font-bold text-gray-900">{fmt(cab.ca)} € <span className="text-xs text-gray-400 font-normal">(Encaissé: {fmt(cab.encaisse)})</span></p>
                </div>
                <div className={`flex items-center gap-1 text-xs font-semibold ${cab.tendance === 'Hausse' ? 'text-green-500' : cab.tendance === 'Baisse' ? 'text-red-500' : 'text-gray-400'}`}>
                  <FiTrendingUp className="w-3 h-3" /> {cab.tendance}
                  {cab.tendanceValue && <span className="text-[10px]">({cab.tendanceValue}%)</span>}
                </div>
              </div>
            </div>

            {/* Statut Rapport */}
            <div className="border border-gray-100 rounded-lg p-3 mb-4 flex justify-between items-center">
              <p className="text-xs text-gray-500">Statut Rapport</p>
              <div className="w-8 h-1 bg-green-400 rounded-full"></div>
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => handleViewDetails(cab)} className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors">
                <FiEye className="w-4 h-4" /> Voir détails
              </button>
              <button onClick={() => handleViewReport(cab.code)} className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-purple-500 text-white text-sm font-semibold hover:bg-purple-600 transition-colors">
                <FiFileText className="w-4 h-4" /> Rapport
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Vue d'ensemble table */}
      <div className={`${cardCls} rounded-xl overflow-hidden`}>
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Vue d'ensemble — {formatSelectedMonth()}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Cabinet</th>
                <th className="px-5 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Score</th>
                <th className="px-5 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">CA</th>
                <th className="px-5 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Encaissé</th>
                <th className="px-5 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tendance</th>
                <th className="px-5 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Rapport</th>
                <th className="px-5 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-5 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((cab, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div>
                      <span className="text-sm font-semibold text-gray-900">{cab.code}</span>
                      <p className="text-[10px] text-gray-400">{cab.email || `${cab.code.toLowerCase()}@cabinet.fr`}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">{cab.score}%</span>
                  </td>
                  <td className="px-5 py-3 text-center text-sm text-gray-700">{fmt(cab.ca)} €</td>
                  <td className="px-5 py-3 text-center text-sm text-gray-700">{fmt(cab.encaisse)} €</td>
                  <td className={`px-5 py-3 text-center text-sm font-semibold ${cab.tendance === 'Hausse' ? 'text-green-500' : cab.tendance === 'Baisse' ? 'text-red-500' : 'text-gray-400'}`}>
                    {cab.tendance}
                    {cab.tendanceValue && <span className="text-[10px] ml-1">({cab.tendanceValue}%)</span>}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <div className="w-8 h-1 bg-green-400 rounded-full mx-auto"></div>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                      cab.status === 'performant' ? 'bg-green-50 text-green-600' :
                      cab.status === 'surveiller' ? 'bg-amber-50 text-amber-600' :
                      'bg-red-50 text-red-600'
                    }`}>
                      {cab.status === 'performant' ? '✅ OK' : cab.status === 'surveiller' ? '⚠️ À surveiller' : '❌ À vérifier'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleViewDetails(cab)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-600" title="Voir détails"><FiEye className="w-4 h-4" /></button>
                      <button onClick={() => handleViewReport(cab.code)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-purple-600" title="Voir rapport"><FiFileText className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {detailModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDetailModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-blue-500 rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold text-white">{detailModal.cab.name}</h2>
                <p className="text-blue-100 text-sm">Cabinet {detailModal.cab.code} — {formatSelectedMonth()}</p>
              </div>
              <button onClick={() => setDetailModal(null)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <FiX className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="p-6">
              {detailLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                </div>
              ) : detailModal.details === 'error' ? (
                <div className="text-center py-12 text-red-500">
                  <FiAlertCircle className="w-10 h-10 mx-auto mb-2" />
                  <p>Erreur lors du chargement des détails.</p>
                </div>
              ) : detailModal.details ? (
                <>
                  {/* Score global */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-sm text-gray-500">Score de performance</p>
                      <p className="text-3xl font-black text-blue-600">{detailModal.cab.score}%</p>
                    </div>
                    <span className={`text-sm font-bold px-4 py-2 rounded-full ${
                      detailModal.cab.status === 'performant' ? 'bg-green-50 text-green-600' :
                      detailModal.cab.status === 'surveiller' ? 'bg-amber-50 text-amber-600' :
                      'bg-red-50 text-red-600'
                    }`}>
                      {detailModal.cab.status === 'performant' ? '✅ Performant' : detailModal.cab.status === 'surveiller' ? '⚠️ À surveiller' : '❌ À vérifier'}
                    </span>
                  </div>

                  {/* Comportement du Cabinet - Design identique au PDF */}
                  <ComportementCabinet
                    cabinetName={detailModal.cab.code}
                    subtitle={formatSelectedMonth()}
                    ca={detailModal.details.moisSelectionne.ca}
                    caVariation={detailModal.details.moisSelectionne.caVariation}
                    patients={detailModal.details.moisSelectionne.patients}
                    patientsVariation={detailModal.details.moisSelectionne.patientsVariation}
                    rdv={detailModal.details.moisSelectionne.rdv}
                    rdvVariation={detailModal.details.moisSelectionne.rdvVariation}
                    heures={detailModal.details.moisSelectionne.heures}
                    heuresVariation={detailModal.details.moisSelectionne.heuresVariation}
                  />

                  {/* Detail Table */}
                  <div className="bg-gray-50 rounded-xl overflow-hidden mt-6 mb-6">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase">Indicateur</th>
                          <th className="px-4 py-2.5 text-right text-[10px] font-bold text-gray-500 uppercase">Valeur</th>
                          <th className="px-4 py-2.5 text-center text-[10px] font-bold text-gray-500 uppercase">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        <tr>
                          <td className="px-4 py-2.5 text-sm text-gray-700">Chiffre d'affaires</td>
                          <td className="px-4 py-2.5 text-sm text-right font-semibold">{fmt(detailModal.details.moisSelectionne.ca)} €</td>
                          <td className="px-4 py-2.5 text-center">{detailModal.details.moisSelectionne.ca >= 25000 ? '✅' : '⚠️'}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 text-sm text-gray-700">Montant encaissé</td>
                          <td className="px-4 py-2.5 text-sm text-right font-semibold">{fmt(detailModal.details.moisSelectionne.encaisse)} €</td>
                          <td className="px-4 py-2.5 text-center">{detailModal.details.moisSelectionne.encaisse >= 20000 ? '✅' : '⚠️'}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 text-sm text-gray-700">Production horaire</td>
                          <td className="px-4 py-2.5 text-sm text-right font-semibold">{detailModal.details.moisSelectionne.productionHoraire} €/h</td>
                          <td className="px-4 py-2.5 text-center">{detailModal.details.moisSelectionne.productionHoraire >= 300 ? '✅' : detailModal.details.moisSelectionne.productionHoraire >= 180 ? '⚠️' : '❌'}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 text-sm text-gray-700">Panier moyen</td>
                          <td className="px-4 py-2.5 text-sm text-right font-semibold">{detailModal.details.moisSelectionne.panierMoyen} €</td>
                          <td className="px-4 py-2.5 text-center">{detailModal.details.moisSelectionne.panierMoyen >= 400 ? '✅' : '⚠️'}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 text-sm text-gray-700">Heures travaillées</td>
                          <td className="px-4 py-2.5 text-sm text-right font-semibold">{detailModal.details.moisSelectionne.heures} h</td>
                          <td className="px-4 py-2.5 text-center">ℹ️</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 text-sm text-gray-700">Taux acceptation devis</td>
                          <td className="px-4 py-2.5 text-sm text-right font-semibold">{detailModal.details.moisSelectionne.tauxAcceptation}%</td>
                          <td className="px-4 py-2.5 text-center">{detailModal.details.moisSelectionne.tauxAcceptation >= 60 ? '✅' : '⚠️'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Evolution CA */}
                  {detailModal.details.evolution.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-gray-700 mb-3">📈 Évolution du CA ({detailModal.details.totalMois} mois)</h4>
                      <div className="space-y-2">
                        {detailModal.details.evolution.slice(-6).map((m, i) => {
                          const maxCA = Math.max(...detailModal.details.evolution.map(e => e.totalFacture || 0), 1);
                          const pct = Math.round(((m.totalFacture || 0) / maxCA) * 100);
                          const moisLabel = m._id ? `${m._id.substring(4,6)}/${m._id.substring(0,4)}` : '';
                          const isSelected = m._id === selectedMonth;
                          return (
                            <div key={i} className={`flex items-center gap-3 ${isSelected ? 'bg-blue-50 -mx-2 px-2 py-1 rounded-lg' : ''}`}>
                              <span className={`text-xs w-14 ${isSelected ? 'font-bold text-blue-600' : 'text-gray-500'}`}>{moisLabel}</span>
                              <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full flex items-center justify-end pr-2 ${isSelected ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gradient-to-r from-gray-400 to-gray-500'}`} 
                                  style={{ width: `${Math.max(pct, 5)}%` }}
                                >
                                  <span className="text-[10px] text-white font-bold">{fmt(m.totalFacture)} €</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
                    <button onClick={() => { setDetailModal(null); navigate('/admin/reports'); }} className="flex-1 py-2.5 bg-purple-500 text-white rounded-lg text-sm font-semibold hover:bg-purple-600 transition-colors flex items-center justify-center gap-2">
                      <FiFileText className="w-4 h-4" /> Voir les rapports
                    </button>
                    <button onClick={() => { setDetailModal(null); navigate('/admin/cabinets'); }} className="flex-1 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2">
                      <FiTrendingUp className="w-4 h-4" /> Analyse détaillée
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
