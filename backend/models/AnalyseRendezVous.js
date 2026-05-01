const mongoose = require('mongoose');

const analyseRendezVousSchema = new mongoose.Schema({
  praticien: { type: String, required: true, index: true },
  mois: { type: String, required: true },
  nbRdv: { type: Number, default: 0 },
  dureeTotaleRdv: { type: Number, default: 0 },     // en minutes
  nbPatients: { type: Number, default: 0 },
  nbNouveauxPatients: { type: Number, default: 0 },
  // Champs enrichis (capture 3)
  rdvHonores: { type: Number, default: 0 },
  rdvManques: { type: Number, default: 0 },
  annulations: { type: Number, default: 0 },
  reports: { type: Number, default: 0 },
  dureeMoyennePrevue: { type: Number, default: 0 }, // en minutes
  rdvParJour: { type: Number, default: 0 },
  rdvImportants: { type: Number, default: 0 }
}, { timestamps: true });

analyseRendezVousSchema.index({ praticien: 1, mois: 1 });

module.exports = mongoose.model('AnalyseRendezVous', analyseRendezVousSchema);
