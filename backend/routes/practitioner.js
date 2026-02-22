const express = require('express');
const router = express.Router();
const { auth, practitionerOnly } = require('../middleware/auth');
const AnalyseRealisation = require('../models/AnalyseRealisation');
const AnalyseRendezVous = require('../models/AnalyseRendezVous');
const AnalyseJoursOuverts = require('../models/AnalyseJoursOuverts');
const AnalyseDevis = require('../models/AnalyseDevis');
const Encours = require('../models/Encours');
const Report = require('../models/Report');
const Patient = require('../models/Patient');

// Helper: get practitioner identifier (code if set, otherwise use name or email)
const getPraticienId = (user) => user.practitionerCode || user.name || user.email;

// GET /api/practitioner/dashboard - Dashboard praticien
router.get('/dashboard', auth, practitionerOnly, async (req, res) => {
  try {
    const code = getPraticienId(req.user);

    const realisations = await AnalyseRealisation.find({ praticien: code }).sort({ mois: 1 });
    const rendezVous = await AnalyseRendezVous.find({ praticien: code }).sort({ mois: 1 });
    const joursOuverts = await AnalyseJoursOuverts.find({ praticien: code }).sort({ mois: 1 });
    const encours = await Encours.findOne({ praticien: code }) || await Encours.findOne({ praticien: 'GLOBAL' });
    const reports = await Report.find({ praticien: code }).sort({ createdAt: -1 }).limit(5);
    const totalPatientsInscrits = await Patient.countDocuments({ praticien: code });
    const patientsActifs = await Patient.countDocuments({ praticien: code, statut: 'actif' });
    const patientsNouveaux = await Patient.countDocuments({ praticien: code, statut: 'nouveau' });

    res.json({
      realisations,
      rendezVous,
      joursOuverts,
      encours: encours || {},
      reports,
      patientsStats: {
        totalInscrits: totalPatientsInscrits,
        actifs: patientsActifs,
        nouveaux: patientsNouveaux
      }
    });
  } catch (error) {
    console.error('Erreur dashboard praticien:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// GET /api/practitioner/statistics - Stats détaillées du praticien
router.get('/statistics', auth, practitionerOnly, async (req, res) => {
  try {
    const code = getPraticienId(req.user);

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
    const code = getPraticienId(req.user);

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
    const code = getPraticienId(req.user);
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

// ═══════════════════════════════════════════════════════════
//  GESTION DES PATIENTS — CRUD manuel par le praticien
// ═══════════════════════════════════════════════════════════

// GET /api/practitioner/patients — Liste des patients du praticien
router.get('/patients', auth, practitionerOnly, async (req, res) => {
  try {
    const code = getPraticienId(req.user);
    const { search, statut, sort } = req.query;

    const filter = { praticien: code };
    if (statut && ['actif', 'inactif', 'nouveau'].includes(statut)) {
      filter.statut = statut;
    }
    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [{ nom: regex }, { prenom: regex }, { email: regex }, { telephone: regex }];
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'nom') sortOption = { nom: 1 };
    if (sort === 'dernier-rdv') sortOption = { dernierRdv: -1 };
    if (sort === 'visites') sortOption = { nbVisites: -1 };

    const patients = await Patient.find(filter).sort(sortOption);
    const stats = {
      total: await Patient.countDocuments({ praticien: code }),
      actifs: await Patient.countDocuments({ praticien: code, statut: 'actif' }),
      nouveaux: await Patient.countDocuments({ praticien: code, statut: 'nouveau' }),
      inactifs: await Patient.countDocuments({ praticien: code, statut: 'inactif' })
    };

    res.json({ patients, stats });
  } catch (error) {
    console.error('Erreur liste patients:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// POST /api/practitioner/patients — Ajouter un patient
router.post('/patients', auth, practitionerOnly, async (req, res) => {
  try {
    const code = getPraticienId(req.user);
    const { nom, prenom, dateNaissance, telephone, email, notes, statut } = req.body;

    if (!nom || !prenom) {
      return res.status(400).json({ message: 'Nom et prénom sont requis.' });
    }

    const patient = await Patient.create({
      praticien: code,
      nom: nom.trim().toUpperCase(),
      prenom: prenom.trim(),
      dateNaissance: dateNaissance || null,
      telephone: telephone || '',
      email: email || '',
      notes: notes || '',
      statut: statut || 'nouveau'
    });

    // ═══ Synchroniser les stats du mois courant ═══
    const now = new Date();
    const moisCourant = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Incrémenter nbPatients dans AnalyseRealisation
    await AnalyseRealisation.findOneAndUpdate(
      { praticien: code, mois: moisCourant },
      { $inc: { nbPatients: 1 }, $setOnInsert: { praticien: code, mois: moisCourant, montantFacture: 0, montantEncaisse: 0 } },
      { upsert: true, new: true }
    );

    // Incrémenter nbNouveauxPatients + nbPatients dans AnalyseRendezVous
    await AnalyseRendezVous.findOneAndUpdate(
      { praticien: code, mois: moisCourant },
      { $inc: { nbNouveauxPatients: 1, nbPatients: 1 }, $setOnInsert: { praticien: code, mois: moisCourant, nbRdv: 0, dureeTotaleRdv: 0 } },
      { upsert: true, new: true }
    );

    console.log(`Patient ajouté: ${patient.nom} ${patient.prenom} par ${req.user.name} (${code}) — stats ${moisCourant} mises à jour`);
    res.status(201).json({ message: 'Patient ajouté avec succès.', patient });
  } catch (error) {
    console.error('Erreur ajout patient:', error);
    res.status(500).json({ message: 'Erreur lors de l\'ajout du patient.' });
  }
});

// PUT /api/practitioner/patients/:id — Modifier un patient
router.put('/patients/:id', auth, practitionerOnly, async (req, res) => {
  try {
    const code = getPraticienId(req.user);
    const { id } = req.params;
    const { nom, prenom, dateNaissance, telephone, email, notes, statut, dernierRdv, prochainRdv, montantTotal, nbVisites } = req.body;

    const patient = await Patient.findOne({ _id: id, praticien: code });
    if (!patient) {
      return res.status(404).json({ message: 'Patient introuvable.' });
    }

    if (nom !== undefined) patient.nom = nom.trim().toUpperCase();
    if (prenom !== undefined) patient.prenom = prenom.trim();
    if (dateNaissance !== undefined) patient.dateNaissance = dateNaissance || null;
    if (telephone !== undefined) patient.telephone = telephone;
    if (email !== undefined) patient.email = email;
    if (notes !== undefined) patient.notes = notes;
    if (statut !== undefined) patient.statut = statut;
    if (dernierRdv !== undefined) patient.dernierRdv = dernierRdv || null;
    if (prochainRdv !== undefined) patient.prochainRdv = prochainRdv || null;
    if (montantTotal !== undefined) patient.montantTotal = parseFloat(montantTotal) || 0;
    if (nbVisites !== undefined) patient.nbVisites = parseInt(nbVisites) || 0;

    await patient.save();
    res.json({ message: 'Patient mis à jour.', patient });
  } catch (error) {
    console.error('Erreur modification patient:', error);
    res.status(500).json({ message: 'Erreur lors de la modification.' });
  }
});

// DELETE /api/practitioner/patients/:id — Supprimer un patient
router.delete('/patients/:id', auth, practitionerOnly, async (req, res) => {
  try {
    const code = getPraticienId(req.user);
    const { id } = req.params;

    const patient = await Patient.findOneAndDelete({ _id: id, praticien: code });
    if (!patient) {
      return res.status(404).json({ message: 'Patient introuvable.' });
    }

    // ═══ Décrémenter les stats du mois courant ═══
    const now = new Date();
    const moisCourant = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    const realMois = await AnalyseRealisation.findOne({ praticien: code, mois: moisCourant });
    if (realMois && realMois.nbPatients > 0) {
      await AnalyseRealisation.updateOne(
        { praticien: code, mois: moisCourant },
        { $inc: { nbPatients: -1 } }
      );
    }

    const rdvMois = await AnalyseRendezVous.findOne({ praticien: code, mois: moisCourant });
    if (rdvMois) {
      const decPatients = rdvMois.nbPatients > 0 ? -1 : 0;
      const decNouveaux = rdvMois.nbNouveauxPatients > 0 ? -1 : 0;
      if (decPatients || decNouveaux) {
        await AnalyseRendezVous.updateOne(
          { praticien: code, mois: moisCourant },
          { $inc: { nbPatients: decPatients, nbNouveauxPatients: decNouveaux } }
        );
      }
    }

    console.log(`Patient supprimé: ${patient.nom} ${patient.prenom} par ${req.user.name} (${code}) — stats mises à jour`);
    res.json({ message: 'Patient supprimé.' });
  } catch (error) {
    console.error('Erreur suppression patient:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression.' });
  }
});

module.exports = router;
