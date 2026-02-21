const mongoose = require('mongoose');

const analyseDevisSchema = new mongoose.Schema({
  praticien: { type: String, required: true, index: true },
  mois: { type: String, required: true },
  nbDevis: { type: Number, default: 0 },
  montantPropositions: { type: Number, default: 0 },
  nbDevisAcceptes: { type: Number, default: 0 },
  montantAccepte: { type: Number, default: 0 }
}, { timestamps: true });

analyseDevisSchema.index({ praticien: 1, mois: 1 });

module.exports = mongoose.model('AnalyseDevis', analyseDevisSchema);
