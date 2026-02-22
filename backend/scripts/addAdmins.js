require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function addAdmins() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connecté...');

    const admins = [
      {
        email: 'mrrobert@efficience.fr',
        password: 'mrRobert',
        role: 'admin',
        name: 'Mr Robert',
        practitionerCode: 'ADMIN2',
        cabinetName: 'Efficience Dentaire',
        isActive: true,
        isVerified: true
      },
      {
        email: 'maarzoukrayan3@gmail.com',
        password: 'rayan@efficience',
        role: 'admin',
        name: 'Rayan Maarzouk',
        practitionerCode: 'ADMIN3',
        cabinetName: 'Efficience Dentaire',
        isActive: true,
        isVerified: true
      }
    ];

    for (const admin of admins) {
      // Check if user already exists
      const existing = await User.findOne({ email: admin.email });
      if (existing) {
        console.log(`⚠️  ${admin.email} existe déjà — ignoré.`);
        continue;
      }
      await User.create(admin);
      console.log(`✅ Compte admin créé: ${admin.name} (${admin.email})`);
    }

    console.log('\nTous les comptes admin:');
    const allAdmins = await User.find({ role: 'admin' }).select('name email isActive');
    allAdmins.forEach(a => console.log(`  - ${a.name} (${a.email}) — ${a.isActive ? 'Actif' : 'Inactif'}`));

    await mongoose.disconnect();
    console.log('\nTerminé.');
    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error);
    process.exit(1);
  }
}

addAdmins();
