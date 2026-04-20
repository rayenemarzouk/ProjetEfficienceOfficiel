require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function swapRoles() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connecté...');

    // younis → admin
    const younis = await User.findOneAndUpdate(
      { email: 'younis@efficience.fr' },
      { role: 'admin', name: 'Younis Admin' },
      { new: true }
    );
    if (younis) {
      console.log(`✅ ${younis.email} → rôle mis à jour : ${younis.role}`);
    } else {
      console.log('⚠️  younis@efficience.fr introuvable');
    }

    // maarzoukrayan3 → consultant
    const rayan = await User.findOneAndUpdate(
      { email: 'maarzoukrayan3@gmail.com' },
      { role: 'consultant', name: 'Rayan Consultant' },
      { new: true }
    );
    if (rayan) {
      console.log(`✅ ${rayan.email} → rôle mis à jour : ${rayan.role}`);
    } else {
      console.log('⚠️  maarzoukrayan3@gmail.com introuvable');
    }

    console.log('\nÉtat final des comptes :');
    const users = await User.find({
      email: { $in: ['younis@efficience.fr', 'maarzoukrayan3@gmail.com'] }
    }).select('name email role isActive');
    users.forEach(u => console.log(`  - ${u.name} (${u.email}) → ${u.role}`));

    await mongoose.disconnect();
    console.log('\nTerminé.');
    process.exit(0);
  } catch (err) {
    console.error('Erreur:', err);
    process.exit(1);
  }
}

swapRoles();
