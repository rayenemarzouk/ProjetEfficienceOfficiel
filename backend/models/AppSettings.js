const mongoose = require('mongoose');

const appSettingsSchema = new mongoose.Schema({
  autoGeneration: { type: Boolean, default: true },
  autoEmail: { type: Boolean, default: true },
  cronHeure: { type: String, default: '20:00' }
}, { timestamps: true });

// Singleton pattern — only one settings document
appSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('AppSettings', appSettingsSchema);
