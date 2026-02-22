const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  praticien: { type: String, required: true, index: true },
  nom: { type: String, required: true, trim: true },
  prenom: { type: String, required: true, trim: true },
  dateNaissance: { type: Date, default: null },
  telephone: { type: String, default: '', trim: true },
  email: { type: String, default: '', trim: true, lowercase: true },
  notes: { type: String, default: '' },
  statut: {
    type: String,
    enum: ['actif', 'inactif', 'nouveau'],
    default: 'nouveau'
  },
  dernierRdv: { type: Date, default: null },
  prochainRdv: { type: Date, default: null },
  montantTotal: { type: Number, default: 0 },  // cumul CA facturé pour ce patient
  nbVisites: { type: Number, default: 0 }
}, { timestamps: true });

patientSchema.index({ praticien: 1, nom: 1, prenom: 1 });

module.exports = mongoose.model('Patient', patientSchema);
