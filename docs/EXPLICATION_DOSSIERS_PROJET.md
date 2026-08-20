# Explication des dossiers du projet Efficience Analytics

## Vue d’ensemble

Le projet est organisé selon une architecture séparant le frontend, le backend, la documentation et les outils techniques :

```text
ProjetEfficienceOfficiel/
├── frontend/   Interface utilisateur React
├── backend/    Serveur API Node.js/Express
├── docs/       Documentation technique
├── .venv/      Environnement Python
├── node_modules/ Dépendances JavaScript
└── .git/       Historique Git du projet
```

## 1. Dossiers à la racine

### `.git/`

Contient les informations internes de Git :

- historique des commits ;
- branches ;
- suivi des modifications ;
- configuration du dépôt local.

Ce dossier ne doit normalement pas être modifié manuellement.

### `.venv/`

Environnement virtuel Python du projet.

Il sert notamment à isoler les bibliothèques nécessaires aux scripts Python présents dans la documentation, comme `generate_report.py`.

### `node_modules/`

Contient les dépendances JavaScript installées avec npm.

Il peut exister plusieurs dossiers `node_modules` :

- à la racine : dépendances générales ;
- dans `backend/` : dépendances du serveur ;
- dans `frontend/` : dépendances React et Vite.

Ces fichiers sont générés automatiquement et ne doivent généralement pas être versionnés.

### `backend/`

Contient toute la partie serveur et l’API de l’application.

### `frontend/`

Contient toute l’interface graphique utilisée par les utilisateurs.

### `docs/`

Contient la documentation fonctionnelle et technique du projet.

# 2. Dossier `backend/`

Le backend est responsable de :

- recevoir les requêtes du frontend ;
- authentifier les utilisateurs ;
- communiquer avec MongoDB ;
- appliquer les règles métier ;
- générer des rapports ;
- envoyer des emails ;
- exposer les routes API.

Le fichier d’entrée principal est `backend/server.js`.

## `backend/config/`

Contient les fichiers de configuration technique.

### `config/db.js`

Configure la connexion à MongoDB avec Mongoose.

Ce dossier centralise les paramètres nécessaires à la connexion à la base de données.

## `backend/middleware/`

Contient les fonctions exécutées avant l’accès aux routes.

### `middleware/auth.js`

Vérifie notamment :

- la présence du token JWT ;
- la validité du token ;
- l’identité de l’utilisateur ;
- parfois son rôle : administrateur, consultant ou praticien.

Le middleware protège donc les routes privées.

## `backend/models/`

Contient les modèles de données MongoDB définis avec Mongoose.

Chaque fichier représente généralement une collection ou une structure métier :

- `User.js` : utilisateurs et rôles ;
- `Patient.js` : patients ;
- `Report.js` : rapports générés ;
- `AnalyseRealisation.js` : analyses de réalisation ;
- `AnalyseRendezVous.js` : analyses des rendez-vous ;
- `AnalyseJoursOuverts.js` : analyses des jours ouverts ;
- `AnalyseDevis.js` : analyses des devis ;
- `Encours.js` : données d’encours ;
- `AppSettings.js` : paramètres globaux de l’application.

Ce dossier constitue la couche de représentation des données.

## `backend/routes/`

Contient les routes HTTP de l’API REST.

Chaque fichier regroupe les endpoints d’un domaine fonctionnel :

- `auth.js` : inscription, connexion et authentification ;
- `admin.js` : fonctionnalités administrateur ;
- `data.js` : importation et gestion des données ;
- `reports.js` : création et récupération des rapports ;
- `practitioner.js` : fonctionnalités du praticien ;
- `consultant.js` : fonctionnalités du consultant.

Dans `server.js`, ces routes sont montées sous des préfixes tels que :

```text
/api/auth
/api/admin
/api/data
/api/reports
/api/practitioner
/api/consultant
```

## `backend/services/`

Contient les traitements métier complexes qui ne doivent pas être directement placés dans les routes.

- `emailService.js` : envoi d’emails ;
- `pdfGenerator.js` : génération de rapports PDF ;
- `cronJobs.js` : tâches automatiques planifiées.

Ce dossier permet de séparer la logique métier de la réception des requêtes HTTP.

## `backend/scripts/`

Contient des scripts exécutés manuellement pour administrer ou initialiser la base de données.

Exemples :

- `seedData.js` : insertion de données de démonstration ;
- `addAdmins.js` : création d’administrateurs ;
- `resetUserPassword.js` : réinitialisation de mots de passe ;
- `checkData.js` : vérification des données ;
- `exportExcel.js` : export des données vers Excel ;
- `fixRoles.js` : correction des rôles utilisateurs ;
- `fixMissingData2024.js` : correction de données historiques.

Ces scripts ne sont pas directement utilisés par l’interface utilisateur.

## `backend/utils/`

Contient des fonctions utilitaires réutilisables par le backend.

### `utils/healthScore.js`

Calcule probablement un score de santé ou de performance d’un cabinet à partir de plusieurs indicateurs.

Ce dossier est destiné aux fonctions communes qui ne correspondent ni à une route, ni à un modèle, ni à un service complet.

## `backend/public/`

Contient les fichiers frontend compilés destinés à être servis par Express en production.

Dans `backend/server.js`, Express utilise ce dossier pour :

- servir les fichiers statiques ;
- retourner `index.html` pour les routes React ;
- permettre au backend de servir également l’application frontend construite.

# 3. Dossier `frontend/`

Le frontend est une application React construite avec Vite.

Il gère :

- l’affichage des pages ;
- la navigation ;
- les tableaux de bord ;
- les graphiques ;
- les formulaires ;
- les appels vers l’API backend ;
- la gestion de session et des rôles.

## Fichiers principaux de `frontend/`

### `frontend/index.html`

Point d’entrée HTML de Vite.

Il contient notamment l’élément dans lequel React est chargé.

### `frontend/package.json`

Définit :

- les dépendances React ;
- les dépendances Chart.js ;
- les scripts Vite ;
- les commandes de compilation.

### `vite.config.js`

Configure Vite, le serveur de développement et la compilation frontend.

### `tailwind.config.js`

Configure Tailwind CSS :

- couleurs ;
- thèmes ;
- extensions de styles ;
- fichiers analysés par Tailwind.

### `postcss.config.js`

Configure PostCSS, utilisé notamment pour traiter Tailwind CSS.

## `frontend/public/`

Contient les fichiers statiques accessibles directement par le navigateur :

- images ;
- logos ;
- icônes ;
- fichiers publics ;
- ressources ne nécessitant pas de compilation React.

## `frontend/src/`

Contient le code source principal de l’application React.

### `src/main.jsx`

Point de démarrage de React.

Il crée l’application React et l’attache à l’élément HTML principal.

### `src/App.jsx`

Composant racine de l’application.

Il contient généralement :

- la configuration des routes React ;
- les routes protégées ;
- les layouts associés aux rôles ;
- la structure générale de l’application.

### `src/index.css`

Contient les styles globaux :

- styles de base ;
- classes personnalisées ;
- animations ;
- importation de Tailwind CSS ;
- variables CSS éventuelles.

## `frontend/src/components/`

Contient les composants React réutilisables dans plusieurs pages.

Exemples :

- `Header.jsx` : en-tête ;
- `Sidebar.jsx` : menu latéral ;
- `Layout.jsx` : structure générale ;
- `AdminLayout.jsx` : structure réservée à l’administrateur ;
- `ConsultantLayout.jsx` : structure réservée au consultant ;
- `PrivateRoute.jsx` : protection des routes privées ;
- `PeriodFilter.jsx` : filtre par période ;
- `CabinetFilter.jsx` : filtre par cabinet ;
- `ComportementCabinet.jsx` : affichage ou analyse du comportement d’un cabinet.

L’objectif est d’éviter de dupliquer la même interface dans plusieurs pages.

## `frontend/src/context/`

Contient les contextes React, utilisés pour partager des informations dans toute l’application.

- `AuthContext.jsx` : utilisateur connecté, token et déconnexion ;
- `ThemeContext.jsx` : thème et apparence ;
- `DynamicContext.jsx` : fonctions ou éléments dynamiques de l’application ;
- `AppSettingsContext.jsx` : paramètres globaux récupérés depuis le backend.

Les contextes évitent de transmettre manuellement les mêmes données à de nombreux composants.

## `frontend/src/pages/`

Contient les pages complètes accessibles via les routes React.

### Pages générales

- `Login.jsx` : connexion ;
- `Register.jsx` : inscription.

### `pages/admin/`

Contient les pages réservées aux administrateurs :

- tableau de bord ;
- statistiques ;
- comparaison de cabinets ;
- analyse des cabinets ;
- gestion des cabinets ;
- rapports ;
- paramètres ;
- saisie ou gestion des données.

L’administrateur possède une vision globale de la plateforme.

### `pages/consultant/`

Contient les pages réservées aux consultants.

Elles permettent notamment :

- de consulter plusieurs cabinets ;
- de suivre leurs analyses ;
- de consulter les rapports ;
- de gérer les clients affectés.

### `pages/practitioner/`

Contient les pages réservées aux praticiens ou cabinets.

Elles servent notamment à :

- consulter les statistiques du cabinet ;
- gérer les patients ;
- saisir les données ;
- consulter les rapports ;
- lancer des analyses IA ;
- gérer les données du cabinet.

## `frontend/src/services/`

Contient les fonctions de communication avec le backend.

### `services/api.js`

Centralise généralement les appels Axios vers les endpoints :

```text
/api/auth
/api/admin
/api/data
/api/reports
/api/practitioner
/api/consultant
```

Ce dossier évite de placer directement les appels HTTP dans chaque composant.

## `frontend/src/utils/`

Contient les fonctions et outils réutilisables côté frontend.

- `aiModels.js` : logique ou données liées aux modèles IA ;
- `chartPlugins.js` : extensions et plugins pour Chart.js ;
- `useCountUp.js` : hook React pour animer les compteurs numériques.

# 4. Dossier `docs/`

Le dossier `docs/` contient la documentation du projet :

- `01_ARCHITECTURE.md` : architecture générale ;
- `02_TECHNOLOGIES.md` : technologies utilisées ;
- `03_BASE_DE_DONNEES.md` : structure MongoDB ;
- `04_API_BACKEND.md` : routes et endpoints API ;
- `05_MODELES_IA.md` : modèles et méthodes d’analyse ;
- `06_FRONTEND.md` : organisation de l’interface React ;
- `07_AUTHENTIFICATION.md` : système JWT et rôles ;
- `08_DEPLOIEMENT.md` : procédures de déploiement ;
- `09_FONCTIONNALITES.md` : fonctionnalités de l’application ;
- `10_RAPPORT_MISE_A_JOUR.md` : historique ou rapport des mises à jour ;
- `CREDENTIALS.example.md` : exemple de variables d’identification ;
- `DOCUMENT_IA_PROJET.md` : documentation liée à l’intelligence artificielle ;
- `generate_report.py` : script Python de génération de documentation ou de rapport.

Ce dossier permet de comprendre et maintenir le projet sans devoir analyser tout le code source.

# 5. Flux général de fonctionnement

```text
Utilisateur
    ↓
Frontend React
    ↓
services/api.js
    ↓
API Express du backend
    ↓
Routes
    ↓
Middleware d’authentification
    ↓
Services métier et modèles Mongoose
    ↓
MongoDB
```

En développement :

- le frontend fonctionne généralement avec Vite sur le port `5173` ;
- le backend fonctionne généralement sur le port `5000`.

En production :

- le frontend est compilé ;
- ses fichiers sont placés dans `backend/public/` ;
- Express peut alors servir à la fois l’API et l’interface React.

Le projet suit donc une architecture **MERN** :

- **MongoDB** : base de données ;
- **Express** : serveur API ;
- **React** : interface utilisateur ;
- **Node.js** : environnement d’exécution backend.
