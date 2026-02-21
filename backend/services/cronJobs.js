const cron = require('node-cron');
const User = require('../models/User');
const Report = require('../models/Report');
const AnalyseRealisation = require('../models/AnalyseRealisation');
const AnalyseRendezVous = require('../models/AnalyseRendezVous');
const AnalyseJoursOuverts = require('../models/AnalyseJoursOuverts');
const AnalyseDevis = require('../models/AnalyseDevis');
const { generatePDFReport } = require('./pdfGenerator');
const { sendReportEmail } = require('./emailService');

// Récupérer l'historique des 6 derniers mois pour un praticien
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

  return enriched.reverse();
}

// Calculer les KPI pour un praticien et un mois
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
    panierMoyen: patients > 0 ? parseFloat((ca / patients).toFixed(2)) : 0,
    productionHoraire: heuresTravaillees > 0 ? parseFloat((ca / heuresTravaillees).toFixed(2)) : 0,
    heuresTravaillees: parseFloat(heuresTravaillees.toFixed(1)),
    nbDevis: devis?.nbDevis || 0,
    tauxAcceptationDevis: devis && devis.nbDevis > 0
      ? parseFloat(((devis.nbDevisAcceptes / devis.nbDevis) * 100).toFixed(1))
      : 0
  };
}

function generateRecommendations(kpi) {
  const recs = [];
  if (kpi.panierMoyen < 400 && kpi.nbPatients > 0) {
    recs.push('Le panier moyen est en dessous de la moyenne nationale (400€). Travaillez sur le diagnostic complet.');
  }
  if (kpi.productionHoraire < 180 && kpi.heuresTravaillees > 0) {
    recs.push('La production horaire est faible. Optimisez l\'organisation du planning.');
  }
  if (kpi.tauxAcceptationDevis < 60 && kpi.nbDevis > 0) {
    recs.push('Le taux d\'acceptation des devis est inférieur à 60%. Améliorez la communication.');
  }
  if (recs.length === 0) {
    recs.push('Les indicateurs sont globalement bons. Continuez à maintenir cette performance.');
  }
  return recs;
}

// Tâche cron: Générer et envoyer les rapports mensuels
// S'exécute le dernier jour de chaque mois à 20h00
function initCronJobs() {
  // Cron: "0 20 28-31 * *" = à 20h00, les jours 28-31 de chaque mois
  cron.schedule('0 20 28-31 * *', async () => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    
    // Ne s'exécute que le dernier jour du mois
    if (now.getDate() !== lastDay) return;

    console.log('=== DÉBUT TÂCHE CRON: Génération rapports mensuels ===');
    
    try {
      const practitioners = await User.find({ role: 'practitioner', isActive: true });
      const mois = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}01`;
      const moisFormate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      console.log(`Génération des rapports pour ${practitioners.length} praticiens - Mois: ${moisFormate}`);

      let reportsGeneres = 0;
      let emailsEnvoyes = 0;

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
            resumeIA: `Rapport mensuel ${moisFormate} pour Dr. ${p.name}.`
          };

          // Générer le PDF
          const pdfBuffer = await generatePDFReport(reportData);

          // Sauvegarder en base
          await Report.findOneAndUpdate(
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
                panierMoyen: kpi.panierMoyen,
                productionHoraire: kpi.productionHoraire,
                tauxAcceptationDevis: kpi.tauxAcceptationDevis,
                heuresTravaillees: kpi.heuresTravaillees,
                recommandations,
                resumeIA: reportData.resumeIA
              },
              pdfPath: `reports/${p.practitionerCode}_${mois}.pdf`
            },
            { upsert: true, new: true }
          );
          reportsGeneres++;

          // Envoyer l'email
          const monthNames = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
          const moisLabel = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
          await sendReportEmail({
            to: process.env.REPORT_RECIPIENT,
            subject: `📊 RAPPORT DE PERFORMANCE - ${p.name} | ${moisLabel}`,
            practitionerName: p.name,
            mois: moisLabel,
            kpi,
            pdfBuffer,
            recommandations,
            cabinetName: p.cabinetName,
            historique
          });
          emailsEnvoyes++;

          // Mettre à jour le statut d'envoi
          await Report.findOneAndUpdate(
            { praticien: p.practitionerCode, mois },
            { emailEnvoye: true, dateEnvoi: new Date(), destinataireEmail: process.env.REPORT_RECIPIENT }
          );

          console.log(`✅ Rapport généré et envoyé pour Dr. ${p.name}`);
        } catch (err) {
          console.error(`❌ Erreur pour ${p.name}:`, err.message);
        }
      }

      console.log(`=== FIN TÂCHE CRON: ${reportsGeneres} rapports générés, ${emailsEnvoyes} emails envoyés ===`);
      
      // Vérification: nb rapports = nb emails = nb praticiens
      if (reportsGeneres === emailsEnvoyes && reportsGeneres === practitioners.length) {
        console.log('✅ Cohérence vérifiée: rapports générés = emails envoyés = nombre de praticiens');
      } else {
        console.warn('⚠️ Incohérence détectée dans les envois!');
      }
    } catch (error) {
      console.error('Erreur tâche cron:', error);
    }
  });

  console.log('📅 Tâches cron initialisées - Rapports mensuels programmés (dernier jour du mois à 20h00)');
}

module.exports = { initCronJobs };
