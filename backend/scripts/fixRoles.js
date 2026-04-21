/**
 * Script one-shot : correction des rôles utilisateurs
 * Usage: node backend/scripts/fixRoles.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const changes = [
  { email: 'maarzoukrayan3@gmail.com', newRole: 'admin',      reason: 'Administrateur principal' },
  { email: 'younis@efficience.fr',     newRole: 'consultant', reason: 'Consultant (était admin)' },
  { email: 'mrrobert@efficience.fr',   newRole: 'consultant', reason: 'Consultant (était admin)' },
];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connecté à MongoDB');

  for (const { email, newRole, reason } of changes) {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log(`⚠️  Introuvable: ${email}`);
      continue;
    }
    const oldRole = user.role;
    if (oldRole === newRole) {
      console.log(`✓  ${email} déjà ${newRole} — rien à faire`);
      continue;
    }
    user.role = newRole;
    await user.save();
    console.log(`✅ ${email}: ${oldRole} → ${newRole}  (${reason})`);
  }

  // Afficher l'état final
  console.log('\n📋 État final des utilisateurs :');
  const users = await User.find({}).select('email name role isActive').lean();
  users.forEach(u => {
    console.log(`   ${u.email.padEnd(40)} ${u.role.padEnd(12)} ${u.isActive ? 'actif' : 'INACTIF'}`);
  });

  await mongoose.disconnect();
  console.log('\n✅ Terminé.');
}

main().catch(e => { console.error(e); process.exit(1); });
