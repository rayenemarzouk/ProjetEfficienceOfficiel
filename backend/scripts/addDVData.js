require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const AnalyseRealisation = require('../models/AnalyseRealisation');
const AnalyseRendezVous = require('../models/AnalyseRendezVous');
const AnalyseJoursOuverts = require('../models/AnalyseJoursOuverts');
const AnalyseDevis = require('../models/AnalyseDevis');

async function addDVData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connecté...');

    // Créer le compte DV s'il n'existe pas
    const existingDV = await User.findOne({ practitionerCode: 'DV' });
    if (!existingDV) {
      await User.create(
        {
        email: 'dv@efficience.fr',
        password: 'dv@efficience',
        role: 'practitioner',
        name: 'Dr. David Vernet',
        practitionerCode: 'DV',
        cabinetName: 'Cabinet DV',
        isActive: true,
        isVerified: true
      }
    );
      console.log('✅ Compte DV créé.');
    } else {
      console.log('ℹ️ Compte DV déjà présent: ', existingDV.email);
    }

    const joursOuvertsDV = [
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

    await AnalyseJoursOuverts.deleteMany({ praticien: 'DV' });
    await AnalyseJoursOuverts.insertMany(joursOuvertsDV);
    console.log(`✅ ${joursOuvertsDV.length} enregistrements Jours Ouverts DV insérés.`);

    const rdvDV = [
      { praticien: 'DV', mois: '20250201', nbRdv: 45, dureeTotaleRdv: 1080, nbPatients: 40, nbNouveauxPatients: 8 },
      { praticien: 'DV', mois: '20250301', nbRdv: 52, dureeTotaleRdv: 1248, nbPatients: 46, nbNouveauxPatients: 10 },
      { praticien: 'DV', mois: '20250401', nbRdv: 65, dureeTotaleRdv: 1560, nbPatients: 58, nbNouveauxPatients: 12 },
      { praticien: 'DV', mois: '20250501', nbRdv: 70, dureeTotaleRdv: 1680, nbPatients: 62, nbNouveauxPatients: 9 },
      { praticien: 'DV', mois: '20250601', nbRdv: 60, dureeTotaleRdv: 1440, nbPatients: 54, nbNouveauxPatients: 7 },
      { praticien: 'DV', mois: '20250701', nbRdv: 68, dureeTotaleRdv: 1632, nbPatients: 60, nbNouveauxPatients: 8 },
      { praticien: 'DV', mois: '20250801', nbRdv: 55, dureeTotaleRdv: 1320, nbPatients: 48, nbNouveauxPatients: 5 },
      { praticien: 'DV', mois: '20250901', nbRdv: 62, dureeTotaleRdv: 1488, nbPatients: 56, nbNouveauxPatients: 7 }
    ];

    
    await AnalyseRendezVous.deleteMany({ praticien: 'DV' });
    await AnalyseRendezVous.insertMany(rdvDV);
    console.log(`✅ ${rdvDV.length} enregistrements Rendez-Vous DV insérés.`);

    const realisationDV = [
      { praticien: 'DV', mois: '20250201', nbPatients: 40, montantFacture: 16800.00, montantEncaisse: 13400.00 },
      { praticien: 'DV', mois: '20250301', nbPatients: 46, montantFacture: 19300.00, montantEncaisse: 15500.00 },
      { praticien: 'DV', mois: '20250401', nbPatients: 58, montantFacture: 24200.00, montantEncaisse: 19800.00 },
      { praticien: 'DV', mois: '20250501', nbPatients: 62, montantFacture: 25900.00, montantEncaisse: 21200.00 },
      { praticien: 'DV', mois: '20250601', nbPatients: 54, montantFacture: 22600.00, montantEncaisse: 18500.00 },
      { praticien: 'DV', mois: '20250701', nbPatients: 60, montantFacture: 25100.00, montantEncaisse: 20600.00 },
      { praticien: 'DV', mois: '20250801', nbPatients: 48, montantFacture: 20100.00, montantEncaisse: 16400.00 },
      { praticien: 'DV', mois: '20250901', nbPatients: 56, montantFacture: 23400.00, montantEncaisse: 19200.00 },
      { praticien: 'DV', mois: '20260101', nbPatients: 72, montantFacture: 28500.00, montantEncaisse: 23400.00 },
      { praticien: 'DV', mois: '20260201', nbPatients: 60, montantFacture: 24000.00, montantEncaisse: 19600.00 }
    ];

    await AnalyseRealisation.deleteMany({ praticien: 'DV' });
    await AnalyseRealisation.insertMany(realisationDV);
    console.log(`✅ ${realisationDV.length} enregistrements Réalisation DV insérés.`);

    const devisDV = [
      { praticien: 'DV', mois: '20250201', nbDevis: 8, montantPropositions: 24000, nbDevisAcceptes: 5, montantAccepte: 15000 },
      { praticien: 'DV', mois: '20250301', nbDevis: 10, montantPropositions: 30000, nbDevisAcceptes: 6, montantAccepte: 18000 },
      { praticien: 'DV', mois: '20250401', nbDevis: 12, montantPropositions: 36000, nbDevisAcceptes: 8, montantAccepte: 24000 },
      { praticien: 'DV', mois: '20250501', nbDevis: 14, montantPropositions: 42000, nbDevisAcceptes: 9, montantAccepte: 27000 },
      { praticien: 'DV', mois: '20260101', nbDevis: 15, montantPropositions: 45000, nbDevisAcceptes: 10, montantAccepte: 30000 },
      { praticien: 'DV', mois: '20260201', nbDevis: 12, montantPropositions: 36000, nbDevisAcceptes: 7, montantAccepte: 21000 }
    ];

    await AnalyseDevis.deleteMany({ praticien: 'DV' });
    await AnalyseDevis.insertMany(devisDV);
    console.log(`✅ ${devisDV.length} enregistrements Devis DV insérés.`);

    console.log('\n═══════════════════════════════════════');
    console.log('✅ Données DV restaurées avec succès !');
    console.log('═══════════════════════════════════════\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error);
    process.exit(1);
  }
}

addDVData();
