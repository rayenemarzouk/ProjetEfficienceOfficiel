const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { auth, adminOnly } = require('../middleware/auth');
const AnalyseRealisation = require('../models/AnalyseRealisation');
const AnalyseRendezVous = require('../models/AnalyseRendezVous');
const AnalyseJoursOuverts = require('../models/AnalyseJoursOuverts');
const AnalyseDevis = require('../models/AnalyseDevis');
const Encours = require('../models/Encours');
const Report = require('../models/Report');
const User = require('../models/User');
const AppSettings = require('../models/AppSettings');

// Helper: get practitioner identifier (code if set, otherwise use name or email)
const getPraticienId = (user) => user.practitionerCode || user.name || user.email;

// ═══ Store for deactivation verification codes (userId → { code, expiresAt }) ═══
const deactivateCodes = new Map();

// ═══ Store for AI toggle verification codes ═══
let aiToggleCode = null; // { code, expiresAt, targetState }

// GET /api/admin/dashboard - Dashboard global admin
router.get('/dashboard', auth, adminOnly, async (req, res) => {
  try {
    // Nombre de praticiens actifs
    const practitioners = await User.find({ role: 'practitioner', isActive: true });
    const practitionerCodes = practitioners.map(p => getPraticienId(p));

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

    // Rapports générés — filtrer par le dernier mois pour cohérence
    const lastMonth = allMois.length > 0 ? allMois[allMois.length - 1] : null;
    const reportFilter = lastMonth ? { mois: lastMonth } : {};
    const totalReports = await Report.countDocuments(reportFilter);
    const reportsEnvoyes = await Report.countDocuments({ ...reportFilter, emailEnvoye: true });

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
        code: getPraticienId(p),
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
    const codes = practitioners.map(p => getPraticienId(p));

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
    const appSettings = await AppSettings.getSettings();
    
    res.json({ users, totalReports, reportsEnvoyes, appSettings });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// PUT /api/admin/settings - Mettre à jour les paramètres
router.put('/settings', auth, adminOnly, async (req, res) => {
  try {
    const { autoGeneration, autoEmail, maintenanceMode, aiModelsEnabled, importEnabled } = req.body;
    let settings = await AppSettings.getSettings();
    if (typeof autoGeneration === 'boolean') settings.autoGeneration = autoGeneration;
    if (typeof autoEmail === 'boolean') settings.autoEmail = autoEmail;
    if (typeof maintenanceMode === 'boolean') settings.maintenanceMode = maintenanceMode;
    if (typeof aiModelsEnabled === 'boolean') settings.aiModelsEnabled = aiModelsEnabled;
    if (typeof importEnabled === 'boolean') settings.importEnabled = importEnabled;
    await settings.save();
    res.json({ message: 'Paramètres mis à jour.', appSettings: settings });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ═══════════════════════════════════════════════════════════
//  IMPERSONATION — Se connecter en tant que praticien
// ═══════════════════════════════════════════════════════════

// POST /api/admin/impersonate — Connexion directe en tant que praticien (admin uniquement)
router.post('/impersonate', auth, adminOnly, async (req, res) => {
  try {
    const { practitionerId } = req.body;
    if (!practitionerId) return res.status(400).json({ message: 'ID praticien requis.' });

    const practitioner = await User.findById(practitionerId);
    if (!practitioner || practitioner.role !== 'practitioner') {
      return res.status(404).json({ message: 'Praticien non trouvé.' });
    }

    // L'admin est déjà authentifié — générer directement un token praticien
    const token = jwt.sign(
      { id: practitioner._id, role: practitioner.role, practitionerCode: getPraticienId(practitioner) },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log(`Admin ${req.user.name} connecté en tant que ${practitioner.name} (${getPraticienId(practitioner)})`);

    res.json({
      token,
      user: {
        id: practitioner._id,
        email: practitioner.email,
        name: practitioner.name,
        role: practitioner.role,
        practitionerCode: getPraticienId(practitioner),
        cabinetName: practitioner.cabinetName
      }
    });
  } catch (error) {
    console.error('Erreur impersonation:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ═══════════════════════════════════════════════════════════
//  SUPPRESSION COMPTE — Envoi code + vérification + suppression définitive
// ═══════════════════════════════════════════════════════════

// POST /api/admin/deactivate-send-code — Envoyer un code de vérification par email
router.post('/deactivate-send-code', auth, adminOnly, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'ID utilisateur requis.' });

    const targetUser = await User.findById(userId);
    if (!targetUser) return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    if (targetUser.role === 'admin') return res.status(403).json({ message: 'Impossible de supprimer un administrateur.' });

    // Generate a 6-digit code
    const code = crypto.randomInt(100000, 999999).toString();
    deactivateCodes.set(userId, { code, expiresAt: Date.now() + 10 * 60 * 1000 }); // 10 min

    // Send email to the admin who is requesting the deletion
    const adminEmail = req.user.email;
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    });

    await transporter.sendMail({
      from: `"Efficience Analytics" <${process.env.EMAIL_USER}>`,
      to: adminEmail,
      subject: `🗑️ Code de vérification — Suppression de ${targetUser.name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px;background:#f8fafc;border-radius:16px;">
          <div style="text-align:center;margin-bottom:25px;">
            <h2 style="color:#1e293b;margin:0;">🗑️ Code de vérification</h2>
            <p style="color:#64748b;font-size:14px;margin-top:8px;">Suppression définitive du compte</p>
          </div>
          <div style="background:white;border-radius:12px;padding:25px;border:1px solid #e2e8f0;text-align:center;">
            <p style="color:#475569;font-size:14px;margin-bottom:5px;">Compte à supprimer :</p>
            <p style="color:#1e293b;font-size:18px;font-weight:bold;margin-bottom:20px;">${targetUser.name} (${targetUser.practitionerCode || targetUser.email})</p>
            <div style="background:#fef2f2;border:2px dashed #ef4444;border-radius:12px;padding:20px;margin-bottom:20px;">
              <p style="color:#ef4444;font-size:12px;font-weight:600;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">Votre code</p>
              <p style="color:#dc2626;font-size:36px;font-weight:900;letter-spacing:8px;margin:0;">${code}</p>
            </div>
            <p style="color:#94a3b8;font-size:12px;">Ce code expire dans <strong>10 minutes</strong>.</p>
            <p style="color:#ef4444;font-size:11px;margin-top:10px;font-weight:600;">⚠️ Cette action est irréversible. Le compte et toutes ses données seront supprimés.</p>
          </div>
          <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:20px;">Efficience Analytics — Sécurité</p>
        </div>
      `
    });

    console.log(`Code de suppression envoyé pour ${targetUser.name} (${targetUser.email}) → email envoyé à ${adminEmail}`);
    res.json({ message: `Code de vérification envoyé à ${adminEmail}.` });
  } catch (error) {
    console.error('Erreur envoi code suppression:', error);
    res.status(500).json({ message: 'Erreur lors de l\'envoi du code.' });
  }
});

// POST /api/admin/deactivate-confirm — Vérifier le code et supprimer définitivement le compte
router.post('/deactivate-confirm', auth, adminOnly, async (req, res) => {
  try {
    const { userId, code } = req.body;
    if (!userId || !code) return res.status(400).json({ message: 'ID utilisateur et code requis.' });

    const stored = deactivateCodes.get(userId);
    if (!stored) return res.status(400).json({ message: 'Aucun code en attente. Veuillez en redemander un.' });
    if (Date.now() > stored.expiresAt) {
      deactivateCodes.delete(userId);
      return res.status(400).json({ message: 'Code expiré. Veuillez en redemander un.' });
    }
    if (stored.code !== code.trim()) {
      return res.status(400).json({ message: 'Code incorrect.' });
    }

    // Code valid — supprimer définitivement le compte et ses données
    deactivateCodes.delete(userId);
    const targetUser = await User.findById(userId);
    if (!targetUser) return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    if (targetUser.role === 'admin') return res.status(403).json({ message: 'Impossible de supprimer un administrateur.' });

    const userName = targetUser.name;
    const userEmail = targetUser.email;
    const praticienId = getPraticienId(targetUser);

    // Supprimer les données liées au praticien
    await Promise.all([
      AnalyseRealisation.deleteMany({ praticien: praticienId }),
      AnalyseRendezVous.deleteMany({ praticien: praticienId }),
      AnalyseJoursOuverts.deleteMany({ praticien: praticienId }),
      AnalyseDevis.deleteMany({ praticien: praticienId }),
    ]);

    // Supprimer les rapports liés
    await Report.deleteMany({ userId: targetUser._id });

    // Supprimer le compte utilisateur
    await User.findByIdAndDelete(userId);

    console.log(`Compte SUPPRIMÉ définitivement : ${userName} (${userEmail}) par admin ${req.user.name}`);
    res.json({ message: `Compte de ${userName} supprimé définitivement.`, deletedUserId: userId });
  } catch (error) {
    console.error('Erreur suppression compte:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ═══════════════════════════════════════════════════════════
//  ACTIVATION MODÈLES IA — Vérification par email
// ═══════════════════════════════════════════════════════════

// POST /api/admin/ai-toggle-send-code — Préparer l'activation + optionnellement envoyer un code par email
router.post('/ai-toggle-send-code', auth, adminOnly, async (req, res) => {
  try {
    // Seul maarzoukrayan3@gmail.com peut contrôler le mode dynamique
    if (req.user.email !== 'maarzoukrayan3@gmail.com') {
      return res.status(403).json({ message: 'Seul l\'administrateur principal peut gérer le mode dynamique.' });
    }

    const { targetState, sendEmail } = req.body;
    if (typeof targetState !== 'boolean') return res.status(400).json({ message: 'État cible requis.' });

    // Toujours stocker l'état cible
    const actionLabel = targetState ? 'ACTIVER' : 'DÉSACTIVER';

    if (sendEmail) {
      // Méthode 2 : envoyer un code temporaire par email
      const code = crypto.randomInt(100000, 999999).toString();
      aiToggleCode = { code, expiresAt: Date.now() + 10 * 60 * 1000, targetState };

      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT),
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      const actionColor = targetState ? '#10b981' : '#ef4444';

      await transporter.sendMail({
        from: `"Efficience Analytics" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER,
        subject: `🤖 Code de vérification — ${actionLabel} les Modèles IA`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px;background:#f8fafc;border-radius:16px;">
            <div style="text-align:center;margin-bottom:25px;">
              <h2 style="color:#1e293b;margin:0;">🤖 Modèles IA — Vérification</h2>
              <p style="color:#64748b;font-size:14px;margin-top:8px;">Changement d'état des modèles IA</p>
            </div>
            <div style="background:white;border-radius:12px;padding:25px;border:1px solid #e2e8f0;text-align:center;">
              <p style="color:#475569;font-size:14px;margin-bottom:5px;">Action demandée :</p>
              <p style="color:${actionColor};font-size:20px;font-weight:bold;margin-bottom:20px;">${actionLabel} tous les modèles IA</p>
              <div style="background:#f0fdf4;border:2px dashed ${actionColor};border-radius:12px;padding:20px;margin-bottom:20px;">
                <p style="color:${actionColor};font-size:12px;font-weight:600;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">Votre code</p>
                <p style="color:#1e293b;font-size:36px;font-weight:900;letter-spacing:8px;margin:0;">${code}</p>
              </div>
              <p style="color:#94a3b8;font-size:12px;">Ce code expire dans <strong>10 minutes</strong>.</p>
              <p style="color:#64748b;font-size:11px;margin-top:10px;">Demandé par : ${req.user.name} (${req.user.email})</p>
            </div>
            <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:20px;">Efficience Analytics — Sécurité</p>
          </div>
        `
      });

      console.log(`Code IA envoyé par email pour ${actionLabel} par ${req.user.name}`);
      res.json({ message: 'Code de vérification envoyé par email.' });
    } else {
      // Méthode 1 : préparer la session (le code admin fixe sera vérifié au confirm)
      aiToggleCode = { targetState, expiresAt: Date.now() + 30 * 60 * 1000 };
      console.log(`Admin ${req.user.name} prépare ${actionLabel} les modèles IA`);
      res.json({ message: 'Session préparée. Entrez votre code administrateur.' });
    }
  } catch (error) {
    console.error('Erreur ai-toggle-send-code:', error);
    res.status(500).json({ message: 'Erreur lors de l\'envoi du code.' });
  }
});

// POST /api/admin/ai-toggle-confirm — Vérifier le code (admin fixe OU email) et activer/désactiver
router.post('/ai-toggle-confirm', auth, adminOnly, async (req, res) => {
  try {
    // Seul maarzoukrayan3@gmail.com peut contrôler le mode dynamique
    if (req.user.email !== 'maarzoukrayan3@gmail.com') {
      return res.status(403).json({ message: 'Seul l\'administrateur principal peut gérer le mode dynamique.' });
    }

    const { code, type } = req.body; // type = 'admin' ou 'email'
    if (!code) return res.status(400).json({ message: 'Code requis.' });

    let targetState = null;
    const trimmedCode = code.trim();

    if (type === 'admin') {
      // Méthode 1 : Code fixe admin (ADMIN_AI_CODE hashé en bcrypt dans .env)
      const isMatch = process.env.ADMIN_AI_CODE ? await bcrypt.compare(trimmedCode, process.env.ADMIN_AI_CODE) : false;
      if (isMatch) {
        if (aiToggleCode && Date.now() <= aiToggleCode.expiresAt) {
          targetState = aiToggleCode.targetState;
          aiToggleCode = null;
        } else {
          targetState = true; // par défaut activer
        }
      } else {
        return res.status(400).json({ message: 'Code administrateur incorrect.' });
      }
    } else {
      // Méthode 2 : Code temporaire envoyé par email
      if (aiToggleCode && aiToggleCode.code) {
        if (Date.now() > aiToggleCode.expiresAt) {
          aiToggleCode = null;
          return res.status(400).json({ message: 'Code expiré. Veuillez en redemander un.' });
        } else if (aiToggleCode.code === trimmedCode) {
          targetState = aiToggleCode.targetState;
          aiToggleCode = null;
        } else {
          return res.status(400).json({ message: 'Code email incorrect.' });
        }
      }

      // Vérifier aussi le code de renouvellement automatique (cron)
      if (targetState === null && global.aiRenewalCode) {
        if (Date.now() > global.aiRenewalCode.expiresAt) {
          global.aiRenewalCode = null;
        } else if (global.aiRenewalCode.code === trimmedCode) {
          targetState = global.aiRenewalCode.targetState;
          global.aiRenewalCode = null;
        }
      }

      if (targetState === null) {
        return res.status(400).json({ message: 'Code incorrect ou expiré.' });
      }
    }

    // Mettre à jour les settings en base
    let settings = await AppSettings.getSettings();
    settings.aiModelsEnabled = targetState;

    if (targetState) {
      // Activer le mode dynamique pour 15 jours
      settings.dynamicExpiresAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    } else {
      // Désactiver immédiatement
      settings.dynamicExpiresAt = null;
    }
    await settings.save();

    const label = targetState ? 'activés' : 'désactivés';
    const expiresMsg = targetState ? ` (expire le ${settings.dynamicExpiresAt.toLocaleDateString('fr-FR')})` : '';
    console.log(`Modèles IA ${label}${expiresMsg} par admin ${req.user.name}`);
    res.json({
      message: `Modèles IA ${label} avec succès.${expiresMsg}`,
      aiModelsEnabled: targetState,
      dynamicActive: settings.isDynamicActive(),
      dynamicExpiresAt: settings.dynamicExpiresAt
    });
  } catch (error) {
    console.error('Erreur toggle IA:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;
