/**
 * Script pour ajouter un compte consultant
 * Usage: node scripts/addConsultant.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/efficience';

const consultantData = {
  email: 'younis@efficience.fr',
  password: 'Consultant2024!',
  name: 'Younis Consultant',
  nom: 'Consultant',
  prenom: 'Younis',
  role: 'consultant',
  practitionerCode: 'CONSULTANT_YOUNIS',
  isActive: true
};

async function addConsultant() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connecté à MongoDB');

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email: consultantData.email });
    if (existingUser) {
      console.log('⚠ Un utilisateur avec cet email existe déjà');
      console.log('  Email:', existingUser.email);
      console.log('  Rôle:', existingUser.role);
      
      // Mettre à jour le rôle si nécessaire
      if (existingUser.role !== 'consultant') {
        existingUser.role = 'consultant';
        await existingUser.save();
        console.log('✓ Rôle mis à jour en consultant');
      }
      
      await mongoose.disconnect();
      return;
    }

    // Hasher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(consultantData.password, salt);

    // Créer le consultant
    const consultant = new User({
      ...consultantData,
      password: hashedPassword
    });

    await consultant.save();
    console.log('✓ Compte consultant créé avec succès!');
    console.log('');
    console.log('  Informations de connexion:');
    console.log('  ─────────────────────────');
    console.log('  Email:', consultantData.email);
    console.log('  Mot de passe:', consultantData.password);
    console.log('  Rôle: consultant');
    console.log('');

    await mongoose.disconnect();
    console.log('✓ Déconnecté de MongoDB');
  } catch (error) {
    console.error('✗ Erreur:', error.message);
    process.exit(1);
  }
}

addConsultant();
