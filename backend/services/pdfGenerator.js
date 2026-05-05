// Génération de rapports PDF avec Puppeteer
const { buildEmailHTML } = require('./emailService');

// Puppeteer désactivé sur Render (timeout HTTP 30s incompatible avec Chrome headless)
// Pour activer localement : PUPPETEER_ENABLED=true dans .env
const PUPPETEER_ENABLED = process.env.PUPPETEER_ENABLED === 'true';

let puppeteer;
if (PUPPETEER_ENABLED) {
  try {
    puppeteer = require('puppeteer');
  } catch (e) {
    console.warn('⚠️ Puppeteer non disponible, fallback HTML');
  }
}

async function generatePDFReport(data) {
  const {
    praticienNom, moisFormate, cabinetName,
    caMensuel, montantEncaisse, nbPatients, nbNouveauxPatients,
    nbRdv, panierMoyen, productionHoraire, heuresTravaillees,
    nbDevis, tauxAcceptationDevis, recommandations, historique, financialCommentary
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
      tauxAcceptationDevis: tauxAcceptationDevis || 0,
      financialCommentary: financialCommentary || ''
    },
    recommandations: recommandations || [],
    cabinetName: cabinetName || 'Cabinet',
    historique: historique || []
  });

  // Try Puppeteer for real PDF
  if (puppeteer) {
    let browser;
    const PUPPETEER_TIMEOUT = 25000; // 25s max
    try {
      const pdfPromise = (async () => {
        browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--no-zygote',
            '--single-process',
            '--disable-extensions',
            '--disable-background-networking',
            '--disable-default-apps',
            '--mute-audio',
            '--no-first-run'
          ]
        });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15000 });
        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '10mm', bottom: '10mm', left: '5mm', right: '5mm' }
        });
        return Buffer.from(pdfBuffer);
      })();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Puppeteer timeout')), PUPPETEER_TIMEOUT)
      );

      return await Promise.race([pdfPromise, timeoutPromise]);
    } catch (err) {
      console.error('Puppeteer PDF error, falling back to HTML:', err.message);
      return Buffer.from(html, 'utf-8');
    } finally {
      if (browser) await browser.close().catch(() => {});
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
    nbDevis, tauxAcceptationDevis, recommandations, historique, financialCommentary
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
      tauxAcceptationDevis: tauxAcceptationDevis || 0,
      financialCommentary: financialCommentary || ''
    },
    recommandations: recommandations || [],
    cabinetName: cabinetName || 'Cabinet',
    historique: historique || []
  });
}

module.exports = { generatePDFReport, generateHTMLReport };
