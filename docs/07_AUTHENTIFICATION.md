# 🔐 Authentification & Sécurité

## Vue d'ensemble

Le système d'authentification utilise **JWT (JSON Web Tokens)** avec **bcrypt** pour le hashage des mots de passe.

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUX D'AUTHENTIFICATION                      │
│                                                                 │
│  ┌─────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐   │
│  │ Client  │───►│  Login   │───►│  Verify  │───►│  JWT     │   │
│  │         │    │ (email,  │    │ Password │    │ Generate │   │
│  │         │    │ password)│    │ (bcrypt) │    │ (24h)    │   │
│  └─────────┘    └──────────┘    └──────────┘    └────┬─────┘   │
│       ▲                                              │         │
│       │              Token JWT + User Data           │         │
│       └──────────────────────────────────────────────┘         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Hashage des Mots de Passe

### Bcrypt

Les mots de passe sont hashés avec **bcrypt** (10 rounds de salage).

**Fichier** : `backend/models/User.js`

```javascript
const bcrypt = require('bcryptjs');

// Hash automatique avant sauvegarde
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Méthode de vérification
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};
```

**Exemple de hash** :
```
Mot de passe : "MonMotDePasse123"
Hash bcrypt  : "$2a$10$N9qo8uLOickgx2ZMRZoMye..."
```

---

## JWT (JSON Web Token)

### Structure du Token

Un JWT est composé de 3 parties séparées par des points :

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.    // Header
eyJpZCI6IjY0YTFiMmMzZDRlNWY2ZzciLCJyb2... // Payload
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c // Signature
```

### Payload (Contenu)

```json
{
  "id": "64a1b2c3d4e5f6g7h8i9j0k1",   // ID utilisateur MongoDB
  "role": "practitioner",              // Rôle
  "practitionerCode": "JC",            // Code praticien (si applicable)
  "iat": 1719763200,                   // Issued At (timestamp)
  "exp": 1719849600                    // Expiration (24h après)
}
```

### Génération

**Fichier** : `backend/routes/auth.js`

```javascript
const jwt = require('jsonwebtoken');

// Lors du login
const token = jwt.sign(
  { 
    id: user._id, 
    role: user.role, 
    practitionerCode: user.practitionerCode 
  },
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
);

res.json({ token, user: { ... } });
```

### Vérification

**Fichier** : `backend/middleware/auth.js`

```javascript
const auth = async (req, res, next) => {
  try {
    // Extraire le token du header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Accès refusé. Token manquant.' });
    }

    // Vérifier et décoder le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Récupérer l'utilisateur
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Token invalide ou compte désactivé.' });
    }

    req.user = user;  // Attacher l'utilisateur à la requête
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token invalide.' });
  }
};
```

---

## Middleware d'Autorisation (RBAC)

### Role-Based Access Control

```javascript
// Admin uniquement
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès réservé aux administrateurs.' });
  }
  next();
};

// Praticien uniquement
const practitionerOnly = (req, res, next) => {
  if (req.user.role !== 'practitioner') {
    return res.status(403).json({ message: 'Accès réservé aux praticiens.' });
  }
  next();
};

// Consultant uniquement
const consultantOnly = (req, res, next) => {
  if (req.user.role !== 'consultant') {
    return res.status(403).json({ message: 'Accès réservé aux consultants.' });
  }
  next();
};
```

### Usage dans les Routes

```javascript
// Route admin protégée
router.get('/admin/dashboard', auth, adminOnly, async (req, res) => {
  // Seuls les admins peuvent accéder
});

// Route praticien protégée
router.get('/practitioner/dashboard', auth, practitionerOnly, async (req, res) => {
  // Seuls les praticiens peuvent accéder
  // Filtrage automatique par practitionerCode de l'utilisateur connecté
});
```

---

## Flux d'Authentification Complet

### 1. Inscription (Register)

```
Client                          Serveur                         MongoDB
  │                                │                                │
  │  POST /api/auth/register       │                                │
  │  { name, email, password }     │                                │
  │────────────────────────────────►                                │
  │                                │                                │
  │                                │  Vérifie email unique          │
  │                                │────────────────────────────────►
  │                                │                                │
  │                                │  Hash password (bcrypt)        │
  │                                │                                │
  │                                │  Crée User                     │
  │                                │────────────────────────────────►
  │                                │                                │
  │                                │  Génère JWT                    │
  │                                │                                │
  │  { token, user }               │                                │
  │◄────────────────────────────────                                │
  │                                │                                │
```

### 2. Connexion (Login)

```
Client                          Serveur                         MongoDB
  │                                │                                │
  │  POST /api/auth/login          │                                │
  │  { email, password }           │                                │
  │────────────────────────────────►                                │
  │                                │                                │
  │                                │  Trouve user par email         │
  │                                │────────────────────────────────►
  │                                │                                │
  │                                │  Compare password (bcrypt)     │
  │                                │                                │
  │                                │  if OK → Génère JWT            │
  │                                │                                │
  │  { token, user }               │                                │
  │◄────────────────────────────────                                │
  │                                │                                │
```

### 3. Requête Protégée

```
Client                          Serveur                         MongoDB
  │                                │                                │
  │  GET /api/admin/dashboard      │                                │
  │  Authorization: Bearer <JWT>   │                                │
  │────────────────────────────────►                                │
  │                                │                                │
  │                                │  Vérifie JWT (jwt.verify)      │
  │                                │                                │
  │                                │  Charge User depuis DB         │
  │                                │────────────────────────────────►
  │                                │                                │
  │                                │  Vérifie rôle (adminOnly)      │
  │                                │                                │
  │                                │  if OK → Exécute route         │
  │                                │────────────────────────────────►
  │                                │                                │
  │  { data }                      │                                │
  │◄────────────────────────────────                                │
```

---

## Stockage Côté Client

### localStorage

```javascript
// Lors du login
localStorage.setItem('token', response.data.token);
localStorage.setItem('user', JSON.stringify(response.data.user));

// Lors du logout
localStorage.removeItem('token');
localStorage.removeItem('user');
```

### Intercepteur Axios

**Fichier** : `frontend/src/services/api.js`

```javascript
// Ajoute automatiquement le token à chaque requête
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Gère les erreurs 401 (token expiré)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';  // Redirection
    }
    return Promise.reject(error);
  }
);
```

---

## Protection des Routes Frontend

### PrivateRoute

**Fichier** : `frontend/src/components/PrivateRoute.jsx`

```jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function PrivateRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  // Affiche un loader pendant la vérification
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Non connecté → Login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Rôle non autorisé → Page d'erreur ou redirection
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Rediriger vers le dashboard approprié
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'practitioner') return <Navigate to="/practitioner/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
}
```

### Usage dans App.jsx

```jsx
<Routes>
  {/* Route publique */}
  <Route path="/login" element={<Login />} />

  {/* Route admin protégée */}
  <Route 
    path="/admin/*" 
    element={
      <PrivateRoute allowedRoles={['admin']}>
        <AdminLayout>
          {/* Routes admin... */}
        </AdminLayout>
      </PrivateRoute>
    } 
  />

  {/* Route praticien protégée */}
  <Route 
    path="/practitioner/*" 
    element={
      <PrivateRoute allowedRoles={['practitioner']}>
        <Layout>
          {/* Routes praticien... */}
        </Layout>
      </PrivateRoute>
    } 
  />
</Routes>
```

---

## Sécurité Additionnelle

### 1. CORS

Seules les origines autorisées peuvent accéder à l'API :

```javascript
app.use(cors({
  origin: [
    'https://efficience-analytics-eu-783177.hostingersite.com',
    'https://projetefficienceofficiel-mk01.onrender.com',
    'http://localhost:5173'
  ],
  credentials: true
}));
```

### 2. Désactivation de Compte

Un admin peut désactiver un compte utilisateur (`isActive: false`). L'utilisateur ne pourra plus se connecter même avec un token valide.

### 3. Vérification par Code (Sensitive Actions)

Pour les actions sensibles (toggle IA, désactivation compte), un code de confirmation est envoyé par email :

```javascript
// 1. Demande de code
router.post('/ai-toggle-send-code', auth, adminOnly, async (req, res) => {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  // Stocker en mémoire avec expiration
  confirmationCodes.set(req.user.id, { code, expires: Date.now() + 300000 }); // 5min
  // Envoyer par email
  await emailService.sendMail({ to: req.user.email, subject: 'Code de confirmation', ... });
  res.json({ message: 'Code envoyé.' });
});

// 2. Confirmation avec code
router.post('/ai-toggle-confirm', auth, adminOnly, async (req, res) => {
  const { code } = req.body;
  const stored = confirmationCodes.get(req.user.id);
  if (!stored || stored.code !== code || Date.now() > stored.expires) {
    return res.status(400).json({ message: 'Code invalide ou expiré.' });
  }
  // Effectuer l'action
  await AppSettings.updateOne({}, { aiModelsEnabled: req.body.targetState });
  confirmationCodes.delete(req.user.id);
  res.json({ message: 'Action confirmée.' });
});
```

---

## Diagramme des Rôles et Permissions

```
┌─────────────────────────────────────────────────────────────────┐
│                        MATRICE DES DROITS                       │
├─────────────────────────┬───────┬─────────────┬─────────────────┤
│        Action           │ Admin │ Practitioner│   Consultant    │
├─────────────────────────┼───────┼─────────────┼─────────────────┤
│ Voir tous les cabinets  │  ✅   │     ❌      │  ✅ (assignés)  │
│ Voir son propre cabinet │  ✅   │     ✅      │      ❌         │
│ Importer des données    │  ✅   │     ❌      │      ❌         │
│ Générer des rapports    │  ✅   │     ❌      │      ✅         │
│ Modifier les paramètres │  ✅   │     ❌      │      ❌         │
│ Toggle IA               │  ✅   │     ❌      │      ❌         │
│ Ajouter des patients    │  ❌   │     ✅      │      ❌         │
│ Saisie manuelle         │  ❌   │     ✅      │      ❌         │
│ Voir analyses IA        │  ✅   │     ✅      │      ✅         │
└─────────────────────────┴───────┴─────────────┴─────────────────┘
```

---

## Variables d'Environnement Sécurité

```env
# Clé secrète JWT (générer une clé forte !)
JWT_SECRET=une_clé_très_longue_et_aléatoire_minimum_32_caractères

# Ne JAMAIS exposer ces variables côté client
# Ne JAMAIS commiter le fichier .env
```

---

*Suivant : [08_DEPLOIEMENT.md](./08_DEPLOIEMENT.md)*
