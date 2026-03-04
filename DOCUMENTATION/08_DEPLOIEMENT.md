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
│  │                       RENDER                             │   │
│  │              (Backend - Node.js/Express)                 │   │
│  │                                                          │   │
│  │  URL: https://projetefficienceofficiel-mk01.onrender.com │   │
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

## Déploiement Backend sur Render

### 1. Configuration `render.yaml`

**Fichier** : `render.yaml`

```yaml
services:
  - type: web
    name: efficience-backend
    env: node
    region: frankfurt  # ou autre région
    plan: free         # ou starter, standard
    buildCommand: cd backend && npm install
    startCommand: cd backend && node server.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        sync: false  # Variable secrète à définir manuellement
      - key: JWT_SECRET
        sync: false
      - key: EMAIL_USER
        sync: false
      - key: EMAIL_PASS
        sync: false
```

### 2. Déploiement Manuel

1. **Créer un compte Render** : [render.com](https://render.com)

2. **Connecter GitHub** :
   - Dashboard → New Web Service
   - Connect your GitHub repository

3. **Configurer le service** :
   ```
   Name: efficience-backend
   Environment: Node
   Build Command: cd backend && npm install
   Start Command: cd backend && node server.js
   ```

4. **Variables d'environnement** (Environment tab) :
   ```
   MONGODB_URI = mongodb+srv://user:pass@cluster.mongodb.net/efficience
   JWT_SECRET = votre_clé_secrète_très_longue
   EMAIL_USER = votre.email@gmail.com
   EMAIL_PASS = app_password_gmail
   NODE_ENV = production
   PORT = 10000
   ```

5. **Déployer** :
   - Render déploie automatiquement sur chaque `git push`

### 3. Commandes Git pour Déployer

```bash
# Depuis la racine du projet
git add -A
git commit -m "Mise à jour backend"
git push origin main

# Si remote render configuré séparément
git push render main
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
0.0.0.0/0  (Autoriser depuis n'importe où - pour Render)
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
name: Deploy to Render

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
      
      # Render webhook trigger (optional)
      - name: Trigger Render Deploy
        run: |
          curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK }}
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
git push render main

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
git push render main

echo "Deployment complete!"
```

---

## Vérification du Déploiement

### Endpoints de Test

```bash
# Health check
curl https://projetefficienceofficiel-mk01.onrender.com/api/health

# Réponse attendue :
{ "status": "OK", "message": "Efficience Analytics API opérationnelle" }
```

### Logs Render

Dashboard Render → Service → Logs pour voir :
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

- **Render** : Monitoring intégré (plan payant)
- **UptimeRobot** : Gratuit, ping toutes les 5 min
- **Sentry** : Error tracking (optionnel)

### 3. Sauvegardes MongoDB

- **Atlas** : Backups automatiques (plan payant)
- **Export manuel** : `mongodump`

---

## Coûts Estimés

| Service | Plan | Coût Mensuel |
|---------|------|--------------|
| Render | Free | 0 € (spin down après 15 min) |
| Render | Starter | ~7 € |
| Hostinger | Single | ~3-5 €/mois |
| MongoDB Atlas | M0 | 0 € (512 MB) |
| MongoDB Atlas | M10 | ~10 €/mois |

**Total estimé** : **0 € (gratuit)** à **~20 €/mois** (production)

---

*Suivant : [09_FONCTIONNALITES.md](./09_FONCTIONNALITES.md)*
