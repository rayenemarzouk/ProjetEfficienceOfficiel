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

module.exports = router;
