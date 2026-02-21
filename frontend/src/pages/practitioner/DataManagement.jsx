import { useState } from 'react';
import Header from '../../components/Header';
import { importData } from '../../services/api';
import { FiUpload, FiFileText, FiCheck, FiAlertCircle } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

export default function DataManagement() {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState('realisation');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);

  const dataTypes = [
    { value: 'realisation', label: 'Réalisation', desc: 'Patients, CA facturé, CA encaissé' },
    { value: 'rendez-vous', label: 'Rendez-vous', desc: 'RDV, durée, patients, nouveaux patients' },
    { value: 'jours-ouverts', label: 'Jours Ouverts', desc: 'Heures travaillées par mois' },
    { value: 'devis', label: 'Devis', desc: 'Nb devis, montants, acceptation' },
    { value: 'encours', label: 'En-cours', desc: 'Durée, montant, rentabilité' },
  ];

  const handleUpload = async () => {
    if (!file) {
      setMessage({ type: 'error', text: 'Veuillez sélectionner un fichier' });
      return;
    }

    setUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await importData(selectedType, formData);
      setMessage({ type: 'success', text: res.data.message || `${res.data.count || 0} enregistrements importés` });
      setFile(null);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur lors de l\'import' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <Header title="Gestion des Données" subtitle={`Cabinet ${user?.practitionerCode || ''} — Import de données LogosW`} />

      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          {/* Import Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8">
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <FiUpload className="text-primary-600" />
              Importer des données
            </h3>

            {message && (
              <div className={`mb-6 p-4 rounded-xl flex items-center gap-2 text-sm ${
                message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {message.type === 'success' ? <FiCheck /> : <FiAlertCircle />}
                {message.text}
              </div>
            )}

            {/* Type selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Type de données</label>
              <div className="grid grid-cols-1 gap-3">
                {dataTypes.map(dt => (
                  <button
                    key={dt.value}
                    onClick={() => setSelectedType(dt.value)}
                    className={`p-4 rounded-xl text-left transition-all ${
                      selectedType === dt.value
                        ? 'bg-primary-50 border-2 border-primary-500'
                        : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                    }`}
                  >
                    <p className={`text-sm font-medium ${selectedType === dt.value ? 'text-primary-700' : 'text-gray-900'}`}>
                      {dt.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{dt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* File input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Fichier TSV (LogosW)</label>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-primary-300 transition-colors">
                <input
                  type="file"
                  accept=".txt,.tsv,.csv"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  {file ? (
                    <div className="flex items-center justify-center gap-2 text-primary-700">
                      <FiFileText className="w-8 h-8" />
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <FiUpload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">Cliquer pour sélectionner un fichier</p>
                      <p className="text-xs text-gray-400 mt-1">.txt, .tsv, .csv</p>
                    </>
                  )}
                </label>
              </div>
            </div>

            {/* Upload button */}
            <button
              onClick={handleUpload}
              disabled={uploading || !file}
              className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Import en cours...
                </>
              ) : (
                <>
                  <FiUpload />
                  Importer les données
                </>
              )}
            </button>

            <p className="text-xs text-gray-500 mt-4 text-center">
              Les fichiers doivent être au format TSV (séparateur tabulation) exportés depuis LogosW.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
