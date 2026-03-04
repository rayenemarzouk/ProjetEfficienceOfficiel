require('dotenv').config();
const mongoose = require('mongoose');
const AnalyseRealisation = require('../models/AnalyseRealisation');
const AnalyseRendezVous = require('../models/AnalyseRendezVous');
const AnalyseJoursOuverts = require('../models/AnalyseJoursOuverts');
const AnalyseDevis = require('../models/AnalyseDevis');

async function addJCData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connecté...\n');

    // ═══════════════════════════════════════
    // 1. JOURS OUVERTS JC
    // ═══════════════════════════════════════
    const joursOuvertsJC = [
      { praticien: 'JC', mois: '20250101', nbHeures: 6930 },
      { praticien: 'JC', mois: '20250201', nbHeures: 5491 },
      { praticien: 'JC', mois: '20250301', nbHeures: 4620 },
      { praticien: 'JC', mois: '20250401', nbHeures: 5940 },
      { praticien: 'JC', mois: '20250501', nbHeures: 5520 },
      { praticien: 'JC', mois: '20250601', nbHeures: 5520 },
      { praticien: 'JC', mois: '20250701', nbHeures: 6420 },
      { praticien: 'JC', mois: '20250801', nbHeures: 6180 },
      { praticien: 'JC', mois: '20250901', nbHeures: 5310 },
      { praticien: 'JC', mois: '20251001', nbHeures: 5460 },
      { praticien: 'JC', mois: '20251101', nbHeures: 4830 },
      { praticien: 'JC', mois: '20251201', nbHeures: 3900 },
      { praticien: 'JC', mois: '20260101', nbHeures: 5430 },
      { praticien: 'JC', mois: '20260201', nbHeures: 4170 },
      { praticien: 'JC', mois: '20260301', nbHeures: 5100 },
    ];

    // Supprimer les anciens JC s'ils existent
    await AnalyseJoursOuverts.deleteMany({ praticien: 'JC' });
    await AnalyseJoursOuverts.insertMany(joursOuvertsJC);
    console.log(`✅ ${joursOuvertsJC.length} enregistrements Jours Ouverts JC insérés.`);

    // ═══════════════════════════════════════
    // 2. RENDEZ-VOUS JC
    // ═══════════════════════════════════════
    const rdvJC = [
      { praticien: 'JC', mois: '20250101', nbRdv: 85, dureeTotaleRdv: 2040, nbPatients: 78, nbNouveauxPatients: 5 },
      { praticien: 'JC', mois: '20250201', nbRdv: 72, dureeTotaleRdv: 1728, nbPatients: 65, nbNouveauxPatients: 4 },
      { praticien: 'JC', mois: '20250301', nbRdv: 68, dureeTotaleRdv: 1632, nbPatients: 60, nbNouveauxPatients: 3 },
      { praticien: 'JC', mois: '20250401', nbRdv: 80, dureeTotaleRdv: 1920, nbPatients: 72, nbNouveauxPatients: 6 },
      { praticien: 'JC', mois: '20250501', nbRdv: 75, dureeTotaleRdv: 1800, nbPatients: 68, nbNouveauxPatients: 4 },
      { praticien: 'JC', mois: '20250601', nbRdv: 78, dureeTotaleRdv: 1872, nbPatients: 70, nbNouveauxPatients: 5 },
      { praticien: 'JC', mois: '20250701', nbRdv: 82, dureeTotaleRdv: 1968, nbPatients: 74, nbNouveauxPatients: 3 },
      { praticien: 'JC', mois: '20250801', nbRdv: 60, dureeTotaleRdv: 1440, nbPatients: 55, nbNouveauxPatients: 2 },
      { praticien: 'JC', mois: '20250901', nbRdv: 76, dureeTotaleRdv: 1824, nbPatients: 69, nbNouveauxPatients: 4 },
      { praticien: 'JC', mois: '20251001', nbRdv: 79, dureeTotaleRdv: 1896, nbPatients: 71, nbNouveauxPatients: 5 },
      { praticien: 'JC', mois: '20251101', nbRdv: 70, dureeTotaleRdv: 1680, nbPatients: 63, nbNouveauxPatients: 3 },
      { praticien: 'JC', mois: '20251201', nbRdv: 55, dureeTotaleRdv: 1320, nbPatients: 50, nbNouveauxPatients: 2 },
      { praticien: 'JC', mois: '20260101', nbRdv: 90, dureeTotaleRdv: 2136, nbPatients: 82, nbNouveauxPatients: 3 },
      { praticien: 'JC', mois: '20260201', nbRdv: 75, dureeTotaleRdv: 1800, nbPatients: 68, nbNouveauxPatients: 4 },
      { praticien: 'JC', mois: '20260301', nbRdv: 80, dureeTotaleRdv: 1920, nbPatients: 72, nbNouveauxPatients: 5 },
    ];

    await AnalyseRendezVous.deleteMany({ praticien: 'JC' });
    await AnalyseRendezVous.insertMany(rdvJC);
    console.log(`✅ ${rdvJC.length} enregistrements Rendez-Vous JC insérés.`);

    // ═══════════════════════════════════════
    // 3. RÉALISATION JC (CA, patients, encaissé)
    // ═══════════════════════════════════════
    const realisationJC = [
      { praticien: 'JC', mois: '20240101', nbPatients: 95, montantFacture: 35826.07, montantEncaisse: 28315.40 },
      { praticien: 'JC', mois: '20240201', nbPatients: 88, montantFacture: 32150.00, montantEncaisse: 26420.00 },
      { praticien: 'JC', mois: '20240301', nbPatients: 82, montantFacture: 29800.00, montantEncaisse: 24100.00 },
      { praticien: 'JC', mois: '20240401', nbPatients: 90, montantFacture: 33500.00, montantEncaisse: 27800.00 },
      { praticien: 'JC', mois: '20240501', nbPatients: 85, montantFacture: 31200.00, montantEncaisse: 25600.00 },
      { praticien: 'JC', mois: '20240601', nbPatients: 88, montantFacture: 32800.00, montantEncaisse: 27100.00 },
      { praticien: 'JC', mois: '20240701', nbPatients: 78, montantFacture: 28900.00, montantEncaisse: 23500.00 },
      { praticien: 'JC', mois: '20240801', nbPatients: 55, montantFacture: 20100.00, montantEncaisse: 16800.00 },
      { praticien: 'JC', mois: '20240901', nbPatients: 86, montantFacture: 31800.00, montantEncaisse: 26200.00 },
      { praticien: 'JC', mois: '20241001', nbPatients: 89, montantFacture: 33100.00, montantEncaisse: 27400.00 },
      { praticien: 'JC', mois: '20241101', nbPatients: 80, montantFacture: 29500.00, montantEncaisse: 24300.00 },
      { praticien: 'JC', mois: '20241201', nbPatients: 65, montantFacture: 24200.00, montantEncaisse: 19800.00 },
      { praticien: 'JC', mois: '20250101', nbPatients: 78, montantFacture: 28950.00, montantEncaisse: 23800.00 },
      { praticien: 'JC', mois: '20250201', nbPatients: 65, montantFacture: 24100.00, montantEncaisse: 19700.00 },
      { praticien: 'JC', mois: '20250301', nbPatients: 60, montantFacture: 22300.00, montantEncaisse: 18200.00 },
      { praticien: 'JC', mois: '20250401', nbPatients: 72, montantFacture: 26800.00, montantEncaisse: 22100.00 },
      { praticien: 'JC', mois: '20250501', nbPatients: 68, montantFacture: 25200.00, montantEncaisse: 20700.00 },
      { praticien: 'JC', mois: '20250601', nbPatients: 70, montantFacture: 26000.00, montantEncaisse: 21400.00 },
      { praticien: 'JC', mois: '20250701', nbPatients: 74, montantFacture: 27500.00, montantEncaisse: 22600.00 },
      { praticien: 'JC', mois: '20250801', nbPatients: 55, montantFacture: 20400.00, montantEncaisse: 16800.00 },
      { praticien: 'JC', mois: '20250901', nbPatients: 69, montantFacture: 25600.00, montantEncaisse: 21000.00 },
      { praticien: 'JC', mois: '20251001', nbPatients: 71, montantFacture: 26400.00, montantEncaisse: 21700.00 },
      { praticien: 'JC', mois: '20251101', nbPatients: 63, montantFacture: 23400.00, montantEncaisse: 19200.00 },
      { praticien: 'JC', mois: '20251201', nbPatients: 50, montantFacture: 18600.00, montantEncaisse: 15300.00 },
      { praticien: 'JC', mois: '20260101', nbPatients: 82, montantFacture: 30500.00, montantEncaisse: 25100.00 },
      { praticien: 'JC', mois: '20260201', nbPatients: 68, montantFacture: 25200.00, montantEncaisse: 20700.00 },
      { praticien: 'JC', mois: '20260301', nbPatients: 72, montantFacture: 26800.00, montantEncaisse: 22100.00 },
    ];

    await AnalyseRealisation.deleteMany({ praticien: 'JC' });
    await AnalyseRealisation.insertMany(realisationJC);
    console.log(`✅ ${realisationJC.length} enregistrements Réalisation JC insérés.`);

    // ═══════════════════════════════════════
    // 4. DEVIS JC
    // ═══════════════════════════════════════
    const devisJC = [
      { praticien: 'JC', mois: '20250101', nbDevis: 15, montantPropositions: 45000, nbDevisAcceptes: 9, montantAccepte: 28000 },
      { praticien: 'JC', mois: '20250201', nbDevis: 12, montantPropositions: 38000, nbDevisAcceptes: 7, montantAccepte: 22000 },
      { praticien: 'JC', mois: '20250301', nbDevis: 10, montantPropositions: 32000, nbDevisAcceptes: 6, montantAccepte: 19000 },
      { praticien: 'JC', mois: '20250401', nbDevis: 14, montantPropositions: 42000, nbDevisAcceptes: 8, montantAccepte: 25000 },
      { praticien: 'JC', mois: '20250501', nbDevis: 11, montantPropositions: 35000, nbDevisAcceptes: 7, montantAccepte: 21000 },
      { praticien: 'JC', mois: '20250601', nbDevis: 13, montantPropositions: 40000, nbDevisAcceptes: 8, montantAccepte: 24000 },
      { praticien: 'JC', mois: '20260101', nbDevis: 16, montantPropositions: 48000, nbDevisAcceptes: 10, montantAccepte: 30000 },
      { praticien: 'JC', mois: '20260201', nbDevis: 13, montantPropositions: 39000, nbDevisAcceptes: 8, montantAccepte: 23000 },
      { praticien: 'JC', mois: '20260301', nbDevis: 14, montantPropositions: 42000, nbDevisAcceptes: 9, montantAccepte: 27000 },
    ];

    await AnalyseDevis.deleteMany({ praticien: 'JC' });
    await AnalyseDevis.insertMany(devisJC);
    console.log(`✅ ${devisJC.length} enregistrements Devis JC insérés.`);

    // Vérification finale
    console.log('\n═══════════════════════════════════════');
    console.log('📊 VÉRIFICATION FINALE');
    console.log('═══════════════════════════════════════');
    
    const caByP = await AnalyseRealisation.aggregate([
      { $group: { _id: '$praticien', count: { $sum: 1 }, totalFacture: { $sum: '$montantFacture' }, totalPatients: { $sum: '$nbPatients' } } }
    ]);
    caByP.forEach(r => console.log(`${r._id}: ${r.count} mois, CA total = ${r.totalFacture.toFixed(2)}€, ${r.totalPatients} patients`));

    await mongoose.disconnect();
    console.log('\n✅ Données JC restaurées avec succès !');
    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error);
    process.exit(1);
  }
}

addJCData();
