const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const nodemailer = require('nodemailer');

// Helper: create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, cabinetName, practitionerCode } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nom, email et mot de passe sont requis.' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Un compte avec cet email existe déjà.' });
    }

    // Create user — actif immédiatement, pas de vérification requise
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      cabinetName: cabinetName || 'Cabinet Dentaire',
      practitionerCode: practitionerCode || null,
      role: 'practitioner',
      isActive: true,
      isVerified: true
    });

    // Send notification email to admin
    try {
      const transporter = createTransporter();
      const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

      await transporter.sendMail({
        from: `"Efficience Analytics" <${process.env.EMAIL_USER}>`,
        to: adminEmail,
        subject: '🆕 Nouvelle inscription - Efficience Analytics',
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 16px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 800;">EFFICIENCE <span style="color: #60a5fa;">DENTAIRE</span></h1>
              <p style="color: #94a3b8; margin: 8px 0 0; font-size: 13px;">Nouvelle demande d'inscription</p>
            </div>
            <div style="padding: 32px;">
              <div style="background: white; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
                <h2 style="margin: 0 0 16px; font-size: 18px; color: #1e293b;">📋 Détails du nouveau praticien</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 13px; width: 140px;">Nom complet</td>
                    <td style="padding: 8px 0; color: #1e293b; font-weight: 600; font-size: 14px;">${user.name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Email</td>
                    <td style="padding: 8px 0; color: #1e293b; font-weight: 600; font-size: 14px;">${user.email}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Cabinet</td>
                    <td style="padding: 8px 0; color: #1e293b; font-weight: 600; font-size: 14px;">${user.cabinetName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Code praticien</td>
                    <td style="padding: 8px 0; color: #1e293b; font-weight: 600; font-size: 14px;">${user.practitionerCode || 'Non renseigné'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Date d'inscription</td>
                    <td style="padding: 8px 0; color: #1e293b; font-weight: 600; font-size: 14px;">${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                  </tr>
                </table>
              </div>
              <div style="margin-top: 20px; padding: 16px; background: #f0fdf4; border-radius: 12px; border: 1px solid #bbf7d0;">
                <p style="margin: 0; font-size: 13px; color: #166534;">
                  ✅ Ce compte est <strong>actif</strong> et le praticien peut se connecter immédiatement.
                </p>
              </div>
            </div>
            <div style="padding: 16px 32px 24px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">Efficience Analytics — Plateforme d'analyse de cabinets dentaires</p>
            </div>
          </div>
        `
      });
      console.log('Email de notification envoyé à', adminEmail);
    } catch (emailErr) {
      console.error('Erreur envoi email notification inscription:', emailErr.message);
      // Don't fail the registration if email fails
    }

    // Générer un token JWT pour connexion immédiate
    const token = jwt.sign(
      { id: user._id, role: user.role, practitionerCode: user.practitionerCode },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Inscription réussie ! Bienvenue sur Efficience Analytics.',
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
  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({ message: 'Erreur lors de l\'inscription. Veuillez réessayer.' });
  }
});

// POST /api/auth/login
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
  } catch (error) {
    console.error('Erreur login:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// GET /api/auth/me - Info utilisateur connecté
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

module.exports = router;
