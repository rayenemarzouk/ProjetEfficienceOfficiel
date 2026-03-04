# ✨ Fonctionnalités

## Vue d'ensemble

Efficience Analytics est une plateforme complète de gestion et d'analyse pour cabinets dentaires, offrant des outils avancés d'Intelligence Artificielle et de visualisation.

---

## Fonctionnalités par Rôle

### 🔵 Administrateur

| Fonctionnalité | Description |
|----------------|-------------|
| **Dashboard Global** | Vue d'ensemble de tous les cabinets (KPIs, graphiques) |
| **Statistiques** | Analyses détaillées avec tendances IA |
| **Comparaison** | Comparer 2 praticiens côte à côte |
| **Gestion Cabinets** | Voir et gérer tous les cabinets |
| **Rapports** | Générer et envoyer des rapports PDF |
| **Paramètres** | Configuration système (IA, import, emails) |
| **Import Données** | Importer des fichiers TSV/CSV |

### 🟢 Praticien

| Fonctionnalité | Description |
|----------------|-------------|
| **Mon Dashboard** | Mes KPIs personnels |
| **Mes Statistiques** | Évolution de mon activité |
| **Mes Rapports** | Télécharger mes rapports PDF |
| **Saisie Manuelle** | Entrer mes données mensuelles |
| **Gestion Patients** | CRUD patientèle |
| **Analyse IA** | Insights personnalisés sur mon cabinet |

### 🟡 Consultant

| Fonctionnalité | Description |
|----------------|-------------|
| **Dashboard Multi-Cabinets** | Vue des cabinets assignés |
| **Analyses** | Rapports et analyses par cabinet |
| **Rapports Clients** | Générer des rapports pour mes clients |

---

## Fonctionnalités Détaillées

### 1. Dashboard Administrateur

```
┌─────────────────────────────────────────────────────────────────┐
│  EFFICIENCE ANALYTICS                              🔔  👤  ☀️   │
├─────────────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│ │CA Facturé│ │CA Encaiss│ │  Taux    │ │  Score   │            │
│ │ 125 000€ │ │  98 000€ │ │  78.4%   │ │ 72/100   │            │
│ │  ▲ +12%  │ │  ▲ +8%   │ │  ▼ -2%   │ │   BON    │            │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Évolution CA (12 derniers mois)             │   │
│  │  📈 ─────────────────────────────────────────           │   │
│  │     Tendance IA (R²=0.87)                               │   │
│  │  🔮 - - - - - - Prévision 3 mois                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────┐  ┌─────────────────────────┐      │
│  │   Répartition par       │  │   Top 3 Praticiens      │      │
│  │    Praticien (Pie)      │  │   1. JC - 65 000€       │      │
│  │       🥧                 │  │   2. DV - 60 000€       │      │
│  │                         │  │   3. ER - 45 000€       │      │
│  └─────────────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**KPIs affichés** :
- CA Facturé (total + variation)
- CA Encaissé (total + variation)
- Taux d'Encaissement (%)
- Score de Santé Global (IA)
- Nombre de Patients
- Nouveaux Patients
- Heures Travaillées
- Rentabilité Horaire (€/h)

---

### 2. Comparaison de Praticiens

Permet de comparer **2 praticiens** sur les mêmes KPIs :

```
┌─────────────────────────────────────────────────────────────────┐
│                     COMPARAISON                                 │
│                                                                 │
│   Praticien 1: [JC ▼]        Praticien 2: [DV ▼]               │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │        │      JC      │      DV      │    Diff    │      │   │
│  ├────────┼──────────────┼──────────────┼────────────┤      │   │
│  │ CA     │   65 000 €   │   60 000 €   │  +5 000 €  │      │   │
│  │ Taux   │    84.2%     │    78.5%     │   +5.7%    │      │   │
│  │ Patients│    145      │     132      │    +13     │      │   │
│  │ Heures │    180h      │    165h      │    +15h    │      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  🏆 Gagnant : JC (meilleur sur 3/4 critères)                   │
└─────────────────────────────────────────────────────────────────┘
```

---

### 3. Analyses IA

#### Score de Santé Cabinet

```
┌─────────────────────────────────────────────────────────────────┐
│              SCORE DE SANTÉ CABINET                             │
│                                                                 │
│                    ╭─────────────╮                              │
│                    │    72 %     │   🔵 BON                     │
│                    ╰─────────────╯                              │
│                                                                 │
│   Composantes du score :                                        │
│                                                                 │
│   Encaissement  ████████████████░░░░  80%  (poids: 30%)        │
│   Évolution CA  ████████████░░░░░░░░  60%  (poids: 25%)        │
│   Absences      ██████████████████░░  90%  (poids: 15%)        │
│   Production €/h ██████████████░░░░░  70%  (poids: 20%)        │
│   Nouveaux Pts  ████████░░░░░░░░░░░░  40%  (poids: 10%)        │
│                                                                 │
│   💡 Conseil IA : "Le cabinet fonctionne bien. Focus sur        │
│      l'acquisition de nouveaux patients pour améliorer."        │
└─────────────────────────────────────────────────────────────────┘
```

#### Détection d'Anomalies

```
⚠️ Anomalies détectées :
  - Mars 2024 : CA anormalement bas (Z-Score: -2.4)
    → Cause probable : fermeture cabinet 2 semaines
  
  - Juin 2024 : Nouveaux patients élevé (Z-Score: +2.8)
    → Campagne marketing réussie ?
```

#### Prévisions IA

```
🔮 Prévisions pour les 3 prochains mois :

   Août 2024  : ~48 500 € (+3.2%)
   Sept 2024  : ~51 200 € (+5.6%)
   Oct 2024   : ~52 800 € (+3.1%)

   Fiabilité du modèle : 87% (R² = 0.87)
   Tendance : HAUSSIÈRE (forte)
```

---

### 4. Gestion des Rapports PDF

**Génération** :
- Rapport individuel par praticien et mois
- Rapport global tous praticiens
- Génération automatique (cron job)

**Contenu du rapport PDF** :
1. En-tête avec logo et période
2. KPIs clés du mois
3. Graphique d'évolution 6 mois
4. Analyse IA avec insights
5. Comparaison avec mois précédent
6. Recommandations

**Envoi** :
- Email automatique au praticien
- Email admin avec notification
- Téléchargement depuis l'interface

---

### 5. Import de Données

**Formats supportés** : TSV (Tab-Separated Values), CSV

**Types de données** :
| Type | Fichier | Colonnes attendues |
|------|---------|-------------------|
| Réalisations | `realisation.tsv` | Praticien, Mois, Nb patients, Montant facturé, Montant encaissé |
| Rendez-vous | `rdv.tsv` | Praticien, Mois, Nb RDV, Durée totale, Nb patients, Nb nouveaux |
| Jours ouverts | `jours.tsv` | Praticien, Mois, Nb heures |
| Devis | `devis.tsv` | Praticien, Mois, Nb devis, Montant propositions, Nb acceptés, Montant accepté |
| Encours | `encours.tsv` | Type, Valeur |

**Exemple de fichier** :
```tsv
Praticien	Mois	Nb patients	Montant facturé	Montant encaissé
JC	2024-01	45	15000	12000
JC	2024-02	52	18000	15500
DV	2024-01	38	12500	10200
```

---

### 6. Saisie Manuelle (Praticien)

Interface formulaire pour saisir les données mensuelles :

```
┌─────────────────────────────────────────────────────────────────┐
│              SAISIE MENSUELLE - Juin 2024                       │
│                                                                 │
│   Réalisations                                                  │
│   ┌───────────────────────────────────────────────────────┐    │
│   │ Nombre de patients traités :    [ 45          ]       │    │
│   │ CA Facturé (€) :                [ 15000       ]       │    │
│   │ CA Encaissé (€) :               [ 12500       ]       │    │
│   └───────────────────────────────────────────────────────┘    │
│                                                                 │
│   Rendez-vous                                                   │
│   ┌───────────────────────────────────────────────────────┐    │
│   │ Nombre de RDV :                 [ 180         ]       │    │
│   │ Durée totale (heures) :         [ 150         ]       │    │
│   │ Nouveaux patients :             [ 8           ]       │    │
│   └───────────────────────────────────────────────────────┘    │
│                                                                 │
│                 [ 💾 Enregistrer ]                              │
└─────────────────────────────────────────────────────────────────┘
```

---

### 7. Gestion des Patients

**CRUD complet** :

| Action | Description |
|--------|-------------|
| **Créer** | Ajouter un nouveau patient |
| **Lire** | Liste avec recherche et filtres |
| **Modifier** | Éditer les informations patient |
| **Supprimer** | Archiver/supprimer un patient |

**Champs patient** :
- Nom, Prénom
- Date de naissance
- Téléphone, Email
- Statut (actif, inactif, nouveau)
- Dernier RDV, Prochain RDV
- CA cumulé
- Notes

---

### 8. Paramètres Système

**Toggle disponibles** :

| Paramètre | Description |
|-----------|-------------|
| **Mode Maintenance** | Bloque l'accès à l'application |
| **IA Activée** | Active/désactive les analyses IA |
| **Import Activé** | Autorise l'import de fichiers |
| **Auto-génération** | Rapports générés automatiquement |
| **Auto-email** | Envoi automatique des rapports |
| **Mode Dynamique** | Animations UI (expire après 15j) |

---

### 9. Animations Dynamiques

Quand le mode dynamique est actif :

- **Entrée** : Fade-in, slide-up sur les composants
- **Hover** : Lift effect, glow, scale
- **KPIs** : Animation de compteur (count-up)
- **Cartes** : Effet brillance au survol
- **Icônes** : Float animation subtile
- **Graphiques** : Animation de dessin progressif

---

### 10. Thème Clair/Sombre

Toggle accessible dans le header :

- **Clair** : Fond blanc, texte sombre
- **Sombre** : Fond slate-900, texte clair
- Persiste via localStorage

---

### 11. Notifications Email

**Types d'emails** :
1. **Connexion** : Notification à l'admin à chaque login
2. **Rapport** : Envoi du rapport PDF mensuel
3. **Code confirmation** : Pour actions sensibles
4. **Alerts** : Anomalies détectées (optionnel)

**Template email** :
- Design moderne avec header gradient
- Logo Efficience Analytics
- Contenu structuré en tableau
- Footer avec infos plateforme

---

### 12. Responsive Design

L'interface s'adapte aux différentes tailles d'écran :

| Breakpoint | Layout |
|------------|--------|
| Desktop (>1024px) | Sidebar fixe + contenu large |
| Tablet (768-1024px) | Sidebar collapsible |
| Mobile (<768px) | Navigation burger, cartes empilées |

---

## Fonctionnalités Futures (Roadmap)

| Priorité | Fonctionnalité | Description |
|----------|----------------|-------------|
| 🔴 Haute | Export Excel | Exporter les données en XLSX |
| 🔴 Haute | Notifications Push | Alertes temps réel |
| 🟡 Moyenne | Multi-langue | FR/EN/AR |
| 🟡 Moyenne | API publique | Intégration logiciels cabinet |
| 🟢 Basse | App Mobile | Version React Native |
| 🟢 Basse | Chat Support | Intégration chatbot |

---

## Résumé des Technologies par Fonctionnalité

| Fonctionnalité | Technologies |
|----------------|--------------|
| Graphiques | Chart.js + react-chartjs-2 |
| IA/ML | JavaScript natif (aiModels.js) |
| PDF | PDFKit (backend) |
| Email | Nodemailer + Gmail SMTP |
| Auth | JWT + bcrypt |
| Base de données | MongoDB Atlas + Mongoose |
| Animations | CSS + TailwindCSS |
| State Management | React Context |

---

*Fin de la documentation*

---

## Contact

**Développeur** : Rayan Maarzouk  
**Email** : maarzoukrayan3@gmail.com  
**Projet** : Efficience Analytics - PFE 2025-2026

---

*Documentation complète générée le 4 Mars 2026*
