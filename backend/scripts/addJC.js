require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function addJC() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connecté...');

    // Check if JC exists
    const existingJC = await User.findOne({ email: 'jc@efficience.fr' });
    if (existingJC) {
      console.log('⚠️  Le compte JC existe déjà.');
    } else {
      await User.create({
        email: 'jc@efficience.fr',
        password: 'jc@efficience',
        role: 'practitioner',
        name: 'Dr. Jean-Claude',
        practitionerCode: 'JC',
        cabinetName: 'Cabinet JC',
        isActive: true,
        isVerified: true
      });
      console.log('✅ Compte JC créé avec succès !');
    }

    // Check if DV exists
    const existingDV = await User.findOne({ email: 'dv@efficience.fr' });
    if (existingDV) {
      console.log('⚠️  Le compte DV existe déjà.');
    } else {
      await User.create({
        email: 'dv@efficience.fr',
        password: 'dv@efficience',
        role: 'practitioner',
        name: 'Dr. David Vernet',
        practitionerCode: 'DV',
        cabinetName: 'Cabinet DV',
        isActive: true,
        isVerified: true
      });
      console.log('✅ Compte DV créé avec succès !');
    }

    // List all practitioners
    console.log('\n📋 Tous les praticiens actifs :');
    const practitioners = await User.find({ role: 'practitioner', isActive: true }).select('name email practitionerCode');
    practitioners.forEach(p => console.log(`  - ${p.name} (${p.practitionerCode}) — ${p.email}`));

    await mongoose.disconnect();
    console.log('\nTerminé.');
    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error);
    process.exit(1);
  }
}

addJC();
