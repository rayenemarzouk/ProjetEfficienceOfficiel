require('dotenv').config();
const mongoose = require('mongoose');
const AnalyseRealisation = require('../models/AnalyseRealisation');
const AnalyseRendezVous = require('../models/AnalyseRendezVous');
const AnalyseJoursOuverts = require('../models/AnalyseJoursOuverts');
const User = require('../models/User');

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connecté...\n');

    // Check users
    const practitioners = await User.find({ role: 'practitioner' }).select('name email practitionerCode');
    console.log('📋 Praticiens dans la base:');
    practitioners.forEach(p => console.log(`  - ${p.name} (${p.practitionerCode}) — ${p.email}`));

    // Check data counts
    const realisationCount = await AnalyseRealisation.countDocuments();
    const rdvCount = await AnalyseRendezVous.countDocuments();
    const heuresCount = await AnalyseJoursOuverts.countDocuments();
    
    console.log('\n📊 Quantité de données:');
    console.log(`  - AnalyseRealisation: ${realisationCount} enregistrements`);
    console.log(`  - AnalyseRendezVous: ${rdvCount} enregistrements`);
    console.log(`  - AnalyseJoursOuverts: ${heuresCount} enregistrements`);

    // Check sample data by praticien
    const realisationByP = await AnalyseRealisation.aggregate([
      { $group: { _id: '$praticien', count: { $sum: 1 }, totalFacture: { $sum: '$montantFacture' } } }
    ]);
    console.log('\n💰 CA par praticien (agrégé):');
    realisationByP.forEach(r => console.log(`  - ${r._id}: ${r.count} mois, CA total = ${r.totalFacture.toFixed(2)}€`));

    // Show sample data for JC
    console.log('\n📆 Dernières données JC (réalisation):');
    const jcData = await AnalyseRealisation.find({ praticien: 'JC' }).sort({ mois: -1 }).limit(3);
    jcData.forEach(d => console.log(`  - ${d.mois}: ${d.nbPatients} patients, ${d.montantFacture}€`));

    // Show sample data for DV
    console.log('\n📆 Dernières données DV (réalisation):');
    const dvData = await AnalyseRealisation.find({ praticien: 'DV' }).sort({ mois: -1 }).limit(3);
    dvData.forEach(d => console.log(`  - ${d.mois}: ${d.nbPatients} patients, ${d.montantFacture}€`));

    await mongoose.disconnect();
    console.log('\n✅ Vérification terminée.');
    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error);
    process.exit(1);
  }
}

checkData();
