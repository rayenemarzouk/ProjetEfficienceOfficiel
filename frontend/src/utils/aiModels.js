/**
 * ═══════════════════════════════════════════════════════════════
 *  EFFICIENCE ANALYTICS — Modèles IA / Machine Learning
 * ═══════════════════════════════════════════════════════════════
 *  
 *  Modèles statistiques et ML implémentés nativement :
 *  
 *   1. Régression Linéaire (OLS — Moindres Carrés Ordinaires)
 *   2. Lissage Exponentiel Simple (SES)
 *   3. Lissage de Holt (Double Exponential Smoothing)
 *   4. Moyenne Mobile (Simple Moving Average)
 *   5. Détection d'Anomalies (Z-Score)
 *   6. Prévision (Forecast) — combinaison régression + lissage
 *   7. Analyse de Tendance (Trend Analysis)
 *   8. Score de Santé Cabinet (Multi-KPI Scoring Model)
 *   9. Régression Polynomiale (degré configurable)
 *  10. Random Forest (Ensemble d'arbres de décision)
 *  11. K-Nearest Neighbors (KNN — classification/régression)
 *  12. K-Means Clustering (segmentation non-supervisée)
 *  13. Régression Logistique (classification binaire)
 *  14. ARIMA simplifié (AutoRegressive Integrated Moving Average)
 *  15. Réseau de Neurones (Perceptron multicouche simplifié)
 *  16. Naive Bayes (classification probabiliste)
 *
 *  Aucune dépendance externe requise — 100% JavaScript natif.
 */

// ─── KILL SWITCH GLOBAL — Désactive tous les modèles IA ─────────
let _aiEnabled = true;
export function setAIEnabled(val) { _aiEnabled = !!val; }
export function isAIEnabled() { return _aiEnabled; }

const AI_DISABLED_MSG = '⛔ Les analyses IA sont actuellement désactivées par l\'administrateur.';

// ─── 1. RÉGRESSION LINÉAIRE (OLS - Ordinary Least Squares) ───────
// Calcule la droite y = slope * x + intercept par moindres carrés
export function linearRegression(data) {
  if (!_aiEnabled) return { slope: 0, intercept: 0, r2: 0, predict: () => 0 };
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: data[0] || 0, r2: 0, predict: () => data[0] || 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += data[i];
    sumXY += i * data[i];
    sumX2 += i * i;
    sumY2 += data[i] * data[i];
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Coefficient de détermination R²
  const yMean = sumY / n;
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept;
    ssRes += (data[i] - predicted) ** 2;
    ssTot += (data[i] - yMean) ** 2;
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  const predict = (x) => slope * x + intercept;

  return { slope, intercept, r2, predict };
}

// ─── 2. LISSAGE EXPONENTIEL (Simple Exponential Smoothing) ───────
// Alpha = facteur de lissage (0.1 à 0.9, plus élevé = plus réactif)
export function exponentialSmoothing(data, alpha = 0.3) {
  if (!_aiEnabled) return [...data];
  if (data.length === 0) return [];
  const smoothed = [data[0]];
  for (let i = 1; i < data.length; i++) {
    smoothed.push(alpha * data[i] + (1 - alpha) * smoothed[i - 1]);
  }
  return smoothed;
}

// ─── 3. LISSAGE EXPONENTIEL DOUBLE (Holt) — pour tendance ───────
// Capture à la fois le niveau et la tendance
export function holtSmoothing(data, alpha = 0.3, beta = 0.1) {
  if (!_aiEnabled) return { smoothed: [...data], forecast: () => 0 };
  if (data.length < 2) return { smoothed: [...data], forecast: (h) => data[0] || 0 };

  let level = data[0];
  let trend = data[1] - data[0];
  const smoothed = [data[0]];

  for (let i = 1; i < data.length; i++) {
    const prevLevel = level;
    level = alpha * data[i] + (1 - alpha) * (prevLevel + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    smoothed.push(level);
  }

  // Forecast h steps ahead
  const forecast = (h) => level + h * trend;

  return { smoothed, forecast, level, trend };
}

// ─── 4. MOYENNE MOBILE (Simple Moving Average) ──────────────────
export function movingAverage(data, window = 3) {
  if (!_aiEnabled) return [...data];
  if (data.length < window) return [...data];
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < window - 1) {
      result.push(null); // Pas assez de données pour la fenêtre
    } else {
      let sum = 0;
      for (let j = i - window + 1; j <= i; j++) {
        sum += data[j];
      }
      result.push(sum / window);
    }
  }
  return result;
}

// ─── 5. DÉTECTION D'ANOMALIES (Z-Score) ─────────────────────────
// Retourne un tableau de booleans (true = anomalie) + détails
export function detectAnomalies(data, threshold = 2.0) {
  if (!_aiEnabled) return data.map(() => ({ isAnomaly: false, zScore: 0, direction: 'normal' }));
  const n = data.length;
  if (n < 3) return data.map(() => ({ isAnomaly: false, zScore: 0 }));

  const mean = data.reduce((s, v) => s + v, 0) / n;
  const variance = data.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return data.map(() => ({ isAnomaly: false, zScore: 0 }));

  return data.map((val) => {
    const zScore = (val - mean) / stdDev;
    return {
      isAnomaly: Math.abs(zScore) > threshold,
      zScore: parseFloat(zScore.toFixed(2)),
      direction: zScore > threshold ? 'high' : zScore < -threshold ? 'low' : 'normal',
    };
  });
}

// ─── 6. PRÉVISION COMBINÉE (Forecast) ───────────────────────────
// Combine régression linéaire + Holt pour une prévision pondérée
export function forecast(data, stepsAhead = 3) {
  if (!_aiEnabled) return new Array(stepsAhead).fill(0);
  if (data.length < 2) return new Array(stepsAhead).fill(data[0] || 0);

  const lr = linearRegression(data);
  const holt = holtSmoothing(data, 0.4, 0.15);
  const n = data.length;

  // Pondérer: si R² de la régression est bon, favoriser la régression
  const w = Math.max(0.3, Math.min(0.7, lr.r2));

  const predictions = [];
  for (let h = 1; h <= stepsAhead; h++) {
    const lrPred = lr.predict(n - 1 + h);
    const holtPred = holt.forecast(h);
    const combined = w * lrPred + (1 - w) * holtPred;
    predictions.push(Math.max(0, Math.round(combined * 100) / 100));
  }

  return predictions;
}

// ─── 7. ANALYSE DE TENDANCE ─────────────────────────────────────
// Retourne une analyse textuelle basée sur les modèles
export function analyzeTrend(data, labels = []) {
  if (!_aiEnabled) return { trend: 'disabled', text: AI_DISABLED_MSG, confidence: 0, mean: 0, lastValue: 0, slope: 0, r2: 0, pctChange: 0, nbAnomalies: 0, severity: 'neutral' };
  if (!data || data.length === 0) {
    return { trend: 'insufficient', text: 'Aucune donnée disponible.', confidence: 0, mean: 0, lastValue: 0, slope: 0, r2: 0, pctChange: 0, nbAnomalies: 0, severity: 'neutral' };
  }
  const safeMean = data.reduce((s, v) => s + v, 0) / data.length;
  if (data.length < 2) {
    return { trend: 'insufficient', text: 'Données insuffisantes pour l\'analyse.', confidence: 0, mean: Math.round(safeMean), lastValue: data[data.length - 1] || 0, slope: 0, r2: 0, pctChange: 0, nbAnomalies: 0, severity: 'neutral' };
  }

  const lr = linearRegression(data);
  const anomalies = detectAnomalies(data);
  const nbAnomalies = anomalies.filter(a => a.isAnomaly).length;
  const lastVal = data[data.length - 1];
  const firstVal = data[0];
  const mean = data.reduce((s, v) => s + v, 0) / data.length;
  const pctChange = firstVal > 0 ? ((lastVal - firstVal) / firstVal * 100).toFixed(1) : 0;

  // Trend classification
  let trend, severity;
  if (lr.slope > mean * 0.02) {
    trend = 'upward';
    severity = lr.slope > mean * 0.05 ? 'strong' : 'moderate';
  } else if (lr.slope < -mean * 0.02) {
    trend = 'downward';
    severity = lr.slope < -mean * 0.05 ? 'strong' : 'moderate';
  } else {
    trend = 'stable';
    severity = 'neutral';
  }

  const confidence = Math.round(Math.abs(lr.r2) * 100);

  return {
    trend,
    severity,
    slope: lr.slope,
    r2: lr.r2,
    confidence,
    pctChange: parseFloat(pctChange),
    nbAnomalies,
    mean: Math.round(mean),
    lastValue: lastVal,
  };
}

// ─── 8. SCORE DE SANTÉ CABINET (Multi-KPI Scoring) ──────────────
// Modèle de scoring pondéré multi-critères
export function cabinetHealthScore({
  tauxEncaissement = 0,    // % (0-100)
  evolutionCA = 0,          // % variation
  tauxAbsence = 0,          // % (0-100)
  productionHoraire = 0,    // €/h
  tauxNouveauxPatients = 0, // % nouveaux / total
}) {
  if (!_aiEnabled) return { globalScore: 0, score: 0, scores: {}, weights: {}, level: 'disabled', label: 'IA désactivée' };
  // Normalisation sur 0-100 pour chaque critère
  const scores = {
    encaissement: Math.min(100, Math.max(0, tauxEncaissement)),
    evolution: Math.min(100, Math.max(0, 50 + evolutionCA * 2)), // centré sur 50
    absence: Math.min(100, Math.max(0, 100 - tauxAbsence * 5)),  // inversé
    production: Math.min(100, Math.max(0, (productionHoraire / 400) * 100)),
    nouveaux: Math.min(100, Math.max(0, tauxNouveauxPatients * 5)),
  };

  // Poids de chaque critère
  const weights = {
    encaissement: 0.30,
    evolution: 0.25,
    absence: 0.15,
    production: 0.20,
    nouveaux: 0.10,
  };

  const globalScore = Object.keys(scores).reduce((total, key) => {
    return total + scores[key] * weights[key];
  }, 0);

  let level;
  if (globalScore >= 80) level = 'excellent';
  else if (globalScore >= 65) level = 'bon';
  else if (globalScore >= 50) level = 'moyen';
  else level = 'critique';

  return {
    globalScore: Math.round(globalScore),
    score: Math.round(globalScore),
    scores,
    weights,
    level,
    label: level,
  };
}

// ─── 9. GÉNÉRATION DE LIGNE DE TENDANCE POUR CHART.JS ───────────
// Produit un dataset Chart.js de la ligne de régression + forecast
export function generateTrendLineDataset(data, forecastSteps = 3, color = '#8b5cf6') {
  if (!_aiEnabled) {
    return {
      trendData: [], forecastData: [], r2: 0, slope: 0,
      dataset: { label: 'Tendance IA', data: [], borderColor: color, borderDash: [6,4], borderWidth: 2, pointRadius: 0, fill: false, tension: 0 },
      forecastDataset: { label: 'Prévision IA', data: [], borderColor: color, borderDash: [3,3], borderWidth: 2.5, pointRadius: 0, fill: false, tension: 0 }
    };
  }
  const lr = linearRegression(data);
  const n = data.length;

  // Ligne de tendance sur les données existantes
  const trendLine = [];
  for (let i = 0; i < n; i++) {
    trendLine.push(Math.max(0, Math.round(lr.predict(i) * 100) / 100));
  }

  // Forecast
  const forecastValues = forecast(data, forecastSteps);

  return {
    trendData: trendLine,
    forecastData: [...new Array(n).fill(null), ...forecastValues],
    r2: lr.r2,
    slope: lr.slope,
    dataset: {
      label: 'Tendance IA',
      data: trendLine,
      borderColor: color,
      borderDash: [6, 4],
      borderWidth: 2,
      pointRadius: 0,
      fill: false,
      tension: 0,
    },
    forecastDataset: {
      label: 'Prévision IA',
      data: [...new Array(n).fill(null), ...forecastValues],
      borderColor: color,
      borderDash: [3, 3],
      borderWidth: 2.5,
      pointRadius: 5,
      pointBackgroundColor: '#ffffff',
      pointBorderColor: color,
      pointBorderWidth: 2,
      pointStyle: 'triangle',
      fill: false,
      tension: 0.3,
    },
  };
}

// ─── 10. GÉNÉRATION DE TEXTE D'ANALYSE IA ───────────────────────
export function generateAIInsight(data, metricName = 'indicateur') {
  if (!_aiEnabled) return { text: AI_DISABLED_MSG, parts: [AI_DISABLED_MSG], trend: 'disabled', confidence: 0, forecast: [], nbAnomalies: 0 };
  const trend = analyzeTrend(data);
  const fc = forecast(data, 3);
  const anomalies = detectAnomalies(data);
  const nbAnomalies = anomalies.filter(a => a.isAnomaly).length;
  const lastVal = data[data.length - 1] || 0;

  const parts = [];

  // Tendance
  const trendMean = (trend.mean != null) ? trend.mean : 0;
  const trendR2 = (trend.r2 != null) ? trend.r2 : 0;
  const trendConf = (trend.confidence != null) ? trend.confidence : 0;
  const trendPct = (trend.pctChange != null) ? trend.pctChange : 0;

  if (trend.trend === 'insufficient') {
    parts.push(`📊 Le ${metricName} dispose de trop peu de données pour une analyse approfondie (moyenne : ${trendMean.toLocaleString('fr-FR')}).`);
  } else if (trend.trend === 'upward') {
    parts.push(`📈 Le ${metricName} montre une tendance haussière (${trend.severity === 'strong' ? 'forte' : 'modérée'}) avec une variation de ${trendPct > 0 ? '+' : ''}${trendPct}% sur la période.`);
  } else if (trend.trend === 'downward') {
    parts.push(`📉 Le ${metricName} est en baisse ${trend.severity === 'strong' ? 'significative' : 'légère'} (${trendPct}% sur la période).`);
  } else {
    parts.push(`📊 Le ${metricName} est globalement stable autour de ${trendMean.toLocaleString('fr-FR')}.`);
  }

  // Fiabilité
  parts.push(`🎯 Fiabilité du modèle : ${trendConf}% (R² = ${trendR2.toFixed(2)}).`);

  // Prévision
  if (fc.length > 0) {
    const avgForecast = Math.round(fc.reduce((s, v) => s + v, 0) / fc.length);
    const direction = avgForecast > lastVal ? 'hausse' : avgForecast < lastVal ? 'baisse' : 'stabilisation';
    parts.push(`🔮 Prévision IA (3 prochaines périodes) : tendance à la ${direction}, valeur estimée ~${avgForecast.toLocaleString('fr-FR')}.`);
  }

  // Anomalies
  if (nbAnomalies > 0) {
    const anomalyIndexes = anomalies.map((a, i) => a.isAnomaly ? i + 1 : null).filter(Boolean);
    parts.push(`⚠️ ${nbAnomalies} anomalie(s) détectée(s) aux périodes : ${anomalyIndexes.join(', ')}.`);
  }

  return {
    text: parts.join('\n'),
    parts,
    trend: trend.trend,
    confidence: trend.confidence,
    forecast: fc,
    nbAnomalies,
  };
}

// ─── 11. GÉNÉRATION D'ANALYSE SIMPLIFIÉE (pour praticiens) ──────
// Version vulgarisée sans jargon technique (R², OLS, Z-Score, etc.)
export function generateSimpleInsight(data, metricName = 'indicateur') {
  if (!_aiEnabled) return { parts: ['Les analyses sont actuellement désactivées.'], trend: 'disabled', trendLabel: 'Désactivé', trendIcon: '⏸️', confidence: 0, forecast: [], nbAnomalies: 0 };
  const trend = analyzeTrend(data);
  const fc = forecast(data, 3);
  const anomalies = detectAnomalies(data);
  const nbAnomalies = anomalies.filter(a => a.isAnomaly).length;
  const lastVal = data[data.length - 1] || 0;
  const trendConf = (trend.confidence != null) ? trend.confidence : 0;
  const trendMean = (trend.mean != null) ? trend.mean : 0;
  const trendPct = (trend.pctChange != null) ? trend.pctChange : 0;

  const parts = [];

  // Situation actuelle en langage simple
  if (trend.trend === 'insufficient') {
    parts.push(`Pas encore assez de données pour analyser votre ${metricName}. Continuez à saisir vos données mensuelles pour obtenir des insights pertinents.`);
  } else if (trend.trend === 'upward') {
    if (trend.severity === 'strong') {
      parts.push(`Excellente nouvelle ! Votre ${metricName} est en forte progression (${trendPct > 0 ? '+' : ''}${trendPct}%). Continuez sur cette lancée.`);
    } else {
      parts.push(`Bonne tendance : votre ${metricName} progresse légèrement (${trendPct > 0 ? '+' : ''}${trendPct}%). Le cabinet est sur la bonne voie.`);
    }
  } else if (trend.trend === 'downward') {
    if (trend.severity === 'strong') {
      parts.push(`Attention : votre ${metricName} est en baisse importante (${trendPct}%). Il serait utile d'en identifier les causes.`);
    } else {
      parts.push(`Votre ${metricName} montre un léger recul (${trendPct}%). Rien d'alarmant, mais à surveiller.`);
    }
  } else {
    parts.push(`Votre ${metricName} est stable autour de ${trendMean.toLocaleString('fr-FR')}. L'activité du cabinet est régulière.`);
  }

  // Fiabilité en langage simple
  if (trendConf >= 70) {
    parts.push(`✅ Cette analyse est fiable : les données sont suffisamment cohérentes.`);
  } else if (trendConf >= 40) {
    parts.push(`ℹ️ Analyse modérément fiable. Plus vous ajoutez de mois, plus les résultats seront précis.`);
  } else if (data.length >= 2) {
    parts.push(`⚡ Analyse préliminaire. Les résultats gagneront en précision avec plus de données.`);
  }

  // Prévision en langage simple
  if (fc.length > 0 && trend.trend !== 'insufficient') {
    const avgForecast = Math.round(fc.reduce((s, v) => s + v, 0) / fc.length);
    if (avgForecast > lastVal * 1.05) {
      parts.push(`📈 Prévision : tendance à la hausse pour les prochains mois (estimation ~${avgForecast.toLocaleString('fr-FR')}).`);
    } else if (avgForecast < lastVal * 0.95) {
      parts.push(`📉 Prévision : risque de baisse dans les prochains mois (estimation ~${avgForecast.toLocaleString('fr-FR')}).`);
    } else {
      parts.push(`➡️ Prévision : stabilité attendue pour les prochains mois.`);
    }
  }

  // Anomalies en langage simple
  if (nbAnomalies > 0) {
    parts.push(`⚠️ ${nbAnomalies} mois inhabituel(s) détecté(s) : des variations sortant de l'ordinaire ont été repérées.`);
  }

  // Labels simplifiés
  let trendLabel, trendIcon;
  if (trend.trend === 'upward') { trendLabel = 'En hausse'; trendIcon = '📈'; }
  else if (trend.trend === 'downward') { trendLabel = 'En baisse'; trendIcon = '📉'; }
  else if (trend.trend === 'stable') { trendLabel = 'Stable'; trendIcon = '➡️'; }
  else { trendLabel = 'En attente'; trendIcon = '⏳'; }

  return {
    parts,
    trend: trend.trend,
    trendLabel,
    trendIcon,
    confidence: trendConf,
    forecast: fc,
    nbAnomalies,
  };
}

// ─── 12. SCORE SANTÉ SIMPLIFIÉ (labels pour praticiens) ─────────
export function getSimpleHealthLabel(score) {
  if (score >= 80) return { label: 'Excellent', emoji: '🟢', advice: 'Votre cabinet se porte très bien ! Maintenez cette dynamique.' };
  if (score >= 65) return { label: 'Bon', emoji: '🔵', advice: 'Le cabinet fonctionne bien. Quelques optimisations sont possibles.' };
  if (score >= 50) return { label: 'Correct', emoji: '🟡', advice: 'Des améliorations sont possibles, notamment sur l\'encaissement et le planning.' };
  return { label: 'À améliorer', emoji: '🟠', advice: 'Plusieurs points méritent votre attention. Consultez les détails ci-dessous.' };
}


// ═══════════════════════════════════════════════════════════════════════
//  NOUVEAUX MODÈLES IA / MACHINE LEARNING
// ═══════════════════════════════════════════════════════════════════════

// ─── 13. RÉGRESSION POLYNOMIALE ──────────────────────────────────────
// Ajuste un polynôme de degré `degree` aux données (method: least squares via matrice)
export function polynomialRegression(data, degree = 2) {
  if (!_aiEnabled) return { coefficients: [], predict: () => 0, r2: 0 };
  const n = data.length;
  if (n < degree + 1) return { coefficients: [data[0] || 0], predict: () => data[0] || 0, r2: 0 };

  // Construire les matrices normales (Vandermonde)
  const size = degree + 1;
  const X = Array.from({ length: size }, () => new Array(size).fill(0));
  const Y = new Array(size).fill(0);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < size; j++) {
      Y[j] += data[i] * Math.pow(i, j);
      for (let k = 0; k < size; k++) {
        X[j][k] += Math.pow(i, j + k);
      }
    }
  }

  // Résolution par élimination de Gauss
  const augmented = X.map((row, i) => [...row, Y[i]]);
  for (let col = 0; col < size; col++) {
    let maxRow = col;
    for (let row = col + 1; row < size; row++) {
      if (Math.abs(augmented[row][col]) > Math.abs(augmented[maxRow][col])) maxRow = row;
    }
    [augmented[col], augmented[maxRow]] = [augmented[maxRow], augmented[col]];

    if (Math.abs(augmented[col][col]) < 1e-12) continue;

    for (let row = 0; row < size; row++) {
      if (row === col) continue;
      const factor = augmented[row][col] / augmented[col][col];
      for (let k = col; k <= size; k++) {
        augmented[row][k] -= factor * augmented[col][k];
      }
    }
  }

  const coefficients = augmented.map((row, i) => row[size] / row[i]);

  const predict = (x) => coefficients.reduce((sum, c, p) => sum + c * Math.pow(x, p), 0);

  // R²
  const yMean = data.reduce((s, v) => s + v, 0) / n;
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < n; i++) {
    ssRes += (data[i] - predict(i)) ** 2;
    ssTot += (data[i] - yMean) ** 2;
  }
  const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

  return { coefficients, predict, r2, degree };
}


// ─── 14. RANDOM FOREST (Ensemble d'Arbres de Décision) ───────────────
// Implémentation JS native : ensemble de decision stumps (arbres à 1 profondeur)
// Utilise le bagging (bootstrap aggregating) pour la prédiction
export function randomForest(data, options = {}) {
  if (!_aiEnabled) return { predict: () => 0, trees: [], importance: [] };

  const {
    nTrees = 20,
    maxDepth = 3,
    sampleRatio = 0.7,
    featureSubset = 0.7,
  } = options;

  const n = data.length;
  if (n < 4) return { predict: () => data[data.length - 1] || 0, trees: [], importance: [] };

  // Préparer les features : pour des séries temporelles, on utilise les valeurs passées comme features
  const windowSize = Math.min(3, Math.floor(n / 2));
  const samples = [];
  for (let i = windowSize; i < n; i++) {
    const features = [];
    for (let w = 1; w <= windowSize; w++) features.push(data[i - w]);
    features.push(i); // index temporel
    samples.push({ features, target: data[i] });
  }

  if (samples.length < 2) return { predict: () => data[n - 1] || 0, trees: [], importance: [] };

  const featureCount = samples[0].features.length;

  // Construire un arbre de décision simple (récursif, profondeur limitée)
  function buildTree(subset, depth) {
    if (depth >= maxDepth || subset.length < 2) {
      const mean = subset.reduce((s, d) => s + d.target, 0) / subset.length;
      return { leaf: true, value: mean };
    }

    // Sélection aléatoire de features
    const nFeatures = Math.max(1, Math.floor(featureCount * featureSubset));
    const featureIndices = [];
    const allIndices = Array.from({ length: featureCount }, (_, i) => i);
    for (let i = 0; i < nFeatures; i++) {
      const idx = Math.floor(Math.random() * allIndices.length);
      featureIndices.push(allIndices.splice(idx, 1)[0]);
    }

    let bestFeature = 0, bestThreshold = 0, bestScore = Infinity;

    for (const fi of featureIndices) {
      const values = [...new Set(subset.map(s => s.features[fi]))].sort((a, b) => a - b);
      for (let t = 0; t < values.length - 1; t++) {
        const threshold = (values[t] + values[t + 1]) / 2;
        const left = subset.filter(s => s.features[fi] <= threshold);
        const right = subset.filter(s => s.features[fi] > threshold);
        if (left.length === 0 || right.length === 0) continue;

        // MSE split score
        const mseLeft = left.reduce((s, d) => s + (d.target - left.reduce((a, b) => a + b.target, 0) / left.length) ** 2, 0);
        const mseRight = right.reduce((s, d) => s + (d.target - right.reduce((a, b) => a + b.target, 0) / right.length) ** 2, 0);
        const score = mseLeft + mseRight;

        if (score < bestScore) {
          bestScore = score;
          bestFeature = fi;
          bestThreshold = threshold;
        }
      }
    }

    const leftData = subset.filter(s => s.features[bestFeature] <= bestThreshold);
    const rightData = subset.filter(s => s.features[bestFeature] > bestThreshold);

    if (leftData.length === 0 || rightData.length === 0) {
      const mean = subset.reduce((s, d) => s + d.target, 0) / subset.length;
      return { leaf: true, value: mean };
    }

    return {
      leaf: false,
      feature: bestFeature,
      threshold: bestThreshold,
      left: buildTree(leftData, depth + 1),
      right: buildTree(rightData, depth + 1),
    };
  }

  function predictTree(tree, features) {
    if (tree.leaf) return tree.value;
    return features[tree.feature] <= tree.threshold
      ? predictTree(tree.left, features)
      : predictTree(tree.right, features);
  }

  // Bootstrap aggregating — construire N arbres
  const trees = [];
  for (let t = 0; t < nTrees; t++) {
    const sampleSize = Math.floor(samples.length * sampleRatio);
    const subset = [];
    for (let i = 0; i < sampleSize; i++) {
      subset.push(samples[Math.floor(Math.random() * samples.length)]);
    }
    trees.push(buildTree(subset, 0));
  }

  // Prédiction : moyenne des arbres
  const predict = (stepsAhead = 1) => {
    const predictions = [];
    const extended = [...data];
    for (let s = 0; s < stepsAhead; s++) {
      const idx = extended.length;
      const features = [];
      for (let w = 1; w <= windowSize; w++) features.push(extended[idx - w]);
      features.push(idx);
      const pred = trees.reduce((sum, tree) => sum + predictTree(tree, features), 0) / trees.length;
      predictions.push(pred);
      extended.push(pred);
    }
    return predictions;
  };

  // Feature importance (basée sur la fréquence d'utilisation)
  function countFeatureUsage(tree, counts) {
    if (tree.leaf) return;
    counts[tree.feature] = (counts[tree.feature] || 0) + 1;
    countFeatureUsage(tree.left, counts);
    countFeatureUsage(tree.right, counts);
  }
  const importance = new Array(featureCount).fill(0);
  trees.forEach(tree => countFeatureUsage(tree, importance));
  const totalSplits = importance.reduce((s, v) => s + v, 0) || 1;
  const normalizedImportance = importance.map(v => v / totalSplits);

  // Évaluation R²
  let ssRes = 0, ssTot = 0;
  const yMean = samples.reduce((s, d) => s + d.target, 0) / samples.length;
  for (const sample of samples) {
    const pred = trees.reduce((sum, tree) => sum + predictTree(tree, sample.features), 0) / trees.length;
    ssRes += (sample.target - pred) ** 2;
    ssTot += (sample.target - yMean) ** 2;
  }
  const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

  return { predict, trees, importance: normalizedImportance, nTrees, r2 };
}


// ─── 15. K-NEAREST NEIGHBORS (KNN) ──────────────────────────────────
// KNN pour régression sur séries temporelles
export function knnPredict(data, options = {}) {
  if (!_aiEnabled) return { predict: () => 0, k: 3 };

  const { k = 3, windowSize: ws } = options;
  const n = data.length;
  const windowSize = ws || Math.min(3, Math.floor(n / 2));

  if (n < windowSize + 1) return { predict: () => data[n - 1] || 0, k };

  // Construire les échantillons (features = fenêtre glissante)
  const samples = [];
  for (let i = windowSize; i < n; i++) {
    const features = [];
    for (let w = 1; w <= windowSize; w++) features.push(data[i - w]);
    samples.push({ features, target: data[i] });
  }

  // Distance euclidienne
  const distance = (a, b) => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));

  const predict = (stepsAhead = 1) => {
    const predictions = [];
    const extended = [...data];

    for (let s = 0; s < stepsAhead; s++) {
      const query = [];
      for (let w = 1; w <= windowSize; w++) query.push(extended[extended.length - w]);

      // Trouver les k plus proches voisins
      const distances = samples.map((sample, idx) => ({
        dist: distance(query, sample.features),
        target: sample.target,
        idx,
      }));
      distances.sort((a, b) => a.dist - b.dist);

      const kNearest = distances.slice(0, Math.min(k, distances.length));

      // Moyenne pondérée inversement par la distance
      const totalWeight = kNearest.reduce((s, d) => s + (1 / (d.dist + 1e-10)), 0);
      const pred = kNearest.reduce((s, d) => s + (d.target / (d.dist + 1e-10)), 0) / totalWeight;

      predictions.push(pred);
      extended.push(pred);
    }
    return predictions;
  };

  return { predict, k, samplesCount: samples.length };
}


// ─── 16. K-MEANS CLUSTERING ─────────────────────────────────────────
// Segmentation non-supervisée — regroupe les mois en clusters de performance
export function kMeansClustering(dataPoints, options = {}) {
  if (!_aiEnabled) return { clusters: [], centroids: [], labels: [] };

  const { k = 3, maxIterations = 50 } = options;
  const n = dataPoints.length;
  if (n < k) return { clusters: [], centroids: [], labels: new Array(n).fill(0) };

  // Normaliser les données (chaque point peut être multi-dimensionnel)
  const isMultiDim = Array.isArray(dataPoints[0]);
  const points = isMultiDim ? dataPoints.map(p => [...p]) : dataPoints.map(v => [v]);
  const dim = points[0].length;

  // Min-Max normalisation
  const mins = new Array(dim).fill(Infinity);
  const maxs = new Array(dim).fill(-Infinity);
  for (const p of points) {
    for (let d = 0; d < dim; d++) {
      mins[d] = Math.min(mins[d], p[d]);
      maxs[d] = Math.max(maxs[d], p[d]);
    }
  }
  const normalized = points.map(p => p.map((v, d) => (maxs[d] - mins[d]) > 0 ? (v - mins[d]) / (maxs[d] - mins[d]) : 0));

  // Initialiser les centroïdes (k-means++)
  const centroids = [normalized[Math.floor(Math.random() * n)]];
  while (centroids.length < k) {
    const distances = normalized.map(p => {
      const minDist = Math.min(...centroids.map(c => Math.sqrt(c.reduce((s, v, d) => s + (v - p[d]) ** 2, 0))));
      return minDist * minDist;
    });
    const totalDist = distances.reduce((s, d) => s + d, 0);
    let r = Math.random() * totalDist;
    for (let i = 0; i < n; i++) {
      r -= distances[i];
      if (r <= 0) { centroids.push([...normalized[i]]); break; }
    }
  }

  let labels = new Array(n).fill(0);

  // Itérer
  for (let iter = 0; iter < maxIterations; iter++) {
    // Assigner chaque point au centroïde le plus proche
    const newLabels = normalized.map(p => {
      let minDist = Infinity, bestC = 0;
      for (let c = 0; c < k; c++) {
        const dist = Math.sqrt(centroids[c].reduce((s, v, d) => s + (v - p[d]) ** 2, 0));
        if (dist < minDist) { minDist = dist; bestC = c; }
      }
      return bestC;
    });

    // Vérifier convergence
    if (newLabels.every((l, i) => l === labels[i])) break;
    labels = newLabels;

    // Recalculer les centroïdes
    for (let c = 0; c < k; c++) {
      const members = normalized.filter((_, i) => labels[i] === c);
      if (members.length === 0) continue;
      for (let d = 0; d < dim; d++) {
        centroids[c][d] = members.reduce((s, p) => s + p[d], 0) / members.length;
      }
    }
  }

  // Dénormaliser les centroïdes
  const denormCentroids = centroids.map(c => c.map((v, d) => v * (maxs[d] - mins[d]) + mins[d]));

  // Construire les clusters
  const clusters = Array.from({ length: k }, () => []);
  labels.forEach((l, i) => clusters[l].push({ index: i, value: isMultiDim ? dataPoints[i] : dataPoints[i] }));

  // Labels descriptifs (trier les clusters par magnitude)
  const clusterMeans = denormCentroids.map(c => c.reduce((s, v) => s + v, 0) / dim);
  const clusterLabels = clusterMeans.map(mean => {
    const sorted = [...clusterMeans].sort((a, b) => a - b);
    const rank = sorted.indexOf(mean);
    if (rank === 0) return 'Faible';
    if (rank === sorted.length - 1) return 'Fort';
    return 'Moyen';
  });

  return { clusters, centroids: denormCentroids, labels, clusterLabels, k };
}


// ─── 17. RÉGRESSION LOGISTIQUE ──────────────────────────────────────
// Classification binaire (ex: mois « bon » vs « mauvais »)
export function logisticRegression(data, options = {}) {
  if (!_aiEnabled) return { predict: () => 0.5, weights: [], threshold: 0.5 };

  const {
    learningRate = 0.01,
    iterations = 200,
    threshold = 0.5,
    targetFn = null, // Fonction pour générer les labels (si null: médiane comme seuil)
  } = options;

  const n = data.length;
  if (n < 4) return { predict: () => 0.5, weights: [0, 0], threshold, accuracy: 0 };

  // Préparer les données
  const windowSize = Math.min(2, Math.floor(n / 2));
  const samples = [];
  const median = [...data].sort((a, b) => a - b)[Math.floor(n / 2)];

  for (let i = windowSize; i < n; i++) {
    const features = [1]; // biais
    for (let w = 1; w <= windowSize; w++) features.push(data[i - w]);
    const label = targetFn ? targetFn(data[i]) : (data[i] >= median ? 1 : 0);
    samples.push({ features, label });
  }

  const featureCount = samples[0].features.length;
  const weights = new Array(featureCount).fill(0);

  // Sigmoid
  const sigmoid = (z) => 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, z))));

  // Gradient descent
  for (let iter = 0; iter < iterations; iter++) {
    const gradients = new Array(featureCount).fill(0);
    for (const sample of samples) {
      const z = weights.reduce((s, w, j) => s + w * sample.features[j], 0);
      const pred = sigmoid(z);
      const error = pred - sample.label;
      for (let j = 0; j < featureCount; j++) {
        gradients[j] += error * sample.features[j];
      }
    }
    for (let j = 0; j < featureCount; j++) {
      weights[j] -= (learningRate / samples.length) * gradients[j];
    }
  }

  // Prédire la probabilité pour une valeur ou des features
  const predict = (features) => {
    if (typeof features === 'number') {
      const f = [1, features];
      return sigmoid(weights.reduce((s, w, j) => s + w * (f[j] || 0), 0));
    }
    const f = [1, ...features];
    return sigmoid(weights.reduce((s, w, j) => s + w * (f[j] || 0), 0));
  };

  // Accuracy
  let correct = 0;
  for (const sample of samples) {
    const z = weights.reduce((s, w, j) => s + w * sample.features[j], 0);
    const pred = sigmoid(z) >= threshold ? 1 : 0;
    if (pred === sample.label) correct++;
  }
  const accuracy = correct / samples.length;

  return { predict, weights, threshold, accuracy };
}


// ─── 18. ARIMA SIMPLIFIÉ ────────────────────────────────────────────
// AutoRegressive Integrated Moving Average — version simplifiée pour JS
export function arimaForecast(data, options = {}) {
  if (!_aiEnabled) return { forecast: [], fitted: [], residuals: [] };

  const { p = 2, d = 1, q = 1, stepsAhead = 3 } = options;
  const n = data.length;
  if (n < p + d + 2) return { forecast: data.length > 0 ? [data[n - 1]] : [0], fitted: [...data], residuals: new Array(n).fill(0) };

  // Différenciation d'ordre d
  let diffData = [...data];
  const diffHistory = [];
  for (let dd = 0; dd < d; dd++) {
    const prev = [...diffData];
    diffHistory.push(prev);
    diffData = diffData.slice(1).map((v, i) => v - prev[i]);
  }

  // Ajustement AR(p) par moindres carrés
  const arSamples = [];
  for (let i = p; i < diffData.length; i++) {
    const features = [];
    for (let j = 1; j <= p; j++) features.push(diffData[i - j]);
    arSamples.push({ features, target: diffData[i] });
  }

  // Résoudre AR par régression linéaire multiple
  const arCoeffs = new Array(p).fill(0);
  if (arSamples.length >= p) {
    // Gradient descent simple pour trouver les coefficients AR
    const lr = 0.001;
    for (let iter = 0; iter < 300; iter++) {
      const grads = new Array(p).fill(0);
      for (const sample of arSamples) {
        const pred = arCoeffs.reduce((s, c, j) => s + c * sample.features[j], 0);
        const error = pred - sample.target;
        for (let j = 0; j < p; j++) grads[j] += error * sample.features[j];
      }
      for (let j = 0; j < p; j++) {
        arCoeffs[j] -= (lr / arSamples.length) * grads[j];
      }
    }
  }

  // Résidus et MA(q)
  const residuals = diffData.map((v, i) => {
    if (i < p) return 0;
    const pred = arCoeffs.reduce((s, c, j) => s + c * diffData[i - j - 1], 0);
    return v - pred;
  });

  const maCoeffs = new Array(q).fill(0);
  if (residuals.length > q) {
    // Simple estimation MA
    for (let j = 0; j < q; j++) {
      let sum = 0, count = 0;
      for (let i = j + 1; i < residuals.length; i++) {
        if (residuals[i] !== 0 && residuals[i - j - 1] !== 0) {
          sum += residuals[i - j - 1] !== 0 ? residuals[i] / Math.abs(residuals[i - j - 1]) : 0;
          count++;
        }
      }
      maCoeffs[j] = count > 0 ? Math.max(-0.9, Math.min(0.9, sum / count)) : 0;
    }
  }

  // Prévision
  const extended = [...diffData];
  const extResiduals = [...residuals];
  const forecasted = [];

  for (let s = 0; s < stepsAhead; s++) {
    const idx = extended.length;
    let pred = 0;
    for (let j = 0; j < p; j++) pred += arCoeffs[j] * (extended[idx - j - 1] || 0);
    for (let j = 0; j < q; j++) pred += maCoeffs[j] * (extResiduals[idx - j - 1] || 0);
    extended.push(pred);
    extResiduals.push(0);
    forecasted.push(pred);
  }

  // Intégration inverse (undifference)
  let result = [...forecasted];
  for (let dd = d - 1; dd >= 0; dd--) {
    const prev = diffHistory[dd];
    let lastVal = prev[prev.length - 1];
    result = result.map(v => { lastVal = lastVal + v; return lastVal; });
  }

  // Fitted values
  const fitted = data.map((v, i) => {
    if (i < p + d) return v;
    const di = i - d;
    if (di < p || di >= diffData.length) return v;
    let pred = arCoeffs.reduce((s, c, j) => s + c * (diffData[di - j - 1] || 0), 0);
    // Reconvertir
    let val = pred;
    for (let dd = d - 1; dd >= 0; dd--) {
      val += diffHistory[dd][di] || 0;
    }
    return val;
  });

  return { forecast: result, fitted, residuals, arCoeffs, maCoeffs, p, d, q };
}


// ─── 19. RÉSEAU DE NEURONES (Perceptron Multicouche simplifié) ───────
// MLP avec 1 couche cachée — activation ReLU + sortie linéaire
export function neuralNetworkPredict(data, options = {}) {
  if (!_aiEnabled) return { predict: () => 0, layers: [] };

  const {
    hiddenSize = 8,
    learningRate = 0.005,
    epochs = 300,
    windowSize: ws,
  } = options;

  const n = data.length;
  const windowSize = ws || Math.min(3, Math.floor(n / 2));
  if (n < windowSize + 2) return { predict: () => data[n - 1] || 0, layers: [] };

  // Normaliser les données
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const norm = data.map(v => (v - min) / range);

  // Préparer les échantillons
  const samples = [];
  for (let i = windowSize; i < n; i++) {
    const features = [];
    for (let w = 1; w <= windowSize; w++) features.push(norm[i - w]);
    samples.push({ features, target: norm[i] });
  }

  const inputSize = windowSize;

  // Initialiser les poids (Xavier initialization)
  const W1 = Array.from({ length: hiddenSize }, () =>
    Array.from({ length: inputSize }, () => (Math.random() - 0.5) * Math.sqrt(2 / inputSize))
  );
  const b1 = new Array(hiddenSize).fill(0);
  const W2 = Array.from({ length: 1 }, () =>
    Array.from({ length: hiddenSize }, () => (Math.random() - 0.5) * Math.sqrt(2 / hiddenSize))
  );
  const b2 = [0];

  const relu = (x) => Math.max(0, x);
  const reluDeriv = (x) => x > 0 ? 1 : 0;

  // Training
  for (let epoch = 0; epoch < epochs; epoch++) {
    for (const sample of samples) {
      // Forward pass
      const hidden = W1.map((row, j) =>
        relu(row.reduce((s, w, i) => s + w * sample.features[i], 0) + b1[j])
      );
      const output = W2[0].reduce((s, w, j) => s + w * hidden[j], 0) + b2[0];

      // Backward pass
      const error = output - sample.target;
      const lr = learningRate * (1 - epoch / epochs * 0.5); // learning rate decay

      // Gradients sortie
      for (let j = 0; j < hiddenSize; j++) {
        W2[0][j] -= lr * error * hidden[j];
      }
      b2[0] -= lr * error;

      // Gradients cachés
      const preHidden = W1.map((row, j) =>
        row.reduce((s, w, i) => s + w * sample.features[i], 0) + b1[j]
      );
      for (let j = 0; j < hiddenSize; j++) {
        const delta = error * W2[0][j] * reluDeriv(preHidden[j]);
        for (let i = 0; i < inputSize; i++) {
          W1[j][i] -= lr * delta * sample.features[i];
        }
        b1[j] -= lr * delta;
      }
    }
  }

  // Prédiction
  const predict = (stepsAhead = 1) => {
    const predictions = [];
    const extended = [...norm];

    for (let s = 0; s < stepsAhead; s++) {
      const features = [];
      for (let w = 1; w <= windowSize; w++) features.push(extended[extended.length - w]);

      const hidden = W1.map((row, j) =>
        relu(row.reduce((sum, w, i) => sum + w * features[i], 0) + b1[j])
      );
      const output = W2[0].reduce((sum, w, j) => sum + w * hidden[j], 0) + b2[0];

      extended.push(output);
      predictions.push(output * range + min); // Dénormaliser
    }
    return predictions;
  };

  // Évaluation
  let ssRes = 0, ssTot = 0;
  const yMean = samples.reduce((s, d) => s + d.target, 0) / samples.length;
  for (const sample of samples) {
    const hidden = W1.map((row, j) =>
      relu(row.reduce((s, w, i) => s + w * sample.features[i], 0) + b1[j])
    );
    const output = W2[0].reduce((s, w, j) => s + w * hidden[j], 0) + b2[0];
    ssRes += (sample.target - output) ** 2;
    ssTot += (sample.target - yMean) ** 2;
  }
  const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

  return { predict, r2, hiddenSize, windowSize };
}


// ─── 20. NAIVE BAYES (Classification Probabiliste) ───────────────────
// Classifie les mois en catégories (« bon », « moyen », « mauvais ») par probabilités gaussiennes
export function naiveBayesClassifier(data, options = {}) {
  if (!_aiEnabled) return { classify: () => 'moyen', classes: [], probabilities: {} };

  const { nClasses = 3 } = options;
  const n = data.length;
  if (n < nClasses * 2) return { classify: () => 'moyen', classes: ['moyen'], probabilities: {} };

  // Créer les classes basées sur les quantiles
  const sorted = [...data].sort((a, b) => a - b);
  const classNames = nClasses === 3 ? ['faible', 'moyen', 'fort'] : ['faible', 'moyen-faible', 'moyen', 'moyen-fort', 'fort'].slice(0, nClasses);

  const thresholds = [];
  for (let c = 1; c < nClasses; c++) {
    thresholds.push(sorted[Math.floor((c / nClasses) * n)]);
  }

  const getClass = (v) => {
    for (let c = 0; c < thresholds.length; c++) {
      if (v < thresholds[c]) return classNames[c];
    }
    return classNames[classNames.length - 1];
  };

  // Calculer les statistiques par classe (moyenne, écart-type)
  const classStats = {};
  classNames.forEach(c => { classStats[c] = { values: [], count: 0 }; });

  data.forEach(v => {
    const cls = getClass(v);
    classStats[cls].values.push(v);
    classStats[cls].count++;
  });

  for (const cls of classNames) {
    const vals = classStats[cls].values;
    const mean = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
    const variance = vals.length > 1 ? vals.reduce((s, v) => s + (v - mean) ** 2, 0) / (vals.length - 1) : 1;
    classStats[cls].mean = mean;
    classStats[cls].variance = Math.max(variance, 1e-10);
    classStats[cls].prior = vals.length / n;
  }

  // Densité gaussienne
  const gaussianPDF = (x, mean, variance) => {
    return (1 / Math.sqrt(2 * Math.PI * variance)) * Math.exp(-((x - mean) ** 2) / (2 * variance));
  };

  // Classifier une nouvelle valeur
  const classify = (value) => {
    let bestClass = classNames[0];
    let bestProb = -Infinity;
    const probabilities = {};

    for (const cls of classNames) {
      const { mean, variance, prior } = classStats[cls];
      const likelihood = gaussianPDF(value, mean, variance);
      const posterior = Math.log(prior + 1e-10) + Math.log(likelihood + 1e-10);
      probabilities[cls] = posterior;
      if (posterior > bestProb) {
        bestProb = posterior;
        bestClass = cls;
      }
    }

    // Normaliser les probabilités
    const maxProb = Math.max(...Object.values(probabilities));
    const expProbs = {};
    let total = 0;
    for (const cls of classNames) {
      expProbs[cls] = Math.exp(probabilities[cls] - maxProb);
      total += expProbs[cls];
    }
    for (const cls of classNames) {
      expProbs[cls] /= total;
    }

    return { class: bestClass, probabilities: expProbs };
  };

  return { classify, classes: classNames, classStats, thresholds };
}
