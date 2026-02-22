const cron = require('node-cron');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const Report = require('../models/Report');
const AppSettings = require('../models/AppSettings');
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
      // Vérifier les paramètres de l'application
      const appSettings = await AppSettings.getSettings();

      if (!appSettings.autoGeneration) {
        console.log('⏸️ Génération automatique désactivée dans les paramètres. Tâche annulée.');
        return;
      }

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

          // Envoyer l'email (si activé)
          if (appSettings.autoEmail) {
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
          }

          console.log(`✅ Rapport généré${appSettings.autoEmail ? ' et envoyé' : ''} pour Dr. ${p.name}`);
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

  // ═══ CRON: Vérification expiration mode dynamique — toutes les heures ═══
  // Quand le dynamisme expire, envoyer automatiquement un nouveau code de renouvellement
  cron.schedule('0 * * * *', async () => {
    try {
      const settings = await AppSettings.getSettings();
      
      // Si le mode dynamique était actif et vient d'expirer
      if (settings.dynamicExpiresAt && new Date() >= settings.dynamicExpiresAt) {
        console.log('⏰ Mode dynamique expiré — Envoi automatique d\'un code de renouvellement');
        
        // Désactiver le mode dynamique
        settings.dynamicExpiresAt = null;
        await settings.save();

        // Générer et envoyer un nouveau code
        const code = crypto.randomInt(100000, 999999).toString();
        
        // Stocker le code dans une variable globale accessible par la route
        global.aiRenewalCode = { code, expiresAt: Date.now() + 24 * 60 * 60 * 1000, targetState: true };

        const transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: parseInt(process.env.EMAIL_PORT),
          secure: false,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });

        await transporter.sendMail({
          from: `"Efficience Analytics" <${process.env.EMAIL_USER}>`,
          to: process.env.EMAIL_USER,
          subject: '🔄 Renouvellement — Code d\'activation Mode Dynamique (expiré)',
          html: `
            <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px;background:#f8fafc;border-radius:16px;">
              <div style="text-align:center;margin-bottom:25px;">
                <h2 style="color:#1e293b;margin:0;">🔄 Renouvellement Dynamique</h2>
                <p style="color:#ef4444;font-size:14px;margin-top:8px;font-weight:600;">Le mode dynamique a expiré</p>
              </div>
              <div style="background:white;border-radius:12px;padding:25px;border:1px solid #e2e8f0;text-align:center;">
                <p style="color:#475569;font-size:14px;margin-bottom:15px;">
                  Le mode dynamique des graphiques a expiré après 15 jours.<br/>
                  Utilisez ce code pour le réactiver dans <strong>Réglages → Modèles IA</strong>.
                </p>
                <div style="background:#f0fdf4;border:2px dashed #10b981;border-radius:12px;padding:20px;margin-bottom:20px;">
                  <p style="color:#10b981;font-size:12px;font-weight:600;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">Code de renouvellement</p>
                  <p style="color:#1e293b;font-size:36px;font-weight:900;letter-spacing:8px;margin:0;">${code}</p>
                </div>
                <p style="color:#94a3b8;font-size:12px;">Ce code est valide <strong>24 heures</strong>.</p>
                <p style="color:#64748b;font-size:11px;margin-top:10px;">Connectez-vous à Réglages pour réactiver le dynamisme.</p>
              </div>
              <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:20px;">Efficience Analytics — Système automatique</p>
            </div>
          `
        });

        console.log('✅ Code de renouvellement dynamique envoyé par email');
      }
    } catch (error) {
      console.error('❌ Erreur cron vérification dynamique:', error);
    }
  });

  console.log('🔄 Cron renouvellement dynamique initialisé (vérification toutes les heures)');
}

module.exports = { initCronJobs };
