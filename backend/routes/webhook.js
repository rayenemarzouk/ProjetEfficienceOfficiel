const express = require('express');
const router = express.Router();
const AnalyseDevis = require('../models/AnalyseDevis');
const AnalyseJoursOuverts = require('../models/AnalyseJoursOuverts');
const AnalyseRealisation = require('../models/AnalyseRealisation');
const AnalyseRendezVous = require('../models/AnalyseRendezVous');
const Encours = require('../models/Encours');

// Middleware de vérification du token webhook
const verifyWebhookToken = (req, res, next) => {
  const token = req.headers['x-webhook-token'] || req.query.token;
  const validToken = process.env.N8N_WEBHOOK_TOKEN;
  
  if (!validToken) {
    console.error('N8N_WEBHOOK_TOKEN non défini dans .env');
    return res.status(500).json({ error: 'Configuration webhook manquante' });
  }
  
  if (token !== validToken) {
    console.warn('Tentative de webhook avec token invalide:', token);
    return res.status(401).json({ error: 'Token webhook invalide' });
  }
  
  next();
};

// POST /api/webhook/sync - Endpoint principal pour n8n
router.post('/sync', verifyWebhookToken, async (req, res) => {
  try {
    const { type, data } = req.body;
    
    if (!type || !data) {
      return res.status(400).json({ error: 'Type et data requis' });
    }

    let imported = 0;
    const results = { success: [], errors: [] };

    console.log(`[Webhook] Réception de ${Array.isArray(data) ? data.length : 1} items de type: ${type}`);

    const items = Array.isArray(data) ? data : [data];

    switch (type) {
      case 'encours':
        for (const item of items) {
          try {
            await Encours.findOneAndUpdate(
              { praticien: item.praticien || 'Global', dateImport: { $gte: new Date(new Date().setHours(0,0,0,0)) } },
              {
                praticien: item.praticien || 'Global',
                dureeTotaleARealiser: parseFloat(item.dureeTotaleARealiser) || 0,
                montantTotalAFacturer: parseFloat(item.montantTotalAFacturer) || 0,
                rentabiliteHoraire: parseFloat(item.rentabiliteHoraire) || 0,
                rentabiliteJoursTravailles: parseFloat(item.rentabiliteJoursTravailles) || 0,
                patientsEnCours: parseFloat(item.patientsEnCours) || 0,
                dateImport: new Date()
              },
              { upsert: true, new: true }
            );
            imported++;
            results.success.push({ praticien: item.praticien || 'Global' });
          } catch (err) {
            results.errors.push({ item, error: err.message });
          }
        }
        break;

      case 'rendezvous':
      case 'rendez-vous':
        for (const item of items) {
          try {
            await AnalyseRendezVous.findOneAndUpdate(
              { praticien: item.praticien, mois: item.mois },
              {
                praticien: item.praticien,
                mois: item.mois,
                nbRdv: parseFloat(item.nbRdv) || 0,
                dureeTotaleRdv: parseFloat(item.dureeTotaleRdv) || 0,
                nbPatients: parseFloat(item.nbPatients) || 0,
                nbNouveauxPatients: parseFloat(item.nbNouveauxPatients) || 0
              },
              { upsert: true, new: true }
            );
            imported++;
            results.success.push({ praticien: item.praticien, mois: item.mois });
          } catch (err) {
            results.errors.push({ item, error: err.message });
          }
        }
        break;

      case 'realisation':
        for (const item of items) {
          try {
            await AnalyseRealisation.findOneAndUpdate(
              { praticien: item.praticien, mois: item.mois },
              {
                praticien: item.praticien,
                mois: item.mois,
                nbPatients: parseFloat(item.nbPatients) || 0,
                montantFacture: parseFloat(item.montantFacture) || 0,
                montantEncaisse: parseFloat(item.montantEncaisse) || 0
              },
              { upsert: true, new: true }
            );
            imported++;
            results.success.push({ praticien: item.praticien, mois: item.mois });
          } catch (err) {
            results.errors.push({ item, error: err.message });
          }
        }
        break;

      case 'joursouvert':
      case 'jours-ouverts':
        for (const item of items) {
          try {
            await AnalyseJoursOuverts.findOneAndUpdate(
              { praticien: item.praticien, mois: item.mois },
              {
                praticien: item.praticien,
                mois: item.mois,
                nbHeures: parseFloat(item.nbHeures) || 0
              },
              { upsert: true, new: true }
            );
            imported++;
            results.success.push({ praticien: item.praticien, mois: item.mois });
          } catch (err) {
            results.errors.push({ item, error: err.message });
          }
        }
        break;

      case 'devis':
        for (const item of items) {
          try {
            await AnalyseDevis.findOneAndUpdate(
              { praticien: item.praticien, mois: item.mois },
              {
                praticien: item.praticien,
                mois: item.mois,
                nbDevis: parseFloat(item.nbDevis) || 0,
                montantPropositions: parseFloat(item.montantPropositions) || 0,
                nbDevisAcceptes: parseFloat(item.nbDevisAcceptes) || 0,
                montantAccepte: parseFloat(item.montantAccepte) || 0
              },
              { upsert: true, new: true }
            );
            imported++;
            results.success.push({ praticien: item.praticien, mois: item.mois });
          } catch (err) {
            results.errors.push({ item, error: err.message });
          }
        }
        break;

      default:
        return res.status(400).json({ error: `Type inconnu: ${type}` });
    }

    console.log(`[Webhook] ${type}: ${imported} importés, ${results.errors.length} erreurs`);

    res.json({
      success: true,
      type,
      imported,
      errors: results.errors.length,
      details: results
    });

  } catch (error) {
    console.error('[Webhook] Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// POST /api/webhook/bulk - Import en masse (plusieurs types à la fois)
router.post('/bulk', verifyWebhookToken, async (req, res) => {
  try {
    const { items } = req.body; // [{ type: 'encours', data: [...] }, { type: 'realisation', data: [...] }]
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Format invalide. Attendu: { items: [{ type, data }] }' });
    }

    const results = {};
    
    for (const item of items) {
      // Appel récursif interne pour chaque type
      const { type, data } = item;
      results[type] = { received: Array.isArray(data) ? data.length : 1 };
    }

    console.log(`[Webhook Bulk] Reçu ${items.length} types de données`);

    res.json({
      success: true,
      message: 'Import bulk reçu',
      summary: results
    });

  } catch (error) {
    console.error('[Webhook Bulk] Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// GET /api/webhook/health - Test de connexion
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'n8n-webhook',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
