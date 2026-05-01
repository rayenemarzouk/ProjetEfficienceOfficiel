const mongoose = require('mongoose');

// Sous-schéma pour les actes par catégorie
const acteSchema = {
  nombre: { type: Number, default: 0 },
  dents:  { type: Number, default: 0 },
  honoraires: { type: Number, default: 0 },
  honorairesNR: { type: Number, default: 0 }
};

const analyseRealisationSchema = new mongoose.Schema({
  praticien: { type: String, required: true, index: true },
  mois: { type: String, required: true },
  nbPatients: { type: Number, default: 0 },
  montantFacture: { type: Number, default: 0 },
  montantEncaisse: { type: Number, default: 0 },
  // Actes réalisés par catégorie (capture 2)
  soinsConservateurs:       { type: acteSchema, default: () => ({}) },
  prothesesFixes:           { type: acteSchema, default: () => ({}) },
  prothesesAmovibles:       { type: acteSchema, default: () => ({}) },
  prothesesMaxilloFaciales: { type: acteSchema, default: () => ({}) },
  chirurgie:                { type: acteSchema, default: () => ({}) },
  odf:                      { type: acteSchema, default: () => ({}) },
  consultations:            { type: acteSchema, default: () => ({}) },
  prophylaxie:              { type: acteSchema, default: () => ({}) },
  endodontie:               { type: acteSchema, default: () => ({}) },
  radiographie:             { type: acteSchema, default: () => ({}) },
  parodontologie:           { type: acteSchema, default: () => ({}) },
  implantologie:            { type: acteSchema, default: () => ({}) },
  implantologieChirurgicale:{ type: acteSchema, default: () => ({}) },
  implantologieProthetique: { type: acteSchema, default: () => ({}) },
  occlusodontie:            { type: acteSchema, default: () => ({}) },
  esthetique:               { type: acteSchema, default: () => ({}) },
  // Totaux
  nouveauxDossiers: { type: Number, default: 0 },
  reglementsPourAnnee: { type: Number, default: 0 }
}, { timestamps: true });

analyseRealisationSchema.index({ praticien: 1, mois: 1 });

module.exports = mongoose.model('AnalyseRealisation', analyseRealisationSchema);
