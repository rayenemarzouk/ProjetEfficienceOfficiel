import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { getSettings } from '../../services/api';
import { FiUser, FiMail, FiShield, FiActivity, FiServer, FiDatabase, FiCalendar } from 'react-icons/fi';

export default function Settings() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getSettings();
        setUsers(res.data.users || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const systemInfo = [
    { icon: FiServer, label: 'Backend', value: 'Node.js + Express', color: 'text-green-600 bg-green-50' },
    { icon: FiDatabase, label: 'Base de données', value: 'MongoDB Atlas', color: 'text-blue-600 bg-blue-50' },
    { icon: FiCalendar, label: 'Cron', value: 'Dernier jour du mois à 20h', color: 'text-purple-600 bg-purple-50' },
    { icon: FiMail, label: 'Email', value: 'Gmail SMTP', color: 'text-amber-600 bg-amber-50' },
  ];

  return (
    <div>
      <Header title="Réglages" subtitle="Configuration du système et gestion des utilisateurs" />

      <div className="p-8">
        {/* System Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {systemInfo.map((info, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${info.color}`}>
                  <info.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{info.label}</p>
                  <p className="text-sm font-semibold text-gray-900">{info.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Users List */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Utilisateurs</h3>
            <span className="text-sm text-gray-500">{users.length} utilisateur(s)</span>
          </div>
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {users.map((user) => (
                <div key={user._id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                      user.role === 'admin' ? 'bg-primary-600' : 'bg-blue-500'
                    }`}>
                      {user.name?.charAt(0) || user.email?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{user.name || user.email}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {user.practitionerCode && (
                      <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                        {user.practitionerCode}
                      </span>
                    )}
                    {user.cabinetName && (
                      <span className="text-xs text-gray-500">{user.cabinetName}</span>
                    )}
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                      user.role === 'admin'
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      <FiShield className="w-3 h-3" />
                      {user.role === 'admin' ? 'Administrateur' : 'Praticien'}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      user.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      <FiActivity className="w-3 h-3" />
                      {user.isActive !== false ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FiCalendar className="text-primary-600" /> Automatisation
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-900">Génération automatique</p>
                  <p className="text-xs text-gray-500">Rapports générés le dernier jour du mois</p>
                </div>
                <div className="w-10 h-6 bg-primary-600 rounded-full relative">
                  <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1"></div>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-900">Envoi automatique par email</p>
                  <p className="text-xs text-gray-500">Rapports envoyés après génération</p>
                </div>
                <div className="w-10 h-6 bg-primary-600 rounded-full relative">
                  <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1"></div>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-900">Heure de génération</p>
                  <p className="text-xs text-gray-500">Planifié chaque dernier jour du mois</p>
                </div>
                <span className="text-sm font-mono font-bold text-primary-700">20:00</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FiMail className="text-blue-600" /> Configuration Email
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs font-medium text-gray-500 mb-1">Service</p>
                <p className="text-sm font-medium text-gray-900">Gmail SMTP</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs font-medium text-gray-500 mb-1">Expéditeur</p>
                <p className="text-sm font-medium text-gray-900">Efficience Analytics</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs font-medium text-gray-500 mb-1">Destinataire rapports</p>
                <p className="text-sm font-medium text-gray-900">maarzoukrayan3@gmail.com</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs font-medium text-blue-600">
                  💡 Nb rapports = Nb emails = Nb praticiens actifs
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
