const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const AnalyseRealisation = require('../models/AnalyseRealisation');
const AnalyseRendezVous = require('../models/AnalyseRendezVous');
const AnalyseJoursOuverts = require('../models/AnalyseJoursOuverts');
const AnalyseDevis = require('../models/AnalyseDevis');
const Encours = require('../models/Encours');
const Report = require('../models/Report');
const User = require('../models/User');

// GET /api/admin/dashboard - Dashboard global admin
router.get('/dashboard', auth, adminOnly, async (req, res) => {
  try {
    // Nombre de praticiens actifs
    const practitioners = await User.find({ role: 'practitioner', isActive: true });
    const practitionerCodes = practitioners.map(p => p.practitionerCode);

    // CA total par praticien (agrégé)
    const caByPractitioner = await AnalyseRealisation.aggregate([
      { $match: { praticien: { $in: practitionerCodes } } },
      { $group: { 
        _id: '$praticien',
        totalFacture: { $sum: '$montantFacture' },
        totalEncaisse: { $sum: '$montantEncaisse' },
        totalPatients: { $sum: '$nbPatients' }
      }}
    ]);

    // RDV par praticien
    const rdvByPractitioner = await AnalyseRendezVous.aggregate([
      { $match: { praticien: { $in: practitionerCodes } } },
      { $group: {
        _id: '$praticien',
        totalRdv: { $sum: '$nbRdv' },
        totalPatients: { $sum: '$nbPatients' },
        totalNouveaux: { $sum: '$nbNouveauxPatients' },
        totalDuree: { $sum: '$dureeTotaleRdv' }
      }}
    ]);

    // Heures travaillées par praticien
    const heuresByPractitioner = await AnalyseJoursOuverts.aggregate([
      { $match: { praticien: { $in: practitionerCodes } } },
      { $group: {
        _id: '$praticien',
        totalMinutes: { $sum: '$nbHeures' }
      }}
    ]);

    // Encours global
    const encours = await Encours.findOne().sort({ createdAt: -1 });

    // Rapports générés
    const totalReports = await Report.countDocuments();
    const reportsEnvoyes = await Report.countDocuments({ emailEnvoye: true });

    // CA mensuel (derniers 12 mois)
    const caMensuel = await AnalyseRealisation.aggregate([
      { $match: { praticien: { $in: practitionerCodes } } },
      { $group: {
        _id: { praticien: '$praticien', mois: '$mois' },
        totalFacture: { $sum: '$montantFacture' },
        totalEncaisse: { $sum: '$montantEncaisse' },
        totalPatients: { $sum: '$nbPatients' }
      }},
      { $sort: { '_id.mois': 1 } }
    ]);

    // Devis
    const devisStats = await AnalyseDevis.aggregate([
      { $match: { praticien: { $in: practitionerCodes } } },
      { $group: {
        _id: '$praticien',
        totalDevis: { $sum: '$nbDevis' },
        totalMontantPropose: { $sum: '$montantPropositions' },
        totalAcceptes: { $sum: '$nbDevisAcceptes' },
        totalMontantAccepte: { $sum: '$montantAccepte' }
      }}
    ]);

    // RDV mensuel (pour graphiques mensuels)
    const rdvMensuel = await AnalyseRendezVous.aggregate([
      { $match: { praticien: { $in: practitionerCodes } } },
      { $group: {
        _id: { mois: '$mois', praticien: '$praticien' },
        totalRdv: { $sum: '$nbRdv' },
        totalPatients: { $sum: '$nbPatients' },
        totalNouveaux: { $sum: '$nbNouveauxPatients' }
      }},
      { $sort: { '_id.mois': 1 } }
    ]);

    // Compute real trends: compare last 2 months of CA
    const allMois = [...new Set(caMensuel.map(c => c._id.mois))].sort();
    let trendCA = null;
    let trendPatients = null;
    if (allMois.length >= 2) {
      const lastMois = allMois[allMois.length - 1];
      const prevMois = allMois[allMois.length - 2];
      const caLast = caMensuel.filter(c => c._id.mois === lastMois).reduce((s, c) => s + c.totalFacture, 0);
      const caPrev = caMensuel.filter(c => c._id.mois === prevMois).reduce((s, c) => s + c.totalFacture, 0);
      const patientsLast = caMensuel.filter(c => c._id.mois === lastMois).reduce((s, c) => s + c.totalPatients, 0);
      const patientsPrev = caMensuel.filter(c => c._id.mois === prevMois).reduce((s, c) => s + c.totalPatients, 0);
      trendCA = caPrev > 0 ? Math.round(((caLast - caPrev) / caPrev) * 100) : null;
      trendPatients = patientsPrev > 0 ? Math.round(((patientsLast - patientsPrev) / patientsPrev) * 100) : null;
    }

    // Real absences: nbRdv (booked) - nbPatients (showed up)
    const totalRdvAll = rdvByPractitioner.reduce((s, r) => s + (r.totalRdv || 0), 0);
    const totalPatientsRdv = rdvByPractitioner.reduce((s, r) => s + (r.totalPatients || 0), 0);
    const totalAbsences = Math.max(0, totalRdvAll - totalPatientsRdv);
    const totalPresences = totalPatientsRdv;

    res.json({
      practitioners: practitioners.map(p => ({
        id: p._id,
        name: p.name,
        code: p.practitionerCode,
        email: p.email
      })),
      caByPractitioner,
      rdvByPractitioner,
      heuresByPractitioner,
      encours,
      totalReports,
      reportsEnvoyes,
      caMensuel,
      rdvMensuel,
      devisStats,
      trendCA,
      trendPatients,
      totalAbsences,
      totalPresences
    });
  } catch (error) {
    console.error('Erreur dashboard admin:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// GET /api/admin/comparison - Comparaison entre cabinets
router.get('/comparison', auth, adminOnly, async (req, res) => {
  try {
    const { practitioner1, practitioner2 } = req.query;
    const codes = [practitioner1 || 'JC', practitioner2 || 'DV'];

    // CA mensuel comparé
    const caComparison = await AnalyseRealisation.aggregate([
      { $match: { praticien: { $in: codes } } },
      { $group: {
        _id: { praticien: '$praticien', mois: '$mois' },
        totalFacture: { $sum: '$montantFacture' },
        totalEncaisse: { $sum: '$montantEncaisse' },
        totalPatients: { $sum: '$nbPatients' }
      }},
      { $sort: { '_id.mois': 1 } }
    ]);

    // RDV comparés
    const rdvComparison = await AnalyseRendezVous.aggregate([
      { $match: { praticien: { $in: codes } } },
      { $group: {
        _id: { praticien: '$praticien', mois: '$mois' },
        totalRdv: { $sum: '$nbRdv' },
        totalPatients: { $sum: '$nbPatients' },
        totalNouveaux: { $sum: '$nbNouveauxPatients' }
      }},
      { $sort: { '_id.mois': 1 } }
    ]);

    // Heures comparées
    const heuresComparison = await AnalyseJoursOuverts.aggregate([
      { $match: { praticien: { $in: codes } } },
      { $group: {
        _id: { praticien: '$praticien', mois: '$mois' },
        totalMinutes: { $sum: '$nbHeures' }
      }},
      { $sort: { '_id.mois': 1 } }
    ]);

    // Calcul des KPI par praticien
    const kpiByPractitioner = {};
    for (const code of codes) {
      const ca = await AnalyseRealisation.aggregate([
        { $match: { praticien: code } },
        { $group: {
          _id: null,
          totalFacture: { $sum: '$montantFacture' },
          totalEncaisse: { $sum: '$montantEncaisse' },
          totalPatients: { $sum: '$nbPatients' }
        }}
      ]);

      const heures = await AnalyseJoursOuverts.aggregate([
        { $match: { praticien: code } },
        { $group: { _id: null, totalMinutes: { $sum: '$nbHeures' } }}
      ]);

      const rdv = await AnalyseRendezVous.aggregate([
        { $match: { praticien: code } },
        { $group: {
          _id: null,
          totalRdv: { $sum: '$nbRdv' },
          totalPatients: { $sum: '$nbPatients' },
          totalNouveaux: { $sum: '$nbNouveauxPatients' }
        }}
      ]);

      const totalHeures = heures[0]?.totalMinutes ? heures[0].totalMinutes / 60 : 1;
      const totalCA = ca[0]?.totalFacture || 0;
      const totalPatients = ca[0]?.totalPatients || 1;

      kpiByPractitioner[code] = {
        caTotal: totalCA,
        totalEncaisse: ca[0]?.totalEncaisse || 0,
        totalPatients: ca[0]?.totalPatients || 0,
        panierMoyen: totalPatients > 0 ? (totalCA / totalPatients).toFixed(2) : 0,
        productionHoraire: totalHeures > 0 ? (totalCA / totalHeures).toFixed(2) : 0,
        heuresTravaillees: totalHeures.toFixed(1),
        totalRdv: rdv[0]?.totalRdv || 0,
        totalNouveauxPatients: rdv[0]?.totalNouveaux || 0
      };
    }

    res.json({
      caComparison,
      rdvComparison,
      heuresComparison,
      kpiByPractitioner
    });
  } catch (error) {
    console.error('Erreur comparaison:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// GET /api/admin/cabinet/:code - Détails d'un cabinet/praticien
router.get('/cabinet/:code', auth, adminOnly, async (req, res) => {
  try {
    const { code } = req.params;

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

    res.json({ realisation, rdv, heures, devis });
  } catch (error) {
    console.error('Erreur cabinet:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// GET /api/admin/statistics - Statistiques globales
router.get('/statistics', auth, adminOnly, async (req, res) => {
  try {
    const practitioners = await User.find({ role: 'practitioner', isActive: true });
    const codes = practitioners.map(p => p.practitionerCode);

    // Stats globales
    const globalCA = await AnalyseRealisation.aggregate([
      { $match: { praticien: { $in: codes } } },
      { $group: {
        _id: null,
        totalFacture: { $sum: '$montantFacture' },
        totalEncaisse: { $sum: '$montantEncaisse' },
        totalPatients: { $sum: '$nbPatients' }
      }}
    ]);

    const globalRdv = await AnalyseRendezVous.aggregate([
      { $match: { praticien: { $in: codes } } },
      { $group: {
        _id: null,
        totalRdv: { $sum: '$nbRdv' },
        totalPatients: { $sum: '$nbPatients' },
        totalNouveaux: { $sum: '$nbNouveauxPatients' },
        totalDuree: { $sum: '$dureeTotaleRdv' }
      }}
    ]);

    const globalHeures = await AnalyseJoursOuverts.aggregate([
      { $match: { praticien: { $in: codes } } },
      { $group: { _id: null, totalMinutes: { $sum: '$nbHeures' } }}
    ]);

    // Encours
    const encours = await Encours.findOne().sort({ createdAt: -1 });

    // Evolution mensuelle
    const evolutionMensuelle = await AnalyseRealisation.aggregate([
      { $match: { praticien: { $in: codes } } },
      { $group: {
        _id: '$mois',
        totalFacture: { $sum: '$montantFacture' },
        totalEncaisse: { $sum: '$montantEncaisse' },
        totalPatients: { $sum: '$nbPatients' }
      }},
      { $sort: { _id: 1 } }
    ]);

    // Per practitioner aggregation (for CA by cabinet)
    const perPractitioner = await AnalyseRealisation.aggregate([
      { $match: { praticien: { $in: codes } } },
      { $group: {
        _id: { mois: '$mois', praticien: '$praticien' },
        totalFacture: { $sum: '$montantFacture' },
        totalEncaisse: { $sum: '$montantEncaisse' },
        totalPatients: { $sum: '$nbPatients' }
      }},
      { $project: {
        _id: '$_id.mois',
        praticien: '$_id.praticien',
        totalFacture: 1,
        totalEncaisse: 1,
        totalPatients: 1
      }},
      { $sort: { _id: 1 } }
    ]);

    res.json({
      globalCA: globalCA[0] || {},
      globalRdv: globalRdv[0] || {},
      globalHeures: globalHeures[0] || {},
      encours,
      evolutionMensuelle,
      perPractitioner,
      nbPraticiens: codes.length
    });
  } catch (error) {
    console.error('Erreur statistiques:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// GET /api/admin/settings - Paramètres
router.get('/settings', auth, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    const totalReports = await Report.countDocuments();
    const reportsEnvoyes = await Report.countDocuments({ emailEnvoye: true });
    
    res.json({ users, totalReports, reportsEnvoyes });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;
