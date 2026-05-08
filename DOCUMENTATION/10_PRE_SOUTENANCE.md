# Présentation pour la présoutenance

## 1. Problématique

L’objectif du projet **Efficience Analytics** est de fournir une application d’analyse de performance pour les cabinets dentaires, capable de transformer des données opérationnelles en indicateurs stratégiques et en prévisions.

- Problème : les praticiens et consultants ont besoin d’une vue claire de la santé financière et commerciale du cabinet.
- Besoin : analyser les tendances, détecter les anomalies, estimer les prévisions et proposer un score de santé exploitable.
- Contraintes : données mensuelles hétérogènes stockées dans MongoDB, architecture full-stack JavaScript, déploiement pratique.

## 2. Acteurs

- **Praticien** : utilisateur principal, consulte son tableau de bord, son chiffre d’affaires, ses rendez-vous et son score de performance.
- **Consultant** : analyse plusieurs cabinets et compare les indicateurs.
- **Administrateur** : gère les paramètres, active/désactive les analyses IA et contrôle l’importation des données.
- **Client final** : décideurs du cabinet qui utilisent les analyses pour améliorer la performance.

## 3. Méthodologie utilisée

1. **Collecte et injection des données**
   - Données métiers stockées via Mongoose dans MongoDB.
   - Jeux de données de type `AnalyseRealisation`, `AnalyseRendezVous`, `AnalyseJoursOuverts`, `AnalyseDevis`.

2. **Analyse descriptive**
   - Visualisations graphiques (CA, patients, devis, temps ouvrés).
   - Mesures de tendance et lissage des séries.

3. **Modélisation prédictive**
   - Implémentation de modèles statistiques/ML en JavaScript natif dans `frontend/src/utils/aiModels.js`.
   - Application de régression, prévision, scoring et détection d’anomalies.

4. **Exploitation terrain**
   - Résultats affichés dans les dashboards.
   - Score de santé cabinet accessible en temps réel.
   - Possibilité de comparaison et prise de décision.

## 4. Frameworks et technologies

- **Frontend** : React, Vite, Tailwind CSS, Chart.js
- **Backend** : Node.js, Express, Mongoose
- **Base de données** : MongoDB Atlas
- **Librairies utiles** : bcryptjs, jsonwebtoken, cors, multer, node-cron, nodemailer, puppeteer
- **Modèles IA actuels** : JavaScript natif (`frontend/src/utils/aiModels.js`) sans dépendance externe ML

## 5. Architecture globale

### Vue d’ensemble

```mermaid
flowchart LR
  U[Utilisateur] --> F[Frontend React + Vite]
  F --> B[Backend Express]
  B --> D[MongoDB Atlas]
  F --> AI[IA JS (aiModels.js)]
  AI --> F
  B --> D
```

### Composants principaux

- `frontend/src/` : pages, composants, contexte, services API.
- `frontend/src/utils/aiModels.js` : algorithmes prédictifs et analytiques.
- `backend/server.js` : API Express, routes, authentification.
- `backend/routes/` : routes d’accès aux données, administration, reporting.
- `backend/models/` : schémas Mongoose pour toutes les collections.

## 6. Données disponibles

Collections principales :

- `Users` : comptes praticiens, consultants, administrateurs.
- `AnalyseRealisation` : nombre de patients, montant facturé, montant encaissé.
- `AnalyseRendezVous` : nombre de rendez-vous, durée, nouveaux patients.
- `AnalyseJoursOuverts` : heures travaillées par mois.
- `AnalyseDevis` : devis émis et acceptés.

## 7. Modèles IA / ML actuels

Le projet utilise actuellement des modèles implémentés en JavaScript natif :

- Régression linéaire
- Lissage exponentiel simple
- Lissage de Holt
- Moyenne mobile
- Détection d’anomalies par Z-score
- Prévision combinée (régression + Holt)
- Score de santé cabinet multi-KPI
- Régression polynomiale
- Random Forest simplifiée
- KNN
- K-Means clustering
- Régression logistique
- ARIMA simplifié
- Réseau de neurones basique
- Naive Bayes

Ces modèles sont exécutés côté frontend et servent à enrichir les dashboards avec des prévisions, des tendances et des alertes.

## 8. Faisabilité d’un modèle Python entraîné

Oui, il est possible de construire des modèles **ML entraînés en Python** sur la base des données existantes.

### Avantages

- **Entraînement réel** : on peut utiliser `scikit-learn` pour obtenir des coefficients, évaluer des scores de validation et exporter un modèle.
- **Robustesse** : les algorithmes Python permettent de mieux gérer l’évaluation croisée, le prétraitement et la généralisation.
- **Exploitation terrain** : un modèle entraîné peut être exporté (`pickle`, `joblib`) et intégré dans l’API backend.

### Exemple de cas d’usage exploitable

- Prédire le **montant facturé futur** à partir du nombre de patients, du nombre de rendez-vous et du montant encaissé.
- Calculer un **score de performance automatisé** à partir de KPI historiques.
- Détecter les cabinets à risque à partir de clusters ou d’une classification binaire.

### Conclusion

Un modèle Python est recommandable si tu veux :

- un entraînement validé
- des métriques précises
- une exploitation backend / production réelle

Mais pour un prototype rapide, la solution JS native existante est déjà fonctionnelle et permet de démontrer les résultats sur les dashboards.

## 9. Plan pour la suite

1. Collecter les jeux de données réels depuis MongoDB.
2. Prétraiter les données et construire un dataset tabulaire.
3. Entraîner des modèles Python (`LinearRegression`, `RandomForestRegressor`, etc.).
4. Comparer les résultats avec les calculs JS actuels.
5. Exporter un modèle Python utilisable dans le backend.

---

## 10. Fichier de test Python

Un script de test est créé à la racine : `python_ml_test.py`.
Ce script montre la faisabilité d’un modèle entraîné à partir des données de `addDVData.js`.
