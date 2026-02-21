const mongoose = require('mongoose');

const analyseRealisationSchema = new mongoose.Schema({
  praticien: { type: String, required: true, index: true },
  mois: { type: String, required: true },
  nbPatients: { type: Number, default: 0 },
  montantFacture: { type: Number, default: 0 },
  montantEncaisse: { type: Number, default: 0 }
}, { timestamps: true });

analyseRealisationSchema.index({ praticien: 1, mois: 1 });

module.exports = mongoose.model('AnalyseRealisation', analyseRealisationSchema);
