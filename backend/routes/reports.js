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

const KPI_CACHE_TTL_MS = 60 * 1000;
const kpiCache = new Map();

function getCachedKpis(mois) {
  const cacheEntry = kpiCache.get(mois);
  if (!cacheEntry) return null;
  if (Date.now() - cacheEntry.ts > KPI_CACHE_TTL_MS) {
    kpiCache.delete(mois);
    return null;
  }
  return cacheEntry.data;
}

function setCachedKpis(mois, data) {
  kpiCache.set(mois, { ts: Date.now(), data });
}

function invalidateKpisCache(mois) {
  if (mois) {
    kpiCache.delete(mois);
    return;
  }
  kpiCache.clear();
}

// Normalize mois: ensure 8-digit format YYYYMMDD (append '01' if 6-digit YYYYMM)
function normalizeMois(m) {
  if (!m) return m;
  m = String(m).trim();
  if (m.length === 6) return m + '01';
  return m;
}

// Helper: Get monthly historique for a practitioner up to targetMois (ascending order)
async function getHistorique(practitionerCode, targetMois = null) {
  const match = { praticien: practitionerCode };
  if (targetMois) match.mois = { $lte: targetMois };

  const results = await AnalyseRealisation.aggregate([
    { $match: match },
    { $group: {
      _id: '$mois',
      ca: { $sum: '$montantFacture' },
      encaisse: { $sum: '$montantEncaisse' },
      patients: { $sum: '$nbPatients' }
    }},
    { $sort: { _id: 1 } }  // ascendant : du plus ancien vers targetMois
  ]);

  const rdvByMonth = await AnalyseRendezVous.aggregate([
    { $match: match },
    { $group: { _id: '$mois', rdv: { $sum: '$nbRdv' } } }
  ]);
  const heuresByMonth = await AnalyseJoursOuverts.aggregate([
    { $match: match },
    { $group: { _id: '$mois', heures: { $sum: '$nbHeures' } } }
  ]);

  const rdvMap = new Map(rdvByMonth.map((x) => [String(x._id), Number(x.rdv || 0)]));
  const heuresMap = new Map(heuresByMonth.map((x) => [String(x._id), Number(x.heures || 0)]));

  const enriched = results.map((r) => ({
    mois: r._id,
    ca: r.ca,
    encaisse: r.encaisse,
    patients: r.patients,
    rdv: rdvMap.get(String(r._id)) || 0,
    heures: heuresMap.get(String(r._id)) || 0
  }));

  return enriched; // déjà trié ascendant
}

// Helper: Calculer les KPI d'un praticien pour un mois donné
async function calculateKPI(practitionerCode, mois) {
  const mois6 = String(mois).substring(0, 6);
  const realisation = await AnalyseRealisation.aggregate([
    { $match: { praticien: practitionerCode, mois: { $regex: '^' + mois6 } } },
    { $group: {
      _id: null,
      totalFacture: { $sum: '$montantFacture' },
      totalEncaisse: { $sum: '$montantEncaisse' },
      totalPatients: { $sum: '$nbPatients' }
    }}
  ]);

  const rdv = await AnalyseRendezVous.findOne({ praticien: practitionerCode, mois: { $regex: '^' + mois6 } });
  const heures = await AnalyseJoursOuverts.findOne({ praticien: practitionerCode, mois: { $regex: '^' + mois6 } });
  const devis = await AnalyseDevis.findOne({ praticien: practitionerCode, mois: { $regex: '^' + mois6 } });

  const hist = await AnalyseRealisation.aggregate([
    { $match: { praticien: practitionerCode, mois: { $lte: mois6 } } },
    { $group: { _id: '$mois', ca: { $sum: '$montantFacture' } } },
    { $sort: { _id: 1 } }
  ]);

  const ca = realisation[0]?.totalFacture || 0;
  const patients = realisation[0]?.totalPatients || 0;
  const heuresTravaillees = heures ? heures.nbHeures / 60 : 0;

  const nbRdv = rdv?.nbRdv || 0;
  const rdvHonores = rdv?.rdvHonores || 0;
  const rdvManques = rdv?.rdvManques || 0;
  const annulations = rdv?.annulations || 0;
  const reportsRdv = rdv?.reports || 0;
  const rdvImportants = rdv?.rdvImportants || 0;
  const tauxAbsence = nbRdv > 0 ? (((rdvManques + annulations) / nbRdv) * 100).toFixed(1) : 0;

  let objectif = Math.round(ca * 1.1);
  let objectifHoraire = 300;
  if (hist.length > 1) {
    const prev = hist[hist.length - 2];
    const prevMois6 = String(prev?._id || '').substring(0, 6);
    const prevCa = Number(prev?.ca || 0);
    objectif = prevCa > 0 ? Math.round(prevCa) : objectif;

    const prevHeuresDoc = await AnalyseJoursOuverts.findOne({
      praticien: practitionerCode,
      mois: { $regex: '^' + prevMois6 }
    });
    const prevHeures = Number(prevHeuresDoc?.nbHeures || 0) / 60;
    const prevProdHoraire = prevHeures > 0 ? (prevCa / prevHeures) : 0;
    objectifHoraire = prevProdHoraire > 0 ? Math.round(prevProdHoraire) : 300;
  }

  return {
    caMensuel: ca,
    montantEncaisse: realisation[0]?.totalEncaisse || 0,
    tauxEncaissement: ca > 0 ? ((( realisation[0]?.totalEncaisse || 0) / ca) * 100).toFixed(1) : 0,
    nbPatients: patients,
    nbNouveauxPatients: rdv?.nbNouveauxPatients || 0,
    panierMoyen: patients > 0 ? (ca / patients).toFixed(2) : 0,
    productionHoraire: heuresTravaillees > 0 ? (ca / heuresTravaillees).toFixed(2) : 0,
    heuresTravaillees: heuresTravaillees.toFixed(1),
    nbHeuresMin: heures?.nbHeures || 0,
    joursOuverts: heures?.joursOuverts || 0,
    // RDV enrichis
    nbRdv,
    rdvHonores,
    rdvManques,
    annulations,
    reportsRdv,
    rdvImportants,
    rdvParJour: rdv?.rdvParJour || 0,
    dureeMoyenneRdv: rdv && nbRdv > 0 ? (rdv.dureeTotaleRdv / nbRdv).toFixed(1) : 0,
    dureeMoyennePrevue: rdv?.dureeMoyennePrevue || 0,
    tauxAbsence,
    // Devis enrichis
    nbDevis: devis?.nbDevis || 0,
    montantDevisPropose: devis?.montantPropositions || 0,
    nbDevisAcceptes: devis?.nbDevisAcceptes || 0,
    montantDevisAccepte: devis?.montantAccepte || 0,
    montantDevisRealise: devis?.montantTotalRealise || 0,
    tauxAcceptationDevis: devis && devis.nbDevis > 0
      ? ((devis.nbDevisAcceptes / devis.nbDevis) * 100).toFixed(1)
      : (devis?.tauxAcceptationNombre || 0),
    tauxAcceptationMontant: devis?.tauxAcceptationMontant || 0,
    delaiMoyenAcceptation: devis?.delaiMoyenAcceptation || 0,
    objectif,
    objectifHoraire
  };
}

function buildStoredReportContent(kpi, recommandations, resumeIA) {
  return {
    caMensuel: Number(kpi.caMensuel || 0),
    montantEncaisse: Number(kpi.montantEncaisse || 0),
    tauxEncaissement: Number(kpi.tauxEncaissement || 0),
    nbPatients: Number(kpi.nbPatients || 0),
    nbNouveauxPatients: Number(kpi.nbNouveauxPatients || 0),
    nbRdv: Number(kpi.nbRdv || 0),
    panierMoyen: Number(kpi.panierMoyen || 0),
    productionHoraire: Number(kpi.productionHoraire || 0),
    heuresTravaillees: Number(kpi.heuresTravaillees || 0),
    nbDevis: Number(kpi.nbDevis || 0),
    nbDevisAcceptes: Number(kpi.nbDevisAcceptes || 0),
    tauxAcceptationDevis: Number(kpi.tauxAcceptationDevis || 0),
    tauxAbsence: Number(kpi.tauxAbsence || 0),
    objectif: Number(kpi.objectif || 0),
    objectifHoraire: Number(kpi.objectifHoraire || 0),
    financialCommentary: String(kpi.financialCommentary || ''),
    recommandations,
    resumeIA
  };
}

function getCommentaryStyleByRole(role) {
  return role === 'practitioner' ? 'practitioner' : 'consultant';
}

function generateFinancialCommentary(kpi, practitionerCode, mois, style = 'consultant') {
  const ca = Number(kpi.caMensuel || 0);
  const objectif = Number(kpi.objectif || 0);
  const encaisse = Number(kpi.montantEncaisse || 0);
  const prod = Number(kpi.productionHoraire || 0);
  const objProd = Number(kpi.objectifHoraire || 0);
  const tauxEnc = ca > 0 ? (encaisse / ca) * 100 : 0;
  const tauxDevis = Number(kpi.tauxAcceptationDevis || 0);
  const ecartCA = ca - objectif;
  const ecartProd = prod - objProd;

  const key = `${practitionerCode || ''}${mois || ''}${style}`;
  const variant = key.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 3;

  let ouverture;
  const isConsultantStyle = style === 'consultant';
  if (ecartCA >= 0 && tauxEnc >= 90) {
    const opts = isConsultantStyle
      ? [
        `Le cabinet surperforme ce mois-ci: le CA dépasse la cible de ${Math.abs(Math.round(ecartCA)).toLocaleString('fr-FR')} EUR avec une conversion en trésorerie élevée.`,
        `La trajectoire business est robuste: objectif dépassé et encaissement sécurisé, ce qui améliore la visibilité financière.`,
        `Les indicateurs valident un mois très performant, avec un CA au-dessus du plan et un excellent niveau d'encaissement.`
      ]
      : [
        `Très bon mois: vous êtes au-dessus de l'objectif de ${Math.abs(Math.round(ecartCA)).toLocaleString('fr-FR')} EUR et l'encaissement suit bien.`,
        `La dynamique est positive sur le terrain: objectif atteint puis dépassé, avec des règlements bien récupérés.`,
        `Vos résultats sont solides: bonne production clinique et encaissement efficace sur la période.`
      ];
    ouverture = opts[variant];
  } else if (ecartCA >= 0) {
    const opts = isConsultantStyle
      ? [
        `Le CA est conforme au plan, avec un levier de marge immédiat sur l'accélération de l'encaissement.`,
        `Le mois est dans la cible côté production; la priorité business reste la vitesse de conversion en cash.`,
        `La performance est stable et alignée avec l'objectif, mais la trésorerie peut être sécurisée plus tôt.`
      ]
      : [
        `Objectif atteint, bravo. Le point à travailler est surtout de transformer plus vite en encaissement.`,
        `Vous êtes dans le bon rythme de production; l'étape suivante est de réduire le délai de règlement.`,
        `Le niveau d'activité est bon ce mois-ci, avec encore du potentiel sur la partie encaissement.`
      ];
    ouverture = opts[variant];
  } else {
    const opts = isConsultantStyle
      ? [
        `Le CA reste sous la cible de ${Math.abs(Math.round(ecartCA)).toLocaleString('fr-FR')} EUR; un recentrage commercial est nécessaire à court terme.`,
        `Le mois est en retrait par rapport au plan et nécessite une action immédiate sur le pipeline devis et les relances.`,
        `La performance financière est inférieure à l'attendu, avec un gap à corriger sur les prochaines semaines.`
      ]
      : [
        `Le CA est en dessous de l'objectif de ${Math.abs(Math.round(ecartCA)).toLocaleString('fr-FR')} EUR; il faut reprendre de l'avance rapidement.`,
        `Le mois est plus difficile que prévu: priorisez les devis à fort potentiel et le suivi des patients hésitants.`,
        `La période est en retrait par rapport à l'objectif, mais un plan d'action simple peut corriger la trajectoire.`
      ];
    ouverture = opts[variant];
  }

  const productivite = ecartProd >= 0
    ? (isConsultantStyle
      ? `La productivité horaire est au-dessus de la référence (${Math.round(prod)} EUR/h vs ${Math.round(objProd)} EUR/h), ce qui soutient la rentabilité.`
      : `Votre productivité horaire est au-dessus de la référence (${Math.round(prod)} EUR/h vs ${Math.round(objProd)} EUR/h), continuez ce rythme.`)
    : (isConsultantStyle
      ? `La productivité horaire reste sous la référence (${Math.round(prod)} EUR/h vs ${Math.round(objProd)} EUR/h) et pèse sur l'efficacité opérationnelle.`
      : `La productivité horaire est sous la référence (${Math.round(prod)} EUR/h vs ${Math.round(objProd)} EUR/h): ajustez la planification des actes pour remonter.`);

  const devis = tauxDevis >= 65
    ? (isConsultantStyle
      ? `Le taux d'acceptation des devis (${tauxDevis.toFixed(1)}%) soutient correctement la croissance du chiffre d'affaires.`
      : `Le taux d'acceptation des devis (${tauxDevis.toFixed(1)}%) est bon et soutient votre activité.`)
    : (isConsultantStyle
      ? `Le taux d'acceptation des devis (${tauxDevis.toFixed(1)}%) limite la progression et nécessite une stratégie de conversion plus active.`
      : `Le taux d'acceptation des devis (${tauxDevis.toFixed(1)}%) freine la progression: renforcez l'explication des plans de traitement.`);

  return `${ouverture} ${productivite} ${devis}`;
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

    const commentaryStyle = getCommentaryStyleByRole(req.user.role);
    const kpi = await calculateKPI(practitionerCode, mois);
    kpi.financialCommentary = generateFinancialCommentary(kpi, practitionerCode, mois, commentaryStyle);
    const recommandations = generateRecommendations(kpi);
    const historique = await getHistorique(practitionerCode, mois);

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
        contenu: buildStoredReportContent(kpi, recommandations, reportData.resumeIA),
        pdfPath
      },
      { upsert: true, new: true }
    );

    invalidateKpisCache(mois);

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
    const commentaryStyle = getCommentaryStyleByRole(req.user.role);
    const results = [];

    for (const p of practitioners) {
      try {
        const kpi = await calculateKPI(p.practitionerCode, mois);
        kpi.financialCommentary = generateFinancialCommentary(kpi, p.practitionerCode, mois, commentaryStyle);
        const recommandations = generateRecommendations(kpi);
        const historique = await getHistorique(p.practitionerCode, mois);
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
            contenu: buildStoredReportContent(kpi, recommandations, reportData.resumeIA),
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

    invalidateKpisCache(mois);
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

        const historique = await getHistorique(report.praticien, mois);
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

    invalidateKpisCache(mois);
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
    const commentaryStyle = getCommentaryStyleByRole(req.user.role);
    const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    const moisFormate = mois.substring(0, 4) + '-' + mois.substring(4, 6);
    const moisLabel = `${months[parseInt(mois.substring(4, 6)) - 1]} ${mois.substring(0, 4)}`;

    const results = [];

    for (const p of practitioners) {
      try {
        const kpi = await calculateKPI(p.practitionerCode, mois);
        kpi.financialCommentary = generateFinancialCommentary(kpi, p.practitionerCode, mois, commentaryStyle);
        const recommandations = generateRecommendations(kpi);
        const historique = await getHistorique(p.practitionerCode, mois);

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
            contenu: buildStoredReportContent(kpi, recommandations, reportData.resumeIA),
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
    
    // Envoyer notification récapitulative à maarzoukrayan3@gmail.com
    try {
      const emailService = require('../services/emailService');
      const now = new Date();
      const dateAction = now.toLocaleDateString('fr-FR') + ' à ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const successList = results.filter(r => r.status === 'sent').map(r => `✅ ${r.practitioner} (${r.code})`).join('<br>');
      const errorList = results.filter(r => r.status === 'error').map(r => `❌ ${r.practitioner}: ${r.error}`).join('<br>');
      
      const notificationHtml = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 16px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 800;">📊 RAPPORTS GÉNÉRÉS & ENVOYÉS</h1>
            <p style="color: #d1fae5; margin: 8px 0 0; font-size: 13px;">Efficience Analytics</p>
          </div>
          <div style="padding: 32px;">
            <div style="background: white; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
              <h2 style="margin: 0 0 16px; font-size: 18px; color: #1e293b;">📋 Récapitulatif de l'action</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-size: 13px; border-bottom: 1px solid #f1f5f9;">Date & Heure</td>
                  <td style="padding: 10px 0; color: #1e293b; font-weight: 600; font-size: 14px; border-bottom: 1px solid #f1f5f9;">📅 ${dateAction}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-size: 13px; border-bottom: 1px solid #f1f5f9;">Période</td>
                  <td style="padding: 10px 0; color: #1e293b; font-weight: 600; font-size: 14px; border-bottom: 1px solid #f1f5f9;">${moisLabel}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-size: 13px; border-bottom: 1px solid #f1f5f9;">Rapports envoyés</td>
                  <td style="padding: 10px 0; font-weight: 600; font-size: 14px; border-bottom: 1px solid #f1f5f9;">
                    <span style="background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 20px; font-size: 12px;">✅ ${sent}/${practitioners.length}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #64748b; font-size: 13px;">Destinataire</td>
                  <td style="padding: 10px 0; color: #1e293b; font-weight: 600; font-size: 14px;">${process.env.REPORT_RECIPIENT}</td>
                </tr>
              </table>
            </div>
            ${successList ? `
            <div style="background: #f0fdf4; border-radius: 12px; padding: 16px; border: 1px solid #bbf7d0; margin-bottom: 16px;">
              <p style="margin: 0 0 10px; font-weight: 700; color: #166534; font-size: 14px;">Rapports envoyés avec succès :</p>
              <p style="margin: 0; font-size: 13px; color: #15803d; line-height: 1.8;">${successList}</p>
            </div>
            ` : ''}
            ${errorList ? `
            <div style="background: #fef2f2; border-radius: 12px; padding: 16px; border: 1px solid #fecaca;">
              <p style="margin: 0 0 10px; font-weight: 700; color: #991b1b; font-size: 14px;">Erreurs :</p>
              <p style="margin: 0; font-size: 13px; color: #dc2626; line-height: 1.8;">${errorList}</p>
            </div>
            ` : ''}
          </div>
          <div style="padding: 16px 32px 24px; text-align: center; background: #f1f5f9;">
            <p style="margin: 0; font-size: 11px; color: #94a3b8;">Efficience Analytics — Notification automatique</p>
          </div>
        </div>
      `;
      
      await emailService.sendMail({
        to: 'maarzoukrayan3@gmail.com',
        subject: `📊 Rapports ${moisLabel} - ${sent}/${practitioners.length} envoyés`,
        html: notificationHtml
      });
      console.log('✅ Notification récapitulative envoyée à maarzoukrayan3@gmail.com');
    } catch (notifErr) {
      console.error('Erreur envoi notification récap:', notifErr.message);
    }
    
    res.json({
      message: `${sent}/${practitioners.length} rapports générés et envoyés à ${process.env.REPORT_RECIPIENT}.`,
      results
    });

    invalidateKpisCache(mois);
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
    if (req.user.role !== 'practitioner' && req.query.praticien) {
      filter.praticien = String(req.query.praticien).toUpperCase();
    }
    if (req.query.mois) {
      filter.mois = normalizeMois(req.query.mois);
    }

    const reports = await Report.find(filter).sort({ updatedAt: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// POST /api/reports/send-one - Envoyer un rapport unique au destinataire configuré
router.post('/send-one', auth, async (req, res) => {
  try {
    const { reportId } = req.body;
    if (!reportId) {
      return res.status(400).json({ message: 'ID rapport requis.' });
    }

    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: 'Rapport introuvable.' });
    }

    if (req.user.role === 'practitioner' && report.praticien !== req.user.practitionerCode) {
      return res.status(403).json({ message: 'Accès refusé.' });
    }

    const practitioner = await User.findOne({ practitionerCode: report.praticien });
    const kpiDoc = report.contenu || {};
    const kpi = typeof kpiDoc.toObject === 'function' ? kpiDoc.toObject() : kpiDoc;
    if (!kpi.financialCommentary) {
      const commentaryStyle = getCommentaryStyleByRole(req.user.role);
      kpi.financialCommentary = generateFinancialCommentary(kpi, report.praticien, report.mois, commentaryStyle);
    }
    const mois = report.mois;
    const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    const moisLabel = mois ? `${months[parseInt(mois.substring(4, 6)) - 1]} ${mois.substring(0, 4)}` : '';

    const historique = await getHistorique(report.praticien, mois);
    const reportData = {
      praticien: report.praticien,
      praticienNom: practitioner?.name || report.praticien,
      mois,
      moisFormate: moisLabel,
      cabinetName: practitioner?.cabinetName || 'Cabinet',
      ...kpi,
      recommandations: kpi.recommandations || [],
      historique
    };

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

    invalidateKpisCache(report.mois);

    res.json({ message: `Rapport envoyé à ${process.env.REPORT_RECIPIENT}.` });
  } catch (error) {
    console.error('Erreur send-one:', error);
    res.status(500).json({ message: 'Erreur lors de l\'envoi du rapport.' });
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

    const historique = await getHistorique(report.praticien, report.mois);

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

// GET /api/reports/kpis/:mois - KPIs live de tous les praticiens pour un mois donné
router.get('/kpis/:mois', auth, async (req, res) => {
  try {
    const mois = normalizeMois(req.params.mois);
    if (!mois) return res.status(400).json({ message: 'Mois requis.' });

    const cached = getCachedKpis(mois);
    if (cached) {
      return res.json(cached);
    }

    const mois6 = String(mois).substring(0, 6);

    const practitioners = await User.find({ role: 'practitioner', isActive: true }).lean();

    const [
      realisationsAgg,
      rdvAgg,
      heuresAgg,
      devisAgg,
      existingReports
    ] = await Promise.all([
      AnalyseRealisation.aggregate([
        { $match: { mois: { $regex: '^' + mois6 } } },
        {
          $group: {
            _id: '$praticien',
            totalFacture: { $sum: '$montantFacture' },
            totalEncaisse: { $sum: '$montantEncaisse' },
            totalPatients: { $sum: '$nbPatients' }
          }
        }
      ]),
      AnalyseRendezVous.aggregate([
        { $match: { mois: { $regex: '^' + mois6 } } },
        {
          $group: {
            _id: '$praticien',
            nbRdv: { $sum: '$nbRdv' },
            nbNouveauxPatients: { $sum: '$nbNouveauxPatients' },
            rdvHonores: { $sum: '$rdvHonores' },
            rdvManques: { $sum: '$rdvManques' },
            annulations: { $sum: '$annulations' },
            reportsRdv: { $sum: '$reports' },
            rdvImportants: { $sum: '$rdvImportants' },
            dureeTotaleRdv: { $sum: '$dureeTotaleRdv' }
          }
        }
      ]),
      AnalyseJoursOuverts.aggregate([
        { $match: { mois: { $regex: '^' + mois6 } } },
        {
          $group: {
            _id: '$praticien',
            nbHeures: { $sum: '$nbHeures' },
            joursOuverts: { $sum: '$joursOuverts' }
          }
        }
      ]),
      AnalyseDevis.aggregate([
        { $match: { mois: { $regex: '^' + mois6 } } },
        {
          $group: {
            _id: '$praticien',
            nbDevis: { $sum: '$nbDevis' },
            nbDevisAcceptes: { $sum: '$nbDevisAcceptes' },
            montantPropositions: { $sum: '$montantPropositions' },
            montantAccepte: { $sum: '$montantAccepte' },
            montantTotalRealise: { $sum: '$montantTotalRealise' }
          }
        }
      ]),
      Report.find({ mois }, { praticien: 1, emailEnvoye: 1 }).lean()
    ]);

    const mapByCode = (arr) => new Map(arr.map((x) => [String(x._id), x]));
    const realMap = mapByCode(realisationsAgg);
    const rdvMap = mapByCode(rdvAgg);
    const heuresMap = mapByCode(heuresAgg);
    const devisMap = mapByCode(devisAgg);
    const reportMap = new Map(existingReports.map((r) => [String(r.praticien), r]));

    const results = practitioners.map((p) => {
      const code = String(p.practitionerCode || '').toUpperCase();
      const real = realMap.get(code) || {};
      const rdv = rdvMap.get(code) || {};
      const heures = heuresMap.get(code) || {};
      const devis = devisMap.get(code) || {};
      const report = reportMap.get(code);

      const caMensuel = Number(real.totalFacture || 0);
      const montantEncaisse = Number(real.totalEncaisse || 0);
      const nbPatients = Number(real.totalPatients || 0);
      const nbRdv = Number(rdv.nbRdv || 0);
      const nbNouveauxPatients = Number(rdv.nbNouveauxPatients || 0);
      const rdvManques = Number(rdv.rdvManques || 0);
      const annulations = Number(rdv.annulations || 0);
      const totalMinutes = Number(heures.nbHeures || 0);
      const heuresTravaillees = totalMinutes / 60;
      const nbDevis = Number(devis.nbDevis || 0);
      const nbDevisAcceptes = Number(devis.nbDevisAcceptes || 0);

      const kpi = {
        caMensuel,
        montantEncaisse,
        tauxEncaissement: caMensuel > 0 ? Number(((montantEncaisse / caMensuel) * 100).toFixed(1)) : 0,
        nbPatients,
        nbNouveauxPatients,
        nbRdv,
        panierMoyen: nbPatients > 0 ? Number((caMensuel / nbPatients).toFixed(2)) : 0,
        productionHoraire: heuresTravaillees > 0 ? Number((caMensuel / heuresTravaillees).toFixed(2)) : 0,
        heuresTravaillees: Number(heuresTravaillees.toFixed(1)),
        nbHeuresMin: totalMinutes,
        joursOuverts: Number(heures.joursOuverts || 0),
        rdvHonores: Number(rdv.rdvHonores || 0),
        rdvManques,
        annulations,
        reportsRdv: Number(rdv.reportsRdv || 0),
        rdvImportants: Number(rdv.rdvImportants || 0),
        dureeMoyenneRdv: nbRdv > 0 ? Number((Number(rdv.dureeTotaleRdv || 0) / nbRdv).toFixed(1)) : 0,
        tauxAbsence: nbRdv > 0 ? Number((((rdvManques + annulations) / nbRdv) * 100).toFixed(1)) : 0,
        nbDevis,
        nbDevisAcceptes,
        montantDevisPropose: Number(devis.montantPropositions || 0),
        montantDevisAccepte: Number(devis.montantAccepte || 0),
        montantDevisRealise: Number(devis.montantTotalRealise || 0),
        tauxAcceptationDevis: nbDevis > 0 ? Number(((nbDevisAcceptes / nbDevis) * 100).toFixed(1)) : 0
      };

      return {
        code,
        name: p.name,
        cabinetName: p.cabinetName || p.name,
        hasData: kpi.caMensuel > 0 || kpi.nbRdv > 0 || kpi.nbDevis > 0,
        reportGenerated: !!report,
        reportSent: report?.emailEnvoye || false,
        reportId: report?._id || null,
        kpi
      };
    });

    const payload = { mois, practitioners: results };
    setCachedKpis(mois, payload);
    res.json(payload);
  } catch (error) {
    console.error('Erreur kpis/:mois:', error);
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

// GET /api/reports/recipient - Destinataire email configuré
router.get('/recipient', auth, async (req, res) => {
  res.json({ recipientEmail: process.env.REPORT_RECIPIENT || '' });
});

module.exports = router;
