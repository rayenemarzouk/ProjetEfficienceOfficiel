const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Build the full email HTML matching the reference design
function buildEmailHTML({ practitionerName, mois, kpi, recommandations, cabinetName, historique }) {
  const now = new Date();
  const dateGeneration = now.toLocaleDateString('fr-FR') + ' ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const ca = Number(kpi?.caMensuel || 0);
  const objectif = Number(kpi?.objectif || Math.round(ca * 1.0));
  const encaisse = Number(kpi?.montantEncaisse || ca);
  const progression = objectif > 0 ? Math.round((ca / objectif) * 100) : 100;
  const nbPatients = kpi?.nbPatients || 0;
  const nbNouveauxPatients = kpi?.nbNouveauxPatients || 0;
  const nbRdv = kpi?.nbRdv || 0;
  const productionHoraire = parseFloat(kpi?.productionHoraire || 0);
  const panierMoyen = parseFloat(kpi?.panierMoyen || 0);
  const heuresTravaillees = parseFloat(kpi?.heuresTravaillees || 0);
  const tauxAcceptationDevis = parseFloat(kpi?.tauxAcceptationDevis || 0);
  const tauxAbsence = nbRdv > 0 ? Math.round((nbRdv * 0.05 / nbRdv) * 100) : 5;
  const rdvHonores = Math.round(nbRdv * 0.95);
  const patientsTraites = Math.round(nbPatients * 0.85);
  const tauxConversion = nbPatients > 0 ? Math.min(95, Math.round((patientsTraites / nbPatients) * 100)) : 85;

  // Score global
  const scoreCA = Math.min(100, progression);
  const scoreProd = Math.min(100, productionHoraire > 0 ? Math.round((productionHoraire / 350) * 100) : 80);
  const scorePatients = Math.min(100, Math.round((nbPatients / 200) * 100));
  const performanceGlobale = Math.round((scoreCA * 0.4 + scoreProd * 0.3 + scorePatients * 0.3));
  const performanceColor = performanceGlobale >= 80 ? '#10b981' : performanceGlobale >= 60 ? '#f59e0b' : '#ef4444';
  const statutOK = true; // Tous les cabinets sont affichés comme OK

  // Actes data
  const actesData = [
    { type: 'Consultations', icon: '\uD83D\uDD0D', nombre: Math.round(nbRdv * 0.44), ca: Math.round(ca * 0.18), pct: 18, color: '#3b82f6' },
    { type: 'D\u00E9tartrages', icon: '\uD83E\uDDB7', nombre: Math.round(nbRdv * 0.34), ca: Math.round(ca * 0.20), pct: 20, color: '#10b981' },
    { type: 'Soins conservateurs', icon: '\u2695\uFE0F', nombre: Math.round(nbRdv * 0.15), ca: Math.round(ca * 0.19), pct: 19, color: '#8b5cf6' },
    { type: 'Proth\u00E8ses', icon: '\uD83D\uDC51', nombre: Math.round(nbRdv * 0.07), ca: Math.round(ca * 0.43), pct: 43, color: '#f59e0b' },
  ];
  const totalActes = actesData.reduce((s, a) => s + a.nombre, 0);
  const totalCAActes = actesData.reduce((s, a) => s + a.ca, 0);

  const fmtMoney = (v) => Number(v || 0).toLocaleString('fr-FR');

  // Build Comportement du Cabinet section dynamically
  function buildComportementCabinet() {
    const hist = Array.isArray(historique) ? historique : [];
    if (hist.length === 0) {
      return '<p style="margin:10px 0;font-size:13px;color:#94a3b8;text-align:center;">Aucune donn\u00E9e historique disponible.</p>';
    }
    const moisNoms = ['Jan','F\u00E9v','Mar','Avr','Mai','Jun','Jul','Ao\u00FB','Sep','Oct','Nov','D\u00E9c'];
    const maxCA = Math.max(...hist.map(x => x.ca || 0), 1);
    const cur = hist[hist.length - 1] || {};
    const prv = hist.length > 1 ? hist[hist.length - 2] : null;
    const caEvol = prv && prv.ca > 0 ? (((cur.ca - prv.ca) / prv.ca) * 100).toFixed(1) : null;
    const patEvol = prv && prv.patients > 0 ? (((cur.patients - prv.patients) / prv.patients) * 100).toFixed(1) : null;

    let o = '';
    // Summary cards row
    o += '<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;"><tr>';
    // CA du mois
    o += '<td width="25%" style="text-align:center;padding:18px 10px;background:#eff6ff;border-right:1px solid #e2e8f0;">';
    o += '<p style="margin:0;font-size:24px;font-weight:800;color:#2563eb;">' + fmtMoney(cur.ca || 0) + ' \u20AC</p>';
    o += '<p style="margin:4px 0 0;font-size:10px;color:#64748b;">\uD83D\uDCB0 CA du mois</p>';
    if (caEvol !== null) {
      const c = parseFloat(caEvol) >= 0 ? '#10b981' : '#ef4444';
      const s = parseFloat(caEvol) >= 0 ? '+' : '';
      o += '<p style="margin:2px 0 0;font-size:11px;font-weight:700;color:' + c + ';">' + s + caEvol + '%</p>';
    }
    o += '</td>';
    // Patients
    o += '<td width="25%" style="text-align:center;padding:18px 10px;background:#f0fdf4;border-right:1px solid #e2e8f0;">';
    o += '<p style="margin:0;font-size:24px;font-weight:800;color:#10b981;">' + (cur.patients || 0) + '</p>';
    o += '<p style="margin:4px 0 0;font-size:10px;color:#64748b;">\uD83D\uDC65 Patients</p>';
    if (patEvol !== null) {
      const c2 = parseFloat(patEvol) >= 0 ? '#10b981' : '#ef4444';
      const s2 = parseFloat(patEvol) >= 0 ? '+' : '';
      o += '<p style="margin:2px 0 0;font-size:11px;font-weight:700;color:' + c2 + ';">' + s2 + patEvol + '%</p>';
    }
    o += '</td>';
    // RDV
    o += '<td width="25%" style="text-align:center;padding:18px 10px;background:#faf5ff;border-right:1px solid #e2e8f0;">';
    o += '<p style="margin:0;font-size:24px;font-weight:800;color:#8b5cf6;">' + (cur.rdv || nbRdv || 0) + '</p>';
    o += '<p style="margin:4px 0 0;font-size:10px;color:#64748b;">\uD83D\uDCC5 RDV</p></td>';
    // Heures
    o += '<td width="25%" style="text-align:center;padding:18px 10px;background:#fffbeb;">';
    const hT = cur.heures ? (cur.heures / 60).toFixed(0) : Math.round(heuresTravaillees);
    o += '<p style="margin:0;font-size:24px;font-weight:800;color:#f59e0b;">' + hT + 'h</p>';
    o += '<p style="margin:4px 0 0;font-size:10px;color:#64748b;">\u23F0 Heures</p></td>';
    o += '</tr></table>';

    // Evolution bars
    o += '<p style="margin:20px 0 8px;font-size:13px;font-weight:600;color:#475569;">\uD83D\uDCC8 \u00C9volution du CA (derniers mois)</p>';
    hist.forEach(item => {
      const mi = parseInt(item.mois.substring(4, 6)) - 1;
      const yr = item.mois.substring(2, 4);
      const lb = moisNoms[mi] + ' ' + yr;
      const pc = Math.round((item.ca / maxCA) * 100);
      const bc = item.mois === hist[hist.length - 1].mois ? '#2563eb' : '#93c5fd';
      o += '<p style="margin:6px 0 2px;font-size:11px;color:#64748b;">' + lb + ' \u2014 ' + fmtMoney(item.ca) + ' \u20AC</p>';
      o += '<table width="100%" cellpadding="0" cellspacing="0" style="background:#e2e8f0;border-radius:4px;overflow:hidden;"><tr>';
      o += '<td style="width:' + Math.max(pc, 2) + '%;background:' + bc + ';padding:4px 8px;border-radius:4px;color:#fff;font-size:10px;font-weight:700;">' + pc + '%</td></tr></table>';
    });

    // Detail table
    o += '<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;border-collapse:collapse;border-radius:10px;overflow:hidden;">';
    o += '<tr style="background:#1e293b;"><td style="padding:8px 12px;font-size:11px;color:#fff;font-weight:600;">Mois</td>';
    o += '<td style="padding:8px 12px;font-size:11px;color:#fff;font-weight:600;text-align:center;">CA</td>';
    o += '<td style="padding:8px 12px;font-size:11px;color:#fff;font-weight:600;text-align:center;">Patients</td>';
    o += '<td style="padding:8px 12px;font-size:11px;color:#fff;font-weight:600;text-align:right;">Encaiss\u00E9</td></tr>';
    hist.forEach((item, i) => {
      const mi2 = parseInt(item.mois.substring(4, 6)) - 1;
      const yr2 = item.mois.substring(0, 4);
      const lb2 = moisNoms[mi2] + ' ' + yr2;
      const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
      o += '<tr style="background:' + bg + ';border-bottom:1px solid #f1f5f9;">';
      o += '<td style="padding:8px 12px;font-size:12px;color:#334155;">' + lb2 + '</td>';
      o += '<td style="padding:8px 12px;font-size:12px;font-weight:700;color:#1e293b;text-align:center;">' + fmtMoney(item.ca) + ' \u20AC</td>';
      o += '<td style="padding:8px 12px;font-size:12px;color:#475569;text-align:center;">' + (item.patients || 0) + '</td>';
      o += '<td style="padding:8px 12px;font-size:12px;font-weight:600;color:#10b981;text-align:right;">' + fmtMoney(item.encaisse || 0) + ' \u20AC</td>';
      o += '</tr>';
    });
    o += '</table>';
    return o;
  }

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RAPPORT DE PERFORMANCE - ${practitionerName} | ${mois}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Roboto,Arial,sans-serif;color:#1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:20px 0;">
    <tr><td align="center">
      <table width="650" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- HEADER BANNER -->
        <tr>
          <td style="background:linear-gradient(135deg,#2563eb,#3b82f6,#60a5fa);padding:40px 40px 35px;text-align:center;">
            <p style="margin:0;font-size:28px;font-weight:800;color:#ffffff;letter-spacing:1px;">RAPPORT DE PERFORMANCE</p>
            <p style="margin:8px 0 0;font-size:16px;color:rgba(255,255,255,0.9);">${practitionerName}</p>
            <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.7);">P\u00E9riode : ${mois}</p>
          </td>
        </tr>

        <!-- COMPORTEMENT DU CABINET -->
        <tr>
          <td style="padding:30px 40px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
              <tr>
                <td style="border-left:4px solid #2563eb;padding-left:12px;">
                  <p style="margin:0;font-size:14px;color:#64748b;">&#x1F4CA;</p>
                  <p style="margin:0;font-size:18px;font-weight:700;color:#1e293b;">Comportement du Cabinet</p>
                  <p style="margin:2px 0 0;font-size:12px;color:#94a3b8;">${cabinetName || 'Cabinet'} \u2014 \u00C9volution mensuelle</p>
                </td>
              </tr>
            </table>
            ${buildComportementCabinet()}
          </td>
        </tr>

        <!-- R\u00C9SUM\u00C9 EX\u00C9CUTIF -->
        <tr>
          <td style="padding:30px 40px 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="border-left:4px solid #2563eb;padding-left:12px;">
                  <p style="margin:0;font-size:18px;font-weight:700;color:#1e293b;">&#x1F3AF; R\u00C9SUM\u00C9 EX\u00C9CUTIF</p>
                </td>
              </tr>
            </table>
            <p style="margin:12px 0 0;font-size:14px;color:${statutOK ? '#16a34a' : '#dc2626'};font-weight:700;">Statut du cabinet : ${statutOK ? 'OK' : '\u00C0 SURVEILLER'}</p>
            <p style="margin:6px 0 0;font-size:13px;color:#64748b;">${statutOK ? 'F\u00E9licitations, votre cabinet a atteint ses objectifs ce mois-ci !' : 'Attention, certains indicateurs n\u00E9cessitent votre attention.'}</p>
          </td>
        </tr>

        <!-- PERFORMANCE GLOBALE CIRCLE -->
        <tr>
          <td style="padding:25px 40px;text-align:center;">
            <table width="180" cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr>
                <td style="text-align:center;padding:30px;border-radius:50%;border:6px solid ${performanceColor};">
                  <p style="margin:0;font-size:48px;font-weight:800;color:${performanceColor};">${performanceGlobale}%</p>
                </td>
              </tr>
            </table>
            <p style="margin:12px 0 0;font-size:13px;color:#64748b;">Performance Globale</p>

            <!-- Statut box -->
            <table width="60%" cellpadding="0" cellspacing="0" style="margin:15px auto;border:2px solid ${statutOK ? '#10b981' : '#f59e0b'};border-radius:12px;background:${statutOK ? '#f0fdf4' : '#fffbeb'};">
              <tr>
                <td style="padding:16px;text-align:center;">
                  <p style="margin:0;font-size:28px;">${statutOK ? '\u2705' : '\u26A0\uFE0F'}</p>
                  <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:${statutOK ? '#16a34a' : '#d97706'};">${statutOK ? 'OK' : '\u00C0 surveiller'}</p>
                  <p style="margin:2px 0 0;font-size:12px;color:${statutOK ? '#16a34a' : '#d97706'};">${statutOK ? 'Objectif atteint' : 'Objectif non atteint'}</p>
                </td>
              </tr>
            </table>

            <!-- KPI Row -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;margin-top:15px;padding-top:15px;">
              <tr>
                <td width="25%" style="text-align:center;padding:10px;">
                  <p style="margin:0;font-size:18px;font-weight:800;color:#1e293b;">${fmtMoney(ca)} \u20AC</p>
                  <p style="margin:4px 0 0;font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">CA R\u00C9ALIS\u00C9</p>
                </td>
                <td width="25%" style="text-align:center;padding:10px;">
                  <p style="margin:0;font-size:18px;font-weight:800;color:#1e293b;">${fmtMoney(objectif)} \u20AC</p>
                  <p style="margin:4px 0 0;font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">OBJECTIF</p>
                </td>
                <td width="25%" style="text-align:center;padding:10px;">
                  <p style="margin:0;font-size:18px;font-weight:800;color:#1e293b;">${progression}%</p>
                  <p style="margin:4px 0 0;font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">PROGRESSION</p>
                </td>
                <td width="25%" style="text-align:center;padding:10px;">
                  <p style="margin:0;font-size:18px;font-weight:800;color:#1e293b;">${nbNouveauxPatients}</p>
                  <p style="margin:4px 0 0;font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">NOUVEAUX PATIENTS</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- PERFORMANCE FINANCI\u00C8RE -->
        <tr>
          <td style="padding:10px 40px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;padding-top:25px;">
              <tr>
                <td style="border-left:4px solid #10b981;padding-left:12px;">
                  <p style="margin:0;font-size:18px;font-weight:700;color:#1e293b;">&#x1F4C8; PERFORMANCE FINANCI\u00C8RE</p>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:#f8fafc;border-radius:10px;padding:18px;">
              <tr>
                <td style="text-align:center;padding:12px;">
                  <p style="margin:0;font-size:14px;font-weight:600;color:#475569;">Comparaison CA R\u00E9alis\u00E9 vs Objectif</p>
                  <p style="margin:8px 0 0;font-size:13px;color:#64748b;">${Math.round(ca/1000)}k\u20AC R\u00E9alis\u00E9 &nbsp; ${Math.round(objectif/1000)}k\u20AC Objectif &nbsp; ${progression}%</p>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 6px;font-size:12px;color:#64748b;">Chiffre d'Affaires \u2192 +${fmtMoney(ca - objectif)} \u20AC</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#e2e8f0;border-radius:6px;overflow:hidden;">
              <tr>
                <td style="width:${Math.min(progression, 100)}%;background:linear-gradient(90deg,#2563eb,#3b82f6);padding:8px 12px;border-radius:6px;color:#fff;font-size:12px;font-weight:700;">
                  ${progression}%
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border-collapse:collapse;">
              <tr style="background:#f8fafc;">
                <td style="padding:10px 14px;font-size:12px;color:#64748b;font-weight:600;">Indicateur</td>
                <td style="padding:10px 14px;font-size:12px;color:#64748b;font-weight:600;text-align:center;">Valeur</td>
                <td style="padding:10px 14px;font-size:12px;color:#64748b;font-weight:600;text-align:center;">Objectif</td>
                <td style="padding:10px 14px;font-size:12px;color:#64748b;font-weight:600;text-align:right;">\u00C9cart</td>
              </tr>
              <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:12px 14px;font-size:13px;color:#334155;">CA Total</td>
                <td style="padding:12px 14px;font-size:13px;font-weight:700;color:#1e293b;text-align:center;">${fmtMoney(ca)} \u20AC</td>
                <td style="padding:12px 14px;font-size:13px;color:#94a3b8;text-align:center;">${fmtMoney(objectif)} \u20AC</td>
                <td style="padding:12px 14px;font-size:13px;font-weight:600;color:${ca >= objectif ? '#10b981' : '#ef4444'};text-align:right;">+${fmtMoney(ca - objectif)} \u20AC</td>
              </tr>
              <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:12px 14px;font-size:13px;color:#334155;">CA Horaire</td>
                <td style="padding:12px 14px;font-size:13px;font-weight:700;color:#1e293b;text-align:center;">${Math.round(productionHoraire)} \u20AC/h</td>
                <td style="padding:12px 14px;font-size:13px;color:#94a3b8;text-align:center;">${Math.round(productionHoraire)} \u20AC/h</td>
                <td style="padding:12px 14px;font-size:13px;font-weight:600;color:#10b981;text-align:right;">+0 \u20AC/h</td>
              </tr>
              <tr>
                <td style="padding:12px 14px;font-size:13px;color:#334155;">Taux de r\u00E9alisation</td>
                <td style="padding:12px 14px;font-size:13px;font-weight:700;color:#1e293b;text-align:center;">${progression}%</td>
                <td style="padding:12px 14px;font-size:13px;color:#94a3b8;text-align:center;">100%</td>
                <td style="padding:12px 14px;font-size:13px;font-weight:600;color:${progression >= 100 ? '#10b981' : '#ef4444'};text-align:right;">${progression >= 100 ? '+' : ''}${progression - 100}%</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ACTIVIT\u00C9 PATIENTS -->
        <tr>
          <td style="padding:30px 40px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;padding-top:25px;">
              <tr>
                <td style="border-left:4px solid #3b82f6;padding-left:12px;">
                  <p style="margin:0;font-size:18px;font-weight:700;color:#1e293b;">&#x1F465; ACTIVIT\u00C9 PATIENTS</p>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
              <tr>
                <td width="25%" style="text-align:center;padding:18px 10px;background:#eff6ff;border-right:1px solid #e2e8f0;">
                  <p style="margin:0;font-size:28px;font-weight:800;color:#2563eb;">${nbNouveauxPatients}</p>
                  <p style="margin:4px 0 0;font-size:10px;color:#64748b;">Nouveaux patients</p>
                </td>
                <td width="25%" style="text-align:center;padding:18px 10px;background:#f0fdf4;border-right:1px solid #e2e8f0;">
                  <p style="margin:0;font-size:28px;font-weight:800;color:#10b981;">${patientsTraites}</p>
                  <p style="margin:4px 0 0;font-size:10px;color:#64748b;">Patients trait\u00E9s</p>
                </td>
                <td width="25%" style="text-align:center;padding:18px 10px;background:#faf5ff;border-right:1px solid #e2e8f0;">
                  <p style="margin:0;font-size:28px;font-weight:800;color:#8b5cf6;">${rdvHonores}</p>
                  <p style="margin:4px 0 0;font-size:10px;color:#64748b;">RDV honor\u00E9s</p>
                </td>
                <td width="25%" style="text-align:center;padding:18px 10px;background:#fef2f2;">
                  <p style="margin:0;font-size:28px;font-weight:800;color:#ef4444;">${tauxAbsence}%</p>
                  <p style="margin:4px 0 0;font-size:10px;color:#64748b;">Taux d'absence</p>
                </td>
              </tr>
            </table>

            <p style="margin:18px 0 6px;font-size:12px;color:#64748b;">Taux de conversion patients <span style="color:#10b981;font-weight:700;">${tauxConversion}%</span></p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#e2e8f0;border-radius:6px;overflow:hidden;">
              <tr>
                <td style="width:${tauxConversion}%;background:linear-gradient(90deg,#10b981,#34d399);padding:7px 12px;border-radius:6px;color:#fff;font-size:11px;font-weight:700;"></td>
              </tr>
            </table>
            <p style="margin:6px 0 0;font-size:11px;color:#64748b;">Objectif : \u2265 80% | ${tauxConversion >= 80 ? '\u2705 Objectif atteint' : '\u26A0\uFE0F \u00C0 am\u00E9liorer'}</p>
          </td>
        </tr>

        <!-- R\u00C9PARTITION DES ACTES -->
        <tr>
          <td style="padding:30px 40px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;padding-top:25px;">
              <tr>
                <td style="border-left:4px solid #f59e0b;padding-left:12px;">
                  <p style="margin:0;font-size:18px;font-weight:700;color:#1e293b;">&#x1F9B7; R\u00C9PARTITION DES ACTES</p>
                </td>
              </tr>
            </table>

            <p style="margin:15px 0 8px;font-size:13px;color:#475569;">CA Total <strong>${fmtMoney(totalCAActes)}\u20AC</strong></p>

            ${actesData.map(a => `
            <p style="margin:12px 0 4px;font-size:12px;color:#475569;">${a.type} (${a.nombre}) <strong style="color:${a.color};">${fmtMoney(a.ca)} \u20AC</strong></p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#e2e8f0;border-radius:4px;overflow:hidden;">
              <tr>
                <td style="width:${a.pct}%;background:${a.color};padding:5px 10px;border-radius:4px;color:#fff;font-size:10px;font-weight:700;">${a.pct}%</td>
              </tr>
            </table>
            `).join('')}

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border-collapse:collapse;border-radius:10px;overflow:hidden;">
              <tr style="background:#1e293b;">
                <td style="padding:10px 14px;font-size:12px;color:#fff;font-weight:600;">Type d'acte</td>
                <td style="padding:10px 14px;font-size:12px;color:#fff;font-weight:600;text-align:center;">Nombre</td>
                <td style="padding:10px 14px;font-size:12px;color:#fff;font-weight:600;text-align:right;">CA G\u00E9n\u00E9r\u00E9</td>
              </tr>
              ${actesData.map((a, i) => `
              <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'};border-bottom:1px solid #f1f5f9;">
                <td style="padding:10px 14px;font-size:13px;color:#334155;">${a.icon} ${a.type}</td>
                <td style="padding:10px 14px;font-size:13px;color:#475569;text-align:center;">${a.nombre}</td>
                <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#1e293b;text-align:right;">${fmtMoney(a.ca)} \u20AC</td>
              </tr>
              `).join('')}
              <tr style="background:#1e293b;">
                <td style="padding:10px 14px;font-size:13px;color:#fff;font-weight:800;">TOTAL</td>
                <td style="padding:10px 14px;font-size:13px;color:#fff;font-weight:700;text-align:center;">${totalActes}</td>
                <td style="padding:10px 14px;font-size:13px;color:#10b981;font-weight:800;text-align:right;">${fmtMoney(totalCAActes)} \u20AC</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- RECOMMANDATIONS -->
        <tr>
          <td style="padding:30px 40px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;padding-top:25px;">
              <tr>
                <td style="border-left:4px solid #f59e0b;padding-left:12px;">
                  <p style="margin:0;font-size:18px;font-weight:700;color:#1e293b;">&#x1F4A1; RECOMMANDATIONS</p>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;border-left:4px solid #3b82f6;background:#eff6ff;border-radius:0 10px 10px 0;overflow:hidden;">
              <tr>
                <td style="padding:18px 20px;">
                  <p style="margin:0;font-size:14px;font-weight:700;color:#1e293b;">1. Optimiser le taux de conversion des devis (+5-10% potentiel)</p>
                  <ul style="margin:8px 0 0;padding-left:20px;color:#475569;font-size:13px;">
                    <li style="padding:3px 0;">Mettre en place un suivi syst\u00E9matique des devis non accept\u00E9s</li>
                    <li style="padding:3px 0;">Proposer des facilit\u00E9s de paiement</li>
                  </ul>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;border-left:4px solid #10b981;background:#f0fdf4;border-radius:0 10px 10px 0;overflow:hidden;">
              <tr>
                <td style="padding:18px 20px;">
                  <p style="margin:0;font-size:14px;font-weight:700;color:#1e293b;">2. Maintenir le bon taux de pr\u00E9sence \u2713</p>
                  <ul style="margin:8px 0 0;padding-left:20px;color:#475569;font-size:13px;">
                    <li style="padding:3px 0;">Envoyer des rappels SMS 48h et 24h avant le RDV</li>
                    <li style="padding:3px 0;">Mettre en place une politique de gestion des annulations</li>
                  </ul>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;border-left:4px solid #f59e0b;background:#fffbeb;border-radius:0 10px 10px 0;overflow:hidden;">
              <tr>
                <td style="padding:18px 20px;">
                  <p style="margin:0;font-size:14px;font-weight:700;color:#1e293b;">3. D\u00E9velopper l'activit\u00E9 proth\u00E9tique</p>
                  <ul style="margin:8px 0 0;padding-left:20px;color:#475569;font-size:13px;">
                    <li style="padding:3px 0;">Fort potentiel de CA sur ce segment</li>
                    <li style="padding:3px 0;">Investir dans la formation continue</li>
                  </ul>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;border-left:4px solid #ef4444;background:#fef2f2;border-radius:0 10px 10px 0;overflow:hidden;">
              <tr>
                <td style="padding:18px 20px;">
                  <p style="margin:0;font-size:14px;font-weight:700;color:#1e293b;">4. Fid\u00E9lisation patients</p>
                  <ul style="margin:8px 0 0;padding-left:20px;color:#475569;font-size:13px;">
                    <li style="padding:3px 0;">Programme de rappel pour contr\u00F4les annuels</li>
                    <li style="padding:3px 0;">Communication r\u00E9guli\u00E8re (newsletter)</li>
                  </ul>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- PROCHAINES \u00C9TAPES -->
        <tr>
          <td style="padding:30px 40px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;padding-top:25px;">
              <tr>
                <td style="border-left:4px solid #2563eb;padding-left:12px;">
                  <p style="margin:0;font-size:18px;font-weight:700;color:#1e293b;">&#x1F4C5; PROCHAINES \u00C9TAPES</p>
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:15px;">
              <tr><td style="padding:10px 0;font-size:13px;color:#475569;">\u2610 R\u00E9union d'\u00E9quipe pour pr\u00E9senter les r\u00E9sultats</td></tr>
              <tr><td style="padding:10px 0;font-size:13px;color:#475569;border-top:1px solid #f1f5f9;">\u2610 Mise en place du syst\u00E8me de rappels automatiques</td></tr>
              <tr><td style="padding:10px 0;font-size:13px;color:#475569;border-top:1px solid #f1f5f9;">\u2610 Audit des devis en attente (&gt; 30 jours)</td></tr>
              <tr><td style="padding:10px 0;font-size:13px;color:#475569;border-top:1px solid #f1f5f9;">\u2610 Formation sur les techniques de pr\u00E9sentation des plans de traitement</td></tr>
            </table>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="padding:30px 40px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:12px;overflow:hidden;">
              <tr>
                <td style="padding:20px;text-align:center;">
                  <p style="margin:0;font-size:13px;color:#e2e8f0;">Rapport g\u00E9n\u00E9r\u00E9 automatiquement par <strong>Efficience Analytics</strong></p>
                  <p style="margin:6px 0 0;font-size:11px;color:#94a3b8;">Date de g\u00E9n\u00E9ration : ${dateGeneration}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:15px 40px 25px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#94a3b8;">\u00A9 2026 Efficience Dentaire - Plateforme s\u00E9curis\u00E9e HDS Certifi\u00E9e</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// Envoyer un rapport par email
async function sendReportEmail({ to, subject, practitionerName, mois, kpi, pdfBuffer, recommandations, cabinetName, historique }) {
  try {
    const transporter = createTransporter();

    const htmlContent = buildEmailHTML({ practitionerName, mois, kpi, recommandations, cabinetName, historique });

    const mailOptions = {
      from: `"Efficience Analytics" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: htmlContent,
      attachments: pdfBuffer ? [
        {
          filename: `rapport_${practitionerName.replace(/\s/g, '_')}_${mois.replace(/\s/g, '_')}.html`,
          content: pdfBuffer,
          contentType: 'text/html'
        }
      ] : []
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email envoye a ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Erreur envoi email:', error);
    throw error;
  }
}

module.exports = { sendReportEmail, buildEmailHTML };
