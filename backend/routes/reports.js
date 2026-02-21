const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { generatePDFReport, generateHTMLReport } = require('../services/pdfGenerator');
const { sendReportEmail } = require('../services/emailService');
const Report = require('../models/Report');
const User = require('../models/User');
const AnalyseRealisation = require('../models/AnalyseRealisation');
const AnalyseRendezVous = require('../models/AnalyseRendezVous');
const AnalyseJoursOuverts = require('../models/AnalyseJoursOuverts');
const AnalyseDevis = require('../models/AnalyseDevis');
const Encours = require('../models/Encours');

// Normalize mois: ensure 8-digit format YYYYMMDD (append '01' if 6-digit YYYYMM)
function normalizeMois(m) {
  if (!m) return m;
  m = String(m).trim();
  if (m.length === 6) return m + '01';
  return m;
}

// Helper: Get monthly historique for a practitioner (last 6 months)
async function getHistorique(practitionerCode) {
  const results = await AnalyseRealisation.aggregate([
    { $match: { praticien: practitionerCode } },
    { $group: {
      _id: '$mois',
      ca: { $sum: '$montantFacture' },
      encaisse: { $sum: '$montantEncaisse' },
      patients: { $sum: '$nbPatients' }
    }},
    { $sort: { _id: -1 } },
    { $limit: 6 }
  ]);

  // Also get RDV and heures for each month
  const enriched = [];
  for (const r of results) {
    const rdv = await AnalyseRendezVous.findOne({ praticien: practitionerCode, mois: r._id });
    const heures = await AnalyseJoursOuverts.findOne({ praticien: practitionerCode, mois: r._id });
    enriched.push({
      mois: r._id,
      ca: r.ca,
      encaisse: r.encaisse,
      patients: r.patients,
      rdv: rdv?.nbRdv || 0,
      heures: heures?.nbHeures || 0
    });
  }

  return enriched.reverse(); // oldest first
}

// Helper: Calculer les KPI d'un praticien pour un mois donné
async function calculateKPI(practitionerCode, mois) {
  const realisation = await AnalyseRealisation.aggregate([
    { $match: { praticien: practitionerCode, mois } },
    { $group: {
      _id: null,
      totalFacture: { $sum: '$montantFacture' },
      totalEncaisse: { $sum: '$montantEncaisse' },
      totalPatients: { $sum: '$nbPatients' }
    }}
  ]);

  const rdv = await AnalyseRendezVous.findOne({ praticien: practitionerCode, mois });
  const heures = await AnalyseJoursOuverts.findOne({ praticien: practitionerCode, mois });
  const devis = await AnalyseDevis.findOne({ praticien: practitionerCode, mois });

  const ca = realisation[0]?.totalFacture || 0;
  const patients = realisation[0]?.totalPatients || 0;
  const heuresTravaillees = heures ? heures.nbHeures / 60 : 0;

  return {
    caMensuel: ca,
    montantEncaisse: realisation[0]?.totalEncaisse || 0,
    nbPatients: patients,
    nbNouveauxPatients: rdv?.nbNouveauxPatients || 0,
    nbRdv: rdv?.nbRdv || 0,
    dureeMoyenneRdv: rdv && rdv.nbRdv > 0 ? (rdv.dureeTotaleRdv / rdv.nbRdv).toFixed(1) : 0,
    panierMoyen: patients > 0 ? (ca / patients).toFixed(2) : 0,
    productionHoraire: heuresTravaillees > 0 ? (ca / heuresTravaillees).toFixed(2) : 0,
    heuresTravaillees: heuresTravaillees.toFixed(1),
    nbDevis: devis?.nbDevis || 0,
    montantDevisPropose: devis?.montantPropositions || 0,
    nbDevisAcceptes: devis?.nbDevisAcceptes || 0,
    tauxAcceptationDevis: devis && devis.nbDevis > 0 
      ? ((devis.nbDevisAcceptes / devis.nbDevis) * 100).toFixed(1) 
      : 0
  };
}

// Générer des recommandations basées sur les KPI
function generateRecommendations(kpi) {
  const recs = [];
  
  if (parseFloat(kpi.panierMoyen) < 400) {
    recs.push('Le panier moyen est en dessous de la moyenne nationale (400€). Travaillez sur le diagnostic complet et la communication des plans de traitement.');
  }
  if (parseFloat(kpi.productionHoraire) < 180) {
    recs.push('La production horaire est faible. Optimisez l\'organisation du planning avec des créneaux de 10 minutes multiples.');
  }
  if (parseFloat(kpi.tauxAcceptationDevis) < 60 && kpi.nbDevis > 0) {
    recs.push('Le taux d\'acceptation des devis est inférieur à 60%. Améliorez la présentation des plans de traitement.');
  }
  if (kpi.nbNouveauxPatients < 2 * 22) {
    recs.push('Le nombre de nouveaux patients est faible. Investissez dans le marketing digital et la présence sur les réseaux sociaux.');
  }
  if (recs.length === 0) {
    recs.push('Les indicateurs sont globalement bons. Continuez à maintenir cette performance.');
    recs.push('Pensez à diversifier votre offre de soins (facettes, aligneurs) pour augmenter le panier moyen.');
  }
  
  return recs;
}

// POST /api/reports/generate - Générer un rapport pour un praticien
router.post('/generate', auth, async (req, res) => {
  try {
    const { practitionerCode, mois: rawMois } = req.body;
    const mois = normalizeMois(rawMois);

    if (!practitionerCode || !mois) {
      return res.status(400).json({ message: 'Code praticien et mois requis.' });
    }

    const practitioner = await User.findOne({ practitionerCode });
    if (!practitioner) {
      return res.status(404).json({ message: 'Praticien non trouvé.' });
    }

    const kpi = await calculateKPI(practitionerCode, mois);
    const recommandations = generateRecommendations(kpi);
    const historique = await getHistorique(practitionerCode);

    // Formater le mois pour l'affichage
    const moisFormate = mois.substring(0, 4) + '-' + mois.substring(4, 6);

    const reportData = {
      praticien: practitionerCode,
      praticienNom: practitioner.name,
      mois,
      moisFormate,
      cabinetName: practitioner.cabinetName,
      ...kpi,
      recommandations,
      historique,
      resumeIA: `Rapport mensuel ${moisFormate} pour Dr. ${practitioner.name}. ` +
        `CA: ${kpi.caMensuel.toFixed(2)}€, ${kpi.nbPatients} patients, ` +
        `Production horaire: ${kpi.productionHoraire}€/h.`
    };

    // Générer le PDF
    const pdfBuffer = await generatePDFReport(reportData);
    const pdfPath = `reports/${practitionerCode}_${mois}.pdf`;

    // Sauvegarder le rapport en base
    const report = await Report.findOneAndUpdate(
      { praticien: practitionerCode, mois },
      {
        praticien: practitionerCode,
        mois,
        type: 'mensuel',
        contenu: {
          caMensuel: kpi.caMensuel,
          nbPatients: kpi.nbPatients,
          nbNouveauxPatients: kpi.nbNouveauxPatients,
          nbRdv: kpi.nbRdv,
          panierMoyen: parseFloat(kpi.panierMoyen),
          productionHoraire: parseFloat(kpi.productionHoraire),
          tauxAcceptationDevis: parseFloat(kpi.tauxAcceptationDevis),
          heuresTravaillees: parseFloat(kpi.heuresTravaillees),
          recommandations,
          resumeIA: reportData.resumeIA
        },
        pdfPath
      },
      { upsert: true, new: true }
    );

    res.json({
      message: 'Rapport généré avec succès.',
      report,
      pdf: pdfBuffer.toString('base64')
    });
  } catch (error) {
    console.error('Erreur génération rapport:', error);
    res.status(500).json({ message: 'Erreur lors de la génération du rapport.' });
  }
});

// POST /api/reports/generate-all - Générer tous les rapports pour un mois
router.post('/generate-all', auth, async (req, res) => {
  try {
    const mois = normalizeMois(req.body.mois);
    if (!mois) {
      return res.status(400).json({ message: 'Mois requis.' });
    }

    const practitioners = await User.find({ role: 'practitioner', isActive: true });
    const results = [];

    for (const p of practitioners) {
      try {
        const kpi = await calculateKPI(p.practitionerCode, mois);
        const recommandations = generateRecommendations(kpi);
        const historique = await getHistorique(p.practitionerCode);
        const moisFormate = mois.substring(0, 4) + '-' + mois.substring(4, 6);

        const reportData = {
          praticien: p.practitionerCode,
          praticienNom: p.name,
          mois,
          moisFormate,
          cabinetName: p.cabinetName,
          ...kpi,
          recommandations,
          historique,
          resumeIA: `Rapport mensuel ${moisFormate} pour Dr. ${p.name}.`
        };

        const pdfBuffer = await generatePDFReport(reportData);

        const report = await Report.findOneAndUpdate(
          { praticien: p.practitionerCode, mois },
          {
            praticien: p.practitionerCode,
            mois,
            type: 'mensuel',
            contenu: {
              caMensuel: kpi.caMensuel,
              nbPatients: kpi.nbPatients,
              nbNouveauxPatients: kpi.nbNouveauxPatients,
              nbRdv: kpi.nbRdv,
              panierMoyen: parseFloat(kpi.panierMoyen),
              productionHoraire: parseFloat(kpi.productionHoraire),
              tauxAcceptationDevis: parseFloat(kpi.tauxAcceptationDevis),
              heuresTravaillees: parseFloat(kpi.heuresTravaillees),
              recommandations,
              resumeIA: reportData.resumeIA
            },
            pdfPath: `reports/${p.practitionerCode}_${mois}.pdf`
          },
          { upsert: true, new: true }
        );

        results.push({ practitioner: p.name, code: p.practitionerCode, status: 'success', reportId: report._id });
      } catch (err) {
        results.push({ practitioner: p.name, code: p.practitionerCode, status: 'error', error: err.message });
      }
    }

    res.json({
      message: `${results.filter(r => r.status === 'success').length}/${practitioners.length} rapports générés.`,
      results
    });
  } catch (error) {
    console.error('Erreur génération rapports:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// POST /api/reports/send - Envoyer les rapports par email
router.post('/send', auth, async (req, res) => {
  try {
    const mois = normalizeMois(req.body.mois);
    const force = req.body.force;
    if (!mois) {
      return res.status(400).json({ message: 'Mois requis.' });
    }

    // If force=true, send all reports for that month (even already sent)
    const filter = { mois };
    if (!force) {
      filter.emailEnvoye = false;
    }

    const reports = await Report.find(filter);
    if (reports.length === 0) {
      return res.status(404).json({ message: 'Aucun rapport à envoyer pour ce mois.' });
    }

    const results = [];
    for (const report of reports) {
      try {
        const practitioner = await User.findOne({ practitionerCode: report.praticien });
        const kpi = report.contenu;
        const moisFormate = mois.substring(0, 4) + '-' + mois.substring(4, 6);
        const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
        const moisLabel = `${months[parseInt(mois.substring(4, 6)) - 1]} ${mois.substring(0, 4)}`;

        const reportData = {
          praticien: report.praticien,
          praticienNom: practitioner?.name || report.praticien,
          mois,
          moisFormate,
          cabinetName: practitioner?.cabinetName || 'Cabinet',
          ...kpi,
          recommandations: kpi.recommandations || []
        };

        const historique = await getHistorique(report.praticien);
        reportData.historique = historique;
        const pdfBuffer = await generatePDFReport(reportData);

        await sendReportEmail({
          to: process.env.REPORT_RECIPIENT,
          subject: `RAPPORT DE PERFORMANCE - ${practitioner?.name || report.praticien} | ${moisLabel}`,
          practitionerName: practitioner?.name || report.praticien,
          mois: moisLabel,
          kpi,
          pdfBuffer,
          recommandations: kpi.recommandations || [],
          cabinetName: practitioner?.cabinetName || 'Cabinet',
          historique
        });

        report.emailEnvoye = true;
        report.dateEnvoi = new Date();
        report.destinataireEmail = process.env.REPORT_RECIPIENT;
        await report.save();

        results.push({ practitioner: practitioner?.name || report.praticien, status: 'sent' });
      } catch (err) {
        results.push({ practitioner: report.praticien, status: 'error', error: err.message });
      }
    }

    res.json({
      message: `${results.filter(r => r.status === 'sent').length}/${reports.length} emails envoyés.`,
      results
    });
  } catch (error) {
    console.error('Erreur envoi emails:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// POST /api/reports/send-now - Générer + Envoyer immédiatement tous les rapports pour un mois
router.post('/send-now', auth, async (req, res) => {
  try {
    const mois = normalizeMois(req.body.mois);
    if (!mois) {
      return res.status(400).json({ message: 'Mois requis.' });
    }

    const practitioners = await User.find({ role: 'practitioner', isActive: true });
    const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    const moisFormate = mois.substring(0, 4) + '-' + mois.substring(4, 6);
    const moisLabel = `${months[parseInt(mois.substring(4, 6)) - 1]} ${mois.substring(0, 4)}`;

    const results = [];

    for (const p of practitioners) {
      try {
        const kpi = await calculateKPI(p.practitionerCode, mois);
        const recommandations = generateRecommendations(kpi);
        const historique = await getHistorique(p.practitionerCode);

        const reportData = {
          praticien: p.practitionerCode,
          praticienNom: p.name,
          mois,
          moisFormate,
          cabinetName: p.cabinetName,
          ...kpi,
          recommandations,
          historique,
          resumeIA: `Rapport mensuel ${moisLabel} pour ${p.name}.`
        };

        const pdfBuffer = await generatePDFReport(reportData);

        // Save report
        await Report.findOneAndUpdate(
          { praticien: p.practitionerCode, mois },
          {
            praticien: p.practitionerCode,
            mois,
            type: 'mensuel',
            contenu: {
              caMensuel: kpi.caMensuel,
              montantEncaisse: kpi.montantEncaisse,
              nbPatients: kpi.nbPatients,
              nbNouveauxPatients: kpi.nbNouveauxPatients,
              nbRdv: kpi.nbRdv,
              panierMoyen: parseFloat(kpi.panierMoyen),
              productionHoraire: parseFloat(kpi.productionHoraire),
              tauxAcceptationDevis: parseFloat(kpi.tauxAcceptationDevis),
              heuresTravaillees: parseFloat(kpi.heuresTravaillees),
              recommandations,
              resumeIA: reportData.resumeIA
            },
            pdfPath: `reports/${p.practitionerCode}_${mois}.pdf`,
            emailEnvoye: true,
            dateEnvoi: new Date(),
            destinataireEmail: process.env.REPORT_RECIPIENT
          },
          { upsert: true, new: true }
        );

        // Send email
        await sendReportEmail({
          to: process.env.REPORT_RECIPIENT,
          subject: `RAPPORT DE PERFORMANCE - ${p.name} | ${moisLabel}`,
          practitionerName: p.name,
          mois: moisLabel,
          kpi,
          pdfBuffer,
          recommandations,
          cabinetName: p.cabinetName,
          historique
        });

        results.push({ practitioner: p.name, code: p.practitionerCode, status: 'sent' });
        console.log(`✅ Rapport généré et envoyé pour ${p.name}`);
      } catch (err) {
        results.push({ practitioner: p.name, code: p.practitionerCode, status: 'error', error: err.message });
        console.error(`❌ Erreur pour ${p.name}:`, err.message);
      }
    }

    const sent = results.filter(r => r.status === 'sent').length;
    res.json({
      message: `${sent}/${practitioners.length} rapports générés et envoyés à ${process.env.REPORT_RECIPIENT}.`,
      results
    });
  } catch (error) {
    console.error('Erreur send-now:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// GET /api/reports/list - Liste des rapports
router.get('/list', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'practitioner') {
      filter.praticien = req.user.practitionerCode;
    }
    if (req.query.mois) {
      filter.mois = normalizeMois(req.query.mois);
    }

    const reports = await Report.find(filter).sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// GET /api/reports/download/:id - Télécharger un rapport PDF
router.get('/download/:id', auth, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Rapport non trouvé.' });
    }

    // Vérifier l'accès
    if (req.user.role === 'practitioner' && report.praticien !== req.user.practitionerCode) {
      return res.status(403).json({ message: 'Accès refusé.' });
    }

    const practitioner = await User.findOne({ practitionerCode: report.praticien });
    const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    const moisLabel = report.mois ? `${months[parseInt(report.mois.substring(4, 6)) - 1]} ${report.mois.substring(0, 4)}` : '';

    const historique = await getHistorique(report.praticien);

    const reportData = {
      praticien: report.praticien,
      praticienNom: practitioner?.name || report.praticien,
      mois: report.mois,
      moisFormate: moisLabel,
      cabinetName: practitioner?.cabinetName || 'Cabinet',
      ...report.contenu.toObject(),
      recommandations: report.contenu.recommandations || [],
      historique
    };

    const pdfBuffer = await generatePDFReport(reportData);

    // Check if buffer is a real PDF (starts with %PDF)
    const isPdf = pdfBuffer.length > 4 && pdfBuffer[0] === 0x25 && pdfBuffer[1] === 0x50 && pdfBuffer[2] === 0x44 && pdfBuffer[3] === 0x46;

    if (isPdf) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=rapport_${report.praticien}_${report.mois}.pdf`);
    } else {
      // Fallback HTML
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=rapport_${report.praticien}_${report.mois}.html`);
    }
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Erreur download rapport:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// GET /api/reports/available-months - Lister tous les mois disponibles dans la DB
router.get('/available-months', auth, async (req, res) => {
  try {
    const months = await AnalyseRealisation.distinct('mois');
    // Trier décroissant (plus récent en premier)
    const sorted = months.sort((a, b) => b.localeCompare(a));
    
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    
    const result = sorted.map(m => ({
      value: m,
      label: `${monthNames[parseInt(m.substring(4, 6)) - 1]} ${m.substring(0, 4)}`
    }));
    
    res.json(result);
  } catch (error) {
    console.error('Erreur available-months:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;
