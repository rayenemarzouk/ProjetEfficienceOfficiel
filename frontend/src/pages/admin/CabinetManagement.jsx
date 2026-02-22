import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import { getAdminDashboard, getCabinetDetails } from '../../services/api';
import { FiBriefcase, FiCheckCircle, FiAlertTriangle, FiAlertCircle, FiSearch, FiEye, FiFileText, FiTrendingUp, FiX, FiUsers, FiClock, FiDollarSign } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

const fmt = (v) => new Intl.NumberFormat('fr-FR').format(Math.round(v || 0));

export default function CabinetManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isRayan = user?.email === 'maarzoukrayan3@gmail.com';
  const cardCls = isRayan ? 'bg-white border border-gray-200 shadow-sm' : 'bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-gray-700';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [detailModal, setDetailModal] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

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
      <div className="flex items-center justify-center h-screen bg-[#f8fafc] dark:bg-[#0f172a]">
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
      // Calculate summary from detailed data
      const lastMonth = d.realisation?.length > 0 ? d.realisation[d.realisation.length - 1] : null;
      const lastRdv = d.rdv?.length > 0 ? d.rdv[d.rdv.length - 1] : null;
      const lastHeures = d.heures?.length > 0 ? d.heures[d.heures.length - 1] : null;
      const lastDevis = d.devis?.length > 0 ? d.devis[d.devis.length - 1] : null;

      const heuresTrav = lastHeures ? (lastHeures.nbHeures / 60).toFixed(1) : 0;
      const caLastMonth = lastMonth?.totalFacture || 0;
      const patientsLastMonth = lastMonth?.totalPatients || 0;

      setDetailModal({
        cab,
        details: {
          evolution: d.realisation || [],
          dernierMois: {
            ca: caLastMonth,
            encaisse: lastMonth?.totalEncaisse || 0,
            patients: patientsLastMonth,
            rdv: lastRdv?.nbRdv || 0,
            nouveauxPatients: lastRdv?.nbNouveauxPatients || 0,
            heures: heuresTrav,
            productionHoraire: heuresTrav > 0 ? (caLastMonth / heuresTrav).toFixed(0) : 0,
            panierMoyen: patientsLastMonth > 0 ? (caLastMonth / patientsLastMonth).toFixed(0) : 0,
            nbDevis: lastDevis?.nbDevis || 0,
            nbDevisAcceptes: lastDevis?.nbDevisAcceptes || 0,
            tauxAcceptation: lastDevis && lastDevis.nbDevis > 0 ? ((lastDevis.nbDevisAcceptes / lastDevis.nbDevis) * 100).toFixed(1) : 0
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

  const cabinets = practitioners.map((p) => {
    const ca = caByP.find(c => c._id === p.code);
    const rdv = rdvByP.find(r => r._id === p.code);
    const totalCA = ca?.totalFacture || 0;
    const totalEncaisse = ca?.totalEncaisse || 0;
    const score = totalCA > 0 ? Math.round((totalEncaisse / totalCA) * 100) : 0;
    const patients = ca?.totalPatients || 0;
    const totalRdv = rdv?.totalRdv || 0;

    // Compute real trend from last 2 months of CA for this practitioner
    const moisForP = caMensuel.filter(c => c._id?.praticien === p.code).sort((a, b) => (a._id?.mois || '').localeCompare(b._id?.mois || ''));
    let tendance = 'Stable';
    if (moisForP.length >= 2) {
      const last = moisForP[moisForP.length - 1]?.totalFacture || 0;
      const prev = moisForP[moisForP.length - 2]?.totalFacture || 0;
      if (prev > 0) {
        const diff = ((last - prev) / prev) * 100;
        tendance = diff > 5 ? 'Hausse' : diff < -5 ? 'Baisse' : 'Stable';
      }
    }

    let status = 'performant';
    if (score < 30) status = 'verifier';
    else if (score < 40) status = 'surveiller';

    return {
      code: p.code, name: p.name, email: p.email,
      ca: totalCA, encaisse: totalEncaisse, score,
      patients, rdv: totalRdv, status, tendance,
    };
  });

  const performants = cabinets.filter(c => c.status === 'performant').length;
  const surveiller = cabinets.filter(c => c.status === 'surveiller').length;
  const verifier = cabinets.filter(c => c.status === 'verifier').length;

  const filtered = cabinets.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <Header title="Gestion des cabinets" subtitle="Suivi et analyse des performances" />

      <div className="p-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className={`${cardCls} rounded-xl p-5 flex items-center justify-between transition-colors`}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg"><FiBriefcase className="w-5 h-5 text-blue-600" /></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Cabinets suivis</span>
            </div>
            <span className="text-2xl font-black text-blue-600">{practitioners.length}</span>
          </div>
          <div className={`${cardCls} rounded-xl p-5 flex items-center justify-between transition-colors`}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-50 dark:bg-green-900/30 rounded-lg"><FiCheckCircle className="w-5 h-5 text-green-600" /></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Performants</span>
            </div>
            <span className="text-2xl font-black text-green-600">{performants}</span>
          </div>
          <div className={`${cardCls} rounded-xl p-5 flex items-center justify-between transition-colors`}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 rounded-lg"><FiAlertTriangle className="w-5 h-5 text-amber-600" /></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">À surveiller</span>
            </div>
            <span className="text-2xl font-black text-amber-600">{surveiller}</span>
          </div>
          <div className={`${cardCls} rounded-xl p-5 flex items-center justify-between transition-colors`}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-50 dark:bg-red-900/30 rounded-lg"><FiAlertCircle className="w-5 h-5 text-red-600" /></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">À vérifier</span>
            </div>
            <span className="text-2xl font-black text-red-600">{verifier}</span>
          </div>
        </div>

        {/* Search */}
        <div className={`${cardCls} rounded-xl p-4 mb-6 flex items-center gap-3 transition-colors`}>
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un cabinet..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-[#1e293b] dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
            Filtrer
          </button>
        </div>

        {/* Cabinet Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          {filtered.map((cab, i) => (
            <div key={i} className={`${cardCls} rounded-xl p-6 hover:shadow-md transition-colors`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{cab.code}</h3>
                  <p className="text-xs text-gray-400">{cab.email || `${cab.code.toLowerCase()}@cabinet.fr`}</p>
                </div>
                <span className="text-xs font-bold text-gray-400 bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded-full">{cab.score}%</span>
              </div>

              {/* CA & Encaissé */}
              <div className="border border-gray-100 dark:border-gray-700 rounded-lg p-3 mb-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase">Chiffre d'affaires</p>
                    <p className="text-base font-bold text-gray-900 dark:text-white">{fmt(cab.ca)} <span className="text-xs text-gray-400 font-normal">(Encaissé: {fmt(cab.encaisse)})</span></p>
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-semibold ${cab.tendance === 'Hausse' ? 'text-green-500' : cab.tendance === 'Baisse' ? 'text-red-500' : 'text-gray-400'}`}>
                    <FiTrendingUp className="w-3 h-3" /> {cab.tendance}
                  </div>
                </div>
              </div>

              {/* Statut Rapport */}
              <div className="border border-gray-100 dark:border-gray-700 rounded-lg p-3 mb-4 flex justify-between items-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Statut Rapport</p>
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
        <div className={`${cardCls} rounded-xl overflow-hidden transition-colors`}>
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Vue d'ensemble</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cabinet</th>
                  <th className="px-5 py-3 text-center text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Score</th>
                  <th className="px-5 py-3 text-center text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">CA</th>
                  <th className="px-5 py-3 text-center text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Encaissé</th>
                  <th className="px-5 py-3 text-center text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tendance</th>
                  <th className="px-5 py-3 text-center text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rapport</th>
                  <th className="px-5 py-3 text-center text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Statut</th>
                  <th className="px-5 py-3 text-center text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map((cab, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-5 py-3">
                      <div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{cab.code}</span>
                        <p className="text-[10px] text-gray-400">{cab.email || `${cab.code.toLowerCase()}@cabinet.fr`}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">{cab.score}%</span>
                    </td>
                    <td className="px-5 py-3 text-center text-sm text-gray-700 dark:text-gray-300">{fmt(cab.ca)}</td>
                    <td className="px-5 py-3 text-center text-sm text-gray-700 dark:text-gray-300">{fmt(cab.encaisse)}</td>
                    <td className={`px-5 py-3 text-center text-sm font-semibold ${cab.tendance === 'Hausse' ? 'text-green-500' : cab.tendance === 'Baisse' ? 'text-red-500' : 'text-gray-400'}`}>{cab.tendance}</td>
                    <td className="px-5 py-3 text-center">
                      <div className="w-8 h-1 bg-green-400 rounded-full mx-auto"></div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                        cab.status === 'performant' ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                        cab.status === 'surveiller' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                        'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      }`}>
                        {cab.status === 'performant' ? '✅ OK' : cab.status === 'surveiller' ? '⚠️ À surveiller' : '❌ À vérifier'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleViewDetails(cab)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-blue-600" title="Voir détails"><FiEye className="w-4 h-4" /></button>
                        <button onClick={() => handleViewReport(cab.code)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-purple-600" title="Voir rapport"><FiFileText className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {detailModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDetailModal(null)}>
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl transition-colors" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-blue-600 to-blue-500 rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold text-white">{detailModal.cab.name}</h2>
                <p className="text-blue-100 text-sm">Cabinet {detailModal.cab.code}</p>
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
                      <p className="text-sm text-gray-500 dark:text-gray-400">Score de performance</p>
                      <p className="text-3xl font-black text-blue-600">{detailModal.cab.score}%</p>
                    </div>
                    <span className={`text-sm font-bold px-4 py-2 rounded-full ${
                      detailModal.cab.status === 'performant' ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                      detailModal.cab.status === 'surveiller' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                      'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    }`}>
                      {detailModal.cab.status === 'performant' ? '✅ Performant' : detailModal.cab.status === 'surveiller' ? '⚠️ À surveiller' : '❌ À vérifier'}
                    </span>
                  </div>

                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 text-center">
                      <FiDollarSign className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{fmt(detailModal.details.dernierMois.ca)} €</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">CA Dernier Mois</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4 text-center">
                      <FiUsers className="w-5 h-5 text-green-600 mx-auto mb-1" />
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{detailModal.details.dernierMois.patients}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Patients</p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-4 text-center">
                      <FiClock className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{detailModal.details.dernierMois.rdv}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Rendez-vous</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-4 text-center">
                      <FiTrendingUp className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{detailModal.details.dernierMois.nouveauxPatients}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Nouveaux patients</p>
                    </div>
                  </div>

                  {/* Detail Table */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden mb-6">
                    <table className="w-full">
                      <thead className="bg-gray-100 dark:bg-gray-800">
                        <tr>
                          <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Indicateur</th>
                          <th className="px-4 py-2.5 text-right text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Valeur</th>
                          <th className="px-4 py-2.5 text-center text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-[#1e293b]">
                        <tr>
                          <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">Chiffre d'affaires</td>
                          <td className="px-4 py-2.5 text-sm text-right font-semibold">{fmt(detailModal.details.dernierMois.ca)} €</td>
                          <td className="px-4 py-2.5 text-center">{detailModal.details.dernierMois.ca >= 25000 ? '✅' : '⚠️'}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">Montant encaissé</td>
                          <td className="px-4 py-2.5 text-sm text-right font-semibold">{fmt(detailModal.details.dernierMois.encaisse)} €</td>
                          <td className="px-4 py-2.5 text-center">{detailModal.details.dernierMois.encaisse >= 20000 ? '✅' : '⚠️'}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">Production horaire</td>
                          <td className="px-4 py-2.5 text-sm text-right font-semibold">{detailModal.details.dernierMois.productionHoraire} €/h</td>
                          <td className="px-4 py-2.5 text-center">{detailModal.details.dernierMois.productionHoraire >= 300 ? '✅' : detailModal.details.dernierMois.productionHoraire >= 180 ? '⚠️' : '❌'}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">Panier moyen</td>
                          <td className="px-4 py-2.5 text-sm text-right font-semibold">{detailModal.details.dernierMois.panierMoyen} €</td>
                          <td className="px-4 py-2.5 text-center">{detailModal.details.dernierMois.panierMoyen >= 400 ? '✅' : '⚠️'}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">Heures travaillées</td>
                          <td className="px-4 py-2.5 text-sm text-right font-semibold">{detailModal.details.dernierMois.heures} h</td>
                          <td className="px-4 py-2.5 text-center">ℹ️</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">Taux acceptation devis</td>
                          <td className="px-4 py-2.5 text-sm text-right font-semibold">{detailModal.details.dernierMois.tauxAcceptation}%</td>
                          <td className="px-4 py-2.5 text-center">{detailModal.details.dernierMois.tauxAcceptation >= 60 ? '✅' : '⚠️'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Evolution CA */}
                  {detailModal.details.evolution.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">📈 Évolution du CA ({detailModal.details.totalMois} mois)</h4>
                      <div className="space-y-2">
                        {detailModal.details.evolution.slice(-6).map((m, i) => {
                          const maxCA = Math.max(...detailModal.details.evolution.map(e => e.totalFacture || 0), 1);
                          const pct = Math.round(((m.totalFacture || 0) / maxCA) * 100);
                          const moisLabel = m._id ? `${m._id.substring(4,6)}/${m._id.substring(0,4)}` : '';
                          return (
                            <div key={i} className="flex items-center gap-3">
                              <span className="text-xs text-gray-500 dark:text-gray-400 w-14">{moisLabel}</span>
                              <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-5 overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-end pr-2" style={{ width: `${Math.max(pct, 5)}%` }}>
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
                  <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
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
