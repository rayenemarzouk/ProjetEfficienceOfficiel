require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { initCronJobs } = require('./services/cronJobs');

const app = express();

// Connexion MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/data', require('./routes/data'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/practitioner', require('./routes/practitioner'));

// Public settings endpoint (no auth required — for maintenance mode check)
const AppSettings = require('./models/AppSettings');
app.get('/api/settings/public', async (req, res) => {
  try {
    const s = await AppSettings.getSettings();
    const dynamicActive = s.isDynamicActive();
    res.json({
      maintenanceMode: s.maintenanceMode,
      aiModelsEnabled: s.aiModelsEnabled,
      importEnabled: s.importEnabled,
      dynamicActive,
      dynamicExpiresAt: s.dynamicExpiresAt
    });
  } catch (err) {
    res.json({ maintenanceMode: false, aiModelsEnabled: true, importEnabled: true, dynamicActive: false, dynamicExpiresAt: null });
  }
});

// Route de test
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Efficience Analytics API opérationnelle' });
});

// Initialiser les tâches cron
initCronJobs();

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Serveur Efficience Analytics démarré sur le port ${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`⚠️ Le port ${PORT} est déjà utilisé. Arrêtez l'autre processus ou changez le port.`);
    process.exit(1);
  }
  throw err;
});

module.exports = app;
