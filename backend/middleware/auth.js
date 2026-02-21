const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware d'authentification JWT
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Accès refusé. Token manquant.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Token invalide ou compte désactivé.' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token invalide.' });
  }
};

// Middleware admin uniquement
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès réservé aux administrateurs.' });
  }
  next();
};

// Middleware praticien uniquement
const practitionerOnly = (req, res, next) => {
  if (req.user.role !== 'practitioner') {
    return res.status(403).json({ message: 'Accès réservé aux praticiens.' });
  }
  next();
};

module.exports = { auth, adminOnly, practitionerOnly };
