// Génération de rapports PDF avec Puppeteer
const { buildEmailHTML } = require('./emailService');
let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch (e) {
  console.warn('⚠️ Puppeteer non disponible, fallback HTML');
}

async function generatePDFReport(data) {
  const {
    praticienNom, moisFormate, cabinetName,
    caMensuel, montantEncaisse, nbPatients, nbNouveauxPatients,
    nbRdv, panierMoyen, productionHoraire, heuresTravaillees,
    nbDevis, tauxAcceptationDevis, recommandations, historique
  } = data;

  const html = buildEmailHTML({
    practitionerName: praticienNom || 'Praticien',
    mois: moisFormate || '',
    kpi: {
      caMensuel: caMensuel || 0,
      montantEncaisse: montantEncaisse || 0,
      nbPatients: nbPatients || 0,
      nbNouveauxPatients: nbNouveauxPatients || 0,
      nbRdv: nbRdv || 0,
      panierMoyen: panierMoyen || 0,
      productionHoraire: productionHoraire || 0,
      heuresTravaillees: heuresTravaillees || 0,
      nbDevis: nbDevis || 0,
      tauxAcceptationDevis: tauxAcceptationDevis || 0
    },
    recommandations: recommandations || [],
    cabinetName: cabinetName || 'Cabinet',
    historique: historique || []
  });

  // Try Puppeteer for real PDF
  if (puppeteer) {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', bottom: '10mm', left: '5mm', right: '5mm' }
      });
      return Buffer.from(pdfBuffer);
    } catch (err) {
      console.error('Puppeteer PDF error, falling back to HTML:', err.message);
      return Buffer.from(html, 'utf-8');
    } finally {
      if (browser) await browser.close();
    }
  }

  // Fallback: return HTML buffer
  return Buffer.from(html, 'utf-8');
}

// Generate just HTML (for email attachments)
function generateHTMLReport(data) {
  const {
    praticienNom, moisFormate, cabinetName,
    caMensuel, montantEncaisse, nbPatients, nbNouveauxPatients,
    nbRdv, panierMoyen, productionHoraire, heuresTravaillees,
    nbDevis, tauxAcceptationDevis, recommandations, historique
  } = data;

  return buildEmailHTML({
    practitionerName: praticienNom || 'Praticien',
    mois: moisFormate || '',
    kpi: {
      caMensuel: caMensuel || 0,
      montantEncaisse: montantEncaisse || 0,
      nbPatients: nbPatients || 0,
      nbNouveauxPatients: nbNouveauxPatients || 0,
      nbRdv: nbRdv || 0,
      panierMoyen: panierMoyen || 0,
      productionHoraire: productionHoraire || 0,
      heuresTravaillees: heuresTravaillees || 0,
      nbDevis: nbDevis || 0,
      tauxAcceptationDevis: tauxAcceptationDevis || 0
    },
    recommandations: recommandations || [],
    cabinetName: cabinetName || 'Cabinet',
    historique: historique || []
  });
}

module.exports = { generatePDFReport, generateHTMLReport };
