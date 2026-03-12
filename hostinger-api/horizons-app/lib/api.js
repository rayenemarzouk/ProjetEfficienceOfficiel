/**
 * API Service pour Efficience Analytics
 * Connexion à l'API PHP sur Hostinger
 */

const API_BASE = 'https://efficience-analytics-eu-783177.hostingersite.com/api';

/**
 * Fetch wrapper avec gestion d'erreurs
 */
async function fetchAPI(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}/${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

export const api = {
  /**
   * Test de connexion à l'API
   */
  health: async () => {
    return fetchAPI('health.php');
  },

  /**
   * Récupérer la liste des praticiens
   * @returns {Promise<string[]>} Liste des codes praticiens (JC, DV, ER, etc.)
   */
  getPraticiens: async () => {
    const result = await fetchAPI('get-praticiens.php');
    return result.data || [];
  },

  /**
   * Récupérer les données d'une table spécifique
   * @param {string} table - Nom de la table
   * @param {string} praticien - Code praticien (optionnel)
   * @param {string} mois - Mois format YYYYMMDD (optionnel)
   */
  getData: async (table, praticien = null, mois = null) => {
    let url = `get-data.php?table=${encodeURIComponent(table)}`;
    if (praticien) url += `&praticien=${encodeURIComponent(praticien)}`;
    if (mois) url += `&mois=${encodeURIComponent(mois)}`;
    
    const result = await fetchAPI(url);
    return result.data || [];
  },

  /**
   * Récupérer le dashboard complet d'un praticien
   * @param {string} praticien - Code praticien (optionnel, null = tous)
   */
  getDashboard: async (praticien = null) => {
    let url = 'get-dashboard.php';
    if (praticien) url += `?praticien=${encodeURIComponent(praticien)}`;
    
    const result = await fetchAPI(url);
    return result.data || {};
  },

  /**
   * Récupérer les statistiques mensuelles pour les graphiques
   * @param {string} praticien - Code praticien (optionnel)
   * @param {string} year - Année (défaut: année courante)
   */
  getMonthlyStats: async (praticien = null, year = null) => {
    let url = 'get-monthly-stats.php';
    const params = [];
    if (praticien) params.push(`praticien=${encodeURIComponent(praticien)}`);
    if (year) params.push(`year=${encodeURIComponent(year)}`);
    if (params.length > 0) url += '?' + params.join('&');
    
    const result = await fetchAPI(url);
    return result.data || [];
  },

  /**
   * Récupérer les jours ouvrés
   */
  getJoursOuverts: async (praticien = null) => {
    return api.getData('analyse_jours_ouverts', praticien);
  },

  /**
   * Récupérer les réalisations (CA)
   */
  getRealisation: async (praticien = null) => {
    return api.getData('analyse_realisation', praticien);
  },

  /**
   * Récupérer les rendez-vous
   */
  getRendezvous: async (praticien = null) => {
    return api.getData('analyse_rendezvous', praticien);
  },

  /**
   * Récupérer les devis
   */
  getDevis: async (praticien = null) => {
    return api.getData('analyse_devis', praticien);
  },

  /**
   * Récupérer les encours
   */
  getEncours: async () => {
    return api.getData('encours');
  }
};

export default api;
