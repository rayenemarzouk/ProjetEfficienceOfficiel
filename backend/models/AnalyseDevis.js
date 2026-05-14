const mongoose = require('mongoose');

const analyseDevisSchema = new mongoose.Schema({
  praticien: { type: String, required: true, index: true },
  mois: { type: String, required: true },
  // Devis présentés
  nbDevis: { type: Number, default: 0 },
  montantPropositions: { type: Number, default: 0 },
  montantDevisEnAttente: { type: Number, default: 0 },
  montantMoyenPresente: { type: Number, default: 0 },
  // Devis acceptés
  nbDevisAcceptes: { type: Number, default: 0 },
  tauxAcceptationNombre: { type: Number, default: 0 },   // %
  montantAccepte: { type: Number, default: 0 },
  montantMoyenAccepte: { type: Number, default: 0 },
  tauxAcceptationMontant: { type: Number, default: 0 },  // %
  delaiMoyenAcceptation: { type: Number, default: 0 },   // jours
  // Réalisé
  montantTotalRealise: { type: Number, default: 0 },
  montantMoyenRealise: { type: Number, default: 0 }
}, { timestamps: true });

analyseDevisSchema.index({ praticien: 1, mois: 1 });

module.exports = mongoose.model('AnalyseDevis', analyseDevisSchema);
