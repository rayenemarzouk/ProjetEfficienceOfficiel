# 🗄️ Base de Données MongoDB

## Vue d'ensemble

La base de données utilise **MongoDB Atlas** (cloud) avec **Mongoose** comme ODM (Object Document Mapper).

```
┌─────────────────────────────────────────────────────────────────┐
│                    MongoDB Atlas Cluster                        │
│                                                                 │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │    users      │  │analyserealisa-│  │analyserendez- │       │
│  │               │  │    tions      │  │     vous      │       │
│  └───────────────┘  └───────────────┘  └───────────────┘       │
│                                                                 │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │analysejourso- │  │ analysedevis  │  │    encours    │       │
│  │    uverts     │  │               │  │               │       │
│  └───────────────┘  └───────────────┘  └───────────────┘       │
│                                                                 │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │   patients    │  │    reports    │  │  appsettings  │       │
│  │               │  │               │  │               │       │
│  └───────────────┘  └───────────────┘  └───────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Schémas Mongoose

### 1. User (Utilisateur)

**Fichier** : `backend/models/User.js`

```javascript
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'practitioner', 'consultant'],
    default: 'practitioner'
  },
  name: {
    type: String,
    required: true
  },
  practitionerCode: {
    type: String,   // Ex: "JC", "DV", "ER"
    default: null
  },
  cabinetName: {
    type: String,
    default: 'Cabinet Dentaire'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: {
    type: String,
    default: null
  }
}, { timestamps: true });  // createdAt, updatedAt automatiques
```

**Méthodes** :
- `pre('save')` : Hash automatique du password avec bcrypt
- `matchPassword(password)` : Compare le password entré avec le hash

**Index** : `email` (unique)

---

### 2. AnalyseRealisation

**Fichier** : `backend/models/AnalyseRealisation.js`

Stocke les réalisations mensuelles par praticien (CA facturé, encaissé, patients).

```javascript
const analyseRealisationSchema = new mongoose.Schema({
  praticien: { type: String, required: true, index: true },
  mois: { type: String, required: true },      // Format: "2024-01"
  nbPatients: { type: Number, default: 0 },
  montantFacture: { type: Number, default: 0 },   // CA Facturé (€)
  montantEncaisse: { type: Number, default: 0 }   // CA Encaissé (€)
}, { timestamps: true });

// Index composé pour requêtes efficaces
analyseRealisationSchema.index({ praticien: 1, mois: 1 });
```

**Exemple de document** :
```json
{
  "_id": "ObjectId(...)",
  "praticien": "JC",
  "mois": "2024-06",
  "nbPatients": 87,
  "montantFacture": 45280,
  "montantEncaisse": 38500,
  "createdAt": "2024-06-30T20:00:00Z",
  "updatedAt": "2024-06-30T20:00:00Z"
}
```

---

### 3. AnalyseRendezVous

**Fichier** : `backend/models/AnalyseRendezVous.js`

Stocke les statistiques de rendez-vous mensuels.

```javascript
const analyseRendezVousSchema = new mongoose.Schema({
  praticien: { type: String, required: true, index: true },
  mois: { type: String, required: true },
  nbRdv: { type: Number, default: 0 },             // Nombre total de RDV
  dureeTotaleRdv: { type: Number, default: 0 },    // Durée en minutes
  nbPatients: { type: Number, default: 0 },        // Patients distincts
  nbNouveauxPatients: { type: Number, default: 0 } // Nouveaux patients
}, { timestamps: true });

analyseRendezVousSchema.index({ praticien: 1, mois: 1 });
```

---

### 4. AnalyseJoursOuverts

**Fichier** : `backend/models/AnalyseJoursOuverts.js`

Stocke les heures travaillées par mois.

```javascript
const analyseJoursOuvertsSchema = new mongoose.Schema({
  praticien: { type: String, required: true, index: true },
  mois: { type: String, required: true },
  nbHeures: { type: Number, default: 0 }  // Heures travaillées
}, { timestamps: true });

analyseJoursOuvertsSchema.index({ praticien: 1, mois: 1 });
```

---

### 5. AnalyseDevis

**Fichier** : `backend/models/AnalyseDevis.js`

Stocke les statistiques de devis.

```javascript
const analyseDevisSchema = new mongoose.Schema({
  praticien: { type: String, required: true, index: true },
  mois: { type: String, required: true },
  nbDevis: { type: Number, default: 0 },            // Nombre de devis proposés
  montantPropositions: { type: Number, default: 0 }, // Montant total proposé
  nbDevisAcceptes: { type: Number, default: 0 },    // Devis acceptés
  montantAccepte: { type: Number, default: 0 }      // Montant accepté
}, { timestamps: true });

analyseDevisSchema.index({ praticien: 1, mois: 1 });
```

**KPI calculé** : `Taux d'acceptation = nbDevisAcceptes / nbDevis * 100`

---

### 6. Encours

**Fichier** : `backend/models/Encours.js`

Stocke l'état des encours à un instant T.

```javascript
const encoursSchema = new mongoose.Schema({
  dureeTotaleARealiser: { type: Number, default: 0 },    // Heures à réaliser
  montantTotalAFacturer: { type: Number, default: 0 },   // Montant à facturer
  rentabiliteHoraire: { type: Number, default: 0 },      // €/heure
  rentabiliteJoursTravailles: { type: Number, default: 0 },
  patientsEnCours: { type: Number, default: 0 }          // Patients en traitement
}, { timestamps: true });
```

---

### 7. Patient

**Fichier** : `backend/models/Patient.js`

Gestion de la patientèle par praticien.

```javascript
const patientSchema = new mongoose.Schema({
  praticien: { type: String, required: true, index: true },
  nom: { type: String, required: true, trim: true },
  prenom: { type: String, required: true, trim: true },
  dateNaissance: { type: Date, default: null },
  telephone: { type: String, default: '', trim: true },
  email: { type: String, default: '', trim: true, lowercase: true },
  notes: { type: String, default: '' },
  statut: {
    type: String,
    enum: ['actif', 'inactif', 'nouveau'],
    default: 'nouveau'
  },
  dernierRdv: { type: Date, default: null },
  prochainRdv: { type: Date, default: null },
  montantTotal: { type: Number, default: 0 },   // Cumul CA pour ce patient
  nbVisites: { type: Number, default: 0 }
}, { timestamps: true });

patientSchema.index({ praticien: 1, nom: 1, prenom: 1 });
```

---

### 8. Report

**Fichier** : `backend/models/Report.js`

Stocke les rapports PDF générés.

```javascript
const reportSchema = new mongoose.Schema({
  practitionerCode: { type: String, required: true },
  mois: { type: String, required: true },         // "2024-06"
  filename: { type: String, required: true },      // "rapport_JC_2024-06.pdf"
  pdfData: { type: Buffer },                       // Contenu binaire du PDF
  sentAt: { type: Date, default: null },          // Date d'envoi par email
  sentTo: { type: String, default: null }         // Email destinataire
}, { timestamps: true });

reportSchema.index({ practitionerCode: 1, mois: 1 });
```

---

### 9. AppSettings (Singleton)

**Fichier** : `backend/models/AppSettings.js`

Configuration globale de l'application (un seul document).

```javascript
const appSettingsSchema = new mongoose.Schema({
  autoGeneration: { type: Boolean, default: true },     // Génération auto rapports
  autoEmail: { type: Boolean, default: true },          // Envoi auto emails
  cronHeure: { type: String, default: '20:00' },        // Heure du cron
  maintenanceMode: { type: Boolean, default: false },   // Mode maintenance
  aiModelsEnabled: { type: Boolean, default: true },    // Toggle IA
  importEnabled: { type: Boolean, default: true },      // Toggle import
  dynamicExpiresAt: { type: Date, default: null }       // Expiration mode dynamique
}, { timestamps: true });

// Méthode statique — Singleton pattern
appSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});  // Crée si n'existe pas
  }
  return settings;
};

// Vérifie si le mode dynamique est actif
appSettingsSchema.methods.isDynamicActive = function () {
  return this.dynamicExpiresAt && new Date() < this.dynamicExpiresAt;
};
```

---

## Relations entre Collections

```
┌───────────────┐
│    Users      │
│  (praticien)  │
└───────┬───────┘
        │ practitionerCode
        │
        ├──────────────┬──────────────┬──────────────┬──────────────┐
        ▼              ▼              ▼              ▼              ▼
┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐┌──────────────┐
│AnalyseRealis.││AnalyseRdv   ││AnalyseJours ││AnalyseDevis ││  Patients    │
│ praticien    ││ praticien   ││ praticien   ││ praticien   ││ praticien    │
└──────────────┘└──────────────┘└──────────────┘└──────────────┘└──────────────┘
```

> **Note** : Les relations sont **logiques** via le champ `praticien` (code praticien). MongoDB ne supporte pas les foreign keys natives, mais Mongoose permet des `populate()` si nécessaire.

---

## Indexation

| Collection | Index | Raison |
|------------|-------|--------|
| `users` | `{ email: 1 }` unique | Recherche login rapide |
| `analyserealisations` | `{ praticien: 1, mois: 1 }` | Requêtes par praticien et période |
| `analyserendezvous` | `{ praticien: 1, mois: 1 }` | Idem |
| `analysejoursuverts` | `{ praticien: 1, mois: 1 }` | Idem |
| `analysedevis` | `{ praticien: 1, mois: 1 }` | Idem |
| `patients` | `{ praticien: 1, nom: 1, prenom: 1 }` | Recherche patient |
| `reports` | `{ practitionerCode: 1, mois: 1 }` | Récupération rapport |

---

## Connexion à MongoDB

**Fichier** : `backend/config/db.js`

```javascript
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB connecté: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Erreur de connexion MongoDB: ${error.message}`);
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
};

module.exports = connectDB;
```

**Format URI** :
```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
```

---

## Requêtes Courantes

### Agrégation CA par mois (Admin Dashboard)

```javascript
const pipeline = [
  { $match: { praticien: { $in: praticienCodes } } },
  { $group: {
      _id: '$mois',
      totalFacture: { $sum: '$montantFacture' },
      totalEncaisse: { $sum: '$montantEncaisse' },
      totalPatients: { $sum: '$nbPatients' }
    }
  },
  { $sort: { _id: 1 } }
];

const results = await AnalyseRealisation.aggregate(pipeline);
```

### Récupérer les 12 derniers mois pour un praticien

```javascript
const data = await AnalyseRealisation.find({ praticien: 'JC' })
  .sort({ mois: -1 })
  .limit(12);
```

---

*Suivant : [04_API_BACKEND.md](./04_API_BACKEND.md)*
