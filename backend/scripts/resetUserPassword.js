/**
 * Script one-shot: reinitialiser le mot de passe d'un utilisateur par email.
 * Usage:
 *   node scripts/resetUserPassword.js --email=mail@example.com --password=NewStrongPass123
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

function getArg(name) {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.split('=').slice(1).join('=') : null;
}

async function main() {
  const emailInput = getArg('email');
  const password = getArg('password');
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!emailInput || !password) {
    console.error('Usage: node scripts/resetUserPassword.js --email=mail@example.com --password=NewStrongPass123');
    process.exit(1);
  }

  if (!mongoUri) {
    console.error('❌ Variable MongoDB manquante: definir MONGODB_URI ou MONGO_URI');
    process.exit(1);
  }

  const email = emailInput.toLowerCase().trim();

  await mongoose.connect(mongoUri);
  console.log('✅ Connecte a MongoDB');

  const user = await User.findOne({ email });
  if (!user) {
    console.error(`❌ Utilisateur introuvable: ${email}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  user.password = password;
  await user.save();

  console.log(`✅ Mot de passe mis a jour pour: ${email}`);

  await mongoose.disconnect();
  console.log('✅ Termine');
}

main().catch((err) => {
  console.error('❌ Erreur:', err.message);
  process.exit(1);
});
