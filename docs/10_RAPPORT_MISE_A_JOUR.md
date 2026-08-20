# 📄 Rapport de Mise à Jour

## Objectif
Ce rapport décrit l'architecture actuelle du projet **ProjetEfficienceOfficiel** après les dernières modifications effectuées dans le dépôt GitHub. Il met en évidence les évolutions du modèle, les composants modifiés et le déploiement, avec des diagrammes actualisés.

---

## 1. Synthèse des modifications

- Le backend Express est configuré pour charger les variables d'environnement depuis `backend/.env`.
- La logique CORS a été affinée : les origines autorisées incluent les environnements locaux (`localhost`) et l'URL Hostinger actuelle.
- Le frontend utilise désormais `frontend/src/services/api.js` avec `VITE_API_URL || '/api'` pour permettre un déploiement flexible.
- Le build local du frontend est démarré avec `npm run dev --prefix frontend`, et le backend avec `npm run dev --prefix backend`.
- Les scripts et le déploiement ont été nettoyés pour travailler indépendamment sur le frontend et le backend.
- Le backend sert les fichiers statiques compilés depuis `backend/public` lorsque le build est copié dans ce dossier.
- Le fichier de configuration `render.yaml` n'est plus présent dans le dépôt, ce qui signifie que la documentation de déploiement doit privilégier une approche générique d'hébergement Node + Frontend statique.

---

## 2. Architecture globale

### 2.1 Couches du système

- **Frontend** : React + Vite + Tailwind CSS
- **Backend** : Node.js + Express + Mongoose
- **Base de données** : MongoDB Atlas
- **IA** : modèles JS natifs dans `frontend/src/utils/aiModels.js`
- **Authentification** : email/password + bcrypt + JWT

### 2.2 Diagramme d'architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                             FRONTEND                               │
│                                                                     │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────┐              │
│  │   React     │   │  TailwindCSS │   │    Vite      │              │
│  │  Components │   │    Styles    │   │   Bundler    │              │
│  └──────┬──────┘   └──────┬───────┘   └──────┬───────┘              │
│           │                  │                 │                    │
│           └──────────────────┼─────────────────┘                    │
│                              │                                      │
│                     ┌────────▼────────┐                             │
│                     │   Axios Client  │                             │
│                     │   `api.js`      │                             │
│                     └────────┬────────┘                             │
└──────────────────────────────│──────────────────────────────────────┘
                               │ HTTPS / REST API
                               │ Bearer JWT
                               │
┌──────────────────────────────│──────────────────────────────────────┐
│                          BACKEND                                 │
│                                                                     │
│                    ┌────────▼────────┐                              │
│                    │   Express.js     │                              │
│                    │   `server.js`    │                              │
│                    └────────┬────────┘                              │
│                             │                                       │
│       ┌─────────────────────┼─────────────────────┐                 │
│       │                     │                     │                 │
│ ┌─────▼────┐           ┌────▼───────┐       ┌─────▼───────┐         │
│ │  Auth    │           │  API       │       │  Static     │         │
│ │ Middleware│           │  Routes    │       │  Assets     │         │
│ └─────┬────┘           └────┬───────┘       └─────┬───────┘         │
│       │                     │                     │                 │
│       └─────────────────────┼─────────────────────┘                 │
│                             │                                       │
│                    ┌────────▼────────┐                              │
│                    │   Mongoose      │                              │
│                    │   ODM           │                              │
│                    └────────┬────────┘                              │
└──────────────────────────────│──────────────────────────────────────┘
                               │ MongoDB Protocol
                               │
┌──────────────────────────────│──────────────────────────────────────┐
│                          DATABASE                                 │
│                    ┌────────▼────────┐                              │
│                    │   MongoDB Atlas  │                              │
│                    │   Cluster Cloud  │                              │
│                    └────────┬────────┘                              │
│                             │                                       │
│   ┌──────────┐   ┌──────────▼──────────┐   ┌──────────┐            │
│   │ Users    │   │ Analyses / Reports  │   │ Settings │            │
│   │ Collection│  │ Collections         │   │ Collection│            │
│   └──────────┘   └─────────────────────┘   └──────────┘            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Flux de données principal

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│              │     │              │     │              │     │              │
│   Utilisateur│────►│   Frontend   │────►│   Backend    │────►│   MongoDB    │
│              │     │   (React)    │     │  (Express)   │     │   Atlas      │
│              │◄────│              │◄────│              │◄────│              │
│              │     │              │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │                    │
       │  1. Action UI      │                    │                    │
       │   (clic bouton)    │                    │                    │
       │                    │                    │                    │
       │                    │ 2. Appel API       │                    │
       │                    │   (GET/POST)       │                    │
       │                    │───────────────────►│                    │
       │                    │                    │                    │
       │                    │                    │ 3. Query MongoDB   │
       │                    │                    │───────────────────►│
       │                    │                    │                    │
       │                    │                    │ 4. Résultat        │
       │                    │                    │◄───────────────────│
       │                    │                    │                    │
       │                    │ 5. Response JSON   │                    │
       │                    │◄───────────────────│                    │
       │                    │                    │                    │
       │ 6. Update State    │                    │                    │
       │   & Render         │                    │                    │
       │◄───────────────────│                    │                    │
```

---

## 4. Captures d'écran et légendes fonctionnelles

### 4.1 Section Import / Data pipeline
- **Figure 1 :** *Interface de sélection de fichier et d’import depuis la page `Gestion des Données`.*
  - `![Figure 1 : Interface de sélection de fichier et d’import](./images/figure1.png)`
  - Texte équivalent : cette capture montre le formulaire de sélection du type de données (`Réalisation`, `Rendez-vous`, `Jours Ouverts`, `Devis`, `En-cours`) et le bloc `Cliquer pour sélectionner un fichier` qui déclenche l’ouverture du sélecteur de fichiers.
- **Figure 2 :** *Message de retour à l’utilisateur après import réussi ou échec.*
  - `![Figure 2 : Message de retour après import](./images/figure2.png)`
  - Texte équivalent : le résultat affiche un message de succès indiquant le nombre d’enregistrements importés, ou une erreur explicite (`Fichier requis`, `Import désactivé`, `Type de données inconnu`, `Erreur lors de l'import`).
- **Figure 3 :** *Vue du navigateur (onglet Network) montrant la requête `POST /api/data/import/{type}` et la réponse JSON.*
  - `![Figure 3 : Requête API d’import et réponse JSON](./images/figure3.png)`
  - Texte équivalent : cette capture met en évidence le `form-data` contenant le champ `file`, le header `Authorization: Bearer ...`, et la réponse du backend (`message`, `count`).

### 4.2 Section Authentification
- **Figure 4 :** *Capture de l’écran de connexion (`Login`).*
  - `![Figure 4 : Écran de connexion](./images/figure4.png)`
  - Texte équivalent : illustration des champs email et mot de passe, du bouton `Connexion` et du comportement de l’interface lors de l’authentification.

### 4.3 Section Tableau de bord / Dashboard analytique
- **Figure 5 :** *Capture du dashboard analytique principal avec les indicateurs clés et les graphiques.*
  - `![Figure 5 : Dashboard analytique](./images/figure5.png)`
  - Texte équivalent : mise en avant des KPI de performance, des graphiques de tendance mensuelle, et de la répartition du chiffre d’affaires par cabinet.

### 4.4 Section Gestion des cabinets / Administration
- **Figure 6 :** *Capture de la page `Gestion Cabinets` montrant les cards de cabinet et les actions `Voir détails` / `Rapport`.*
  - `![Figure 6 : Gestion des cabinets](./images/figure6.png)`
  - Texte équivalent : représentation de la consultation et de la supervision des cabinets suivis, avec indicateurs de statut.

### 4.5 Section Modèles IA
- **Figure 7 :** *Capture d’un panel de prédiction IA ou de commentaire automatique généré.*
  - `![Figure 7 : Modèles IA intégrés](./images/figure7.png)`
  - Texte équivalent : démonstration de l’intégration d’une analyse IA au sein de l’interface, avec recommandations financières et commentaires automatisés.

### 4.6 Section Génération de rapports PDF
- **Figure 8 :** *Capture d’un rapport PDF généré ou de la zone de génération de rapports.*
  - `![Figure 8 : Génération de rapport PDF](./images/figure8.png)`
  - Texte équivalent : illustration du rendu final d’un rapport de performance et de la préparation des données pour l’export PDF.

### 4.7 Section Cron / tâches planifiées
- **Titre suggéré dans le rapport :** *Figure 9 : Configuration et planification de la tâche Cron de calcul des indicateurs.*
  - `![Figure 9 : Initialisation Cron dans server.js](./images/figure9.png)`
- **Exemple de description textuelle à ajouter sous l'image :**
  > **Figure 9 :** *Point d'entrée du serveur backend (`server.js`) mettant en évidence l'initialisation automatique du service de tâches planifiées (`initCronJobs()`) juste avant l'écoute du serveur sur le port de production.*
  - Texte équivalent : cette capture montre l’appel à `initCronJobs()` au démarrage du serveur, ce qui active le traitement automatique des rapports de performance à la fin de chaque mois.

### 4.8 Section Déploiement Hostinger
- **Figure 10 :** *Capture de l’interface Hostinger ou du point de déploiement statique.*
  - `![Figure 10 : Déploiement Hostinger](./images/figure10.png)`
  - Texte équivalent : cette capture sera utilisée pour documenter la phase finale de déploiement et le lien entre le frontend statique et le backend Node.js.
- Note : la finalisation du chapitre Déploiement pourra être complétée une fois les captures Hostinger disponibles.

---

## 5. Composants frontend clés

- `frontend/src/services/api.js` : client Axios avec base URL dynamique
- `frontend/src/context/AuthContext.jsx` : gestion JWT, rôle et session
- `frontend/src/context/ThemeContext.jsx` : thème clair/sombre
- `frontend/src/context/DynamicContext.jsx` : animations et réglages dynamiques
- `frontend/src/utils/aiModels.js` : 16 modèles IA natifs en JavaScript
- pages `frontend/src/pages/admin/*` : dashboards, analytics et gestion de cabinets
- `frontend/src/components/Header.jsx` : navigation et affichage par rôle

---

## 6. Backend et API

### 6.1 Composants backend principaux

- `backend/server.js`
  - Express + JSON parser
  - CORS avec origines locales et Hostinger
  - routes pour `auth`, `admin`, `data`, `reports`, `practitioner` et `consultant`
  - point public `GET /api/settings/public`
  - fallback SPA pour toutes les routes qui ne commencent pas par `/api`
  - timeout augmenté à 120s pour les requêtes longues

- `backend/config/db.js`
  - connexion Mongoose à MongoDB Atlas
  - chargement du `.env`

- `backend/services/pdfGenerator.js`
  - génération PDF avec Puppeteer désactivée par défaut en environnement cloud

- `backend/services/cronJobs.js`
  - planification de génération de rapports et envois automatisés

### 5.2 Principaux endpoints

- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/health`
- `GET /api/settings/public`
- `GET/POST/PUT/DELETE /api/admin`
- `GET/POST /api/data`
- `GET /api/reports`

---

## 6. Sécurité

- Authentification par email + bcrypt
- Jeton JWT signé et vérifié pour chaque requête protégée
- Contrôle des rôles : admin, practitioner, consultant
- CORS strict sur origin : localhost et Hostinger

---

## 7. Déploiement

### 7.1 Diagramme de déploiement mis à jour

```
┌─────────────────────────────────────────────────────────────────────┐
│                            PRODUCTION                              │
│                                                                     │
│  ┌────────────────────┐      HTTPS      ┌────────────────────────┐  │
│  │   HOSTINGER / CDN  │◄──────────────►│   BACKEND NODE.JS      │  │
│  │   Frontend static  │               │   Express + API        │  │
│  │   (dist/ ou public)│               │   + SPA fallback       │  │
│  └────────────────────┘               └───────────┬─────────────┘  │
│                                                       │            │
│                                                       │ MongoDB     │
│                                                       ▼            │
│                                            ┌──────────────────────┐ │
│                                            │    MongoDB Atlas      │ │
│                                            │    Cluster Cloud      │ │
│                                            └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.2 Mode opératoire de déploiement

- Construire le frontend :
  ```bash
  cd frontend
  npm install
  npm run build
  ```
- Copier ou déployer le contenu dans un hébergement statique (Hostinger, CDN, etc.)
- Héberger le backend Node.js sur un service cloud compatible
- Configurer les variables d'environnement :
  - `MONGODB_URI`
  - `JWT_SECRET`
  - `EMAIL_USER`
  - `EMAIL_PASS`
  - `PORT`
  - `NODE_ENV=production`
  - `PUPPETEER_ENABLED=false`
- Vérifier que `VITE_API_URL` pointe vers l'URL du backend

### 7.3 Configuration CORS actuelle

Origines autorisées :
- `https://efficience-analytics-eu-783177.hostingersite.com`
- `http://localhost:5173`
- `http://localhost:5000`
- `http://localhost:3000`
- `http://localhost:3001`
- `http://127.0.0.1:3000`
- `http://127.0.0.1:3001`

---

## 8. Variables d'environnement recommandées

### Backend

```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/efficience
JWT_SECRET=votre_cle_jwt_secrete
EMAIL_USER=votre.email@gmail.com
EMAIL_PASS=app_password_gmail
PORT=5000
NODE_ENV=production
PUPPETEER_ENABLED=false
```

### Frontend

```env
VITE_API_URL=https://votre-backend-domain.com/api
```

---

## 9. Conclusion

Ce rapport met à jour l'architecture et le déploiement en fonction des changements identifiés dans le dépôt. Il est prêt à remplacer ou compléter l'ancien modèle de rapport que vous avez envoyé, avec des diagrammes adaptés aux modifications actuelles du projet.
