# 📐 Architecture du Projet
DOCUMENTATION/
├── README.md               # Vue d'ensemble + arborescence projet
├── 01_ARCHITECTURE.md      # Architecture Client-Serveur + diagrammes
├── 02_TECHNOLOGIES.md      # Stack MERN, packages, versions
├── 03_BASE_DE_DONNEES.md   # Schémas MongoDB Mongoose (9 collections)
├── 04_API_BACKEND.md       # Routes REST, endpoints, codes HTTP
├── 05_MODELES_IA.md        # 16 modèles IA/ML avec formules mathématiques
├── 06_FRONTEND.md          # React components, contexts, routing
├── 07_AUTHENTIFICATION.md  # JWT, bcrypt, RBAC, flux complet
├── 08_DEPLOIEMENT.md       # Render, Hostinger, MongoDB Atlas, CI/CD
└── 09_FONCTIONNALITES.md   # Liste complète des features par rôle

## Vue d'ensemble

**Efficience Analytics** suit une architecture **Client-Serveur** classique à 3 tiers :

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (FRONTEND)                          │
│                                                                     │
│    ┌─────────────┐   ┌─────────────┐   ┌─────────────┐            │
│    │   React     │   │  TailwindCSS│   │    Vite     │            │
│    │  Components │   │    Styles   │   │   Bundler   │            │
│    └──────┬──────┘   └──────┬──────┘   └──────┬──────┘            │
│           │                 │                 │                    │
│           └─────────────────┼─────────────────┘                    │
│                             │                                      │
│                    ┌────────▼────────┐                             │
│                    │  Axios Client   │                             │
│                    │  (API Service)  │                             │
│                    └────────┬────────┘                             │
└─────────────────────────────│───────────────────────────────────────┘
                              │ HTTP/HTTPS (REST API)
                              │ Bearer Token JWT
                              │
┌─────────────────────────────│───────────────────────────────────────┐
│                    ┌────────▼────────┐                             │
│                    │  Express.js     │                             │
│                    │    Router       │                             │
│                    └────────┬────────┘                             │
│                             │                                      │
│     ┌───────────────────────┼───────────────────────┐              │
│     │                       │                       │              │
│ ┌───▼───┐              ┌────▼────┐             ┌────▼───┐          │
│ │ CORS  │              │  Auth   │             │  JSON  │          │
│ │Middleware            │Middleware│             │ Parser │          │
│ └───┬───┘              └────┬────┘             └────┬───┘          │
│     │                       │                       │              │
│     └───────────────────────┼───────────────────────┘              │
│                             │                                      │
│              ┌──────────────┼──────────────┐                       │
│              │              │              │                       │
│         ┌────▼────┐   ┌─────▼────┐   ┌─────▼────┐                  │
│         │  Auth   │   │  Admin   │   │  Data    │                  │
│         │ Routes  │   │  Routes  │   │ Routes   │                  │
│         └────┬────┘   └────┬─────┘   └────┬─────┘                  │
│              │              │              │                       │
│              └──────────────┼──────────────┘                       │
│                             │                                      │
│                    ┌────────▼────────┐                             │
│                    │    Mongoose     │                             │
│                    │     ODM         │                             │
│                    └────────┬────────┘                             │
│                         SERVER (BACKEND)                           │
└─────────────────────────────│───────────────────────────────────────┘
                              │ MongoDB Wire Protocol
                              │
┌─────────────────────────────│───────────────────────────────────────┐
│                    ┌────────▼────────┐                             │
│                    │  MongoDB Atlas  │                             │
│                    │    Cluster      │                             │
│                    └────────┬────────┘                             │
│                             │                                      │
│     ┌───────────────────────┼───────────────────────┐              │
│     │                       │                       │              │
│ ┌───▼───────┐         ┌─────▼─────┐         ┌──────▼──────┐        │
│ │  Users    │         │ Analyses  │         │   Reports   │        │
│ │Collection │         │Collections│         │ Collection  │        │
│ └───────────┘         └───────────┘         └─────────────┘        │
│                        DATABASE                                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Flux de Données Principal

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

## Architecture des Composants Frontend

```
App.jsx
│
├── AuthProvider (Contexte d'authentification)
│   │
│   ├── ThemeProvider (Thème clair/sombre)
│   │   │
│   │   ├── DynamicProvider (Animations)
│   │   │   │
│   │   │   └── Router (React Router DOM)
│   │   │       │
│   │   │       ├── /login ──────► Login.jsx
│   │   │       ├── /register ───► Register.jsx
│   │   │       │
│   │   │       ├── PrivateRoute (role: admin)
│   │   │       │   └── AdminLayout
│   │   │       │       ├── Header.jsx
│   │   │       │       ├── Sidebar.jsx
│   │   │       │       └── Pages
│   │   │       │           ├── Dashboard.jsx
│   │   │       │           ├── Statistics.jsx
│   │   │       │           ├── Comparison.jsx
│   │   │       │           ├── CabinetAnalysis.jsx
│   │   │       │           ├── CabinetManagement.jsx
│   │   │       │           ├── Reports.jsx
│   │   │       │           └── Settings.jsx
│   │   │       │
│   │   │       ├── PrivateRoute (role: practitioner)
│   │   │       │   └── Layout
│   │   │       │       ├── Header.jsx
│   │   │       │       ├── Sidebar.jsx
│   │   │       │       └── Pages
│   │   │       │           ├── Dashboard.jsx
│   │   │       │           ├── MyStats.jsx
│   │   │       │           ├── MyReports.jsx
│   │   │       │           ├── DataManagement.jsx
│   │   │       │           ├── ManualEntry.jsx
│   │   │       │           ├── PatientManagement.jsx
│   │   │       │           └── AIAnalysis.jsx
│   │   │       │
│   │   │       └── PrivateRoute (role: consultant)
│   │   │           └── ConsultantLayout
│   │   │               └── Pages consultant...
```

---

## Architecture Sécurité

```
                   ┌─────────────────────────────────┐
                   │        Authentification         │
                   │                                 │
    Connexion      │  ┌──────────┐    ┌──────────┐  │
    ───────────────┼─►│ Email    │───►│ Password │  │
                   │  │ Check    │    │ bcrypt   │  │
                   │  └──────────┘    └────┬─────┘  │
                   │                       │        │
                   │                       ▼        │
                   │              ┌───────────────┐ │
                   │              │ JWT Sign      │ │
                   │              │ (24h expiry)  │ │
                   │              └───────┬───────┘ │
                   │                      │         │
                   └──────────────────────┼─────────┘
                                          │
                                          ▼
                   ┌─────────────────────────────────┐
                   │        Autorisation             │
                   │                                 │
    Requête API    │  ┌──────────┐    ┌──────────┐  │
    (+ Bearer)     │  │ JWT      │───►│ Role     │  │
    ───────────────┼─►│ Verify   │    │ Check    │  │
                   │  └──────────┘    └────┬─────┘  │
                   │                       │        │
                   │     ┌─────────────────┼────────┤
                   │     │                 │        │
                   │     ▼                 ▼        │
                   │ ┌───────┐        ┌────────┐   │
                   │ │ Admin │        │Practit.│   │
                   │ │ Only  │        │ Only   │   │
                   │ └───────┘        └────────┘   │
                   │                                │
                   └────────────────────────────────┘
```

---

## Architecture des Services

### Backend Services

| Service | Fichier | Rôle |
|---------|---------|------|
| **Email** | `services/emailService.js` | Envoi d'emails via nodemailer (SMTP Gmail) |
| **PDF** | `services/pdfGenerator.js` | Génération de rapports PDF |
| **Cron** | `services/cronJobs.js` | Tâches planifiées (génération auto rapports) |

### Frontend Services

| Service | Fichier | Rôle |
|---------|---------|------|
| **API** | `services/api.js` | Client Axios avec intercepteurs JWT |
| **AI Models** | `utils/aiModels.js` | 16 modèles IA/ML (régression, forecast, etc.) |

---

## Variables d'Environnement

### Backend (`backend/.env`)

```env
# Base de données
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/efficience

# Authentification
JWT_SECRET=ma_cle_secrete_jwt

# Email
EMAIL_USER=email@gmail.com
EMAIL_PASS=app_password

# Serveur
PORT=5000
NODE_ENV=production
```

### Frontend (`frontend/.env`)

```env
# API URL (optionnel, défaut: /api)
VITE_API_URL=https://backend-url.onrender.com/api
```

---

## Patterns Architecturaux Utilisés

1. **MVC (Model-View-Controller)**
   - Model: Schémas Mongoose
   - View: Composants React
   - Controller: Routes Express

2. **Repository Pattern**
   - Accès aux données via Mongoose Models

3. **Singleton Pattern**
   - Configuration AppSettings (un seul document)

4. **Provider Pattern (React)**
   - AuthContext, ThemeContext, DynamicContext

5. **Middleware Chain**
   - CORS → JSON → Auth → Routes

6. **SPA (Single Page Application)**
   - React Router pour navigation client-side

---

## Diagramme de Déploiement

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRODUCTION                               │
│                                                                 │
│  ┌─────────────────┐         ┌─────────────────┐               │
│  │    HOSTINGER    │         │     RENDER      │               │
│  │                 │         │                 │               │
│  │  ┌───────────┐  │  HTTPS  │  ┌───────────┐  │               │
│  │  │  Static   │◄─┼─────────┼──│  Node.js  │  │               │
│  │  │  Frontend │  │         │  │  Backend  │  │               │
│  │  └───────────┘  │         │  └─────┬─────┘  │               │
│  │                 │         │        │        │               │
│  └─────────────────┘         │        │        │               │
│                              │        │        │               │
│                              └────────│────────┘               │
│                                       │                        │
│                              ┌────────▼────────┐               │
│                              │  MongoDB Atlas  │               │
│                              │    (Cloud)      │               │
│                              └─────────────────┘               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

*Suivant : [02_TECHNOLOGIES.md](./02_TECHNOLOGIES.md)*
