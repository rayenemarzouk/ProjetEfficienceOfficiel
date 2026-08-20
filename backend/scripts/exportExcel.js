/**
 * Export COMPLET des données MongoDB vers un fichier Excel multi-onglets
 * Contient TOUS les champs de chaque collection
 * Usage : node scripts/exportExcel.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const path = require('path');

const AnalyseRealisation = require('../models/AnalyseRealisation');
const AnalyseRendezVous  = require('../models/AnalyseRendezVous');
const AnalyseJoursOuverts = require('../models/AnalyseJoursOuverts');
const AnalyseDevis       = require('../models/AnalyseDevis');
const Encours            = require('../models/Encours');
const Report             = require('../models/Report');
const User               = require('../models/User');

const MONTH_NAMES = ['Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

function formatMois(m) {
  if (!m) return '';
  const s = String(m);
  const y = s.substring(0, 4);
  const mo = parseInt(s.substring(4, 6)) - 1;
  return `${MONTH_NAMES[mo]} ${y}`;
}
const f2 = (n) => Number(n || 0).toFixed(2);
const pct = (a, b) => b > 0 ? ((a / b) * 100).toFixed(1) + '%' : '0.0%';
const acte = (obj, prefix) => ({
  [`${prefix} - Nombre`]:        obj?.nombre || 0,
  [`${prefix} - Dents`]:         obj?.dents  || 0,
  [`${prefix} - Honoraires (€)`]: f2(obj?.honoraires),
  [`${prefix} - Honoraires NR (€)`]: f2(obj?.honorairesNR),
});

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connecté à MongoDB');

  const wb = XLSX.utils.book_new();

  // ── 1. CA & Réalisations (TOUS champs + actes détaillés) ─────────────────
  const realisations = await AnalyseRealisation.find({}).sort({ praticien: 1, mois: 1 }).lean();
  const realRows = realisations.map(r => ({
    Praticien:               r.praticien || '',
    Mois:                    formatMois(r.mois),
    Mois_Brut:               r.mois || '',
    'CA Facturé (€)':        f2(r.montantFacture),
    'CA Encaissé (€)':       f2(r.montantEncaisse),
    'Taux Encaissement':     pct(r.montantEncaisse, r.montantFacture),
    'Nb Patients':           r.nbPatients || 0,
    'Panier Moyen (€)':      r.nbPatients > 0 ? f2(r.montantFacture / r.nbPatients) : '0.00',
    'Nouveaux Dossiers':     r.nouveauxDossiers || 0,
    'Règlements Année':      r.reglementsPourAnnee || 0,
    ...acte(r.soinsConservateurs,        'Soins Conservateurs'),
    ...acte(r.prothesesFixes,            'Prothèses Fixes'),
    ...acte(r.prothesesAmovibles,        'Prothèses Amovibles'),
    ...acte(r.prothesesMaxilloFaciales,  'Prothèses Maxillo-Faciales'),
    ...acte(r.chirurgie,                 'Chirurgie'),
    ...acte(r.odf,                       'ODF'),
    ...acte(r.consultations,             'Consultations'),
    ...acte(r.prophylaxie,               'Prophylaxie'),
    ...acte(r.endodontie,                'Endodontie'),
    ...acte(r.radiographie,              'Radiographie'),
    ...acte(r.parodontologie,            'Parodontologie'),
    ...acte(r.implantologie,             'Implantologie'),
    ...acte(r.implantologieChirurgicale, 'Implantologie Chirurgicale'),
    ...acte(r.implantologieProthetique,  'Implantologie Prothétique'),
    ...acte(r.occlusodontie,             'Occlusodontie'),
    ...acte(r.esthetique,               'Esthétique'),
    'Date Création':   r.createdAt ? new Date(r.createdAt).toLocaleDateString('fr-FR') : '',
    'Dernière MàJ':    r.updatedAt ? new Date(r.updatedAt).toLocaleDateString('fr-FR') : '',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(realRows), 'CA & Réalisations');

  // ── 2. Rendez-vous (TOUS champs) ─────────────────────────────────────────
  const rdvs = await AnalyseRendezVous.find({}).sort({ praticien: 1, mois: 1 }).lean();
  const rdvRows = rdvs.map(r => ({
    Praticien:                r.praticien || '',
    Mois:                     formatMois(r.mois),
    Mois_Brut:                r.mois || '',
    'Nb RDV':                 r.nbRdv || 0,
    'Durée Totale (min)':     r.dureeTotaleRdv || 0,
    'Durée Moy. Prévue (min)':r.dureeMoyennePrevue || 0,
    'RDV / Jour':             r.rdvParJour || 0,
    'Nb Patients':            r.nbPatients || 0,
    'Nb Nouveaux Patients':   r.nbNouveauxPatients || 0,
    'RDV Honorés':            r.rdvHonores || 0,
    'RDV Manqués':            r.rdvManques || 0,
    'Annulations':            r.annulations || 0,
    'Reports':                r.reports || 0,
    'RDV Importants':         r.rdvImportants || 0,
    'Taux Absence':           pct((r.rdvManques||0)+(r.annulations||0), r.nbRdv),
    'Date Création':          r.createdAt ? new Date(r.createdAt).toLocaleDateString('fr-FR') : '',
    'Dernière MàJ':           r.updatedAt ? new Date(r.updatedAt).toLocaleDateString('fr-FR') : '',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rdvRows), 'Rendez-vous');

  // ── 3. Jours & Heures ───────────────────────────────────────────────────
  const heures = await AnalyseJoursOuverts.find({}).sort({ praticien: 1, mois: 1 }).lean();
  const hRows = heures.map(r => ({
    Praticien:                  r.praticien || '',
    Mois:                       formatMois(r.mois),
    Mois_Brut:                  r.mois || '',
    'Durée Totale (min)':       r.nbHeures || 0,
    'Heures Travaillées (h)':   ((r.nbHeures || 0) / 60).toFixed(1),
    'Jours Estimés (7h/j)':     r.nbHeures > 0 ? Math.round(r.nbHeures / 420) : 0,
    'Date Création':            r.createdAt ? new Date(r.createdAt).toLocaleDateString('fr-FR') : '',
    'Dernière MàJ':             r.updatedAt ? new Date(r.updatedAt).toLocaleDateString('fr-FR') : '',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hRows), 'Jours & Heures');

  // ── 4. Devis (TOUS champs) ───────────────────────────────────────────────
  const devis = await AnalyseDevis.find({}).sort({ praticien: 1, mois: 1 }).lean();
  const devisRows = devis.map(r => ({
    Praticien:                    r.praticien || '',
    Mois:                         formatMois(r.mois),
    Mois_Brut:                    r.mois || '',
    'Nb Devis Présentés':         r.nbDevis || 0,
    'Montant Proposé (€)':        f2(r.montantPropositions),
    'Montant Moy. Présenté (€)':  f2(r.montantMoyenPresente),
    'Nb Devis Acceptés':          r.nbDevisAcceptes || 0,
    'Taux Acceptation (nb)':      (r.tauxAcceptationNombre || 0) + '%',
    'Montant Accepté (€)':        f2(r.montantAccepte),
    'Montant Moy. Accepté (€)':   f2(r.montantMoyenAccepte),
    'Taux Acceptation (montant)': (r.tauxAcceptationMontant || 0) + '%',
    'Délai Moy. Acceptation (j)': r.delaiMoyenAcceptation || 0,
    'Montant Total Réalisé (€)':  f2(r.montantTotalRealise),
    'Montant Moy. Réalisé (€)':   f2(r.montantMoyenRealise),
    'Date Création':              r.createdAt ? new Date(r.createdAt).toLocaleDateString('fr-FR') : '',
    'Dernière MàJ':               r.updatedAt ? new Date(r.updatedAt).toLocaleDateString('fr-FR') : '',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(devisRows), 'Devis');

  // ── 5. Encours (TOUS champs) ─────────────────────────────────────────────
  const encours = await Encours.find({}).sort({ praticien: 1 }).lean();
  const encRows = encours.map(r => ({
    Praticien:                          r.praticien || '',
    'Durée Totale À Réaliser (min)':    r.dureeTotaleARealiser || 0,
    'Montant Total À Facturer (€)':     f2(r.montantTotalAFacturer),
    'Rentabilité Horaire (€/h)':        f2(r.rentabiliteHoraire),
    'Rentabilité Jours Travaillés':     f2(r.rentabiliteJoursTravailles),
    'Patients En Cours':                r.patientsEnCours || 0,
    'Date Import':                      r.dateImport ? new Date(r.dateImport).toLocaleDateString('fr-FR') : '',
    'Date Création':                    r.createdAt ? new Date(r.createdAt).toLocaleDateString('fr-FR') : '',
    'Dernière MàJ':                     r.updatedAt ? new Date(r.updatedAt).toLocaleDateString('fr-FR') : '',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(encRows), 'Encours');

  // ── 6. Synthèse par Praticien ────────────────────────────────────────────
  const synth = {};
  for (const r of realisations) {
    if (!synth[r.praticien]) synth[r.praticien] = { caFacture: 0, caEncaisse: 0, nbPatients: 0, mois: new Set() };
    synth[r.praticien].caFacture  += r.montantFacture  || 0;
    synth[r.praticien].caEncaisse += r.montantEncaisse || 0;
    synth[r.praticien].nbPatients += r.nbPatients      || 0;
    synth[r.praticien].mois.add(String(r.mois).substring(0, 6));
  }
  const rdvSynth = {};
  for (const r of rdvs) {
    if (!rdvSynth[r.praticien]) rdvSynth[r.praticien] = { nbRdv: 0, honores: 0, manques: 0, annul: 0 };
    rdvSynth[r.praticien].nbRdv   += r.nbRdv    || 0;
    rdvSynth[r.praticien].honores += r.rdvHonores|| 0;
    rdvSynth[r.praticien].manques += r.rdvManques|| 0;
    rdvSynth[r.praticien].annul   += r.annulations|| 0;
  }
  const hSynth = {};
  for (const r of heures) {
    if (!hSynth[r.praticien]) hSynth[r.praticien] = { min: 0 };
    hSynth[r.praticien].min += r.nbHeures || 0;
  }
  const dvSynth = {};
  for (const r of devis) {
    if (!dvSynth[r.praticien]) dvSynth[r.praticien] = { nb: 0, acc: 0, propose: 0, accepte: 0, realise: 0 };
    dvSynth[r.praticien].nb      += r.nbDevis || 0;
    dvSynth[r.praticien].acc     += r.nbDevisAcceptes || 0;
    dvSynth[r.praticien].propose += r.montantPropositions || 0;
    dvSynth[r.praticien].accepte += r.montantAccepte || 0;
    dvSynth[r.praticien].realise += r.montantTotalRealise || 0;
  }
  const allCodes = [...new Set([...Object.keys(synth), ...Object.keys(rdvSynth)])].sort();
  const synthRows = allCodes.map(code => {
    const s = synth[code] || {};
    const rdv = rdvSynth[code] || {};
    const h = hSynth[code] || {};
    const dv = dvSynth[code] || {};
    return {
      Praticien:                    code,
      'Nb Mois de Données':         s.mois?.size || 0,
      'CA Total Facturé (€)':       f2(s.caFacture),
      'CA Total Encaissé (€)':      f2(s.caEncaisse),
      'Taux Encaissement':          pct(s.caEncaisse, s.caFacture),
      'Total Patients':             s.nbPatients || 0,
      'Panier Moyen (€)':           s.nbPatients > 0 ? f2(s.caFacture / s.nbPatients) : '0.00',
      'Total Heures (h)':           ((h.min || 0) / 60).toFixed(1),
      'Productivité (€/h)':         h.min > 0 ? f2(s.caFacture / (h.min / 60)) : '0.00',
      'Total RDV':                  rdv.nbRdv || 0,
      'RDV Honorés':                rdv.honores || 0,
      'RDV Manqués':                rdv.manques || 0,
      'Annulations':                rdv.annul || 0,
      'Taux Absence':               pct((rdv.manques||0)+(rdv.annul||0), rdv.nbRdv),
      'Nb Devis':                   dv.nb || 0,
      'Nb Devis Acceptés':          dv.acc || 0,
      'Taux Acceptation Devis':     pct(dv.acc, dv.nb),
      'Montant Devis Proposé (€)':  f2(dv.propose),
      'Montant Devis Accepté (€)':  f2(dv.accepte),
      'Montant Devis Réalisé (€)':  f2(dv.realise),
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(synthRows), 'Synthèse Praticiens');

  // ── 7. Rapports ──────────────────────────────────────────────────────────
  const reports = await Report.find({}).sort({ mois: 1, praticien: 1 }).lean();
  const repRows = reports.map(r => ({
    Praticien:         r.praticien || '',
    Mois:               formatMois(r.mois),
    Mois_Brut:          r.mois || '',
    'Email Envoyé':     r.emailEnvoye ? 'Oui' : 'Non',
    'Date Génération':  r.createdAt ? new Date(r.createdAt).toLocaleString('fr-FR') : '',
    'Dernière MàJ':     r.updatedAt ? new Date(r.updatedAt).toLocaleString('fr-FR') : '',
  }));
  const wsRep = XLSX.utils.json_to_sheet(repRows);
  XLSX.utils.book_append_sheet(wb, wsRep, 'Rapports');

  // ── 8. Utilisateurs / Praticiens ─────────────────────────────────────────
  const users = await User.find({}).select('-password').lean();
  const userRows = users.map(u => ({
    Nom:                u.name || '',
    Email:              u.email || '',
    Rôle:               u.role || '',
    'Code Praticien':   u.practitionerCode || '',
    'Nom Cabinet':      u.cabinetName || '',
    Actif:              u.isActive ? 'Oui' : 'Non',
    'Date Création':    u.createdAt ? new Date(u.createdAt).toLocaleDateString('fr-FR') : '',
  }));
  const wsUsers = XLSX.utils.json_to_sheet(userRows);
  XLSX.utils.book_append_sheet(wb, wsUsers, 'Utilisateurs');

  // ── Écriture du fichier ──────────────────────────────────────────────────
  const outPath = path.join(__dirname, '..', '..', 'export_efficience.xlsx');
  XLSX.writeFile(wb, outPath);
  console.log(`\n✅ Fichier Excel créé : ${outPath}`);
  console.log(`   → ${realRows.length} lignes CA | ${rdvRows.length} lignes RDV | ${hRows.length} lignes heures | ${devisRows.length} lignes devis | ${encRows.length} encours | ${repRows.length} rapports | ${userRows.length} utilisateurs`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
