const mongoose = require('mongoose');

const analyseRendezVousSchema = new mongoose.Schema({
  praticien: { type: String, required: true, index: true },
  mois: { type: String, required: true },
  nbRdv: { type: Number, default: 0 },
  dureeTotaleRdv: { type: Number, default: 0 }, // en minutes
  nbPatients: { type: Number, default: 0 },
  nbNouveauxPatients: { type: Number, default: 0 }
}, { timestamps: true });

analyseRendezVousSchema.index({ praticien: 1, mois: 1 });

module.exports = mongoose.model('AnalyseRendezVous', analyseRendezVousSchema);
