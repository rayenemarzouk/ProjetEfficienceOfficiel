const express = require('express');
const router = express.Router();
const { auth, consultantOnly } = require('../middleware/auth');
const AnalyseRealisation = require('../models/AnalyseRealisation');
const AnalyseRendezVous = require('../models/AnalyseRendezVous');
const AnalyseJoursOuverts = require('../models/AnalyseJoursOuverts');
const AnalyseDevis = require('../models/AnalyseDevis');
const Encours = require('../models/Encours');
const Report = require('../models/Report');
const User = require('../models/User');

// Helper: get practitioner identifier
const getPraticienId = (user) => user.practitionerCode || user.name || user.email;

// Helper: Filtrer par période
function getDateRangeFilter(period, startDate, endDate) {
  const now = new Date();
  let start, end;
  
  switch (period) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      break;
    case 'yesterday':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
      break;
    case 'this_week':
      const dayOfWeek = now.getDay();
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
      end = now;
      break;
    case 'this_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case 'last_month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    case '3_months':
      start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      end = now;
      break;
    case '6_months':
      start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      end = now;
      break;
    case 'this_year':
      start = new Date(now.getFullYear(), 0, 1);
      end = now;
      break;
    case 'last_year':
      start = new Date(now.getFullYear() - 1, 0, 1);
      end = new Date(now.getFullYear() - 1, 11, 31);
      break;
    case 'custom':
      if (startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
      } else {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = now;
      }
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = now;
  }
  
  // Convertir en format YYYYMM01 / YYYYMM31 pour correspondre au format des données en DB (YYYYMMDD)
  const startMois = `${start.getFullYear()}${String(start.getMonth() + 1).padStart(2, '0')}01`;
  const endMois = `${end.getFullYear()}${String(end.getMonth() + 1).padStart(2, '0')}31`;
  
  return { start, end, startMois, endMois };
}

// GET /api/consultant/dashboard - Dashboard global consultant
router.get('/dashboard', auth, consultantOnly, async (req, res) => {
  try {
    const { period, startDate, endDate, cabinet } = req.query;
    const dateRange = getDateRangeFilter(period || 'this_month', startDate, endDate);
    
    // Récupérer tous les praticiens
    const practitioners = await User.find({ role: 'practitioner', isActive: true });
    let practitionerCodes = practitioners.map(p => getPraticienId(p));
    
    // Filtrer par cabinet si spécifié
    if (cabinet && cabinet !== 'all') {
      const filteredPractitioners = practitioners.filter(p => 
        p.cabinetName === cabinet || getPraticienId(p) === cabinet
      );
      practitionerCodes = filteredPractitioners.map(p => getPraticienId(p));
    }

    // Agrégation CA par praticien avec filtre date
    const caByPractitioner = await AnalyseRealisation.aggregate([
      { 
        $match: { 
          praticien: { $in: practitionerCodes },
          mois: { $gte: dateRange.startMois, $lte: dateRange.endMois }
        } 
      },
      { $group: { 
        _id: '$praticien',
        totalFacture: { $sum: '$montantFacture' },
        totalEncaisse: { $sum: '$montantEncaisse' },
        totalPatients: { $sum: '$nbPatients' }
      }}
    ]);

    // RDV par praticien avec filtre date
    const rdvByPractitioner = await AnalyseRendezVous.aggregate([
      { 
        $match: { 
          praticien: { $in: practitionerCodes },
          mois: { $gte: dateRange.startMois, $lte: dateRange.endMois }
        } 
      },
      { $group: {
        _id: '$praticien',
        totalRdv: { $sum: '$nbRdv' },
        totalPatients: { $sum: '$nbPatients' },
        totalNouveaux: { $sum: '$nbNouveauxPatients' },
        totalDuree: { $sum: '$dureeTotaleRdv' }
      }}
    ]);

    // Heures travaillées par praticien
    const heuresByPractitioner = await AnalyseJoursOuverts.aggregate([
      { 
        $match: { 
          praticien: { $in: practitionerCodes },
          mois: { $gte: dateRange.startMois, $lte: dateRange.endMois }
        } 
      },
      { $group: {
        _id: '$praticien',
        totalMinutes: { $sum: '$nbHeures' }
      }}
    ]);

    // CA mensuel
    const caMensuel = await AnalyseRealisation.aggregate([
      { 
        $match: { 
          praticien: { $in: practitionerCodes },
          mois: { $gte: dateRange.startMois, $lte: dateRange.endMois }
        } 
      },
      { $group: {
        _id: { praticien: '$praticien', mois: '$mois' },
        totalFacture: { $sum: '$montantFacture' },
        totalEncaisse: { $sum: '$montantEncaisse' },
        totalPatients: { $sum: '$nbPatients' }
      }},
      { $sort: { '_id.mois': 1 } }
    ]);

    // Devis stats
    const devisStats = await AnalyseDevis.aggregate([
      { 
        $match: { 
          praticien: { $in: practitionerCodes },
          mois: { $gte: dateRange.startMois, $lte: dateRange.endMois }
        } 
      },
      { $group: {
        _id: '$praticien',
        totalDevis: { $sum: '$nbDevis' },
        totalMontantPropose: { $sum: '$montantPropositions' },
        totalAcceptes: { $sum: '$nbDevisAcceptes' },
        totalMontantAccepte: { $sum: '$montantAccepte' }
      }}
    ]);

    // Encours global
    const encours = await Encours.findOne().sort({ createdAt: -1 });

    // Rapports
    const totalReports = await Report.countDocuments({ 
      mois: { $gte: dateRange.startMois, $lte: dateRange.endMois } 
    });
    const reportsEnvoyes = await Report.countDocuments({ 
      mois: { $gte: dateRange.startMois, $lte: dateRange.endMois },
      emailEnvoye: true 
    });

    // Calculer les KPI globaux
    const totalCA = caByPractitioner.reduce((s, p) => s + (p.totalFacture || 0), 0);
    const totalEncaisse = caByPractitioner.reduce((s, p) => s + (p.totalEncaisse || 0), 0);
    const totalPatients = caByPractitioner.reduce((s, p) => s + (p.totalPatients || 0), 0);
    const totalRdv = rdvByPractitioner.reduce((s, p) => s + (p.totalRdv || 0), 0);
    const totalNouveauxPatients = rdvByPractitioner.reduce((s, p) => s + (p.totalNouveaux || 0), 0);
    const totalHeures = heuresByPractitioner.reduce((s, p) => s + (p.totalMinutes || 0), 0) / 60;
    const tauxEncaissement = totalCA > 0 ? Math.round((totalEncaisse / totalCA) * 100) : 0;

    // Performance moyenne par cabinet
    const performanceParCabinet = caByPractitioner.map(p => {
      const rdv = rdvByPractitioner.find(r => r._id === p._id) || {};
      const heures = heuresByPractitioner.find(h => h._id === p._id) || {};
      const devis = devisStats.find(d => d._id === p._id) || {};
      const h = (heures.totalMinutes || 0) / 60;
      const practitioner = practitioners.find(pr => getPraticienId(pr) === p._id);
      
      // Score de performance avec bonus +10%
      const tauxEnc = p.totalFacture > 0 ? (p.totalEncaisse / p.totalFacture) * 100 : 0;
      const prodHoraire = h > 0 ? p.totalFacture / h : 0;
      const tauxDevis = devis.totalDevis > 0 ? (devis.totalAcceptes / devis.totalDevis) * 100 : 0;
      const baseScore = Math.round((tauxEnc * 0.3 + Math.min(100, prodHoraire / 4) * 0.4 + tauxDevis * 0.3));
      const score = Math.min(baseScore + 10, 100);
      
      return {
        praticien: p._id,
        praticienNom: practitioner?.name || p._id,
        cabinetName: practitioner?.cabinetName || 'Cabinet',
        email: practitioner?.email || '',
        totalFacture: p.totalFacture,
        totalEncaisse: p.totalEncaisse,
        totalPatients: p.totalPatients,
        totalRdv: rdv.totalRdv || 0,
        totalNouveaux: rdv.totalNouveaux || 0,
        heuresTravaillees: h,
        productionHoraire: h > 0 ? Math.round(p.totalFacture / h) : 0,
        tauxEncaissement: tauxEnc,
        nbDevis: devis.totalDevis || 0,
        devisAcceptes: devis.totalAcceptes || 0,
        tauxDevis,
        score,
        scoreLabel: score >= 85 ? 'Excellent' : score >= 70 ? 'Bon' : score >= 50 ? 'Moyen' : 'À surveiller'
      };
    });

    // Liste des cabinets uniques pour le filtre
    const cabinets = [...new Set(practitioners.map(p => p.cabinetName))].filter(Boolean);

    // Alertes
    const alertes = {
      caInferieurObjectif: performanceParCabinet.filter(p => p.score < 70).length,
      absencesElevees: rdvByPractitioner.filter(r => {
        const ratio = r.totalPatients / (r.totalRdv || 1);
        return ratio < 0.85;
      }).length,
      rapportsNonEnvoyes: totalReports - reportsEnvoyes
    };

    res.json({
      periode: {
        debut: dateRange.start,
        fin: dateRange.end,
        label: period || 'this_month'
      },
      kpis: {
        cabinetsActifs: practitionerCodes.length,
        totalPraticiens: practitioners.length,
        totalCA,
        totalEncaisse,
        tauxEncaissement,
        totalPatients,
        totalRdv,
        totalNouveauxPatients,
        totalHeures: Math.round(totalHeures),
        totalReports,
        reportsEnvoyes,
        performanceMoyenne: performanceParCabinet.length > 0 
          ? Math.round(performanceParCabinet.reduce((s, p) => s + p.score, 0) / performanceParCabinet.length)
          : 0
      },
      practitioners: practitioners.map(p => ({
        id: p._id,
        name: p.name,
        code: getPraticienId(p),
        email: p.email,
        cabinetName: p.cabinetName
      })),
      cabinets,
      performanceParCabinet,
      caMensuel,
      encours,
      alertes,
      devisStats
    });
  } catch (error) {
    console.error('Erreur dashboard consultant:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// GET /api/consultant/analyses - Analyses globales comparatives
router.get('/analyses', auth, consultantOnly, async (req, res) => {
  try {
    const { period, startDate, endDate, cabinets } = req.query;
    const dateRange = getDateRangeFilter(period || 'this_month', startDate, endDate);
    const practitioners = await User.find(
      { role: 'practitioner', isActive: true },
      { practitionerCode: 1, name: 1, cabinetName: 1 }
    ).lean();

    const selectedCodes = String(cabinets || '')
      .split(',')
      .map(v => v.trim())
      .filter(Boolean);

    const filteredPractitioners = selectedCodes.length > 0
      ? practitioners.filter(p => selectedCodes.includes(getPraticienId(p)))
      : practitioners;

    const codes = filteredPractitioners.map(p => getPraticienId(p));

    if (codes.length === 0) {
      return res.json({
        periode: { debut: dateRange.start, fin: dateRange.end },
        globalStats: {
          averageTauxRealisation: 0,
          bestCabinet: { name: '-', taux: 0 },
          toWatch: { name: '-', taux: 0 }
        },
        cabinetAnalyses: [],
        monthlyComparison: { months: [], data: {} }
      });
    }

    const match = {
      praticien: { $in: codes },
      mois: { $gte: dateRange.startMois, $lte: dateRange.endMois }
    };

    // Lancer les agrégations en parallèle pour réduire le temps de réponse.
    const [
      caParMoisParPraticien,
      heuresParMoisParPraticien,
      rdvParMoisParPraticien,
      devisParMoisParPraticien
    ] = await Promise.all([
      AnalyseRealisation.aggregate([
        { $match: match },
        { $group: {
          _id: { mois: '$mois', praticien: '$praticien' },
          totalFacture: { $sum: '$montantFacture' },
          totalEncaisse: { $sum: '$montantEncaisse' },
          totalPatients: { $sum: '$nbPatients' }
        }},
        { $sort: { '_id.mois': 1 } }
      ]),
      AnalyseJoursOuverts.aggregate([
        { $match: match },
        { $group: {
          _id: { mois: '$mois', praticien: '$praticien' },
          totalMinutes: { $sum: '$nbHeures' }
        }},
        { $sort: { '_id.mois': 1 } }
      ]),
      AnalyseRendezVous.aggregate([
        { $match: match },
        { $group: {
          _id: { mois: '$mois', praticien: '$praticien' },
          totalRdv: { $sum: '$nbRdv' },
          totalPatients: { $sum: '$nbPatients' },
          totalNouveaux: { $sum: '$nbNouveauxPatients' }
        }},
        { $sort: { '_id.mois': 1 } }
      ]),
      AnalyseDevis.aggregate([
        { $match: match },
        { $group: {
          _id: { mois: '$mois', praticien: '$praticien' },
          nbDevis: { $sum: '$nbDevis' },
          montantPropose: { $sum: '$montantPropositions' },
          nbAcceptes: { $sum: '$nbDevisAcceptes' },
          montantAccepte: { $sum: '$montantAccepte' }
        }},
        { $sort: { '_id.mois': 1 } }
      ])
    ]);

    const byPraticien = new Map();
    const monthlyByCode = new Map();

    const ensurePraticien = (code) => {
      if (!byPraticien.has(code)) {
        byPraticien.set(code, {
          totalCA: 0,
          totalEncaisse: 0,
          totalRdv: 0,
          totalNouveaux: 0,
          totalMinutes: 0,
          totalDevis: 0,
          totalAcceptes: 0
        });
      }
      return byPraticien.get(code);
    };

    const ensureMonthly = (code, mois) => {
      if (!monthlyByCode.has(code)) monthlyByCode.set(code, new Map());
      const map = monthlyByCode.get(code);
      if (!map.has(mois)) map.set(mois, { mois, totalFacture: 0, totalEncaisse: 0 });
      return map.get(mois);
    };

    caParMoisParPraticien.forEach((row) => {
      const code = row._id.praticien;
      const mois = row._id.mois;
      const acc = ensurePraticien(code);
      acc.totalCA += row.totalFacture || 0;
      acc.totalEncaisse += row.totalEncaisse || 0;
      const monthly = ensureMonthly(code, mois);
      monthly.totalFacture += row.totalFacture || 0;
      monthly.totalEncaisse += row.totalEncaisse || 0;
    });

    heuresParMoisParPraticien.forEach((row) => {
      const code = row._id.praticien;
      const acc = ensurePraticien(code);
      acc.totalMinutes += row.totalMinutes || 0;
    });

    rdvParMoisParPraticien.forEach((row) => {
      const code = row._id.praticien;
      const acc = ensurePraticien(code);
      acc.totalRdv += row.totalRdv || 0;
      acc.totalNouveaux += row.totalNouveaux || 0;
    });

    devisParMoisParPraticien.forEach((row) => {
      const code = row._id.praticien;
      const acc = ensurePraticien(code);
      acc.totalDevis += row.nbDevis || 0;
      acc.totalAcceptes += row.nbAcceptes || 0;
    });

    const allMonthsSet = new Set();
    const monthlyComparisonData = {};

    const cabinetAnalyses = codes.map((code) => {
      const practitioner = filteredPractitioners.find(p => getPraticienId(p) === code);
      const totals = ensurePraticien(code);
      const totalHours = (totals.totalMinutes || 0) / 60;

      const tauxRealisation = totals.totalCA > 0
        ? (totals.totalEncaisse / totals.totalCA) * 100
        : 0;
      const prodHoraire = totalHours > 0 ? totals.totalCA / totalHours : 0;
      const tauxDevis = totals.totalDevis > 0
        ? (totals.totalAcceptes / totals.totalDevis) * 100
        : 0;

      const baseScore = Math.round((tauxRealisation * 0.3 + Math.min(100, prodHoraire / 4) * 0.4 + tauxDevis * 0.3));
      const scoreGlobal = Math.min(baseScore + 10, 100);

      const monthlyMap = monthlyByCode.get(code) || new Map();
      const monthlyRows = Array.from(monthlyMap.values())
        .sort((a, b) => String(a.mois).localeCompare(String(b.mois)))
        .map((m) => {
          allMonthsSet.add(m.mois);
          return {
            mois: m.mois,
            tauxRealisation: m.totalFacture > 0 ? Number(((m.totalEncaisse / m.totalFacture) * 100).toFixed(1)) : 0
          };
        });

      monthlyComparisonData[code] = monthlyRows;
      const prev = monthlyRows.length > 1 ? monthlyRows[monthlyRows.length - 2].tauxRealisation : null;
      const curr = monthlyRows.length > 0 ? monthlyRows[monthlyRows.length - 1].tauxRealisation : null;
      const trend = prev === null || curr === null
        ? 'flat'
        : (curr > prev ? 'up' : (curr < prev ? 'down' : 'flat'));

      return {
        practitionerCode: code,
        practitionerName: practitioner?.name || code,
        cabinetName: practitioner?.cabinetName || 'Cabinet',
        scoreGlobal,
        trend,
        metrics: {
          caRealise: totals.totalCA || 0,
          tauxRealisation,
          nouveauxPatients: totals.totalNouveaux || 0,
          rdv: totals.totalRdv || 0,
          joursOuverts: totalHours / 8,
          tauxAcceptationDevis: tauxDevis
        }
      };
    }).sort((a, b) => (b.scoreGlobal || 0) - (a.scoreGlobal || 0));

    const avgTaux = cabinetAnalyses.length > 0
      ? cabinetAnalyses.reduce((s, c) => s + (c.metrics?.tauxRealisation || 0), 0) / cabinetAnalyses.length
      : 0;

    const best = cabinetAnalyses[0];
    const worst = cabinetAnalyses[cabinetAnalyses.length - 1];

    const monthlyComparison = {
      months: Array.from(allMonthsSet).sort((a, b) => String(a).localeCompare(String(b))),
      data: monthlyComparisonData
    };

    res.json({
      periode: { debut: dateRange.start, fin: dateRange.end },
      globalStats: {
        averageTauxRealisation: Number(avgTaux.toFixed(1)),
        bestCabinet: {
          name: best?.practitionerName || '-',
          taux: Number((best?.metrics?.tauxRealisation || 0).toFixed(1))
        },
        toWatch: {
          name: worst?.practitionerName || '-',
          taux: Number((worst?.metrics?.tauxRealisation || 0).toFixed(1))
        }
      },
      cabinetAnalyses,
      monthlyComparison,
      // Champs legacy conservés pour compatibilité d'autres écrans
      practitioners: filteredPractitioners.map(p => ({
        code: getPraticienId(p),
        name: p.name,
        cabinetName: p.cabinetName
      })),
      scoresParPraticien: cabinetAnalyses.map(c => ({
        code: c.practitionerCode,
        name: c.practitionerName,
        cabinetName: c.cabinetName,
        score: c.scoreGlobal,
        totalCA: c.metrics.caRealise,
        prodHoraire: Math.round((c.metrics.caRealise || 0) / Math.max(1, (c.metrics.joursOuverts || 0) * 8)),
        tauxDevis: Math.round(c.metrics.tauxAcceptationDevis || 0)
      })),
      caParMoisParPraticien,
      heuresParMoisParPraticien,
      rdvParMoisParPraticien,
      devisParMoisParPraticien
    });
  } catch (error) {
    console.error('Erreur analyses consultant:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// GET /api/consultant/clients - Gestion clients (analyse des consultations/chiffres)
router.get('/clients', auth, consultantOnly, async (req, res) => {
  try {
    const { type, search } = req.query; // type = 'chiffres' | 'consultations'
    
    const practitioners = await User.find({ role: 'practitioner', isActive: true });
    let filtered = practitioners;
    
    if (search) {
      const regex = new RegExp(search, 'i');
      filtered = practitioners.filter(p => 
        regex.test(p.name) || regex.test(p.cabinetName) || regex.test(p.email)
      );
    }
    
    const results = await Promise.all(filtered.map(async (p) => {
      const code = getPraticienId(p);
      
      // Dernière analyse
      const lastRealisation = await AnalyseRealisation.findOne({ praticien: code }).sort({ mois: -1 });
      const lastRdv = await AnalyseRendezVous.findOne({ praticien: code }).sort({ mois: -1 });
      const lastDevis = await AnalyseDevis.findOne({ praticien: code }).sort({ mois: -1 });
      const lastReport = await Report.findOne({ praticien: code }).sort({ createdAt: -1 });
      
      // Total consultations (tous les mois)
      const totalConsultations = await AnalyseRendezVous.aggregate([
        { $match: { praticien: code } },
        { $group: { _id: null, total: { $sum: '$nbRdv' } } }
      ]);
      
      // Total enregistrements
      const totalEnregistrements = await AnalyseRealisation.countDocuments({ praticien: code });
      
      // Score moyen
      const allCA = await AnalyseRealisation.find({ praticien: code });
      const allHeures = await AnalyseJoursOuverts.find({ praticien: code });
      const allDevis = await AnalyseDevis.find({ praticien: code });
      
      const totalFacture = allCA.reduce((s, c) => s + (c.montantFacture || 0), 0);
      const totalEncaisse = allCA.reduce((s, c) => s + (c.montantEncaisse || 0), 0);
      const totalH = allHeures.reduce((s, h) => s + (h.nbHeures || 0), 0) / 60;
      const nbDevis = allDevis.reduce((s, d) => s + (d.nbDevis || 0), 0);
      const nbAcceptes = allDevis.reduce((s, d) => s + (d.nbDevisAcceptes || 0), 0);
      
      const tauxEnc = totalFacture > 0 ? (totalEncaisse / totalFacture) * 100 : 0;
      const prodH = totalH > 0 ? totalFacture / totalH : 0;
      const tauxDevis = nbDevis > 0 ? (nbAcceptes / nbDevis) * 100 : 0;
      const baseScoreMoyen = Math.round((tauxEnc * 0.3 + Math.min(100, prodH / 4) * 0.4 + tauxDevis * 0.3));
      const scoreMoyen = Math.min(baseScoreMoyen + 10, 100);
      
      // % analysé par IA (simulation)
      const pctAnalyseIA = totalEnregistrements > 0 ? Math.min(100, Math.round((totalEnregistrements / 12) * 100)) : 0;
      
      return {
        id: p._id,
        code,
        name: p.name,
        email: p.email,
        cabinetName: p.cabinetName,
        nbConsultations: totalConsultations[0]?.total || 0,
        nbEnregistrements: totalEnregistrements,
        pctAnalyseIA,
        scoreMoyen,
        scoreLabel: scoreMoyen >= 85 ? 'Excellent' : scoreMoyen >= 70 ? 'Bon' : scoreMoyen >= 50 ? 'Moyen' : 'À surveiller',
        derniereAnalyse: lastRealisation?.updatedAt || lastRdv?.updatedAt || null,
        chiffreAffaires: totalFacture,
        lastReport: lastReport ? {
          mois: lastReport.mois,
          emailEnvoye: lastReport.emailEnvoye,
          dateEnvoi: lastReport.dateEnvoi
        } : null
      };
    }));
    
    res.json({ clients: results.sort((a, b) => (b.scoreMoyen || 0) - (a.scoreMoyen || 0)) });
  } catch (error) {
    console.error('Erreur clients consultant:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// GET /api/consultant/client/:code - Détail d'un client/cabinet
router.get('/client/:code', auth, consultantOnly, async (req, res) => {
  try {
    const { code } = req.params;
    const { period, startDate, endDate } = req.query;
    const dateRange = getDateRangeFilter(period || 'this_year', startDate, endDate);
    
    const practitioner = await User.findOne({ 
      $or: [
        { practitionerCode: code },
        { name: code },
        { email: code }
      ]
    });
    
    if (!practitioner) {
      return res.status(404).json({ message: 'Cabinet non trouvé.' });
    }
    
    const praticienCode = getPraticienId(practitioner);
    
    // Données mensuelles
    const realisations = await AnalyseRealisation.find({ 
      praticien: praticienCode,
      mois: { $gte: dateRange.startMois, $lte: dateRange.endMois }
    }).sort({ mois: 1 });
    
    const rdvs = await AnalyseRendezVous.find({ 
      praticien: praticienCode,
      mois: { $gte: dateRange.startMois, $lte: dateRange.endMois }
    }).sort({ mois: 1 });
    
    const heures = await AnalyseJoursOuverts.find({ 
      praticien: praticienCode,
      mois: { $gte: dateRange.startMois, $lte: dateRange.endMois }
    }).sort({ mois: 1 });
    
    const devis = await AnalyseDevis.find({ 
      praticien: praticienCode,
      mois: { $gte: dateRange.startMois, $lte: dateRange.endMois }
    }).sort({ mois: 1 });
    
    const encours = await Encours.findOne({ praticien: praticienCode }) || await Encours.findOne({ praticien: 'GLOBAL' });
    
    // Rapports
    const reports = await Report.find({ praticien: praticienCode }).sort({ createdAt: -1 });
    
    // KPIs cumulés
    const totalFacture = realisations.reduce((s, r) => s + (r.montantFacture || 0), 0);
    const totalEncaisse = realisations.reduce((s, r) => s + (r.montantEncaisse || 0), 0);
    const totalPatients = realisations.reduce((s, r) => s + (r.nbPatients || 0), 0);
    const totalRdv = rdvs.reduce((s, r) => s + (r.nbRdv || 0), 0);
    const totalNouveaux = rdvs.reduce((s, r) => s + (r.nbNouveauxPatients || 0), 0);
    const totalH = heures.reduce((s, h) => s + (h.nbHeures || 0), 0) / 60;
    const totalDevis = devis.reduce((s, d) => s + (d.nbDevis || 0), 0);
    const totalAcceptes = devis.reduce((s, d) => s + (d.nbDevisAcceptes || 0), 0);
    const montantDevisPropose = devis.reduce((s, d) => s + (d.montantPropositions || 0), 0);
    const montantDevisAccepte = devis.reduce((s, d) => s + (d.montantAccepte || 0), 0);
    
    const tauxEnc = totalFacture > 0 ? (totalEncaisse / totalFacture) * 100 : 0;
    const prodH = totalH > 0 ? totalFacture / totalH : 0;
    const tauxDevisNb = totalDevis > 0 ? (totalAcceptes / totalDevis) * 100 : 0;
    const tauxDevisMontant = montantDevisPropose > 0 ? (montantDevisAccepte / montantDevisPropose) * 100 : 0;
    
    res.json({
      practitioner: {
        id: practitioner._id,
        code: praticienCode,
        name: practitioner.name,
        email: practitioner.email,
        cabinetName: practitioner.cabinetName
      },
      periode: { debut: dateRange.start, fin: dateRange.end },
      kpis: {
        totalFacture,
        totalEncaisse,
        tauxEncaissement: Math.round(tauxEnc),
        totalPatients,
        totalRdv,
        totalNouveaux,
        heuresTravaillees: Math.round(totalH),
        productionHoraire: Math.round(prodH),
        objectifCA: 600, // €/h objectif fixe
        objectifAtteint: prodH >= 600
      },
      analyseDevis: {
        nbDevis: totalDevis,
        montantPropose: montantDevisPropose,
        nbAcceptes: totalAcceptes,
        montantAccepte: montantDevisAccepte,
        tauxAcceptationNombre: Math.round(tauxDevisNb),
        tauxAcceptationMontant: Math.round(tauxDevisMontant)
      },
      encours: encours || {},
      mensuel: {
        realisations,
        rdvs,
        heures,
        devis
      },
      reports: reports.map(r => ({
        id: r._id,
        mois: r.mois,
        type: r.type,
        emailEnvoye: r.emailEnvoye,
        dateEnvoi: r.dateEnvoi,
        createdAt: r.createdAt
      }))
    });
  } catch (error) {
    console.error('Erreur détail client consultant:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// GET /api/consultant/reports - Liste des rapports avec filtres
router.get('/reports', auth, consultantOnly, async (req, res) => {
  try {
    const { period, startDate, endDate, status, search } = req.query;
    const dateRange = getDateRangeFilter(period || 'this_year', startDate, endDate);
    
    const practitioners = await User.find({ role: 'practitioner', isActive: true });
    const codes = practitioners.map(p => getPraticienId(p));
    
    const filter = { 
      praticien: { $in: codes },
      mois: { $gte: dateRange.startMois, $lte: dateRange.endMois }
    };
    
    if (status === 'sent') filter.emailEnvoye = true;
    if (status === 'generated') filter.emailEnvoye = false;
    
    const reports = await Report.find(filter).sort({ createdAt: -1 });
    
    // Enrichir avec les infos praticien
    const enriched = reports.map(r => {
      const p = practitioners.find(pr => getPraticienId(pr) === r.praticien);
      return {
        id: r._id,
        praticien: r.praticien,
        praticienNom: p?.name || r.praticien,
        cabinetName: p?.cabinetName || 'Cabinet',
        email: p?.email || '',
        mois: r.mois,
        moisLabel: formatMoisLabel(r.mois),
        type: r.type,
        emailEnvoye: r.emailEnvoye,
        dateEnvoi: r.dateEnvoi,
        createdAt: r.createdAt,
        contenu: r.contenu
      };
    });
    
    // Filtrer par recherche
    let filtered = enriched;
    if (search) {
      const regex = new RegExp(search, 'i');
      filtered = enriched.filter(r => 
        regex.test(r.praticienNom) || regex.test(r.cabinetName) || regex.test(r.email)
      );
    }
    
    // Stats
    const totalEnvoyes = reports.filter(r => r.emailEnvoye).length;
    const totalGeneres = reports.filter(r => !r.emailEnvoye).length;
    const totalNonGeneres = practitioners.length - reports.length;
    
    res.json({
      reports: filtered,
      stats: {
        envoyes: totalEnvoyes,
        generesNonEnvoyes: totalGeneres,
        nonGeneres: Math.max(0, totalNonGeneres)
      }
    });
  } catch (error) {
    console.error('Erreur rapports consultant:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// POST /consultant/manual-entry — Saisie manuelle mensuelle pour un praticien
router.post('/manual-entry', auth, consultantOnly, async (req, res) => {
  try {
    const {
      praticien,
      mois,             // format YYYYMM
      // === Chiffre d'affaires ===
      caFacture,
      caEncaisse,
      // === Patients ===
      nbPatients,
      nouveauxPatients,
      nouveauxDossiers,
      reglementsPourAnnee,
      // === RDV ===
      totalRdv,
      heuresTravaillees,
      rdvHonores,
      rdvManques,
      annulations,
      reports,
      dureeMoyennePrevue,
      rdvParJour,
      rdvImportants,
      // === Devis (capture 1) ===
      nbDevis,
      montantTotalPresente,
      montantMoyenPresente,
      nbDevisAcceptes,
      tauxAcceptationNombre,
      montantTotalAccepte,
      montantMoyenAccepte,
      tauxAcceptationMontant,
      delaiMoyenAcceptation,
      montantTotalRealise,
      montantMoyenRealise,
      // === Actes réalisés (capture 2) ===
      soinsConservateurs,
      prothesesFixes,
      prothesesAmovibles,
      prothesesMaxilloFaciales,
      chirurgie,
      odf,
      consultations,
      prophylaxie,
      endodontie,
      radiographie,
      parodontologie,
      implantologie,
      implantologieChirurgicale,
      implantologieProthetique,
      occlusodontie,
      esthetique
    } = req.body;

    if (!praticien || !mois) {
      return res.status(400).json({ message: 'Praticien et mois sont requis.' });
    }

    // Helper pour nettoyer un objet acte
    const parseActe = (acte) => ({
      nombre:       Number(acte?.nombre)       || 0,
      dents:        Number(acte?.dents)         || 0,
      honoraires:   Number(acte?.honoraires)   || 0,
      honorairesNR: Number(acte?.honorairesNR) || 0
    });

    // Upsert AnalyseRealisation
    await AnalyseRealisation.findOneAndUpdate(
      { praticien, mois },
      {
        praticien,
        mois,
        montantFacture:   Number(caFacture)   || 0,
        montantEncaisse:  Number(caEncaisse)  || 0,
        nbPatients:       Number(nbPatients)  || 0,
        nouveauxDossiers: Number(nouveauxDossiers) || 0,
        reglementsPourAnnee: Number(reglementsPourAnnee) || 0,
        soinsConservateurs:       parseActe(soinsConservateurs),
        prothesesFixes:           parseActe(prothesesFixes),
        prothesesAmovibles:       parseActe(prothesesAmovibles),
        prothesesMaxilloFaciales: parseActe(prothesesMaxilloFaciales),
        chirurgie:                parseActe(chirurgie),
        odf:                      parseActe(odf),
        consultations:            parseActe(consultations),
        prophylaxie:              parseActe(prophylaxie),
        endodontie:               parseActe(endodontie),
        radiographie:             parseActe(radiographie),
        parodontologie:           parseActe(parodontologie),
        implantologie:            parseActe(implantologie),
        implantologieChirurgicale:parseActe(implantologieChirurgicale),
        implantologieProthetique: parseActe(implantologieProthetique),
        occlusodontie:            parseActe(occlusodontie),
        esthetique:               parseActe(esthetique)
      },
      { upsert: true, new: true }
    );

    // Upsert AnalyseRendezVous
    await AnalyseRendezVous.findOneAndUpdate(
      { praticien, mois },
      {
        praticien,
        mois,
        nbRdv:              Number(totalRdv)           || 0,
        nbNouveauxPatients: Number(nouveauxPatients)   || 0,
        nbPatients:         Number(nbPatients)         || 0,
        rdvHonores:         Number(rdvHonores)         || 0,
        rdvManques:         Number(rdvManques)         || 0,
        annulations:        Number(annulations)        || 0,
        reports:            Number(reports)            || 0,
        dureeMoyennePrevue: Number(dureeMoyennePrevue) || 0,
        rdvParJour:         Number(rdvParJour)         || 0,
        rdvImportants:      Number(rdvImportants)      || 0
      },
      { upsert: true, new: true }
    );

    // Upsert AnalyseJoursOuverts (nbHeures stocké en minutes)
    await AnalyseJoursOuverts.findOneAndUpdate(
      { praticien, mois },
      {
        praticien,
        mois,
        nbHeures: (Number(heuresTravaillees) || 0) * 60
      },
      { upsert: true, new: true }
    );

    // Upsert AnalyseDevis
    await AnalyseDevis.findOneAndUpdate(
      { praticien, mois },
      {
        praticien,
        mois,
        nbDevis:               Number(nbDevis)               || 0,
        montantPropositions:   Number(montantTotalPresente)  || 0,
        montantMoyenPresente:  Number(montantMoyenPresente)  || 0,
        nbDevisAcceptes:       Number(nbDevisAcceptes)       || 0,
        tauxAcceptationNombre: Number(tauxAcceptationNombre) || 0,
        montantAccepte:        Number(montantTotalAccepte)   || 0,
        montantMoyenAccepte:   Number(montantMoyenAccepte)   || 0,
        tauxAcceptationMontant:Number(tauxAcceptationMontant)|| 0,
        delaiMoyenAcceptation: Number(delaiMoyenAcceptation) || 0,
        montantTotalRealise:   Number(montantTotalRealise)   || 0,
        montantMoyenRealise:   Number(montantMoyenRealise)   || 0
      },
      { upsert: true, new: true }
    );

    res.json({ message: 'Données enregistrées avec succès.' });
  } catch (error) {
    console.error('Erreur saisie manuelle consultant:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

function formatMoisLabel(mois) {
  if (!mois) return '';
  const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const y = mois.substring(0, 4);
  const m = parseInt(mois.substring(4, 6)) - 1;
  return `${months[m]} ${y}`;
}

module.exports = router;
