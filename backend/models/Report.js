const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  praticien: { type: String, required: true },
  mois: { type: String, required: true },
  type: {
    type: String,
    enum: ['mensuel', 'trimestriel', 'annuel'],
    default: 'mensuel'
  },
  contenu: {
    caMensuel: Number,
    nbPatients: Number,
    nbNouveauxPatients: Number,
    nbRdv: Number,
    panierMoyen: Number,
    productionHoraire: Number,
    tauxAcceptationDevis: Number,
    heuresTravaillees: Number,
    recommandations: [String],
    resumeIA: String
  },
  pdfPath: { type: String },
  emailEnvoye: { type: Boolean, default: false },
  dateEnvoi: { type: Date },
  destinataireEmail: { type: String }
}, { timestamps: true });

reportSchema.index({ praticien: 1, mois: 1 });

module.exports = mongoose.model('Report', reportSchema);
