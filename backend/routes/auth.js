const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const emailService = require('../services/emailService');

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis.' });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Identifiants incorrects.' });
    }
    if (user.role === 'practitioner' && !user.isActive) {
      user.isActive = true;
      await user.save();
    }
    if (!user.isActive) {
      return res.status(401).json({ message: 'Compte désactivé. Contactez l\'administrateur.' });
    }
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Identifiants incorrects.' });
    }
    const token = jwt.sign(
      { id: user._id, role: user.role, practitionerCode: user.practitionerCode },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        practitionerCode: user.practitionerCode,
        cabinetName: user.cabinetName
      }
    });
    // Notification de connexion désactivée (suppression de l'envoi d'email et du log)
  } catch (error) {
    console.error('Erreur login:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, cabinetName, practitionerCode, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nom, email et mot de passe sont requis.' });
    }
    const normalizedRole = role === 'consultant' ? 'consultant' : 'practitioner';
    const normalizedPractitionerCode = practitionerCode?.trim()?.toUpperCase() || '';
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Un compte avec cet email existe déjà.' });
    }
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      cabinetName: cabinetName || 'Cabinet Dentaire',
      practitionerCode: normalizedPractitionerCode || null,
      role: normalizedRole,
      isActive: true,
      isVerified: true
    });
    res.status(201).json({
      message: `Inscription ${normalizedRole === 'consultant' ? 'consultant' : 'praticien'} enregistrée. Vous pouvez maintenant vous connecter.`
    });
  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({ message: "Erreur lors de l'inscription. Veuillez réessayer." });
  }
});

router.get('/me', auth, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
      practitionerCode: req.user.practitionerCode,
      cabinetName: req.user.cabinetName
    }
  });
});

router.put('/profile', auth, async (req, res) => {
  try {
    const { practitionerCode, cabinetName } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    if (practitionerCode !== undefined) {
      user.practitionerCode = practitionerCode.trim().toUpperCase() || null;
    }
    if (cabinetName !== undefined) {
      user.cabinetName = cabinetName;
    }
    await user.save();
    res.json({
      message: 'Profil mis à jour.',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        practitionerCode: user.practitionerCode,
        cabinetName: user.cabinetName
      }
    });
  } catch (error) {
    console.error('Erreur mise à jour profil:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;