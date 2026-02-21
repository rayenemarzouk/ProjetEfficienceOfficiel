const mongoose = require('mongoose');

const encoursSchema = new mongoose.Schema({
  praticien: { type: String, default: 'GLOBAL' },
  dureeTotaleARealiser: { type: Number, default: 0 },
  montantTotalAFacturer: { type: Number, default: 0 },
  rentabiliteHoraire: { type: Number, default: 0 },
  rentabiliteJoursTravailles: { type: Number, default: 0 },
  patientsEnCours: { type: Number, default: 0 },
  dateImport: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Encours', encoursSchema);
