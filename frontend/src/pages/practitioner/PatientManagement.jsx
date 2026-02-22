import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { getPatients, addPatient, updatePatient, deletePatient } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  FiUsers, FiUserPlus, FiEdit3, FiTrash2, FiSearch, FiCheck, FiAlertCircle,
  FiLoader, FiPhone, FiMail, FiCalendar, FiX, FiFileText, FiFilter,
  FiChevronDown, FiActivity, FiUser
} from 'react-icons/fi';

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmt = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v || 0);

const statutColors = {
  actif: { bg: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', border: 'border-green-200 dark:border-green-800', dot: 'bg-green-500' },
  nouveau: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', dot: 'bg-blue-500' },
  inactif: { bg: 'bg-gray-50 dark:bg-gray-800', text: 'text-gray-500 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700', dot: 'bg-gray-400' },
};

const emptyForm = {
  nom: '', prenom: '', dateNaissance: '', telephone: '', email: '', notes: '', statut: 'nouveau',
  dernierRdv: '', prochainRdv: '', montantTotal: '', nbVisites: ''
};

export default function PatientManagement() {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [stats, setStats] = useState({ total: 0, actifs: 0, nouveaux: 0, inactifs: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (filterStatut) params.statut = filterStatut;
      if (sortBy) params.sort = sortBy;
      const res = await getPatients(params);
      setPatients(res.data.patients || []);
      setStats(res.data.stats || { total: 0, actifs: 0, nouveaux: 0, inactifs: 0 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [filterStatut, sortBy]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => fetchPatients(), 400);
    return () => clearTimeout(t);
  }, [search]);

  const openAddForm = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowForm(true);
    setMessage(null);
  };

  const openEditForm = (p) => {
    setEditingId(p._id);
    setForm({
      nom: p.nom || '',
      prenom: p.prenom || '',
      dateNaissance: p.dateNaissance ? p.dateNaissance.substring(0, 10) : '',
      telephone: p.telephone || '',
      email: p.email || '',
      notes: p.notes || '',
      statut: p.statut || 'nouveau',
      dernierRdv: p.dernierRdv ? p.dernierRdv.substring(0, 10) : '',
      prochainRdv: p.prochainRdv ? p.prochainRdv.substring(0, 10) : '',
      montantTotal: p.montantTotal || '',
      nbVisites: p.nbVisites || ''
    });
    setShowForm(true);
    setMessage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nom.trim() || !form.prenom.trim()) {
      setMessage({ type: 'error', text: 'Nom et prénom sont requis.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      if (editingId) {
        await updatePatient(editingId, form);
        setMessage({ type: 'success', text: 'Patient mis à jour avec succès.' });
      } else {
        await addPatient(form);
        setMessage({ type: 'success', text: 'Patient ajouté avec succès !' });
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ ...emptyForm });
      fetchPatients();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur lors de l\'enregistrement.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deletePatient(id);
      setConfirmDelete(null);
      setMessage({ type: 'success', text: 'Patient supprimé.' });
      fetchPatients();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur lors de la suppression.' });
    }
  };

  const statCards = [
    { label: 'Total patients', value: stats.total, icon: FiUsers, color: 'primary' },
    { label: 'Actifs', value: stats.actifs, icon: FiActivity, color: 'green' },
    { label: 'Nouveaux', value: stats.nouveaux, icon: FiUserPlus, color: 'blue' },
    { label: 'Inactifs', value: stats.inactifs, icon: FiUser, color: 'gray' },
  ];

  const colorMap = {
    primary: 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
    green: 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    gray: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
  };

  return (
    <div>
      <Header title="Mes Patients" subtitle={`Cabinet ${user?.cabinetName || user?.name || ''} — Gestion de votre patientèle`} />

      <div className="p-8">
        {/* Message global */}
        {message && !showForm && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-2 text-sm max-w-5xl mx-auto ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
          }`}>
            {message.type === 'success' ? <FiCheck className="flex-shrink-0" /> : <FiAlertCircle className="flex-shrink-0" />}
            {message.text}
            <button onClick={() => setMessage(null)} className="ml-auto"><FiX className="w-4 h-4" /></button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 max-w-5xl mx-auto">
          {statCards.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-gray-700 p-5 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2.5 rounded-xl ${colorMap[s.color]}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{s.value}</p>
                <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-1">{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="max-w-5xl mx-auto mb-6 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un patient..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Filtre statut */}
          <div className="relative">
            <select
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
              className="appearance-none pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 cursor-pointer"
            >
              <option value="">Tous les statuts</option>
              <option value="actif">Actifs</option>
              <option value="nouveau">Nouveaux</option>
              <option value="inactif">Inactifs</option>
            </select>
            <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            <FiChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          </div>

          {/* Tri */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 cursor-pointer"
            >
              <option value="">Plus récents</option>
              <option value="nom">Par nom</option>
              <option value="dernier-rdv">Dernier RDV</option>
              <option value="visites">Nb visites</option>
            </select>
            <FiChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          </div>

          {/* Add button */}
          <button
            onClick={openAddForm}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-blue-600 text-white text-sm font-bold hover:from-primary-700 hover:to-blue-700 transition-all shadow-lg shadow-primary-500/20"
          >
            <FiUserPlus className="w-4 h-4" />
            Ajouter un patient
          </button>
        </div>

        {/* Modal Form */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setShowForm(false); setEditingId(null); }}>
            <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary-50 dark:bg-primary-900/30">
                    {editingId ? <FiEdit3 className="w-5 h-5 text-primary-600" /> : <FiUserPlus className="w-5 h-5 text-primary-600" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold dark:text-white">{editingId ? 'Modifier le patient' : 'Nouveau patient'}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Remplissez les informations du patient</p>
                  </div>
                </div>
                <button onClick={() => { setShowForm(false); setEditingId(null); }} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <FiX className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {message && showForm && (
                  <div className={`p-3 rounded-xl flex items-center gap-2 text-sm ${
                    message.type === 'success'
                      ? 'bg-green-50 dark:bg-green-900/30 text-green-700 border border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/30 text-red-700 border border-red-200 dark:border-red-800'
                  }`}>
                    {message.type === 'success' ? <FiCheck className="flex-shrink-0" /> : <FiAlertCircle className="flex-shrink-0" />}
                    {message.text}
                  </div>
                )}

                {/* Nom + Prénom */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Nom *</label>
                    <input
                      type="text"
                      value={form.nom}
                      onChange={(e) => setForm({ ...form, nom: e.target.value })}
                      placeholder="DUPONT"
                      required
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm uppercase focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Prénom *</label>
                    <input
                      type="text"
                      value={form.prenom}
                      onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                      placeholder="Jean"
                      required
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Date de naissance */}
                <div>
                  <label className="flex text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 items-center gap-1.5">
                    <FiCalendar className="w-3.5 h-3.5 text-gray-400" /> Date de naissance
                  </label>
                  <input
                    type="date"
                    value={form.dateNaissance}
                    onChange={(e) => setForm({ ...form, dateNaissance: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Tel + Email */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="flex text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 items-center gap-1.5">
                      <FiPhone className="w-3.5 h-3.5 text-gray-400" /> Téléphone
                    </label>
                    <input
                      type="tel"
                      value={form.telephone}
                      onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                      placeholder="06 12 34 56 78"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="flex text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 items-center gap-1.5">
                      <FiMail className="w-3.5 h-3.5 text-gray-400" /> Email
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="patient@email.fr"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Statut */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Statut</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['nouveau', 'actif', 'inactif'].map(s => {
                      const c = statutColors[s];
                      return (
                        <button
                          type="button"
                          key={s}
                          onClick={() => setForm({ ...form, statut: s })}
                          className={`py-2 px-3 rounded-xl text-xs font-bold capitalize transition-all border-2 ${
                            form.statut === s
                              ? `${c.bg} ${c.text} ${c.border}`
                              : 'bg-gray-50 dark:bg-gray-800 text-gray-400 border-transparent hover:border-gray-200 dark:hover:border-gray-600'
                          }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Dernier RDV + Prochain RDV (edit mode) */}
                {editingId && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Dernier RDV</label>
                      <input
                        type="date"
                        value={form.dernierRdv}
                        onChange={(e) => setForm({ ...form, dernierRdv: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Prochain RDV</label>
                      <input
                        type="date"
                        value={form.prochainRdv}
                        onChange={(e) => setForm({ ...form, prochainRdv: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}

                {/* Montant + Visites (edit mode) */}
                {editingId && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Montant total (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.montantTotal}
                        onChange={(e) => setForm({ ...form, montantTotal: e.target.value })}
                        placeholder="0"
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Nb visites</label>
                      <input
                        type="number"
                        min="0"
                        value={form.nbVisites}
                        onChange={(e) => setForm({ ...form, nbVisites: e.target.value })}
                        placeholder="0"
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="flex text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 items-center gap-1.5">
                    <FiFileText className="w-3.5 h-3.5 text-gray-400" /> Notes
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Remarques, traitements en cours..."
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-blue-600 text-white font-bold text-sm hover:from-primary-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/20"
                >
                  {saving ? (
                    <><FiLoader className="w-4 h-4 animate-spin" /> Enregistrement...</>
                  ) : editingId ? (
                    <><FiCheck className="w-4 h-4" /> Mettre à jour</>
                  ) : (
                    <><FiUserPlus className="w-4 h-4" /> Ajouter le patient</>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Confirm Delete Modal */}
        {confirmDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
            <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                  <FiTrash2 className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Supprimer ce patient ?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  <strong>{confirmDelete.nom} {confirmDelete.prenom}</strong> sera définitivement supprimé.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => handleDelete(confirmDelete._id)}
                    className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Patient List */}
        <div className="max-w-5xl mx-auto">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : patients.length === 0 ? (
            <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-gray-700 p-16 text-center transition-colors">
              <FiUsers className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {search || filterStatut ? 'Aucun patient trouvé' : 'Aucun patient enregistré'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                {search || filterStatut
                  ? 'Essayez de modifier vos filtres de recherche.'
                  : 'Commencez par ajouter votre premier patient.'}
              </p>
              {!search && !filterStatut && (
                <button onClick={openAddForm} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-bold hover:bg-primary-700 transition-colors">
                  <FiUserPlus className="w-4 h-4" />
                  Ajouter un patient
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {patients.map((p) => {
                const sc = statutColors[p.statut] || statutColors.nouveau;
                return (
                  <div key={p._id} className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all duration-300 group">
                    <div className="p-5">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                            {p.prenom?.charAt(0)}{p.nom?.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{p.nom} {p.prenom}</h4>
                            {p.dateNaissance && (
                              <p className="text-[10px] text-gray-400 dark:text-gray-500">Né(e) le {formatDate(p.dateNaissance)}</p>
                            )}
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${sc.bg} ${sc.text} border ${sc.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}></span>
                          {p.statut}
                        </span>
                      </div>

                      {/* Contact */}
                      <div className="space-y-1.5 mb-3">
                        {p.telephone && (
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <FiPhone className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{p.telephone}</span>
                          </div>
                        )}
                        {p.email && (
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <FiMail className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{p.email}</span>
                          </div>
                        )}
                      </div>

                      {/* Stats row */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                          <p className="text-[9px] text-gray-500 dark:text-gray-400 uppercase font-semibold">Visites</p>
                          <p className="text-sm font-black text-gray-900 dark:text-white">{p.nbVisites || 0}</p>
                        </div>
                        <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                          <p className="text-[9px] text-gray-500 dark:text-gray-400 uppercase font-semibold">CA Total</p>
                          <p className="text-sm font-black text-gray-900 dark:text-white">{p.montantTotal ? fmt(p.montantTotal) : '—'}</p>
                        </div>
                        <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                          <p className="text-[9px] text-gray-500 dark:text-gray-400 uppercase font-semibold">Dernier RDV</p>
                          <p className="text-[10px] font-bold text-gray-900 dark:text-white">{p.dernierRdv ? formatDate(p.dernierRdv) : '—'}</p>
                        </div>
                      </div>

                      {/* Notes */}
                      {p.notes && (
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 italic line-clamp-2 mb-3">"{p.notes}"</p>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditForm(p)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-xs font-medium hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
                        >
                          <FiEdit3 className="w-3 h-3" /> Modifier
                        </button>
                        <button
                          onClick={() => setConfirmDelete(p)}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-500 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                        >
                          <FiTrash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
