require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const AnalyseJoursOuverts = require('../models/AnalyseJoursOuverts');
const AnalyseRealisation = require('../models/AnalyseRealisation');
const AnalyseRendezVous = require('../models/AnalyseRendezVous');
const AnalyseDevis = require('../models/AnalyseDevis');
const Encours = require('../models/Encours');

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connecté pour le seed...');

    // ═══════════════════════════════════════
    // 1. UTILISATEURS
    // ═══════════════════════════════════════
    await User.deleteMany({});
    console.log('Users supprimés.');

    const users = [
      {
        email: 'younis@efficience.fr',
        password: 'younis@efficience',
        role: 'admin',
        name: 'Younis Admin',
        practitionerCode: 'ADMIN',
        cabinetName: 'Efficience Dentaire',
        isActive: true
      },
      {
        email: 'mrrobert@efficience.fr',
        password: 'mrrobert.efficience',
        role: 'admin',
        name: 'Mr Robert',
        practitionerCode: 'ADMIN',
        cabinetName: 'Efficience Dentaire',
        isActive: true,
        isVerified: true
      },
      {
        email: 'maarzoukrayan3@gmail.com',
        password: 'maarzoukrayan3@gmail',
        role: 'admin',
        name: 'Rayan Admin 2',
        practitionerCode: 'ADMIN',
        cabinetName: 'Efficience Dentaire',
        isActive: true,
        isVerified: true
      },
      {
        email: 'jc@efficience.fr',
        password: 'jc@efficience',
        role: 'practitioner',
        name: 'Dr. Jean-Claude',
        practitionerCode: 'JC',
        cabinetName: 'Cabinet JC',
        isActive: true
      },
      {
        email: 'dv@efficience.fr',
        password: 'dv@efficience',
        role: 'practitioner',
        name: 'Dr. David Vernet',
        practitionerCode: 'DV',
        cabinetName: 'Cabinet DV',
        isActive: true
      }
    ];

    for (const u of users) {
      await User.create(u);
      console.log(`Utilisateur créé: ${u.email} (${u.role})`);
    }

    // ═══════════════════════════════════════
    // 2. ANALYSE JOURS OUVERTS
    // ═══════════════════════════════════════
    await AnalyseJoursOuverts.deleteMany({});
    
    const joursOuvertsData = [
      // JC
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
      { praticien: 'JC', mois: '20260301', nbHeures: 0 },
      { praticien: 'JC', mois: '20260401', nbHeures: 0 },
      { praticien: 'JC', mois: '20260501', nbHeures: 0 },
      { praticien: 'JC', mois: '20260601', nbHeures: 0 },
      { praticien: 'JC', mois: '20260701', nbHeures: 0 },
      { praticien: 'JC', mois: '20260801', nbHeures: 0 },
      { praticien: 'JC', mois: '20260901', nbHeures: 0 },
      { praticien: 'JC', mois: '20261001', nbHeures: 0 },
      { praticien: 'JC', mois: '20261101', nbHeures: 0 },
      { praticien: 'JC', mois: '20261201', nbHeures: 0 },
      // DV
      { praticien: 'DV', mois: '20250101', nbHeures: 0 },
      { praticien: 'DV', mois: '20250201', nbHeures: 3585 },
      { praticien: 'DV', mois: '20250301', nbHeures: 3780 },
      { praticien: 'DV', mois: '20250401', nbHeures: 5040 },
      { praticien: 'DV', mois: '20250501', nbHeures: 5460 },
      { praticien: 'DV', mois: '20250601', nbHeures: 4620 },
      { praticien: 'DV', mois: '20250701', nbHeures: 5460 },
      { praticien: 'DV', mois: '20250801', nbHeures: 4860 },
      { praticien: 'DV', mois: '20250901', nbHeures: 4800 },
      { praticien: 'DV', mois: '20251001', nbHeures: 70 },
      { praticien: 'DV', mois: '20251101', nbHeures: 0 },
      { praticien: 'DV', mois: '20251201', nbHeures: 0 },
      { praticien: 'DV', mois: '20260101', nbHeures: 7140 },
      { praticien: 'DV', mois: '20260201', nbHeures: 5460 },
      { praticien: 'DV', mois: '20260301', nbHeures: 7560 },
      { praticien: 'DV', mois: '20260401', nbHeures: 6300 },
      { praticien: 'DV', mois: '20260501', nbHeures: 5460 },
      { praticien: 'DV', mois: '20260601', nbHeures: 7560 },
      { praticien: 'DV', mois: '20260701', nbHeures: 7140 },
      { praticien: 'DV', mois: '20260801', nbHeures: 7140 },
      { praticien: 'DV', mois: '20260901', nbHeures: 7560 },
      { praticien: 'DV', mois: '20261001', nbHeures: 7140 },
      { praticien: 'DV', mois: '20261101', nbHeures: 6720 },
      { praticien: 'DV', mois: '20261201', nbHeures: 7140 }
    ];

    await AnalyseJoursOuverts.insertMany(joursOuvertsData);
    console.log(`${joursOuvertsData.length} enregistrements Jours Ouverts insérés.`);

    // ═══════════════════════════════════════
    // 3. ANALYSE RENDEZ-VOUS
    // ═══════════════════════════════════════
    await AnalyseRendezVous.deleteMany({});

    const rdvData = [
      { praticien: 'JC', mois: '20260101', nbRdv: 90, dureeTotaleRdv: 2136, nbPatients: 82, nbNouveauxPatients: 3 },
      { praticien: 'DV', mois: '20260101', nbRdv: 2, dureeTotaleRdv: 60, nbPatients: 2, nbNouveauxPatients: 0 },
      // Données simulées pour mois précédents JC
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
      // Données simulées pour DV
      { praticien: 'DV', mois: '20250201', nbRdv: 45, dureeTotaleRdv: 1080, nbPatients: 40, nbNouveauxPatients: 8 },
      { praticien: 'DV', mois: '20250301', nbRdv: 52, dureeTotaleRdv: 1248, nbPatients: 46, nbNouveauxPatients: 10 },
      { praticien: 'DV', mois: '20250401', nbRdv: 65, dureeTotaleRdv: 1560, nbPatients: 58, nbNouveauxPatients: 12 },
      { praticien: 'DV', mois: '20250501', nbRdv: 70, dureeTotaleRdv: 1680, nbPatients: 62, nbNouveauxPatients: 9 },
      { praticien: 'DV', mois: '20250601', nbRdv: 60, dureeTotaleRdv: 1440, nbPatients: 54, nbNouveauxPatients: 7 },
      { praticien: 'DV', mois: '20250701', nbRdv: 68, dureeTotaleRdv: 1632, nbPatients: 60, nbNouveauxPatients: 8 },
      { praticien: 'DV', mois: '20250801', nbRdv: 55, dureeTotaleRdv: 1320, nbPatients: 48, nbNouveauxPatients: 5 },
      { praticien: 'DV', mois: '20250901', nbRdv: 62, dureeTotaleRdv: 1488, nbPatients: 56, nbNouveauxPatients: 7 }
    ];

    await AnalyseRendezVous.insertMany(rdvData);
    console.log(`${rdvData.length} enregistrements Rendez-Vous insérés.`);

    // ═══════════════════════════════════════
    // 4. ANALYSE RÉALISATION (données agrégées par mois)
    // ═══════════════════════════════════════
    await AnalyseRealisation.deleteMany({});

    const realisationData = [
      // JC - Données agrégées mensuelles (à partir des données brutes fournies)
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
      // DV
      { praticien: 'DV', mois: '20250201', nbPatients: 40, montantFacture: 16800.00, montantEncaisse: 13400.00 },
      { praticien: 'DV', mois: '20250301', nbPatients: 46, montantFacture: 19300.00, montantEncaisse: 15500.00 },
      { praticien: 'DV', mois: '20250401', nbPatients: 58, montantFacture: 24200.00, montantEncaisse: 19800.00 },
      { praticien: 'DV', mois: '20250501', nbPatients: 62, montantFacture: 25900.00, montantEncaisse: 21200.00 },
      { praticien: 'DV', mois: '20250601', nbPatients: 54, montantFacture: 22600.00, montantEncaisse: 18500.00 },
      { praticien: 'DV', mois: '20250701', nbPatients: 60, montantFacture: 25100.00, montantEncaisse: 20600.00 },
      { praticien: 'DV', mois: '20250801', nbPatients: 48, montantFacture: 20100.00, montantEncaisse: 16400.00 },
      { praticien: 'DV', mois: '20250901', nbPatients: 56, montantFacture: 23400.00, montantEncaisse: 19200.00 },
      { praticien: 'DV', mois: '20260101', nbPatients: 72, montantFacture: 28500.00, montantEncaisse: 23400.00 },
      { praticien: 'DV', mois: '20260201', nbPatients: 60, montantFacture: 24000.00, montantEncaisse: 19600.00 },
    ];

    // ER - données vides (pas encore prêt)
    realisationData.push(
      { praticien: 'ER', mois: '20240101', nbPatients: 0, montantFacture: 0, montantEncaisse: 0 }
    );

    await AnalyseRealisation.insertMany(realisationData);
    console.log(`${realisationData.length} enregistrements Réalisation insérés.`);

    // ═══════════════════════════════════════
    // 5. ENCOURS
    // ═══════════════════════════════════════
    await Encours.deleteMany({});

    await Encours.create({
      praticien: 'GLOBAL',
      dureeTotaleARealiser: 251,
      montantTotalAFacturer: 143785,
      rentabiliteHoraire: 573,
      rentabiliteJoursTravailles: 5615,
      patientsEnCours: 5615
    });
    console.log('Encours inséré.');

    // ═══════════════════════════════════════
    // 6. ANALYSE DEVIS (données vides comme dans le fichier fourni)
    // ═══════════════════════════════════════
    await AnalyseDevis.deleteMany({});
    
    // Créer quelques données de devis simulées pour avoir du contenu
    const devisData = [
      { praticien: 'JC', mois: '20250101', nbDevis: 15, montantPropositions: 45000, nbDevisAcceptes: 9, montantAccepte: 28000 },
      { praticien: 'JC', mois: '20250201', nbDevis: 12, montantPropositions: 38000, nbDevisAcceptes: 7, montantAccepte: 22000 },
      { praticien: 'JC', mois: '20250301', nbDevis: 10, montantPropositions: 32000, nbDevisAcceptes: 6, montantAccepte: 19000 },
      { praticien: 'JC', mois: '20250401', nbDevis: 14, montantPropositions: 42000, nbDevisAcceptes: 8, montantAccepte: 25000 },
      { praticien: 'JC', mois: '20250501', nbDevis: 11, montantPropositions: 35000, nbDevisAcceptes: 7, montantAccepte: 21000 },
      { praticien: 'JC', mois: '20250601', nbDevis: 13, montantPropositions: 40000, nbDevisAcceptes: 8, montantAccepte: 24000 },
      { praticien: 'JC', mois: '20260101', nbDevis: 16, montantPropositions: 48000, nbDevisAcceptes: 10, montantAccepte: 30000 },
      { praticien: 'JC', mois: '20260201', nbDevis: 13, montantPropositions: 39000, nbDevisAcceptes: 8, montantAccepte: 23000 },
      { praticien: 'DV', mois: '20250201', nbDevis: 8, montantPropositions: 24000, nbDevisAcceptes: 5, montantAccepte: 15000 },
      { praticien: 'DV', mois: '20250301', nbDevis: 10, montantPropositions: 30000, nbDevisAcceptes: 6, montantAccepte: 18000 },
      { praticien: 'DV', mois: '20250401', nbDevis: 12, montantPropositions: 36000, nbDevisAcceptes: 8, montantAccepte: 24000 },
      { praticien: 'DV', mois: '20250501', nbDevis: 14, montantPropositions: 42000, nbDevisAcceptes: 9, montantAccepte: 27000 },
      { praticien: 'DV', mois: '20260101', nbDevis: 15, montantPropositions: 45000, nbDevisAcceptes: 10, montantAccepte: 30000 },
      { praticien: 'DV', mois: '20260201', nbDevis: 12, montantPropositions: 36000, nbDevisAcceptes: 7, montantAccepte: 21000 },
    ];

    await AnalyseDevis.insertMany(devisData);
    console.log(`${devisData.length} enregistrements Devis insérés.`);

    console.log('\n══════════════════════════════════════');
    console.log('✅ SEED TERMINÉ AVEC SUCCÈS !');
    console.log('══════════════════════════════════════');
    console.log('\nComptes créés:');
    console.log('  Admin:  younis@efficience.fr / younis@efficience');
    console.log('  JC:     jc@efficience.fr / jc@efficience');
    console.log('  DV:     dv@efficience.fr / dv@efficience');
    console.log('══════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('Erreur seed:', error);
    process.exit(1);
  }
}

seedDatabase();
