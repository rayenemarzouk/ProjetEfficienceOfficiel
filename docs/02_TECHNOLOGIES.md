# 🛠️ Technologies Utilisées

## Stack Technique (MERN Stack)

```
┌────────────────────────────────────────────────────────────────────┐
│                          STACK MERN                                │
│                                                                    │
│   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐           │
│   │         │   │         │   │         │   │         │           │
│   │ MongoDB │   │ Express │   │  React  │   │ Node.js │           │
│   │         │   │         │   │         │   │         │           │
│   └─────────┘   └─────────┘   └─────────┘   └─────────┘           │
│                                                                    │
│      Base de       Framework     Interface     Runtime             │
│      Données         API           UI        JavaScript            │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Frontend

### Frameworks & Librairies

| Technologie | Version | Rôle | Documentation |
|-------------|---------|------|---------------|
| **React** | 18.x | Framework UI (composants, hooks) | [react.dev](https://react.dev) |
| **Vite** | 5.x | Bundler & Dev Server (ultra-rapide) | [vitejs.dev](https://vitejs.dev) |
| **React Router DOM** | 6.x | Routage SPA | [reactrouter.com](https://reactrouter.com) |
| **TailwindCSS** | 3.x | Framework CSS utility-first | [tailwindcss.com](https://tailwindcss.com) |
| **Axios** | 1.x | Client HTTP pour API | [axios-http.com](https://axios-http.com) |
| **Chart.js** | 4.x | Graphiques et visualisations | [chartjs.org](https://www.chartjs.org) |
| **react-chartjs-2** | 5.x | Wrapper React pour Chart.js | [npmjs.com](https://www.npmjs.com/package/react-chartjs-2) |
| **Lucide React** | 0.x | Icônes SVG modernes | [lucide.dev](https://lucide.dev) |

### Fichier `package.json` Frontend

```json
{
  "name": "efficience-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.x.x",
    "axios": "^1.x.x",
    "chart.js": "^4.x.x",
    "react-chartjs-2": "^5.x.x",
    "lucide-react": "^0.x.x"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.x.x",
    "vite": "^5.x.x",
    "tailwindcss": "^3.x.x",
    "postcss": "^8.x.x",
    "autoprefixer": "^10.x.x"
  }
}
```

---

## Backend

### Frameworks & Librairies

| Technologie | Version | Rôle | Documentation |
|-------------|---------|------|---------------|
| **Node.js** | 18+ | Runtime JavaScript serveur | [nodejs.org](https://nodejs.org) |
| **Express** | 4.x | Framework web minimaliste | [expressjs.com](https://expressjs.com) |
| **Mongoose** | 8.x | ODM MongoDB (schémas, validation) | [mongoosejs.com](https://mongoosejs.com) |
| **jsonwebtoken** | 9.x | Authentification JWT | [npmjs.com/package/jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) |
| **bcryptjs** | 2.x | Hashage sécurisé passwords | [npmjs.com/package/bcryptjs](https://www.npmjs.com/package/bcryptjs) |
| **cors** | 2.x | Middleware CORS | [npmjs.com/package/cors](https://www.npmjs.com/package/cors) |
| **nodemailer** | 6.x | Envoi d'emails SMTP | [nodemailer.com](https://nodemailer.com) |
| **multer** | 1.x | Upload de fichiers | [npmjs.com/package/multer](https://www.npmjs.com/package/multer) |
| **node-cron** | 3.x | Tâches planifiées | [npmjs.com/package/node-cron](https://www.npmjs.com/package/node-cron) |
| **pdfkit** | 0.x | Génération de PDFs | [pdfkit.org](http://pdfkit.org) |
| **dotenv** | 16.x | Variables d'environnement | [npmjs.com/package/dotenv](https://www.npmjs.com/package/dotenv) |

### Fichier `package.json` Backend

```json
{
  "name": "efficience-backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.x",
    "mongoose": "^8.x.x",
    "jsonwebtoken": "^9.x.x",
    "bcryptjs": "^2.x.x",
    "cors": "^2.x.x",
    "nodemailer": "^6.x.x",
    "multer": "^1.x.x",
    "node-cron": "^3.x.x",
    "pdfkit": "^0.x.x",
    "dotenv": "^16.x.x"
  },
  "devDependencies": {
    "nodemon": "^3.x.x"
  }
}
```

---

## Base de Données

| Technologie | Type | Rôle |
|-------------|------|------|
| **MongoDB Atlas** | Cloud NoSQL | Base de données principale (hébergée) |
| **Mongoose** | ODM | Abstraction et schémas typés |

### Pourquoi MongoDB ?

1. **Flexibilité** : Schémas flexibles pour données dentaires variées
2. **Performance** : Indexation efficace pour requêtes analytiques
3. **Scalabilité** : MongoDB Atlas scale automatiquement
4. **JSON natif** : Communication directe avec JavaScript/Node.js

---

## Services Tiers

| Service | Rôle | Configuration |
|---------|------|---------------|
| **MongoDB Atlas** | Base de données cloud | Cluster M0 (gratuit) ou M10+ |
| **Render** | Hébergement backend Node.js | Web Service auto-deploy |
| **Hostinger** | Hébergement frontend statique | Subdomain ou domaine custom |
| **Gmail SMTP** | Service email | App Password OAuth2 |

---

## Outils de Développement

| Outil | Rôle |
|-------|------|
| **VS Code** | IDE principal |
| **Git** | Versioning |
| **GitHub** | Dépôt distant |
| **Postman** | Test des API |
| **MongoDB Compass** | GUI MongoDB |
| **Chrome DevTools** | Debug frontend |

---

## Configuration TailwindCSS

```javascript
// tailwind.config.js
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Thème sombre via classe
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(20px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        scaleIn: { '0%': { transform: 'scale(0.9)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
      },
    },
  },
  plugins: [],
}
```

---

## Configuration Vite

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
```

---

## Compatibilité Navigateurs

| Navigateur | Version Minimum | Support |
|------------|-----------------|---------|
| Chrome | 80+ | ✅ Complet |
| Firefox | 75+ | ✅ Complet |
| Safari | 13+ | ✅ Complet |
| Edge | 80+ | ✅ Complet |
| IE | - | ❌ Non supporté |

---

## Performance Optimisations

1. **Code Splitting** : Vite split automatique des chunks
2. **Lazy Loading** : Composants chargés à la demande
3. **Tree Shaking** : Import sélectif (ex: Lucide icons)
4. **Compression** : Gzip/Brotli sur Render/Hostinger
5. **CDN** : Assets statiques en cache
6. **Indexation MongoDB** : Index composites sur praticien+mois

---

*Suivant : [03_BASE_DE_DONNEES.md](./03_BASE_DE_DONNEES.md)*
