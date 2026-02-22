/**
 * ═══════════════════════════════════════════════════════════════
 *  EFFICIENCE ANALYTICS — Modèles IA / Machine Learning
 * ═══════════════════════════════════════════════════════════════
 *  
 *  Modèles statistiques et ML implémentés nativement :
 *  
 *  1. Régression Linéaire (Moindres Carrés Ordinaires)
 *  2. Lissage Exponentiel (Holt-Winters simplifié)
 *  3. Moyenne Mobile (Simple Moving Average)
 *  4. Détection d'Anomalies (Z-Score)
 *  5. Prévision (Forecast) — combinaison régression + lissage
 *  6. Analyse de Tendance (Trend Analysis)
 *  7. Score de Santé Cabinet (Multi-KPI Scoring Model)
 *
 *  Aucune dépendance externe requise.
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
