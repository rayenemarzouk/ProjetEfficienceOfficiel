# 🔌 API Backend (REST)

## Vue d'ensemble

L'API REST est construite avec **Express.js** et suit les conventions RESTful.

**Base URL** : `https://projetefficienceofficiel-mk01.onrender.com/api`

---

## Structure des Routes

```
/api
├── /auth            # Authentification (login, register, profile)
├── /admin           # Routes administrateur
├── /practitioner    # Routes praticien
├── /consultant      # Routes consultant
├── /data            # Import de données
├── /reports         # Génération et téléchargement de rapports
└── /settings/public # Paramètres publics (maintenance, etc.)
```

---

## Authentification

### Headers Requis

```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Format de Réponse Erreur

```json
{
  "message": "Description de l'erreur"
}
```

---

## Routes Auth (`/api/auth`)

**Fichier** : `backend/routes/auth.js`

### POST `/api/auth/login`

Connexion utilisateur.

**Request Body** :
```json
{
  "email": "user@example.com",
  "password": "motdepasse123"
}
```

**Response 200** :
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64a1b2c3d4e5f6g7h8i9j0k1",
    "email": "user@example.com",
    "name": "Dr. Dupont",
    "role": "practitioner",
    "practitionerCode": "JC",
    "cabinetName": "Cabinet Dentaire Paris"
  }
}
```

**Erreurs** :
- `400` : Email et mot de passe requis
- `401` : Identifiants incorrects / Compte désactivé

---

### POST `/api/auth/register`

Inscription nouvel utilisateur.

**Request Body** :
```json
{
  "name": "Dr. Martin",
  "email": "martin@cabinet.com",
  "password": "SecurePass123!",
  "cabinetName": "Cabinet Dentaire Lyon",
  "practitionerCode": "DM"
}
```

**Response 201** :
```json
{
  "message": "Compte créé avec succès.",
  "token": "eyJ...",
  "user": { ... }
}
```

---

### GET `/api/auth/me`

Récupère le profil de l'utilisateur connecté.

**Headers** : `Authorization: Bearer <token>`

**Response 200** :
```json
{
  "user": {
    "id": "...",
    "email": "user@example.com",
    "name": "Dr. Dupont",
    "role": "practitioner",
    "practitionerCode": "JC",
    "cabinetName": "Cabinet XYZ"
  }
}
```

---

### PUT `/api/auth/profile`

Met à jour le profil utilisateur.

**Request Body** :
```json
{
  "name": "Nouveau Nom",
  "cabinetName": "Nouveau Cabinet",
  "password": "NouveauMotDePasse"  // optionnel
}
```

---

## Routes Admin (`/api/admin`)

**Fichier** : `backend/routes/admin.js`

> **Middleware** : `auth` + `adminOnly`

### GET `/api/admin/dashboard`

Dashboard principal avec KPIs globaux.

**Query Params** :
- `startDate` (optionnel) : Date début (YYYY-MM)
- `endDate` (optionnel) : Date fin (YYYY-MM)
- `praticiens` (optionnel) : Codes praticiens séparés par virgule

**Response 200** :
```json
{
  "kpis": {
    "caFacture": 125000,
    "caEncaisse": 98000,
    "tauxEncaissement": 78.4,
    "nbPatients": 340,
    "nbNouveauxPatients": 45,
    "heuresTravaillees": 680,
    "rentabiliteHoraire": 183.8
  },
  "evolution": {
    "labels": ["2024-01", "2024-02", ...],
    "caFacture": [41000, 43000, ...],
    "caEncaisse": [32000, 35000, ...]
  },
  "praticiens": [
    { "code": "JC", "name": "Dr. Dupont", "caTotal": 65000 },
    { "code": "DV", "name": "Dr. Martin", "caTotal": 60000 }
  ]
}
```

---

### GET `/api/admin/comparison`

Comparaison entre deux praticiens.

**Query Params** :
- `practitioner1` : Code praticien 1 (ex: "JC")
- `practitioner2` : Code praticien 2 (ex: "DV")

**Response 200** :
```json
{
  "p1": {
    "code": "JC",
    "kpis": { "caFacture": 65000, ... }
  },
  "p2": {
    "code": "DV",
    "kpis": { "caFacture": 60000, ... }
  },
  "comparison": {
    "winner": "JC",
    "caFactureDiff": 5000,
    "tauxEncaissementDiff": 3.2
  }
}
```

---

### GET `/api/admin/cabinet/:code`

Détails d'un cabinet spécifique.

**Params** : `code` = Code praticien (ex: "JC")

**Response 200** :
```json
{
  "praticien": {
    "code": "JC",
    "name": "Dr. Dupont",
    "cabinet": "Cabinet Paris"
  },
  "kpis": { ... },
  "evolution12Mois": { ... },
  "devis": { ... },
  "encours": { ... }
}
```

---

### GET `/api/admin/statistics`

Statistiques globales tous cabinets.

---

### GET `/api/admin/settings`

Récupère les paramètres application.

**Response 200** :
```json
{
  "autoGeneration": true,
  "autoEmail": true,
  "cronHeure": "20:00",
  "maintenanceMode": false,
  "aiModelsEnabled": true,
  "importEnabled": true,
  "dynamicExpiresAt": "2024-07-15T00:00:00.000Z"
}
```

---

### PUT `/api/admin/settings`

Met à jour les paramètres.

**Request Body** :
```json
{
  "maintenanceMode": true,
  "aiModelsEnabled": false
}
```

---

### POST `/api/admin/ai-toggle-send-code`

Envoie un code de confirmation pour activer/désactiver l'IA.

**Request Body** :
```json
{
  "targetState": true  // true = activer, false = désactiver
}
```

---

### POST `/api/admin/ai-toggle-confirm`

Confirme le toggle IA avec le code reçu.

**Request Body** :
```json
{
  "code": "123456"
}
```

---

## Routes Practitioner (`/api/practitioner`)

**Fichier** : `backend/routes/practitioner.js`

> **Middleware** : `auth` (praticien voit uniquement ses données)

### GET `/api/practitioner/dashboard`

Dashboard du praticien connecté.

**Response 200** :
```json
{
  "kpis": {
    "caFacture": 45000,
    "caEncaisse": 38000,
    "tauxEncaissement": 84.4,
    "nbPatients": 120,
    "heuresTravaillees": 180
  },
  "evolution6Mois": { ... },
  "encours": { ... }
}
```

---

### POST `/api/practitioner/manual-entry`

Saisie manuelle de données.

**Request Body** :
```json
{
  "type": "realisation",  // ou "rendez-vous", "jours-ouverts", "devis"
  "mois": "2024-06",
  "data": {
    "nbPatients": 45,
    "montantFacture": 15000,
    "montantEncaisse": 12000
  }
}
```

---

### GET `/api/practitioner/patients`

Liste des patients du praticien.

**Query Params** :
- `search` : Recherche nom/prénom
- `statut` : "actif", "inactif", "nouveau"
- `page` : Page (défaut: 1)
- `limit` : Nombre par page (défaut: 20)

---

### POST `/api/practitioner/patients`

Ajouter un patient.

**Request Body** :
```json
{
  "nom": "Dupont",
  "prenom": "Jean",
  "dateNaissance": "1985-03-15",
  "telephone": "0612345678",
  "email": "jean.dupont@email.com"
}
```

---

## Routes Data (`/api/data`)

**Fichier** : `backend/routes/data.js`

> **Middleware** : `auth` + `adminOnly`

### POST `/api/data/import/:type`

Import de fichier TSV/CSV.

**Types supportés** :
- `realisation` : Analyse des réalisations
- `rendez-vous` : Analyse des rendez-vous
- `jours-ouverts` : Jours/heures travaillés
- `devis` : Analyse des devis
- `encours` : État des encours

**Request** : `multipart/form-data`
```
file: [fichier.tsv]
```

**Format TSV attendu (exemple realisation)** :
```
Praticien	Mois	Nb patients	Montant facturé	Montant encaissé
JC	2024-01	45	15000	12000
JC	2024-02	52	18000	15500
```

**Response 200** :
```json
{
  "message": "52 enregistrements importés avec succès.",
  "count": 52
}
```

---

### GET `/api/data/summary`

Résumé des données disponibles.

**Response 200** :
```json
{
  "devis": 156,
  "joursOuverts": 156,
  "realisations": 312,
  "rendezVous": 156,
  "encours": 12
}
```

---

## Routes Reports (`/api/reports`)

**Fichier** : `backend/routes/reports.js`

### POST `/api/reports/generate`

Génère un rapport PDF pour un praticien.

**Request Body** :
```json
{
  "practitionerCode": "JC",
  "mois": "2024-06"
}
```

**Response 200** :
```json
{
  "message": "Rapport généré avec succès.",
  "reportId": "64a1b2c3d4e5f6..."
}
```

---

### POST `/api/reports/generate-all`

Génère les rapports pour tous les praticiens.

**Request Body** :
```json
{
  "mois": "2024-06"
}
```

---

### GET `/api/reports/download/:id`

Télécharge un rapport PDF.

**Response** : `application/pdf` (binary)

---

### GET `/api/reports/list`

Liste des rapports disponibles.

**Query Params** :
- `mois` (optionnel) : Filtrer par mois

**Response 200** :
```json
{
  "reports": [
    {
      "_id": "...",
      "practitionerCode": "JC",
      "mois": "2024-06",
      "filename": "rapport_JC_2024-06.pdf",
      "sentAt": "2024-06-30T20:15:00Z"
    }
  ]
}
```

---

## Routes Publiques

### GET `/api/settings/public`

Paramètres publics (pas d'authentification requise).

**Response 200** :
```json
{
  "maintenanceMode": false,
  "aiModelsEnabled": true,
  "importEnabled": true,
  "dynamicActive": true,
  "dynamicExpiresAt": "2024-07-15T00:00:00.000Z"
}
```

---

### GET `/api/health`

Vérification de l'état de l'API.

**Response 200** :
```json
{
  "status": "OK",
  "message": "Efficience Analytics API opérationnelle"
}
```

---

## Codes HTTP Utilisés

| Code | Signification | Usage |
|------|---------------|-------|
| `200` | OK | Requête réussie |
| `201` | Created | Ressource créée (POST) |
| `400` | Bad Request | Données invalides |
| `401` | Unauthorized | Token manquant/invalide |
| `403` | Forbidden | Accès refusé (rôle) |
| `404` | Not Found | Ressource introuvable |
| `500` | Server Error | Erreur interne |

---

## Middleware d'Authentification

**Fichier** : `backend/middleware/auth.js`

```javascript
// Middleware JWT
const auth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'Accès refusé. Token manquant.' });
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id).select('-password');
  
  if (!user || !user.isActive) {
    return res.status(401).json({ message: 'Token invalide ou compte désactivé.' });
  }

  req.user = user;
  next();
};

// Middleware Admin uniquement
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès réservé aux administrateurs.' });
  }
  next();
};
```

---

## CORS Configuration

```javascript
app.use(cors({
  origin: [
    'https://efficience-analytics-eu-783177.hostingersite.com',
    'https://projetefficienceofficiel-mk01.onrender.com',
    'http://localhost:5173',
    'http://localhost:5000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

*Suivant : [05_MODELES_IA.md](./05_MODELES_IA.md)*
