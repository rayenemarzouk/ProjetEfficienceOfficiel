# 🚀 Déploiement

## Architecture de Production

```
┌─────────────────────────────────────────────────────────────────┐
│                    ENVIRONNEMENT PRODUCTION                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                      HOSTINGER                           │   │
│  │           (Frontend - Fichiers Statiques)                │   │
│  │                                                          │   │
│  │  URL: https://efficience-analytics-eu-783177.            │   │
│  │       hostingersite.com                                  │   │
│  │                                                          │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │  index.html  │  assets/  │  index-*.js/css      │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              │ HTTPS (API Calls)                │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 BACKEND NODE HOST                       │   │
│  │              (Backend - Node.js/Express)                 │   │
│  │                                                          │   │
│  │  URL: https://votre-backend-domain.com                    │   │
│  │                                                          │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │    server.js    │   routes/   │   services/      │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              │ MongoDB Wire Protocol            │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   MONGODB ATLAS                          │   │
│  │                   (Base de données)                      │   │
│  │                                                          │   │
│  │  Cluster: efficience-cluster.mongodb.net                 │   │
│  │  Database: efficience                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Déploiement Backend sur un hébergement Node.js

### 1. Hébergement backend Node.js

Ce projet peut être déployé sur n'importe quel service Node.js compatible. Le backend utilise :

- `backend/server.js` comme point d'entrée
- `express.json()` et `express.urlencoded()` pour parser les requêtes
- `cors()` pour autoriser les requêtes depuis Hostinger et les environnements locaux
- un fallback SPA pour servir `backend/public/index.html` lorsque la route ne commence pas par `/api`

### 2. Déploiement manuel

1. Héberger le backend sur un service Node.js (Hostinger, Railway, Heroku, etc.)
2. Configurer la commande de démarrage :
   ```bash
   node backend/server.js
   ```
3. Installer les dépendances :
   ```bash
   cd backend
   npm install
   ```
4. Configurer les variables d'environnement :
   ```env
   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/efficience
   JWT_SECRET=votre_clé_secrète_très_longue
   EMAIL_USER=votre.email@gmail.com
   EMAIL_PASS=app_password_gmail
   NODE_ENV=production
   PORT=5000
   PUPPETEER_ENABLED=false
   ```
5. Déployer et démarrer l'application.

### 3. Commandes Git pour déployer

```bash
# Depuis la racine du projet
git add -A
git commit -m "Mise à jour backend"
git push origin main
```

---

## Déploiement Frontend sur Hostinger

### 1. Build du Frontend

```bash
cd frontend
npm run build
```

Génère le dossier `dist/` avec :
```
dist/
├── index.html
├── assets/
│   ├── index-*.js     # Bundle JavaScript
│   └── index-*.css    # Styles compilés
```

### 2. Upload sur Hostinger

#### Option A : File Manager

1. Connectez-vous à [hpanel.hostinger.com](https://hpanel.hostinger.com)
2. File Manager → public_html
3. Supprimez l'ancien contenu
4. Uploadez le contenu de `dist/`

#### Option B : FTP

```bash
# Avec un client FTP (FileZilla, etc.)
Host: ftp.yourdomain.com
User: votre_user_ftp
Password: votre_password
Port: 21

# Uploadez dist/* vers public_html/
```

#### Option C : Git (recommandé)

```bash
# Configurer Git sur Hostinger (SSH accès requis)
ssh user@yourdomain.com
cd public_html
git clone https://github.com/your-repo.git .

# Pour les mises à jour
git pull origin main
```

### 3. Configuration `.htaccess` (SPA)

**Fichier** : `public_html/.htaccess`

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Redirect HTTP to HTTPS
  RewriteCond %{HTTPS} off
  RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
  
  # Don't rewrite existing files or directories
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  
  # Rewrite all other URLs to index.html (SPA)
  RewriteRule ^ index.html [L]
</IfModule>

# Compression Gzip
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json
</IfModule>

# Cache pour assets statiques
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType text/css "access plus 1 month"
</IfModule>
```

---

## Configuration MongoDB Atlas

### 1. Créer un Cluster

1. [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create Cluster → M0 (Free) ou M10+
3. Région : Europe (Frankfurt) pour latence minimale

### 2. Configurer l'Accès Réseau

**Network Access** → Add IP Address :
```
0.0.0.0/0  (Autoriser depuis n'importe où - pour hébergement cloud)
```

### 3. Créer un Utilisateur

**Database Access** → Add New Database User :
```
Username: efficience_user
Password: mot_de_passe_securise
Role: readWriteAnyDatabase
```

### 4. Obtenir la Connection String

```
mongodb+srv://efficience_user:mot_de_passe@cluster0.xxxxx.mongodb.net/efficience?retryWrites=true&w=majority
```

---

## Configuration Email (Gmail SMTP)

### 1. Activer 2FA sur Gmail

1. Google Account → Security → 2-Step Verification → Enable

### 2. Générer un App Password

1. Google Account → Security → App passwords
2. Select app: Mail
3. Select device: Other (Node.js)
4. Copier le mot de passe généré (16 caractères)

### 3. Configuration Nodemailer

**Fichier** : `backend/services/emailService.js`

```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS  // App Password, pas le mot de passe Gmail
  }
});

async function sendMail({ to, subject, html }) {
  return transporter.sendMail({
    from: `"Efficience Analytics" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html
  });
}
```

---

## CI/CD Automatique

### GitHub Actions (optionnel)

**Fichier** : `.github/workflows/deploy.yml`

```yaml
name: Deploy to Node Host

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
      
      - name: Build frontend
        run: |
          cd frontend
          npm run build
      
      - name: Copy build to backend
        run: |
          rm -rf backend/public/*
          cp -r frontend/dist/* backend/public/
      
      # Déclencheur de déploiement optionnel
      - name: Trigger Deploy
        run: |
          curl -X POST ${{ secrets.DEPLOY_HOOK }}
```

---

## Scripts de Déploiement

### Script Windows (PowerShell)

**Fichier** : `deploy.ps1`

```powershell
# Build frontend
Write-Host "Building frontend..." -ForegroundColor Cyan
Set-Location frontend
npm run build

# Copy to backend
Write-Host "Copying to backend/public..." -ForegroundColor Cyan
Set-Location ..
Remove-Item -Recurse -Force backend/public/*
Copy-Item -Recurse frontend/dist/* backend/public/

# Git commit and push
Write-Host "Pushing to Git..." -ForegroundColor Cyan
git add -A
git commit -m "Deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
git push origin main
# git push <remote> main  # Optionnel selon configuration remote

Write-Host "Deployment complete!" -ForegroundColor Green
```

### Script Linux/Mac (Bash)

**Fichier** : `deploy.sh`

```bash
#!/bin/bash

echo "Building frontend..."
cd frontend
npm run build

echo "Copying to backend/public..."
cd ..
rm -rf backend/public/*
cp -r frontend/dist/* backend/public/

echo "Pushing to Git..."
git add -A
git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M')"
git push origin main
# git push <remote> main  # Optionnel selon configuration remote

echo "Deployment complete!"
```

---

## Vérification du Déploiement

### Endpoints de Test

```bash
# Health check
curl https://votre-backend-domain.com/api/health

# Réponse attendue :
{ "status": "OK", "message": "Efficience Analytics API opérationnelle" }
```

### Logs du service

Dashboard du service → Logs pour voir :
- Démarrage du serveur
- Connexion MongoDB
- Erreurs éventuelles

---

## Maintenance et Monitoring

### 1. Mode Maintenance

Activer depuis l'interface admin ou via API :

```javascript
POST /api/admin/settings
{ "maintenanceMode": true }
```

### 2. Monitoring Uptime

- **Hébergement Node.js** : monitoring intégré selon le fournisseur
- **UptimeRobot** : Gratuit, ping toutes les 5 min
- **Sentry** : Error tracking (optionnel)

### 3. Sauvegardes MongoDB

- **Atlas** : Backups automatiques (plan payant)
- **Export manuel** : `mongodump`

---

## Coûts Estimés

| Service | Plan | Coût Mensuel |
|---------|------|--------------|
| Hébergement Node.js | Free | 0 € (optionnel, selon offre) |
| Hébergement Node.js | Starter | ~7 € |
| Hostinger | Single | ~3-5 €/mois |
| MongoDB Atlas | M0 | 0 € (512 MB) |
| MongoDB Atlas | M10 | ~10 €/mois |

**Total estimé** : **0 € (gratuit)** à **~20 €/mois** (production)

---

*Suivant : [09_FONCTIONNALITES.md](./09_FONCTIONNALITES.md)*
