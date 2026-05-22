# 📊 EFFICIENCE ANALYTICS - Documentation Technique

## Projet de Fin d'Études - Plateforme d'Analyse de Cabinets Dentaires

---

### 🎯 Vue d'ensemble

**Efficience Analytics** est une plateforme SaaS d'analyse et de gestion pour cabinets dentaires, intégrant des modèles d'Intelligence Artificielle pour l'analyse prédictive, la détection d'anomalies et le scoring de performance.

---

## 📁 Structure du Projet

```
ProjetEfficienceOfficiel/
│
├── 📂 DOCUMENTATION/           # Documentation technique (ce dossier)
│   ├── README.md               # Vue d'ensemble (ce fichier)
│   ├── 01_ARCHITECTURE.md      # Architecture globale
│   ├── 02_TECHNOLOGIES.md      # Stack technologique
│   ├── 03_BASE_DE_DONNEES.md   # Modèles MongoDB
│   ├── 04_API_BACKEND.md       # Routes et endpoints API
│   ├── 05_MODELES_IA.md        # Algorithmes d'IA
│   ├── 06_FRONTEND.md          # Interface utilisateur React
│   ├── 07_AUTHENTIFICATION.md  # Système d'auth JWT
│   ├── 08_DEPLOIEMENT.md       # Déploiement Render/Hostinger
│   └── 09_FONCTIONNALITES.md   # Liste des fonctionnalités
│
├── 📂 backend/                 # Serveur Node.js/Express
│   ├── server.js               # Point d'entrée principal
│   ├── package.json            # Dépendances backend
│   ├── 📂 config/
│   │   └── db.js               # Configuration MongoDB
│   ├── 📂 middleware/
│   │   └── auth.js             # Middleware JWT
│   ├── 📂 models/              # Schémas Mongoose
│   │   ├── User.js
│   │   ├── Patient.js
│   │   ├── Report.js
│   │   ├── AnalyseRealisation.js
│   │   ├── AnalyseRendezVous.js
│   │   ├── AnalyseJoursOuverts.js
│   │   ├── AnalyseDevis.js
│   │   ├── Encours.js
│   │   └── AppSettings.js
│   ├── 📂 routes/              # Routes API REST
│   │   ├── auth.js
│   │   ├── admin.js
│   │   ├── practitioner.js
│   │   ├── data.js
│   │   └── reports.js
│   ├── 📂 services/            # Services métier
│   │   ├── emailService.js
│   │   ├── pdfGenerator.js
│   │   └── cronJobs.js
│   ├── 📂 scripts/             # Scripts utilitaires
│   │   ├── addAdmins.js
│   │   └── seedData.js
│   └── 📂 public/              # Build frontend servi
│       └── index.html
│
├── 📂 frontend/                # Application React/Vite
│   ├── index.html              # Point d'entrée HTML
│   ├── package.json            # Dépendances frontend
│   ├── vite.config.js          # Configuration Vite
│   ├── tailwind.config.js      # Configuration Tailwind
│   ├── postcss.config.js       # Configuration PostCSS
│   └── 📂 src/
│       ├── main.jsx            # Bootstrap React
│       ├── App.jsx             # Router principal
│       ├── index.css           # Styles globaux + animations
│       ├── 📂 components/      # Composants réutilisables
│       │   ├── Header.jsx
│       │   ├── Sidebar.jsx
│       │   ├── Layout.jsx
│       │   ├── AdminLayout.jsx
│       │   ├── ConsultantLayout.jsx
│       │   ├── PrivateRoute.jsx
│       │   ├── PeriodFilter.jsx
│       │   ├── CabinetFilter.jsx
│       │   └── ComportementCabinet.jsx
│       ├── 📂 context/         # Contextes React
│       │   ├── AuthContext.jsx
│       │   ├── ThemeContext.jsx
│       │   ├── DynamicContext.jsx
│       │   └── AppSettingsContext.jsx
│       ├── 📂 pages/           # Pages de l'application
│       │   ├── Login.jsx
│       │   ├── Register.jsx
│       │   ├── 📂 admin/       # Pages administrateur
│       │   │   ├── Dashboard.jsx
│       │   │   ├── Statistics.jsx
│       │   │   ├── Comparison.jsx
│       │   │   ├── CabinetAnalysis.jsx
│       │   │   ├── CabinetManagement.jsx
│       │   │   ├── Reports.jsx
│       │   │   └── Settings.jsx
│       │   └── 📂 practitioner/ # Pages praticien
│       │       ├── Dashboard.jsx
│       │       ├── MyStats.jsx
│       │       ├── MyReports.jsx
│       │       ├── DataManagement.jsx
│       │       ├── ManualEntry.jsx
│       │       ├── PatientManagement.jsx
│       │       └── AIAnalysis.jsx
│       ├── 📂 services/        # Appels API
│       │   └── api.js
│       └── 📂 utils/           # Utilitaires
│           ├── aiModels.js     # Modèles IA frontend
│           ├── chartPlugins.js # Plugins Chart.js
│           └── useCountUp.js   # Hook animation compteur
│
├── package.json                # Scripts racine
├── render.yaml                 # Configuration Render
└── DOCUMENT_IA_PROJET.md       # Notes IA
```

---

## 📋 Table des Matières

| N° | Document | Description |
|----|----------|-------------|
| 01 | [Architecture](./01_ARCHITECTURE.md) | Architecture globale client-serveur |
| 02 | [Technologies](./02_TECHNOLOGIES.md) | Stack MERN et outils |
| 03 | [Base de Données](./03_BASE_DE_DONNEES.md) | Schémas MongoDB Mongoose |
| 04 | [API Backend](./04_API_BACKEND.md) | Routes REST et endpoints |
| 05 | [Modèles IA](./05_MODELES_IA.md) | Algorithmes d'analyse prédictive |
| 06 | [Frontend](./06_FRONTEND.md) | Interface React et composants |
| 07 | [Authentification](./07_AUTHENTIFICATION.md) | JWT et gestion des rôles |
| 08 | [Déploiement](./08_DEPLOIEMENT.md) | Render et Hostinger |
| 09 | [Fonctionnalités](./09_FONCTIONNALITES.md) | Liste complète des features |

---

## 🚀 Démarrage Rapide

### Prérequis
- Node.js v18+
- MongoDB Atlas (ou local)
- npm ou yarn

### Installation

```bash
# Cloner le projet
git clone https://github.com/rayeneemarzoukk-rgb/ProjetEfficienceOfficiel.git

# Backend
cd backend
npm install
npm run dev

# Frontend (nouvel terminal)
cd frontend
npm install
npm run dev
```

### Variables d'environnement (backend/.env)
```env
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_secret_key
EMAIL_USER=...@gmail.com
EMAIL_PASS=...
PORT=5000
```

---

## 👥 Rôles Utilisateurs

| Rôle | Description | Accès |
|------|-------------|-------|
| **Admin** | Administrateur plateforme (Rayan) | Tous les cabinets, rapports globaux, paramètres |
| **Consultant** | Consultant multi-cabinets | Cabinets assignés, rapports |
| **Practitioner** | Praticien/Cabinet | Ses propres données uniquement |

---

## 📊 Indicateurs Clés (KPIs)

- **CA Facturé** : Chiffre d'affaires mensuel
- **CA Encaissé** : Montant réellement perçu
- **Taux d'Encaissement** : CA Encaissé / CA Facturé × 100
- **Patients Traités** : Nombre de patients vus
- **Nouveaux Patients** : Acquisition mensuelle
- **Heures Travaillées** : Temps cabinet
- **Rentabilité Horaire** : CA / Heures
- **Taux d'Absence** : RDV manqués / Total RDV

---

## 🤖 Modèles IA Intégrés

1. **Régression Linéaire OLS** - Tendances CA
2. **Holt-Winters** - Prévisions saisonnières
3. **Détection Z-Score** - Anomalies
4. **Scoring Multi-KPI** - Santé cabinet
5. **SMA (Simple Moving Average)** - Lissage

---

## 📞 Contact

**Développeur** : Rayan Maarzouk  
**Email** : maarzoukrayan3@gmail.com  
**Projet** : Efficience Analytics - PFE 2025-2026

---

*Documentation générée le 4 Mars 2026*
