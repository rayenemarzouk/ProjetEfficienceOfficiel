const express = require('express');
const router = express.Router();
const multer = require('multer');
const { auth, adminOnly } = require('../middleware/auth');
const AnalyseDevis = require('../models/AnalyseDevis');
const AnalyseJoursOuverts = require('../models/AnalyseJoursOuverts');
const AnalyseRealisation = require('../models/AnalyseRealisation');
const AnalyseRendezVous = require('../models/AnalyseRendezVous');
const Encours = require('../models/Encours');

const upload = multer({ storage: multer.memoryStorage() });

// Helper: parser un fichier TSV/CSV
function parseTSV(content, delimiter = '\t') {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(delimiter).map(h => h.trim());
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map(v => v.trim());
    if (values.length >= headers.length) {
      const row = {};
      headers.forEach((h, idx) => { row[h] = values[idx]; });
      data.push(row);
    }
  }
  return data;
}

// POST /api/data/import/:type - Importer un fichier de données
router.post('/import/:type', auth, adminOnly, upload.single('file'), async (req, res) => {
  try {
    const { type } = req.params;
    if (!req.file) {
      return res.status(400).json({ message: 'Fichier requis.' });
    }

    const content = req.file.buffer.toString('utf-8');
    const data = parseTSV(content);

    let imported = 0;

    switch (type) {
      case 'devis':
        for (const row of data) {
          await AnalyseDevis.findOneAndUpdate(
            { praticien: row['Praticien'], mois: row['Mois'] },
            {
              praticien: row['Praticien'],
              mois: row['Mois'],
              nbDevis: parseFloat(row['Nb devis']) || 0,
              montantPropositions: parseFloat(row['Montant propositions']) || 0,
              nbDevisAcceptes: parseFloat(row['Nb des devis acceptes']) || 0,
              montantAccepte: parseFloat(row['Montant accepté'] || row['Montant accept']) || 0
            },
            { upsert: true, new: true }
          );
          imported++;
        }
        break;

      case 'jours-ouverts':
        for (const row of data) {
          await AnalyseJoursOuverts.findOneAndUpdate(
            { praticien: row['Praticien'], mois: row['Mois'] },
            {
              praticien: row['Praticien'],
              mois: row['Mois'],
              nbHeures: parseFloat(row['Nb heures']) || 0
            },
            { upsert: true, new: true }
          );
          imported++;
        }
        break;

      case 'realisation':
        for (const row of data) {
          await AnalyseRealisation.create({
            praticien: row['Praticien'],
            mois: row['Mois'],
            nbPatients: parseFloat(row['Nb patients']) || 0,
            montantFacture: parseFloat(row['Montant facturé'] || row['Montant facture']) || 0,
            montantEncaisse: parseFloat(row['Montant encaissé'] || row['Montant encaisse']) || 0
          });
          imported++;
        }
        break;

      case 'rendez-vous':
        for (const row of data) {
          await AnalyseRendezVous.findOneAndUpdate(
            { praticien: row['Praticien'], mois: row['Mois'] },
            {
              praticien: row['Praticien'],
              mois: row['Mois'],
              nbRdv: parseFloat(row['Nb RDV']) || 0,
              dureeTotaleRdv: parseFloat(row['Duree totale RDV']) || 0,
              nbPatients: parseFloat(row['Nb patients']) || 0,
              nbNouveauxPatients: parseFloat(row['Nb nouveaux patients']) || 0
            },
            { upsert: true, new: true }
          );
          imported++;
        }
        break;

      case 'encours':
        const encoursData = {};
        for (const row of data) {
          encoursData[row['Type']] = parseFloat(row['Valeur']) || 0;
        }
        await Encours.create({
          dureeTotaleARealiser: encoursData['Duree totale a realiser'] || 0,
          montantTotalAFacturer: encoursData['Montant total a facturer'] || 0,
          rentabiliteHoraire: encoursData['Rentabilite horaire'] || 0,
          rentabiliteJoursTravailles: encoursData['Rentabilite jours travailles'] || 0,
          patientsEnCours: encoursData['Patients en cours'] || 0
        });
        imported = Object.keys(encoursData).length;
        break;

      default:
        return res.status(400).json({ message: 'Type de données inconnu.' });
    }

    res.json({ message: `${imported} enregistrements importés avec succès.`, count: imported });
  } catch (error) {
    console.error('Erreur import:', error);
    res.status(500).json({ message: 'Erreur lors de l\'import.' });
  }
});

// GET /api/data/summary - Résumé des données disponibles
router.get('/summary', auth, async (req, res) => {
  try {
    const devisCount = await AnalyseDevis.countDocuments();
    const joursCount = await AnalyseJoursOuverts.countDocuments();
    const realisationCount = await AnalyseRealisation.countDocuments();
    const rdvCount = await AnalyseRendezVous.countDocuments();
    const encoursCount = await Encours.countDocuments();

    res.json({
      devis: devisCount,
      joursOuverts: joursCount,
      realisation: realisationCount,
      rendezVous: rdvCount,
      encours: encoursCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;
