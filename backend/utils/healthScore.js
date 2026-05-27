/**
 * Calcul unifié du score de santé d'un cabinet dentaire.
 * Modèle à 5 critères — poids et normalisation identiques au modèle frontend (aiModels.js).
 * Exposé via les routes API ; aucun calcul de score ne doit subsister côté frontend.
 */

/**
 * Calcule le score de santé global (0–100) d'un cabinet.
 *
 * @param {object} metrics
 * @param {number} metrics.tauxEncaissement    - % encaissement (0–100)
 * @param {number} metrics.evolutionCA         - % variation CA vs période précédente (défaut 0 = neutre)
 * @param {number} metrics.tauxAbsence         - % rendez-vous manqués / total RDV (0–100)
 * @param {number} metrics.productionHoraire   - production en €/h
 * @param {number} metrics.tauxNouveauxPatients - % nouveaux patients / total RDV (0–100)
 * @returns {{ score: number, label: string }}
 */
function calculateHealthScore({
  tauxEncaissement = 0,
  evolutionCA = 0,
  tauxAbsence = 0,
  productionHoraire = 0,
  tauxNouveauxPatients = 0,
} = {}) {
  const normalized = {
    encaissement: Math.min(100, Math.max(0, tauxEncaissement)),
    evolution:    Math.min(100, Math.max(0, 50 + evolutionCA * 2)),
    absence:      Math.min(100, Math.max(0, 100 - tauxAbsence * 5)),
    production:   Math.min(100, Math.max(0, (productionHoraire / 400) * 100)),
    nouveaux:     Math.min(100, Math.max(0, tauxNouveauxPatients * 5)),
  };

  const weights = {
    encaissement: 0.30,
    evolution:    0.25,
    absence:      0.15,
    production:   0.20,
    nouveaux:     0.10,
  };

  const globalScore = Object.keys(normalized).reduce((total, key) => {
    return total + normalized[key] * weights[key];
  }, 0);

  const score = Math.round(globalScore);

  return { score, label: getHealthScoreLabel(score) };
}

/**
 * Retourne le libellé correspondant à un score de santé.
 * Seuils uniques utilisés dans toute l'application (backend + frontend).
 *
 * @param {number} score - Score entre 0 et 100
 * @returns {string}
 */
function getHealthScoreLabel(score) {
  if (score >= 80) return 'Excellent';
  if (score >= 65) return 'Bon';
  if (score >= 50) return 'Moyen';
  return 'Critique';
}

module.exports = { calculateHealthScore, getHealthScoreLabel };
