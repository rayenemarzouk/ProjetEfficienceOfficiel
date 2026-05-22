# 🤖 Modèles IA / Machine Learning

## Vue d'ensemble

Efficience Analytics intègre **16 modèles** d'Intelligence Artificielle et de Machine Learning, tous implémentés en **JavaScript natif** (aucune dépendance externe comme TensorFlow ou scikit-learn).

**Fichier principal** : `frontend/src/utils/aiModels.js` (1188 lignes)

```
┌─────────────────────────────────────────────────────────────────────┐
│                     MODÈLES IA DISPONIBLES                          │
│                                                                     │
│  ANALYSE TENDANCE          PRÉVISION           DÉTECTION ANOMALIES  │
│  ┌─────────────┐          ┌─────────────┐      ┌─────────────┐      │
│  │ Régression  │          │Holt-Winters │      │  Z-Score    │      │
│  │  Linéaire   │          │ (DExpo)     │      │ Detection   │      │
│  └─────────────┘          └─────────────┘      └─────────────┘      │
│  ┌─────────────┐          ┌─────────────┐      ┌─────────────┐      │
│  │ Régression  │          │   ARIMA     │      │  Scoring    │      │
│  │ Polynomiale │          │ (simplifié) │      │  Multi-KPI  │      │
│  └─────────────┘          └─────────────┘      └─────────────┘      │
│                                                                     │
│  CLASSIFICATION           CLUSTERING           DEEP LEARNING        │
│  ┌─────────────┐          ┌─────────────┐      ┌─────────────┐      │
│  │  K-Nearest  │          │  K-Means    │      │  Perceptron │      │
│  │  Neighbors  │          │ Clustering  │      │ Multicouche │      │
│  └─────────────┘          └─────────────┘      └─────────────┘      │
│  ┌─────────────┐          ┌─────────────┐                          │
│  │ Régression  │          │   Random    │                          │
│  │ Logistique  │          │   Forest    │                          │
│  └─────────────┘          └─────────────┘                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Kill Switch Global

Un **interrupteur global** permet à l'administrateur de désactiver tous les modèles IA en un clic.

```javascript
let _aiEnabled = true;

export function setAIEnabled(val) { 
  _aiEnabled = !!val; 
}

export function isAIEnabled() { 
  return _aiEnabled; 
}

const AI_DISABLED_MSG = '⛔ Les analyses IA sont actuellement désactivées par l\'administrateur.';
```

Chaque fonction vérifie `_aiEnabled` avant de calculer :

```javascript
export function linearRegression(data) {
  if (!_aiEnabled) return { slope: 0, intercept: 0, r2: 0, predict: () => 0 };
  // ... calcul
}
```

---

## 1. Régression Linéaire (OLS)

**Méthode** : Moindres Carrés Ordinaires (Ordinary Least Squares)

**Formule** :
$$y = \beta_0 + \beta_1 x$$

Où :
- $\beta_1 = \frac{n \sum xy - \sum x \sum y}{n \sum x^2 - (\sum x)^2}$ (pente)
- $\beta_0 = \bar{y} - \beta_1 \bar{x}$ (ordonnée à l'origine)

**Coefficient R² (détermination)** :
$$R^2 = 1 - \frac{SS_{res}}{SS_{tot}}$$

```javascript
export function linearRegression(data) {
  const n = data.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += data[i];
    sumXY += i * data[i];
    sumX2 += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calcul R²
  const yMean = sumY / n;
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept;
    ssRes += (data[i] - predicted) ** 2;
    ssTot += (data[i] - yMean) ** 2;
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { 
    slope, 
    intercept, 
    r2, 
    predict: (x) => slope * x + intercept 
  };
}
```

**Usage** :
```javascript
const ca = [15000, 16500, 18000, 17200, 19500, 21000];
const model = linearRegression(ca);

console.log(model.slope);           // ~1000 (tendance mensuelle)
console.log(model.r2);              // 0.85 (fiabilité)
console.log(model.predict(6));      // Prévision mois 7
```

---

## 2. Lissage Exponentiel Simple (SES)

**Formule** :
$$S_t = \alpha \cdot y_t + (1 - \alpha) \cdot S_{t-1}$$

Où $\alpha$ est le facteur de lissage (0.1 à 0.9).

```javascript
export function exponentialSmoothing(data, alpha = 0.3) {
  if (data.length === 0) return [];
  const smoothed = [data[0]];
  
  for (let i = 1; i < data.length; i++) {
    smoothed.push(alpha * data[i] + (1 - alpha) * smoothed[i - 1]);
  }
  return smoothed;
}
```

**Interprétation** :
- Alpha élevé (0.7-0.9) : Réactif aux changements récents
- Alpha faible (0.1-0.3) : Lissage fort, stabilité

---

## 3. Lissage de Holt (Double Exponential)

Capture **niveau** et **tendance** simultanément.

**Formules** :
$$L_t = \alpha \cdot y_t + (1 - \alpha)(L_{t-1} + T_{t-1})$$
$$T_t = \beta (L_t - L_{t-1}) + (1 - \beta) T_{t-1}$$

**Prévision** :
$$\hat{y}_{t+h} = L_t + h \cdot T_t$$

```javascript
export function holtSmoothing(data, alpha = 0.3, beta = 0.1) {
  let level = data[0];
  let trend = data[1] - data[0];
  const smoothed = [data[0]];

  for (let i = 1; i < data.length; i++) {
    const prevLevel = level;
    level = alpha * data[i] + (1 - alpha) * (prevLevel + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    smoothed.push(level);
  }

  return { 
    smoothed, 
    forecast: (h) => level + h * trend,
    level,
    trend 
  };
}
```

---

## 4. Moyenne Mobile (SMA)

**Formule** :
$$SMA_t = \frac{1}{k} \sum_{i=0}^{k-1} y_{t-i}$$

```javascript
export function movingAverage(data, window = 3) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < window - 1) {
      result.push(null);
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
```

---

## 5. Détection d'Anomalies (Z-Score)

**Formule** :
$$Z = \frac{x - \mu}{\sigma}$$

Une valeur est considérée **anomalie** si $|Z| > threshold$ (généralement 2.0 ou 2.5).

```javascript
export function detectAnomalies(data, threshold = 2.0) {
  const n = data.length;
  const mean = data.reduce((s, v) => s + v, 0) / n;
  const variance = data.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);

  return data.map((val) => {
    const zScore = (val - mean) / stdDev;
    return {
      isAnomaly: Math.abs(zScore) > threshold,
      zScore: parseFloat(zScore.toFixed(2)),
      direction: zScore > threshold ? 'high' : zScore < -threshold ? 'low' : 'normal',
    };
  });
}
```

**Usage** :
```javascript
const ca = [15000, 16000, 15500, 45000, 16200, 15800];  // 45000 = anomalie
const anomalies = detectAnomalies(ca, 2.0);

// anomalies[3] = { isAnomaly: true, zScore: 3.24, direction: 'high' }
```

---

## 6. Prévision Combinée (Forecast)

Combine **régression linéaire** et **Holt** avec pondération adaptative.

```javascript
export function forecast(data, stepsAhead = 3) {
  const lr = linearRegression(data);
  const holt = holtSmoothing(data, 0.4, 0.15);
  const n = data.length;

  // Pondérer selon R² de la régression
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
```

---

## 7. Analyse de Tendance

Retourne une analyse complète d'une série temporelle.

```javascript
export function analyzeTrend(data) {
  const lr = linearRegression(data);
  const anomalies = detectAnomalies(data);
  const nbAnomalies = anomalies.filter(a => a.isAnomaly).length;
  const mean = data.reduce((s, v) => s + v, 0) / data.length;

  // Classification de la tendance
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

  return {
    trend,           // 'upward', 'downward', 'stable'
    severity,        // 'strong', 'moderate', 'neutral'
    slope: lr.slope,
    r2: lr.r2,
    confidence: Math.round(Math.abs(lr.r2) * 100),
    pctChange: ((data[data.length-1] - data[0]) / data[0] * 100).toFixed(1),
    nbAnomalies,
    mean: Math.round(mean),
    lastValue: data[data.length - 1],
  };
}
```

---

## 8. Score de Santé Cabinet (Multi-KPI Scoring)

Modèle de **scoring pondéré** multi-critères pour évaluer la "santé" d'un cabinet.

```javascript
export function cabinetHealthScore({
  tauxEncaissement = 0,     // % (0-100)
  evolutionCA = 0,          // % variation
  tauxAbsence = 0,          // % (0-100)
  productionHoraire = 0,    // €/h
  tauxNouveauxPatients = 0, // % nouveaux / total
}) {
  // Normalisation 0-100
  const scores = {
    encaissement: Math.min(100, Math.max(0, tauxEncaissement)),
    evolution: Math.min(100, Math.max(0, 50 + evolutionCA * 2)),
    absence: Math.min(100, Math.max(0, 100 - tauxAbsence * 5)),
    production: Math.min(100, Math.max(0, (productionHoraire / 400) * 100)),
    nouveaux: Math.min(100, Math.max(0, tauxNouveauxPatients * 5)),
  };

  // Poids de chaque critère
  const weights = {
    encaissement: 0.30,  // 30%
    evolution: 0.25,     // 25%
    absence: 0.15,       // 15%
    production: 0.20,    // 20%
    nouveaux: 0.10,      // 10%
  };

  const globalScore = Object.keys(scores).reduce((total, key) => {
    return total + scores[key] * weights[key];
  }, 0);

  let level;
  if (globalScore >= 80) level = 'excellent';
  else if (globalScore >= 65) level = 'bon';
  else if (globalScore >= 50) level = 'moyen';
  else level = 'critique';

  return { globalScore: Math.round(globalScore), scores, weights, level };
}
```

**Interprétation du Score** :
| Score | Niveau | Couleur |
|-------|--------|---------|
| 80-100 | Excellent | 🟢 Vert |
| 65-79 | Bon | 🔵 Bleu |
| 50-64 | Moyen | 🟡 Jaune |
| 0-49 | Critique | 🟠 Orange |

---

## 9. Régression Polynomiale

Ajuste un polynôme de degré $n$ aux données.

$$y = a_0 + a_1 x + a_2 x^2 + ... + a_n x^n$$

Utilise la méthode de **Gauss** pour résoudre le système linéaire.

```javascript
export function polynomialRegression(data, degree = 2) {
  // Résolution par élimination de Gauss
  // ... (voir code complet dans aiModels.js)
  return { coefficients, predict: (x) => ..., r2 };
}
```

---

## 10. Random Forest (Ensemble)

Implémentation simplifiée d'un ensemble d'arbres de décision.

```javascript
export function randomForest(X, y, options = {}) {
  const { nTrees = 10, maxDepth = 5, minSamples = 2 } = options;
  
  // Crée plusieurs arbres sur des sous-échantillons bootstrap
  const trees = [];
  for (let t = 0; t < nTrees; t++) {
    const sample = bootstrap(X, y);
    trees.push(buildTree(sample.X, sample.y, maxDepth, minSamples));
  }

  // Prédiction par vote majoritaire
  return {
    predict: (x) => {
      const votes = trees.map(tree => predictTree(tree, x));
      return majorityVote(votes);
    }
  };
}
```

---

## 11. K-Nearest Neighbors (KNN)

Classification/régression par les k plus proches voisins.

```javascript
export function knn(X, y, k = 3) {
  return {
    predict: (point) => {
      // Calcul des distances euclidiennes
      const distances = X.map((xi, i) => ({
        distance: euclidean(xi, point),
        label: y[i]
      }));
      
      // Tri et sélection des k plus proches
      distances.sort((a, b) => a.distance - b.distance);
      const kNearest = distances.slice(0, k);
      
      // Vote majoritaire
      return majorityVote(kNearest.map(n => n.label));
    }
  };
}
```

---

## 12. K-Means Clustering

Segmentation non-supervisée en k clusters.

```javascript
export function kMeans(data, k = 3, maxIter = 100) {
  // 1. Initialisation aléatoire des centroïdes
  let centroids = initCentroids(data, k);
  
  for (let iter = 0; iter < maxIter; iter++) {
    // 2. Affectation aux clusters
    const clusters = assignClusters(data, centroids);
    
    // 3. Mise à jour des centroïdes
    const newCentroids = updateCentroids(data, clusters, k);
    
    // 4. Vérification convergence
    if (hasConverged(centroids, newCentroids)) break;
    centroids = newCentroids;
  }

  return { centroids, labels: assignClusters(data, centroids) };
}
```

---

## 13. Régression Logistique

Classification binaire par fonction sigmoïde.

$$P(y=1) = \sigma(z) = \frac{1}{1 + e^{-z}}$$

Où $z = \beta_0 + \beta_1 x_1 + ... + \beta_n x_n$

---

## 14. ARIMA Simplifié

AutoRegressive Integrated Moving Average pour séries temporelles.

---

## 15. Réseau de Neurones (MLP)

Perceptron multicouche basique avec rétropropagation.

```javascript
export function neuralNetwork(layers = [4, 8, 1]) {
  // Initialisation des poids
  const weights = initWeights(layers);
  
  return {
    forward: (x) => {
      let activation = x;
      for (const W of weights) {
        activation = relu(matmul(activation, W));
      }
      return activation;
    },
    train: (X, y, epochs, lr) => {
      // Descente de gradient + backpropagation
    }
  };
}
```

---

## 16. Naive Bayes

Classification probabiliste basée sur le théorème de Bayes.

$$P(C|X) = \frac{P(X|C) \cdot P(C)}{P(X)}$$

---

## Fonctions Utilitaires pour l'UI

### Génération de Dataset Chart.js

```javascript
export function generateTrendLineDataset(data, forecastSteps = 3, color = '#8b5cf6') {
  const lr = linearRegression(data);
  const n = data.length;

  // Ligne de tendance
  const trendLine = data.map((_, i) => lr.predict(i));

  // Prévisions
  const forecastValues = forecast(data, forecastSteps);

  return {
    dataset: {
      label: 'Tendance IA',
      data: trendLine,
      borderColor: color,
      borderDash: [6, 4],
      borderWidth: 2,
      pointRadius: 0,
      fill: false,
    },
    forecastDataset: {
      label: 'Prévision IA',
      data: [...new Array(n).fill(null), ...forecastValues],
      borderColor: color,
      borderDash: [3, 3],
      pointStyle: 'triangle',
    },
  };
}
```

### Génération de Texte d'Analyse

```javascript
export function generateAIInsight(data, metricName = 'indicateur') {
  const trend = analyzeTrend(data);
  const fc = forecast(data, 3);
  const anomalies = detectAnomalies(data);
  
  const parts = [];
  
  if (trend.trend === 'upward') {
    parts.push(`📈 Le ${metricName} montre une tendance haussière (+${trend.pctChange}%).`);
  } else if (trend.trend === 'downward') {
    parts.push(`📉 Le ${metricName} est en baisse (${trend.pctChange}%).`);
  }
  
  parts.push(`🎯 Fiabilité : ${trend.confidence}% (R² = ${trend.r2.toFixed(2)}).`);
  parts.push(`🔮 Prévision : ~${Math.round(fc[0]).toLocaleString('fr-FR')}.`);
  
  return { text: parts.join('\n'), trend: trend.trend, forecast: fc };
}
```

---

## Performances

| Modèle | Complexité | Données min. | Usage principal |
|--------|------------|--------------|-----------------|
| Régression Linéaire | O(n) | 2 points | Tendance CA |
| Holt-Winters | O(n) | 3 points | Prévisions |
| Z-Score | O(n) | 3 points | Anomalies |
| Scoring Multi-KPI | O(1) | - | Score santé |
| K-Means | O(nki) | k points | Segmentation |
| Random Forest | O(ntm) | 10 points | Classification |

---

*Suivant : [06_FRONTEND.md](./06_FRONTEND.md)*
