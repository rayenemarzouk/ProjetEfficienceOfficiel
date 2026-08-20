const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    // Force IPv4 to avoid ENETUNREACH errors with IPv6
    family: 4,
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Build the full email HTML matching the reference design
function buildEmailHTML({ practitionerName, mois, kpi, recommandations, cabinetName, historique }) {
  const now = new Date();
  const dateGeneration = now.toLocaleDateString('fr-FR') + ' ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const hist = Array.isArray(historique) ? historique : [];
  const prevHist = hist.length > 1 ? hist[hist.length - 2] : null;

  const ca = Number(kpi?.caMensuel || 0);
  const prevCa = Number(prevHist?.ca || 0);
  const objectif = Number(kpi?.objectif || (prevCa > 0 ? Math.round(prevCa) : Math.round(ca * 1.1)));
  const encaisse = Number(kpi?.montantEncaisse || ca);
  const progression = objectif > 0 ? Math.round((ca / objectif) * 100) : 100;
  const nbPatients = kpi?.nbPatients || 0;
  const nbNouveauxPatients = kpi?.nbNouveauxPatients || 0;
  const nbRdv = kpi?.nbRdv || 0;
  const productionHoraire = parseFloat(kpi?.productionHoraire || 0);
  const prevHeuresMinutes = Number(prevHist?.heures || 0);
  const prevHeures = prevHeuresMinutes > 0 ? prevHeuresMinutes / 60 : 0;
  const prevProdHoraire = prevHeures > 0 ? (prevCa / prevHeures) : 0;
  const objectifHoraire = Number(kpi?.objectifHoraire || (prevProdHoraire > 0 ? Math.round(prevProdHoraire) : 300));
  const panierMoyen = parseFloat(kpi?.panierMoyen || 0);
  const heuresTravaillees = parseFloat(kpi?.heuresTravaillees || 0);
  const tauxAcceptationDevis = parseFloat(kpi?.tauxAcceptationDevis || 0);
  const tauxAbsence = Number.isFinite(Number(kpi?.tauxAbsence)) ? Number(kpi?.tauxAbsence) : 0;
  const financialCommentary = String(kpi?.financialCommentary || 'Analyse financi\u00e8re indisponible pour ce rapport.');
  const financialCommentaryHTML = financialCommentary
    .split('\n\n')
    .map(para => `<p style="margin:0 0 8px;font-size:13px;line-height:1.7;color:#1e293b;">${para.replace(/\n/g, '<br>')}</p>`)
    .join('');
  // RDV honor\u00e9s coh\u00e9rent avec le taux d'absence r\u00e9el
  const rdvHonores = tauxAbsence > 0 ? Math.round(nbRdv * (1 - tauxAbsence / 100)) : nbRdv;
  const rdvManques = nbRdv - rdvHonores;

  // Score global
  const scoreCA = Math.min(100, progression);
  const scoreProd = Math.min(100, productionHoraire > 0 ? Math.round((productionHoraire / 350) * 100) : 80);
  const scorePatients = Math.min(100, Math.round((nbPatients / 200) * 100));
  const performanceGlobale = Math.round((scoreCA * 0.4 + scoreProd * 0.3 + scorePatients * 0.3));
  const performanceColor = performanceGlobale >= 80 ? '#10b981' : performanceGlobale >= 60 ? '#f59e0b' : '#ef4444';
  const statutOK = true; // Tous les cabinets sont affich\u00e9s comme OK

  const fmtMoney = (v) => Number(v || 0).toLocaleString('fr-FR');

  // Build Comportement du Cabinet section dynamically
  function buildComportementCabinet() {
    if (hist.length === 0) {
      return '<p style="margin:10px 0;font-size:13px;color:#94a3b8;text-align:center;">Aucune donn\u00e9e historique disponible.</p>';
    }
    const cur = hist[hist.length - 1] || {};
    const prv = hist.length > 1 ? hist[hist.length - 2] : null;
    const caEvol = prv && prv.ca > 0 ? (((cur.ca - prv.ca) / prv.ca) * 100).toFixed(1) : null;
    const patEvol = prv && prv.patients > 0 ? (((cur.patients - prv.patients) / prv.patients) * 100).toFixed(1) : null;

    let o = '';
    // Summary cards row
    o += '<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;"><tr>';
    // CA du mois
    o += '<td width="25%" style="text-align:center;padding:18px 10px;background:#eff6ff;border-right:1px solid #e2e8f0;">';
    o += '<p style="margin:0;font-size:24px;font-weight:800;color:#2563eb;">' + fmtMoney(cur.ca || 0) + ' &euro;</p>';
    o += '<p style="margin:4px 0 0;font-size:10px;color:#64748b;">&#x1F4B0; CA du mois</p>';
    if (caEvol !== null) {
      const c = parseFloat(caEvol) >= 0 ? '#10b981' : '#ef4444';
      const s = parseFloat(caEvol) >= 0 ? '+' : '';
      o += '<p style="margin:2px 0 0;font-size:11px;font-weight:700;color:' + c + ';">' + s + caEvol + '%</p>';
    }
    o += '</td>';
    // Patients
    o += '<td width="25%" style="text-align:center;padding:18px 10px;background:#f0fdf4;border-right:1px solid #e2e8f0;">';
    o += '<p style="margin:0;font-size:24px;font-weight:800;color:#10b981;">' + (cur.patients || 0) + '</p>';
    o += '<p style="margin:4px 0 0;font-size:10px;color:#64748b;">&#x1F465; Patients</p>';
    if (patEvol !== null) {
      const c2 = parseFloat(patEvol) >= 0 ? '#10b981' : '#ef4444';
      const s2 = parseFloat(patEvol) >= 0 ? '+' : '';
      o += '<p style="margin:2px 0 0;font-size:11px;font-weight:700;color:' + c2 + ';">' + s2 + patEvol + '%</p>';
    }
    o += '</td>';
    // RDV
    o += '<td width="25%" style="text-align:center;padding:18px 10px;background:#faf5ff;border-right:1px solid #e2e8f0;">';
    o += '<p style="margin:0;font-size:24px;font-weight:800;color:#8b5cf6;">' + (cur.rdv || nbRdv || 0) + '</p>';
    o += '<p style="margin:4px 0 0;font-size:10px;color:#64748b;">&#x1F4C5; RDV</p></td>';
    // Heures
    o += '<td width="25%" style="text-align:center;padding:18px 10px;background:#fffbeb;">';
    const hT = cur.heures ? (cur.heures / 60).toFixed(0) : Math.round(heuresTravaillees);
    o += '<p style="margin:0;font-size:24px;font-weight:800;color:#f59e0b;">' + hT + 'h</p>';
    o += '<p style="margin:4px 0 0;font-size:10px;color:#64748b;">&#x23F0; Heures</p></td>';
    o += '</tr></table>';

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
            <p style="margin:12px 0 0;font-size:14px;color:${statutOK ? '#16a34a' : '#dc2626'};font-weight:700;">Statut du cabinet : ${statutOK ? 'Passable' : '\u00C0 SURVEILLER'}</p>
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
                  <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:${statutOK ? '#16a34a' : '#d97706'};">${statutOK ? 'Passable' : '\u00C0 surveiller'}</p>
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

            <p style="margin:0 0 6px;font-size:12px;color:#64748b;">Chiffre d'Affaires \u2192 ${ca - objectif >= 0 ? '+' : ''}${fmtMoney(ca - objectif)} \u20AC</p>
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
                <td style="padding:12px 14px;font-size:13px;font-weight:600;color:${ca >= objectif ? '#10b981' : '#ef4444'};text-align:right;">${ca - objectif >= 0 ? '+' : ''}${fmtMoney(ca - objectif)} \u20AC</td>
              </tr>
              <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:12px 14px;font-size:13px;color:#334155;">CA Horaire</td>
                <td style="padding:12px 14px;font-size:13px;font-weight:700;color:#1e293b;text-align:center;">${Math.round(productionHoraire)} \u20AC/h</td>
                <td style="padding:12px 14px;font-size:13px;color:#94a3b8;text-align:center;">${Math.round(objectifHoraire)} \u20AC/h</td>
                <td style="padding:12px 14px;font-size:13px;font-weight:600;color:${productionHoraire >= objectifHoraire ? '#10b981' : '#ef4444'};text-align:right;">${Math.round(productionHoraire - objectifHoraire) >= 0 ? '+' : ''}${Math.round(productionHoraire - objectifHoraire)} \u20AC/h</td>
              </tr>
              <tr>
                <td style="padding:12px 14px;font-size:13px;color:#334155;">Taux de r\u00E9alisation</td>
                <td style="padding:12px 14px;font-size:13px;font-weight:700;color:#1e293b;text-align:center;">${progression}%</td>
                <td style="padding:12px 14px;font-size:13px;color:#94a3b8;text-align:center;">100%</td>
                <td style="padding:12px 14px;font-size:13px;font-weight:600;color:${progression >= 100 ? '#10b981' : '#ef4444'};text-align:right;">${progression >= 100 ? '+' : ''}${progression - 100}%</td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;border-left:4px solid #2563eb;background:#eff6ff;border-radius:0 10px 10px 0;overflow:hidden;">
              <tr>
                <td style="padding:14px 16px;">
                  <p style="margin:0;font-size:11px;font-weight:700;color:#1d4ed8;letter-spacing:0.3px;text-transform:uppercase;">Commentaire IA financier</p>
                  <div style="margin:6px 0 0;">${financialCommentaryHTML}</div>
                </td>
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
                  <p style="margin:0;font-size:28px;font-weight:800;color:#2563eb;">${nbPatients}</p>
                  <p style="margin:4px 0 0;font-size:10px;color:#64748b;">Patients</p>
                </td>
                <td width="25%" style="text-align:center;padding:18px 10px;background:#f0fdf4;border-right:1px solid #e2e8f0;">
                  <p style="margin:0;font-size:28px;font-weight:800;color:#10b981;">${nbRdv}</p>
                  <p style="margin:4px 0 0;font-size:10px;color:#64748b;">RDV total</p>
                </td>
                <td width="25%" style="text-align:center;padding:18px 10px;background:#faf5ff;border-right:1px solid #e2e8f0;">
                  <p style="margin:0;font-size:28px;font-weight:800;color:#8b5cf6;">${rdvHonores}</p>
                  <p style="margin:4px 0 0;font-size:10px;color:#64748b;">RDV honor\u00E9s</p>
                </td>
                <td width="25%" style="text-align:center;padding:18px 10px;background:${tauxAbsence > 10 ? '#fef2f2' : '#f0fdf4'};">
                  <p style="margin:0;font-size:28px;font-weight:800;color:${tauxAbsence > 10 ? '#ef4444' : '#10b981'};">${tauxAbsence}%</p>
                  <p style="margin:4px 0 0;font-size:10px;color:#64748b;">Absent\u00E9isme</p>
                </td>
              </tr>
            </table>
            ${rdvManques > 0 ? '<p style="margin:12px 0 0;font-size:12px;color:#64748b;">RDV manqu\u00E9s / annul\u00E9s\u00A0: <strong style="color:#ef4444;">' + rdvManques + '</strong> sur ' + nbRdv + '</p>' : '<p style="margin:12px 0 0;font-size:12px;color:#10b981;">\u2705 Aucun RDV manqu\u00E9 ce mois-ci</p>'}
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
    return info;
  } catch (error) {
    console.error('Erreur envoi email:', error);
    throw error;
  }
}

module.exports = {
  createTransporter,
  buildEmailHTML,
  sendReportEmail,
  sendMail: async function({ to, subject, html }) {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"Efficience Analytics" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
  }
};
