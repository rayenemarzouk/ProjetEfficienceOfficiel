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
    montantEncaisse: Number,
    tauxEncaissement: Number,
    nbPatients: Number,
    nbNouveauxPatients: Number,
    nbRdv: Number,
    panierMoyen: Number,
    productionHoraire: Number,
    heuresTravaillees: Number,
    tauxAbsence: Number,
    tauxAcceptationDevis: Number,
    nbDevis: Number,
    nbDevisAcceptes: Number,
    objectif: Number,
    objectifHoraire: Number,
    financialCommentary: String,
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
