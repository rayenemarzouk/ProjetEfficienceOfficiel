const express = require('express');
const router = express.Router();
const { auth, practitionerOnly } = require('../middleware/auth');
const AnalyseRealisation = require('../models/AnalyseRealisation');
const AnalyseRendezVous = require('../models/AnalyseRendezVous');
const AnalyseJoursOuverts = require('../models/AnalyseJoursOuverts');
const AnalyseDevis = require('../models/AnalyseDevis');
const Encours = require('../models/Encours');
const Report = require('../models/Report');

// GET /api/practitioner/dashboard - Dashboard praticien
router.get('/dashboard', auth, practitionerOnly, async (req, res) => {
  try {
    const code = req.user.practitionerCode;

    const realisations = await AnalyseRealisation.find({ praticien: code }).sort({ mois: 1 });
    const rendezVous = await AnalyseRendezVous.find({ praticien: code }).sort({ mois: 1 });
    const joursOuverts = await AnalyseJoursOuverts.find({ praticien: code }).sort({ mois: 1 });
    const encours = await Encours.findOne({ praticien: code }) || await Encours.findOne({ praticien: 'GLOBAL' });
    const reports = await Report.find({ praticien: code }).sort({ createdAt: -1 }).limit(5);

    res.json({
      realisations,
      rendezVous,
      joursOuverts,
      encours: encours || {},
      reports
    });
  } catch (error) {
    console.error('Erreur dashboard praticien:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// GET /api/practitioner/statistics - Stats détaillées du praticien
router.get('/statistics', auth, practitionerOnly, async (req, res) => {
  try {
    const code = req.user.practitionerCode;

    const realisation = await AnalyseRealisation.aggregate([
      { $match: { praticien: code } },
      { $group: {
        _id: '$mois',
        totalFacture: { $sum: '$montantFacture' },
        totalEncaisse: { $sum: '$montantEncaisse' },
        totalPatients: { $sum: '$nbPatients' }
      }},
      { $sort: { _id: 1 } }
    ]);

    const rdv = await AnalyseRendezVous.find({ praticien: code }).sort({ mois: 1 });
    const heures = await AnalyseJoursOuverts.find({ praticien: code }).sort({ mois: 1 });
    const devis = await AnalyseDevis.find({ praticien: code }).sort({ mois: 1 });

    // Calcul KPI par mois
    const monthlyKPI = realisation.map(r => {
      const h = heures.find(h => h.mois === r._id);
      const rv = rdv.find(rv => rv.mois === r._id);
      const heuresTrav = h ? h.nbHeures / 60 : 0;

      return {
        mois: r._id,
        caFacture: r.totalFacture,
        caEncaisse: r.totalEncaisse,
        nbPatients: r.totalPatients,
        panierMoyen: r.totalPatients > 0 ? parseFloat((r.totalFacture / r.totalPatients).toFixed(2)) : 0,
        rentabiliteHoraire: heuresTrav > 0 ? parseFloat((r.totalFacture / heuresTrav).toFixed(2)) : 0,
        heuresTravaillees: parseFloat(heuresTrav.toFixed(1)),
        nbRdv: rv?.nbRdv || 0,
        nbNouveauxPatients: rv?.nbNouveauxPatients || 0
      };
    });

    res.json({ monthlyKPI, devis });
  } catch (error) {
    console.error('Erreur statistiques praticien:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ═══════════════════════════════════════════════════════════
//  SAISIE MANUELLE — Entrée de données par le praticien
// ═══════════════════════════════════════════════════════════

// POST /api/practitioner/manual-entry — Ajouter/mettre à jour une entrée manuelle
router.post('/manual-entry', auth, practitionerOnly, async (req, res) => {
  try {
    const code = req.user.practitionerCode;
    if (!code) {
      return res.status(400).json({ message: 'Code praticien manquant dans votre profil.' });
    }

    const { type, mois, data } = req.body;
    if (!type || !mois || !data) {
      return res.status(400).json({ message: 'Type, mois et données requis.' });
    }

    // Valider le format du mois (YYYYMM)
    if (!/^\d{6}$/.test(mois)) {
      return res.status(400).json({ message: 'Format du mois invalide (attendu: YYYYMM).' });
    }

    let result;

    switch (type) {
      case 'realisation':
        result = await AnalyseRealisation.findOneAndUpdate(
          { praticien: code, mois },
          {
            praticien: code,
            mois,
            nbPatients: parseFloat(data.nbPatients) || 0,
            montantFacture: parseFloat(data.montantFacture) || 0,
            montantEncaisse: parseFloat(data.montantEncaisse) || 0
          },
          { upsert: true, new: true }
        );
        break;

      case 'rendez-vous':
        result = await AnalyseRendezVous.findOneAndUpdate(
          { praticien: code, mois },
          {
            praticien: code,
            mois,
            nbRdv: parseFloat(data.nbRdv) || 0,
            dureeTotaleRdv: parseFloat(data.dureeTotaleRdv) || 0,
            nbPatients: parseFloat(data.nbPatients) || 0,
            nbNouveauxPatients: parseFloat(data.nbNouveauxPatients) || 0
          },
          { upsert: true, new: true }
        );
        break;

      case 'jours-ouverts':
        result = await AnalyseJoursOuverts.findOneAndUpdate(
          { praticien: code, mois },
          {
            praticien: code,
            mois,
            nbHeures: parseFloat(data.nbHeures) || 0
          },
          { upsert: true, new: true }
        );
        break;

      case 'devis':
        result = await AnalyseDevis.findOneAndUpdate(
          { praticien: code, mois },
          {
            praticien: code,
            mois,
            nbDevis: parseFloat(data.nbDevis) || 0,
            montantPropositions: parseFloat(data.montantPropositions) || 0,
            nbDevisAcceptes: parseFloat(data.nbDevisAcceptes) || 0,
            montantAccepte: parseFloat(data.montantAccepte) || 0
          },
          { upsert: true, new: true }
        );
        break;

      case 'encours':
        result = await Encours.findOneAndUpdate(
          { praticien: code },
          {
            praticien: code,
            dureeTotaleARealiser: parseFloat(data.dureeTotaleARealiser) || 0,
            montantTotalAFacturer: parseFloat(data.montantTotalAFacturer) || 0,
            rentabiliteHoraire: parseFloat(data.rentabiliteHoraire) || 0,
            rentabiliteJoursTravailles: parseFloat(data.rentabiliteJoursTravailles) || 0,
            patientsEnCours: parseFloat(data.patientsEnCours) || 0,
            dateImport: new Date()
          },
          { upsert: true, new: true }
        );
        break;

      default:
        return res.status(400).json({ message: 'Type de données inconnu.' });
    }

    console.log(`Saisie manuelle [${type}] mois ${mois} par ${req.user.name} (${code})`);
    res.json({ message: 'Données enregistrées avec succès.', data: result });
  } catch (error) {
    console.error('Erreur saisie manuelle:', error);
    res.status(500).json({ message: 'Erreur lors de l\'enregistrement.' });
  }
});

// GET /api/practitioner/manual-entry/:type/:mois — Récupérer les données existantes pour un mois
router.get('/manual-entry/:type/:mois', auth, practitionerOnly, async (req, res) => {
  try {
    const code = req.user.practitionerCode;
    const { type, mois } = req.params;

    let data = null;

    switch (type) {
      case 'realisation':
        data = await AnalyseRealisation.findOne({ praticien: code, mois });
        break;
      case 'rendez-vous':
        data = await AnalyseRendezVous.findOne({ praticien: code, mois });
        break;
      case 'jours-ouverts':
        data = await AnalyseJoursOuverts.findOne({ praticien: code, mois });
        break;
      case 'devis':
        data = await AnalyseDevis.findOne({ praticien: code, mois });
        break;
      case 'encours':
        data = await Encours.findOne({ praticien: code });
        break;
      default:
        return res.status(400).json({ message: 'Type inconnu.' });
    }

    res.json({ data });
  } catch (error) {
    console.error('Erreur lecture saisie manuelle:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;
