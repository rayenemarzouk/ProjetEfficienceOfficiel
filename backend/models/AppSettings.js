const mongoose = require('mongoose');

const appSettingsSchema = new mongoose.Schema({
  autoGeneration: { type: Boolean, default: true },
  autoEmail: { type: Boolean, default: true },
  cronHeure: { type: String, default: '20:00' },
  maintenanceMode: { type: Boolean, default: false },
  aiModelsEnabled: { type: Boolean, default: true },
  importEnabled: { type: Boolean, default: true },
  // Mode dynamique — expire après 15 jours, requiert un code de vérification pour le renouveler
  dynamicExpiresAt: { type: Date, default: null }
}, { timestamps: true });

// Singleton pattern — only one settings document
appSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

// Vérifie si le mode dynamique est actuellement actif
appSettingsSchema.methods.isDynamicActive = function () {
  return this.dynamicExpiresAt && new Date() < this.dynamicExpiresAt;
};

module.exports = mongoose.model('AppSettings', appSettingsSchema);
