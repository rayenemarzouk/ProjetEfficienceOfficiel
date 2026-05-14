const express = require('express');
const router = express.Router();
const crypto = require('crypto');
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

  let nbRdv = rdv?.nbRdv || 0;
  let rdvHonores = rdv?.rdvHonores || 0;
  let rdvManques = rdv?.rdvManques || 0;
  let annulations = rdv?.annulations || 0;
  const reportsRdv = rdv?.reports || 0;
  const rdvImportants = rdv?.rdvImportants || 0;

  // Inférer les données RDV manquantes depuis nbRdv et/ou nbPatients (ratio 60% manqués / 40% annulations)
  if (rdvHonores === 0 && rdvManques === 0 && annulations === 0) {
    if (nbRdv > 0) {
      const ecart = Math.max(0, nbRdv - patients);
      rdvHonores = Math.min(patients, nbRdv);
      rdvManques = Math.round(ecart * 0.6);
      annulations = Math.round(ecart * 0.4);
    } else if (patients > 0) {
      // Aucun document AnalyseRendezVous pour ce mois — inférer depuis les patients
      nbRdv = patients;
      rdvHonores = patients;
      rdvManques = 0;
      annulations = 0;
    }
  }

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
    joursOuverts: heures?.joursOuverts || (heuresTravaillees > 0 ? Math.round(heuresTravaillees / 7) : 0),
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
  const tauxEnc = ca > 0 ? Math.round((encaisse / ca) * 100) : 0;
  const tauxDevis = Math.round(Number(kpi.tauxAcceptationDevis || 0));
  const nbDevis = Number(kpi.nbDevis || 0);
  const nbDevisAcceptes = Number(kpi.nbDevisAcceptes || 0);
  const nbRdv = Number(kpi.nbRdv || 0);
  const tauxAbsence = Math.round(Number(kpi.tauxAbsence || 0));
  const ecartCA = ca - objectif;
  const ecartPct = objectif > 0 ? Math.round((ecartCA / objectif) * 100) : 0;
  const isConsultant = style === 'consultant';

  const fmt = (n) => Math.round(n).toLocaleString('fr-FR');

  // --- Paragraphe 1 : bilan chiffré du CA + productivité ---
  let para1 = '';
  if (ca > 0 && objectif > 0) {
    if (ecartCA >= 0) {
      para1 = isConsultant
        ? `Le cabinet affiche ce mois un chiffre d'affaires de ${fmt(ca)} €, soit ${ecartPct > 0 ? '+' + ecartPct : ecartPct}% par rapport à l'objectif fixé à ${fmt(objectif)} €. La dynamique de production est bien orientée.`
        : `Votre CA du mois s'élève à ${fmt(ca)} €, au-dessus de l'objectif de ${fmt(objectif)} € (${ecartPct > 0 ? '+' + ecartPct : ecartPct}%). Bonne dynamique à maintenir.`;
    } else {
      para1 = isConsultant
        ? `Le cabinet enregistre un chiffre d'affaires de ${fmt(ca)} € ce mois-ci, en retrait de ${Math.abs(ecartPct)}% par rapport à l'objectif de ${fmt(objectif)} €. Un plan d'action à court terme est nécessaire pour corriger la trajectoire.`
        : `Votre CA du mois est de ${fmt(ca)} €, soit ${Math.abs(ecartPct)}% en dessous de l'objectif de ${fmt(objectif)} €. Il faut rattraper ce retard rapidement.`;
    }
  } else if (ca > 0) {
    para1 = isConsultant
      ? `Le cabinet enregistre un chiffre d'affaires de ${fmt(ca)} € ce mois-ci.`
      : `Votre CA du mois s'élève à ${fmt(ca)} €.`;
  } else {
    para1 = isConsultant
      ? "Les données de production du mois ne permettent pas encore d'établir un bilan financier complet."
      : "Les données de production du mois sont en cours de consolidation.";
  }

  // Productivité horaire chiffrée
  if (prod > 0) {
    if (objProd > 0) {
      const prodEcart = Math.round(prod - objProd);
      para1 += isConsultant
        ? ` La productivité horaire atteint ${fmt(prod)} €/h (objectif : ${fmt(objProd)} €/h, écart : ${prodEcart >= 0 ? '+' : ''}${fmt(prodEcart)} €/h).`
        : ` Votre productivité horaire est de ${fmt(prod)} €/h (objectif : ${fmt(objProd)} €/h).`;
    } else {
      para1 += isConsultant
        ? ` La productivité horaire s'établit à ${fmt(prod)} €/h.`
        : ` Votre productivité horaire est de ${fmt(prod)} €/h.`;
    }
  }

  // --- Paragraphe 2 : encaissement chiffré ---
  let para2 = '';
  if (ca > 0) {
    const nonEncaisse = ca - encaisse;
    if (tauxEnc >= 90) {
      para2 = isConsultant
        ? `L'encaissement est très satisfaisant ce mois-ci : ${fmt(encaisse)} € encaissés sur ${fmt(ca)} € produits, soit un taux de ${tauxEnc}%. La trésorerie du cabinet est bien alimentée.`
        : `Encaissement solide : ${fmt(encaisse)} € encaissés sur ${fmt(ca)} € (${tauxEnc}%). Votre trésorerie est bien gérée.`;
    } else if (tauxEnc >= 75) {
      para2 = isConsultant
        ? `Le taux d'encaissement s'élève à ${tauxEnc}% (${fmt(encaisse)} € sur ${fmt(ca)} € produits). Un solde de ${fmt(nonEncaisse)} € reste à recouvrer ; une relance ciblée permettrait d'améliorer rapidement la trésorerie.`
        : `Taux d'encaissement : ${tauxEnc}% (${fmt(encaisse)} € / ${fmt(ca)} €). Il reste ${fmt(nonEncaisse)} € à encaisser — pensez à relancer les règlements en attente.`;
    } else if (ca > 0) {
      para2 = isConsultant
        ? `L'encaissement présente un écart significatif : seulement ${tauxEnc}% encaissé (${fmt(encaisse)} € sur ${fmt(ca)} €), laissant ${fmt(nonEncaisse)} € de créances en attente. L'accélération du recouvrement est une priorité immédiate pour la trésorerie du cabinet.`
        : `Attention : seulement ${tauxEnc}% encaissé ce mois-ci (${fmt(encaisse)} € sur ${fmt(ca)} €). Il faut accélérer les relances de règlement pour les ${fmt(nonEncaisse)} € restants.`;
    }
  }

  // --- Paragraphe 3 : devis et RDV chiffrés ---
  let para3 = '';
  if (nbDevis > 0) {
    if (tauxDevis >= 75) {
      para3 = isConsultant
        ? `La conversion des devis est excellente ce mois-ci : ${nbDevisAcceptes} devis acceptés sur ${nbDevis} présentés (${tauxDevis}%). Ce niveau de transformation sécurise le chiffre d'affaires futur du cabinet.`
        : `Très bon taux d'acceptation des devis : ${nbDevisAcceptes}/${nbDevis} (${tauxDevis}%). Continuez à bien présenter vos plans de traitement.`;
    } else if (tauxDevis >= 60) {
      para3 = isConsultant
        ? `Le taux d'acceptation des devis s'établit à ${tauxDevis}% (${nbDevisAcceptes} acceptés sur ${nbDevis} présentés). Ce niveau est acceptable mais perfectible — un suivi actif des ${nbDevis - nbDevisAcceptes} devis restants pourrait générer un complément de chiffre d'affaires significatif.`
        : `Taux d'acceptation des devis : ${tauxDevis}% (${nbDevisAcceptes}/${nbDevis}). Les ${nbDevis - nbDevisAcceptes} devis en attente représentent un levier de croissance direct.`;
    } else {
      para3 = isConsultant
        ? `Le taux d'acceptation des devis est insuffisant : ${nbDevisAcceptes} acceptés sur ${nbDevis} présentés (${tauxDevis}%). Ce niveau fragilise la visibilité financière à court terme. Il est impératif de travailler la qualité de présentation des plans de traitement et de relancer systématiquement les ${nbDevis - nbDevisAcceptes} devis en attente.`
        : `Taux d'acceptation des devis trop faible : ${nbDevisAcceptes}/${nbDevis} (${tauxDevis}%). Relancez les ${nbDevis - nbDevisAcceptes} devis en attente — c'est votre principal levier de croissance ce mois-ci.`;
    }
  } else if (nbRdv > 0 && tauxAbsence > 0) {
    para3 = isConsultant
      ? `L'activité du cabinet s'appuie sur ${nbRdv} rendez-vous ce mois, avec un taux d'absence de ${tauxAbsence}%. La maîtrise de ce taux est un levier direct sur la production mensuelle.`
      : `Vous avez réalisé ${nbRdv} rendez-vous ce mois (taux d'absence : ${tauxAbsence}%). Réduire ce taux aura un impact direct sur votre production.`;
  }

  // --- Paragraphe 4 : priorités pour le mois suivant ---
  const prios = [];
  if (ecartCA < 0) prios.push(isConsultant ? 'retrouver le niveau de production cible' : 'rattraper le retard de production');
  else prios.push(isConsultant ? 'maintenir le niveau de production actuel' : 'maintenir votre rythme de production');
  if (tauxDevis > 0 && tauxDevis < 65) prios.push(isConsultant ? `améliorer la conversion des devis (actuellement ${tauxDevis}%) par un suivi renforcé des plans de traitement en attente` : `améliorer votre taux de conversion des devis (${tauxDevis}%) via des relances ciblées`);
  else if (tauxEnc < 85 && ca > 0) prios.push(isConsultant ? `accélérer le recouvrement pour ramener le taux d'encaissement au-dessus de 85% (actuellement ${tauxEnc}%)` : `accélérer vos encaissements pour atteindre 85%+ (actuellement ${tauxEnc}%)`);
  else prios.push(isConsultant ? 'consolider la fidélisation patient et la qualité du suivi clinique' : 'renforcer le suivi patient pour consolider vos résultats');

  const para4 = isConsultant
    ? `Les priorités pour la période à venir sont les suivantes :\n\n${prios.map(p => `— ${p}`).join(' ;\n\n')} .`
    : `Vos priorités pour le mois prochain :\n\n${prios.map(p => `— ${p}`).join(' ;\n\n')} .`;

  return [para1, para2, para3, para4].filter(Boolean).join('\n\n');
}

function ensureFinancialCommentary(kpi, practitionerCode, mois, role = 'consultant') {
  const safeKpi = kpi || {};
  if (safeKpi.financialCommentary && String(safeKpi.financialCommentary).trim()) {
    return safeKpi;
  }
  const commentaryStyle = getCommentaryStyleByRole(role);
  return {
    ...safeKpi,
    financialCommentary: generateFinancialCommentary(safeKpi, practitionerCode, mois, commentaryStyle)
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
        const kpi = ensureFinancialCommentary(report.contenu, report.praticien, mois, req.user.role);
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
    const kpiRaw = typeof kpiDoc.toObject === 'function' ? kpiDoc.toObject() : kpiDoc;
    const kpi = ensureFinancialCommentary(kpiRaw, report.praticien, report.mois, req.user.role);
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

    // Recalculate fresh KPIs from live data (stored contenu is incomplete — schema only stores a subset)
    const freshKpi = await calculateKPI(report.praticien, report.mois);
    const commentaryStyle = getCommentaryStyleByRole(req.user.role);
    freshKpi.financialCommentary = generateFinancialCommentary(freshKpi, report.praticien, report.mois, commentaryStyle);

    const historique = await getHistorique(report.praticien, report.mois);

    const reportData = {
      praticien: report.praticien,
      praticienNom: practitioner?.name || report.praticien,
      mois: report.mois,
      moisFormate: moisLabel,
      cabinetName: practitioner?.cabinetName || 'Cabinet',
      ...freshKpi,
      recommandations: generateRecommendations(freshKpi),
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
      let nbRdv = Number(rdv.nbRdv || 0);
      const nbNouveauxPatients = Number(rdv.nbNouveauxPatients || 0);
      let rdvManques = Number(rdv.rdvManques || 0);
      let annulations = Number(rdv.annulations || 0);
      let rdvHonores = Number(rdv.rdvHonores || 0);
      const totalMinutes = Number(heures.nbHeures || 0);
      const heuresTravaillees = totalMinutes / 60;
      const nbDevis = Number(devis.nbDevis || 0);
      const nbDevisAcceptes = Number(devis.nbDevisAcceptes || 0);

      // Inférer les données RDV manquantes depuis nbRdv et/ou nbPatients (ratio 60% manqués / 40% annulations)
      if (rdvHonores === 0 && rdvManques === 0 && annulations === 0) {
        if (nbRdv > 0) {
          const ecart = Math.max(0, nbRdv - nbPatients);
          rdvHonores = Math.min(nbPatients, nbRdv);
          rdvManques = Math.round(ecart * 0.6);
          annulations = Math.round(ecart * 0.4);
        } else if (nbPatients > 0) {
          // Aucun document AnalyseRendezVous pour ce mois — inférer depuis les patients
          nbRdv = nbPatients;
          rdvHonores = nbPatients;
          rdvManques = 0;
          annulations = 0;
        }
      }

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
        joursOuverts: heuresTravaillees > 0 ? Math.round(heuresTravaillees / 7) : 0,
        rdvHonores,
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

// ── Suppression de rapport avec code 4 chiffres ───────────────────────────────

const reportDeleteCodes = new Map(); // reportId -> { code, expiresAt }

// POST /api/reports/:id/request-delete — Génère un code 4 chiffres et l'envoie par email
router.post('/:id/request-delete', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const report = await Report.findById(id);
    if (!report) return res.status(404).json({ message: 'Rapport introuvable.' });

    const code = crypto.randomInt(1000, 9999).toString();
    reportDeleteCodes.set(id, { code, expiresAt: Date.now() + 10 * 60 * 1000 }); // 10 min

    const SECURITY_RECIPIENT = 'maarzoukrayan3@gmail.com';
    const moisLabel = report.mois ? String(report.mois).substring(0, 6) : '';
    try {
      const emailService = require('../services/emailService');
      await emailService.sendMail({
        to: SECURITY_RECIPIENT,
        subject: `🗑️ Code de suppression — Rapport ${report.praticien} ${moisLabel}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px;background:#f8fafc;border-radius:16px;">
            <div style="text-align:center;margin-bottom:25px;">
              <h2 style="color:#1e293b;margin:0;">🗑️ Code de vérification</h2>
              <p style="color:#64748b;font-size:14px;margin-top:8px;">Suppression d'un rapport mensuel</p>
            </div>
            <div style="background:white;border-radius:12px;padding:25px;border:1px solid #e2e8f0;text-align:center;">
              <p style="color:#475569;font-size:14px;margin-bottom:5px;">Rapport à supprimer :</p>
              <p style="color:#1e293b;font-size:18px;font-weight:bold;margin-bottom:20px;">${report.praticien} — ${moisLabel}</p>
              <div style="background:#fef2f2;border:2px dashed #ef4444;border-radius:12px;padding:20px;margin-bottom:20px;">
                <p style="color:#ef4444;font-size:12px;font-weight:600;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">Votre code de sécurité (4 chiffres)</p>
                <p style="color:#dc2626;font-size:40px;font-weight:900;letter-spacing:10px;margin:0;">${code}</p>
              </div>
              <p style="color:#94a3b8;font-size:12px;">Ce code expire dans <strong>10 minutes</strong>.</p>
              <p style="color:#ef4444;font-size:11px;margin-top:10px;font-weight:600;">⚠️ Cette action est irréversible.</p>
            </div>
            <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:20px;">Efficience Analytics — Sécurité</p>
          </div>
        `
      });
      console.log(`[REPORT-DELETE] Code envoyé à ${SECURITY_RECIPIENT} pour rapport ${report.praticien} ${moisLabel}`);
    } catch (mailErr) {
      console.error('[REPORT-DELETE] Email indisponible:', mailErr.message || mailErr);
    }

    return res.json({ message: `Code de sécurité envoyé à ${SECURITY_RECIPIENT}.` });
  } catch (err) {
    console.error('[REPORT-DELETE] request-delete error:', err);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// DELETE /api/reports/:id — Vérifie le code et supprime le rapport
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: 'Code requis.' });

    const stored = reportDeleteCodes.get(id);
    if (!stored) return res.status(400).json({ message: 'Aucun code en attente. Veuillez redemander un code.' });
    if (Date.now() > stored.expiresAt) {
      reportDeleteCodes.delete(id);
      return res.status(400).json({ message: 'Code expiré. Veuillez redemander un code.' });
    }
    if (stored.code !== code.trim()) {
      return res.status(400).json({ message: 'Code incorrect.' });
    }

    const report = await Report.findByIdAndDelete(id);
    reportDeleteCodes.delete(id);
    if (!report) return res.status(404).json({ message: 'Rapport introuvable.' });

    invalidateKpisCache(report.mois);
    console.log(`[REPORT-DELETE] Rapport supprimé : ${report.praticien} ${report.mois}`);
    return res.json({ message: `Rapport de ${report.praticien} (${report.mois}) supprimé avec succès.` });
  } catch (err) {
    console.error('[REPORT-DELETE] delete error:', err);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;
