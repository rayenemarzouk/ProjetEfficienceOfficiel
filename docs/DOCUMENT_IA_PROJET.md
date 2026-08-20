# 🧠 Efficience Analytics — Documentation de l'Intelligence Artificielle

## Résumé

Ce document décrit l'ensemble des modèles d'Intelligence Artificielle et de Machine Learning intégrés dans le projet **Efficience Analytics**. Tous les modèles sont implémentés **nativement en JavaScript** dans le fichier `frontend/src/utils/aiModels.js` (327 lignes), sans aucune dépendance externe (pas de TensorFlow, scikit-learn, etc.).

---

## 📁 Fichier central : `frontend/src/utils/aiModels.js`

Ce fichier contient **10 fonctions exportées** regroupant **7 modèles ML distincts** :

---

### 1. Régression Linéaire (OLS — Ordinary Least Squares)

| Propriété | Détail |
|-----------|--------|
| **Fonction** | `linearRegression(data)` |
| **Algorithme** | Moindres Carrés Ordinaires |
| **Entrée** | Tableau de valeurs numériques (série temporelle) |
| **Sortie** | `{ slope, intercept, r2, predict(x) }` |
| **Métriques** | Pente (slope), Ordonnée à l'origine (intercept), Coefficient de détermination R² |
| **Usage** | Calcul de droite de tendance sur les graphiques, évaluation de la fiabilité du modèle |

**Formule mathématique :**
- `y = slope × x + intercept`
- `R² = 1 − (SSres / SStot)` — mesure la qualité de la régression (0 = mauvais, 1 = parfait)

---

### 2. Lissage Exponentiel Simple (Simple Exponential Smoothing)

| Propriété | Détail |
|-----------|--------|
| **Fonction** | `exponentialSmoothing(data, alpha)` |
| **Paramètre** | `alpha` = facteur de lissage (défaut: 0.3), entre 0.1 et 0.9 |
| **Usage** | Lisser les données bruitées pour mieux visualiser la tendance |

**Formule :** `S(t) = α × Y(t) + (1 − α) × S(t−1)`

---

### 3. Lissage Exponentiel Double (Holt Smoothing)

| Propriété | Détail |
|-----------|--------|
| **Fonction** | `holtSmoothing(data, alpha, beta)` |
| **Paramètres** | `alpha` = lissage du niveau (0.3), `beta` = lissage de la tendance (0.1) |
| **Sortie** | `{ smoothed, forecast(h), level, trend }` |
| **Usage** | Prévision avec capture du niveau ET de la tendance |

**Formules :**
- Niveau : `L(t) = α × Y(t) + (1 − α) × (L(t−1) + T(t−1))`
- Tendance : `T(t) = β × (L(t) − L(t−1)) + (1 − β) × T(t−1)`
- Prévision : `Ŷ(t+h) = L(t) + h × T(t)`

---

### 4. Moyenne Mobile (Simple Moving Average)

| Propriété | Détail |
|-----------|--------|
| **Fonction** | `movingAverage(data, window)` |
| **Paramètre** | `window` = taille de la fenêtre (défaut: 3) |
| **Usage** | Lissage simple pour identifier les tendances de fond |

---

### 5. Détection d'Anomalies (Z-Score)

| Propriété | Détail |
|-----------|--------|
| **Fonction** | `detectAnomalies(data, threshold)` |
| **Paramètre** | `threshold` = seuil en écarts-types (défaut: 2.0, utilisé à 1.5 dans certaines pages) |
| **Sortie** | Tableau de `{ isAnomaly, zScore, direction }` par point |
| **Usage** | Détection des mois anormaux (pics ou creux) sur les graphiques |

**Formule :** `Z = (X − μ) / σ` — Si |Z| > seuil → anomalie

**Visualisation :** Les anomalies sont affichées comme des croix rouges (✕) sur les graphiques.

---

### 6. Prévision Combinée (Combined Forecast)

| Propriété | Détail |
|-----------|--------|
| **Fonction** | `forecast(data, stepsAhead)` |
| **Algorithme** | Combinaison pondérée Régression + Holt |
| **Pondération** | `w = max(0.3, min(0.7, R²))` — si R² est fort, favorise la régression |
| **Usage** | Prédiction des 2 à 3 prochaines périodes (mois) |

**Formule :** `Ŷ = w × Régression(t) + (1 − w) × Holt(t)`

---

### 7. Score de Santé Cabinet (Multi-KPI Scoring Model)

| Propriété | Détail |
|-----------|--------|
| **Fonction** | `cabinetHealthScore({ tauxEncaissement, evolutionCA, tauxAbsence, productionHoraire, tauxNouveauxPatients })` |
| **Sortie** | `{ globalScore (0-100), scores, weights, level }` |
| **Niveaux** | ≥80 = Excellent, ≥65 = Bon, ≥50 = Moyen, <50 = Critique |

**Pondérations du modèle :**

| Critère | Poids | Description |
|---------|-------|-------------|
| Taux d'encaissement | 30% | % CA encaissé / CA facturé |
| Évolution CA | 25% | Variation du chiffre d'affaires |
| Taux d'absence | 15% | % absences (inversé) |
| Production horaire | 20% | €/heure travaillée |
| Nouveaux patients | 10% | Taux d'acquisition |

---

### 8-9. Générateurs pour Chart.js

| Fonction | Description |
|----------|-------------|
| `generateTrendLineDataset(data, forecastSteps, color)` | Génère un dataset Chart.js avec la ligne de tendance (régression) + prévision (Holt+régression pondéré) |
| `generateAIInsight(data, metricName)` | Génère un texte d'analyse IA complet (tendance, confiance, prévision, anomalies) |

---

## 📊 Pages utilisant l'IA — Détail complet

### 1. Admin — Tableau de Bord (`pages/admin/Dashboard.jsx`)

| Élément | Modèle IA utilisé |
|---------|-------------------|
| Graphique Line CA (Facturé + Encaissé) | Ligne de tendance (Régression OLS) |
| Prévision 3 mois sur le graphique | Forecast combiné (Régression + Holt pondéré) |
| Badge "Modèle IA — Régression + Holt" | Affichage du nom du modèle |
| Panel "Analyse IA" sous le graphique | `generateAIInsight()` — texte avec tendance, R², prévision, anomalies |

**Fonctions importées :** `generateTrendLineDataset`, `generateAIInsight`, `forecast`

---

### 2. Admin — Analyse et comparaison des cabinets

Les analyses administrateur sont maintenant réparties entre `pages/admin/Comparison.jsx`, `pages/admin/CabinetsUnified.jsx` et `pages/admin/Statistics.jsx`. Elles utilisent notamment le score de santé, l’analyse de tendance, la détection d’anomalies et les prévisions.

---

### 3. Admin — Statistiques (`pages/admin/Statistics.jsx`)

| Élément | Modèle IA utilisé |
|---------|-------------------|
| Graphique Line CA | Ligne de tendance (Régression) + Anomalies Z-Score |
| Graphique Line Patients | Ligne de tendance + Anomalies Z-Score |
| Panel "Analyse IA — CA" | `generateAIInsight()` avec R² affiché |
| Panel "Analyse IA — Patients" | `generateAIInsight()` — modèle Holt-Winters |
| Score Santé global | `cabinetHealthScore()` |

**Fonctions importées :** `generateTrendLineDataset`, `generateAIInsight`, `detectAnomalies`, `cabinetHealthScore`

---

### 4. Admin — Comparaison des Cabinets (`pages/admin/Comparison.jsx`)

| Élément | Modèle IA utilisé |
|---------|-------------------|
| Score Santé IA par cabinet (/100) | `cabinetHealthScore()` dans chaque carte Performance |
| Barre de santé gradient | Vert ≥80, Amber ≥60, Rouge <60 |
| Tendance absences par praticien | `analyzeTrend()` sur absences mensuelles |
| Panel "Analyse IA — Comparaison" | `generateAIInsight()` par docteur avec score affiché |

**Fonctions importées :** `cabinetHealthScore`, `analyzeTrend`, `generateAIInsight`

---

### 5. Praticien — Tableau de Bord (`pages/practitioner/Dashboard.jsx`)

| Élément | Modèle IA utilisé |
|---------|-------------------|
| Graphique Bar CA | Ligne de tendance OLS (dashed amber) |
| Panel "Analyse IA — CA" | `generateAIInsight()` + Tendance + Prévision M+1, M+2 |
| Doughnut Encaissement | Score Santé Cabinet IA /100 avec barre gradient |
| Badge R² | Coefficient de détermination affiché |

**Fonctions importées :** `linearRegression`, `generateAIInsight`, `forecast`, `analyzeTrend`, `cabinetHealthScore`

---

### 6. Praticien — Mes Statistiques (`pages/practitioner/MyStats.jsx`)

| Élément | Modèle IA utilisé |
|---------|-------------------|
| Graphique Bar CA Facturé / Encaissé | Tendance OLS + Anomalies Z-Score |
| Graphique Bar Patients | Tendance OLS (ligne rose) |
| Graphique Bar Rentabilité Horaire | Tendance OLS + Anomalies Z-Score |
| 3 panels "Analyse IA" | `generateAIInsight()` sous chaque graphique avec badges tendance |

**Fonctions importées :** `linearRegression`, `generateAIInsight`, `detectAnomalies`, `analyzeTrend`, `forecast`

---

### 7. Praticien — Analyse IA (`pages/practitioner/AIAnalysis.jsx`)

| Élément | Modèle IA utilisé |
|---------|-------------------|
| Header avec 4 KPI IA | Mois analysés, Score Santé, Confiance R², Anomalies |
| Carte "Régression Linéaire CA" | `linearRegression()` — pente, intercept, R² |
| Carte "Prévision IA 3 mois" | `forecast()` — Holt + Régression pondérée |
| Carte "Détection d'Anomalies" | `detectAnomalies()` — Z-Score σ=1.5 |
| Carte "Score Santé Cabinet" | `cabinetHealthScore()` — 5 dimensions pondérées |
| Carte "Analyse de Tendance" | `analyzeTrend()` — tendance multi-variables |
| 2 Panels Insight IA (CA + Patients) | `generateAIInsight()` avec confiance % |

**Fonctions importées :** `linearRegression`, `forecast`, `analyzeTrend`, `detectAnomalies`, `cabinetHealthScore`, `generateAIInsight`

---

## 📈 Récapitulatif visuel

```
┌─────────────────────────────────────────────────────────────┐
│                    EFFICIENCE ANALYTICS                      │
│                   Architecture IA / ML                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   frontend/src/utils/aiModels.js (327 lignes)               │
│   ┌─────────────────────────────────────────────┐           │
│   │  1. Régression Linéaire (OLS)               │           │
│   │  2. Lissage Exponentiel Simple              │           │
│   │  3. Lissage Exponentiel Double (Holt)       │           │
│   │  4. Moyenne Mobile                          │           │
│   │  5. Détection d'Anomalies (Z-Score)         │           │
│   │  6. Prévision Combinée (Régression + Holt)  │           │
│   │  7. Score Santé Multi-KPI (5 critères)      │           │
│   │  8. Générateur Tendance Chart.js            │           │
│   │  9. Générateur Texte IA                     │           │
│   └─────────────────┬───────────────────────────┘           │
│                     │                                       │
│         ┌───────────┼───────────────────┐                   │
│         ▼           ▼                   ▼                   │
│   ┌──────────┐ ┌──────────┐ ┌────────────────┐             │
│   │  ADMIN   │ │  ADMIN   │ │   PRATICIEN    │             │
│   │ 4 pages  │ │ Charts   │ │   3 pages      │             │
│   ├──────────┤ ├──────────┤ ├────────────────┤             │
│   │Dashboard │ │ Tendance │ │ Dashboard      │             │
│   │CabinetAn.│ │ Anomalies│ │ MyStats        │             │
│   │Statistics│ │ Prévision│ │ AIAnalysis     │             │
│   │Comparison│ │ Insight  │ │                │             │
│   └──────────┘ └──────────┘ └────────────────┘             │
│                                                             │
│   Total : 7 pages   │   10 fonctions IA   │   0 dépendance │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Résumé final

| Métrique | Valeur |
|----------|--------|
| **Nombre de modèles ML** | 7 |
| **Nombre de fonctions IA** | 10 |
| **Pages enrichies par l'IA** | 7 / 7 (100%) |
| **Graphiques avec IA** | 12+ (tous les graphiques) |
| **Dépendances externes ML** | 0 (tout natif JavaScript) |
| **Fichier source** | `frontend/src/utils/aiModels.js` (327 lignes) |
| **Éléments visuels IA** | Tendances, anomalies (✕), prévisions, scores /100, badges R², panels d'insight |

---

*Document généré le 21 février 2026 — Projet Efficience Analytics*
