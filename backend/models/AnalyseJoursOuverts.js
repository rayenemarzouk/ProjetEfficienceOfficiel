const mongoose = require('mongoose');

const analyseJoursOuvertsSchema = new mongoose.Schema({
  praticien: { type: String, required: true, index: true },
  mois: { type: String, required: true },
  nbHeures: { type: Number, default: 0 } // en minutes
}, { timestamps: true });

analyseJoursOuvertsSchema.index({ praticien: 1, mois: 1 });

module.exports = mongoose.model('AnalyseJoursOuverts', analyseJoursOuvertsSchema);
