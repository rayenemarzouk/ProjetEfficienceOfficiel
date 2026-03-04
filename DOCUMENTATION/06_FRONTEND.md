# 🖥️ Frontend React

## Vue d'ensemble

Le frontend est une **Single Page Application (SPA)** construite avec **React 18** et **Vite**.

**Dossier** : `frontend/src/`

---

## Structure des Fichiers

```
frontend/src/
│
├── main.jsx              # Point d'entrée React
├── App.jsx               # Router et providers
├── index.css             # Styles globaux + animations
│
├── 📂 components/        # Composants réutilisables
│   ├── Header.jsx        # Barre de navigation supérieure
│   ├── Sidebar.jsx       # Menu latéral
│   ├── Layout.jsx        # Layout praticien
│   ├── AdminLayout.jsx   # Layout admin
│   ├── ConsultantLayout.jsx
│   ├── PrivateRoute.jsx  # Protection des routes
│   ├── PeriodFilter.jsx  # Sélecteur de période
│   └── CabinetFilter.jsx # Sélecteur de cabinet
│
├── 📂 context/           # Contextes React (état global)
│   ├── AuthContext.jsx   # Authentification
│   ├── ThemeContext.jsx  # Thème clair/sombre
│   ├── DynamicContext.jsx# Animations dynamiques
│   └── AppSettingsContext.jsx
│
├── 📂 pages/             # Pages de l'application
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── 📂 admin/         # Pages administrateur
│   └── 📂 practitioner/  # Pages praticien
│
├── 📂 services/          # Appels API
│   └── api.js            # Client Axios
│
└── 📂 utils/             # Utilitaires
    ├── aiModels.js       # Modèles IA
    ├── chartPlugins.js   # Plugins Chart.js
    └── useCountUp.js     # Hook animation compteur
```

---

## Point d'Entrée (`main.jsx`)

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

---

## Router et Providers (`App.jsx`)

```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { DynamicProvider } from './context/DynamicContext';
import PrivateRoute from './components/PrivateRoute';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/admin/Dashboard';
import PractitionerDashboard from './pages/practitioner/Dashboard';
// ... autres imports

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <DynamicProvider>
            <Routes>
              {/* Routes publiques */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Routes Admin */}
              <Route path="/admin/*" element={
                <PrivateRoute allowedRoles={['admin']}>
                  <AdminLayout>
                    <Routes>
                      <Route path="dashboard" element={<AdminDashboard />} />
                      <Route path="statistics" element={<Statistics />} />
                      <Route path="comparison" element={<Comparison />} />
                      {/* ... */}
                    </Routes>
                  </AdminLayout>
                </PrivateRoute>
              } />
              
              {/* Routes Praticien */}
              <Route path="/practitioner/*" element={
                <PrivateRoute allowedRoles={['practitioner']}>
                  <Layout>
                    <Routes>
                      <Route path="dashboard" element={<PractitionerDashboard />} />
                      <Route path="stats" element={<MyStats />} />
                      {/* ... */}
                    </Routes>
                  </Layout>
                </PrivateRoute>
              } />
              
              {/* Redirection par défaut */}
              <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
          </DynamicProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

---

## Contextes React

### AuthContext (Authentification)

**Fichier** : `context/AuthContext.jsx`

```jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { getMe } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      getMe()
        .then((res) => {
          setUser(res.data.user || res.data);
          localStorage.setItem('user', JSON.stringify(res.data.user));
        })
        .catch(() => {
          localStorage.removeItem('token');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const loginUser = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

**Usage** :
```jsx
function Dashboard() {
  const { user, logout } = useAuth();
  
  return (
    <div>
      <p>Bienvenue, {user?.name}</p>
      <button onClick={logout}>Déconnexion</button>
    </div>
  );
}
```

---

### ThemeContext (Thème Clair/Sombre)

**Fichier** : `context/ThemeContext.jsx`

```jsx
import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

---

### DynamicContext (Animations)

**Fichier** : `context/DynamicContext.jsx`

```jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { getPublicSettings } from '../services/api';

const DynamicContext = createContext();

export function DynamicProvider({ children }) {
  const [isDynamic, setIsDynamic] = useState(false);

  useEffect(() => {
    getPublicSettings()
      .then((res) => {
        setIsDynamic(res.data.dynamicActive || false);
      })
      .catch(() => setIsDynamic(false));
  }, []);

  return (
    <DynamicContext.Provider value={{ isDynamic, setIsDynamic }}>
      {children}
    </DynamicContext.Provider>
  );
}

export const useDynamic = () => useContext(DynamicContext);
```

**Usage dans les composants** :
```jsx
function KPICard({ title, value }) {
  const { isDynamic } = useDynamic();
  
  return (
    <div className={`card ${isDynamic ? 'animate-fade-in hover-lift' : ''}`}>
      <h3>{title}</h3>
      <p>{value}</p>
    </div>
  );
}
```

---

## Composants Principaux

### PrivateRoute (Protection des routes)

```jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function PrivateRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading-spinner">Chargement...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
```

---

### Header (Navigation supérieure)

```jsx
function Header() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { isDynamic } = useDynamic();

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-800 shadow-md z-50">
      <div className="flex items-center justify-between h-full px-4">
        <h1 className="text-xl font-bold">
          EFFICIENCE <span className="text-blue-500">ANALYTICS</span>
        </h1>
        
        <div className="flex items-center gap-4">
          {/* Toggle thème */}
          <button onClick={toggleTheme}>
            {isDark ? <Sun /> : <Moon />}
          </button>
          
          {/* Profil utilisateur */}
          <span>{user?.name}</span>
          
          {/* Déconnexion */}
          <button onClick={logout}>
            <LogOut />
          </button>
        </div>
      </div>
    </header>
  );
}
```

---

### Sidebar (Menu latéral)

```jsx
function Sidebar() {
  const { user } = useAuth();
  
  const adminLinks = [
    { to: '/admin/dashboard', icon: <LayoutDashboard />, label: 'Dashboard' },
    { to: '/admin/statistics', icon: <BarChart3 />, label: 'Statistiques' },
    { to: '/admin/comparison', icon: <GitCompare />, label: 'Comparaison' },
    { to: '/admin/reports', icon: <FileText />, label: 'Rapports' },
    { to: '/admin/settings', icon: <Settings />, label: 'Paramètres' },
  ];

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-slate-900">
      <nav className="p-4">
        {adminLinks.map((link) => (
          <NavLink 
            key={link.to} 
            to={link.to}
            className={({ isActive }) => 
              `flex items-center gap-3 p-3 rounded-lg ${isActive ? 'bg-blue-600' : 'hover:bg-slate-800'}`
            }
          >
            {link.icon}
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
```

---

## Pages Admin

### Dashboard Admin

**Fichier** : `pages/admin/Dashboard.jsx`

```jsx
import { useState, useEffect } from 'react';
import { getAdminDashboard } from '../../services/api';
import { useDynamic } from '../../context/DynamicContext';
import { Line } from 'react-chartjs-2';
import { generateTrendLineDataset, cabinetHealthScore } from '../../utils/aiModels';

function AdminDashboard() {
  const { isDynamic } = useDynamic();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminDashboard()
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const { kpis, evolution, praticiens } = data;
  
  // Calcul score santé via IA
  const healthScore = cabinetHealthScore({
    tauxEncaissement: kpis.tauxEncaissement,
    evolutionCA: kpis.evolutionMensuelle,
    tauxAbsence: kpis.tauxAbsence,
    productionHoraire: kpis.rentabiliteHoraire,
    tauxNouveauxPatients: kpis.tauxNouveaux
  });

  // Classes d'animation conditionnelles
  const animClass = (delay) => isDynamic 
    ? `animate-fade-in animate-delay-${delay}` 
    : '';

  return (
    <div className="p-6">
      {/* Bannière EFFICIENCE */}
      <div className={`bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 mb-6 ${isDynamic ? 'animate-scale-in' : ''}`}>
        <h1 className="text-3xl font-bold text-white">
          EFFICIENCE <span className="text-blue-400">ANALYTICS</span>
        </h1>
        <p className="text-slate-400">Tableau de bord administrateur</p>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard 
          title="CA Facturé" 
          value={kpis.caFacture.toLocaleString('fr-FR') + ' €'}
          className={animClass(100)}
        />
        <KPICard 
          title="CA Encaissé" 
          value={kpis.caEncaisse.toLocaleString('fr-FR') + ' €'}
          className={animClass(200)}
        />
        <KPICard 
          title="Taux Encaissement" 
          value={kpis.tauxEncaissement + '%'}
          className={animClass(300)}
        />
        <KPICard 
          title="Score Santé" 
          value={healthScore.globalScore + '/100'}
          level={healthScore.level}
          className={animClass(400)}
        />
      </div>

      {/* Graphique évolution */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6">
        <h2>Évolution du CA</h2>
        <Line 
          data={{
            labels: evolution.labels,
            datasets: [
              { label: 'CA Facturé', data: evolution.caFacture },
              { label: 'CA Encaissé', data: evolution.caEncaisse },
              // Ligne de tendance IA
              generateTrendLineDataset(evolution.caFacture, 3).dataset
            ]
          }}
        />
      </div>
    </div>
  );
}
```

---

## Pages Praticien

### Dashboard Praticien

**Fichier** : `pages/practitioner/Dashboard.jsx`

```jsx
function PractitionerDashboard() {
  const { user } = useAuth();
  const { isDynamic } = useDynamic();
  const [data, setData] = useState(null);

  useEffect(() => {
    getPractitionerDashboard().then((res) => setData(res.data));
  }, []);

  // Génération d'insights IA simplifiés
  const caInsight = generateSimpleInsight(data?.evolution?.caFacture || [], 'CA Facturé');

  return (
    <div className="p-6">
      <h1 className={isDynamic ? 'animate-fade-in' : ''}>
        Bonjour, {user?.name} 👋
      </h1>
      
      {/* KPIs personnels */}
      <div className="grid grid-cols-3 gap-4">
        <KPICard title="Mon CA" value={data?.kpis?.caFacture} />
        <KPICard title="Patients" value={data?.kpis?.nbPatients} />
        <KPICard title="Rentabilité" value={data?.kpis?.rentabiliteHoraire + '€/h'} />
      </div>

      {/* Analyse IA */}
      <div className="mt-6 p-4 bg-purple-50 rounded-xl">
        <h3>🤖 Analyse IA</h3>
        <p>{caInsight.trendIcon} {caInsight.trendLabel}</p>
        {caInsight.parts.map((p, i) => <p key={i}>{p}</p>)}
      </div>
    </div>
  );
}
```

---

## Styles et Animations CSS

**Fichier** : `index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Animations entrée */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

/* Classes utilitaires */
.animate-fade-in { animation: fadeIn 0.5s ease-out; }
.animate-fade-in-up { animation: fadeInUp 0.5s ease-out; }
.animate-scale-in { animation: scaleIn 0.4s ease-out; }

/* Délais d'animation */
.animate-delay-100 { animation-delay: 100ms; }
.animate-delay-200 { animation-delay: 200ms; }
.animate-delay-300 { animation-delay: 300ms; }
.animate-delay-400 { animation-delay: 400ms; }

/* Effets hover */
.hover-lift {
  transition: transform 0.2s, box-shadow 0.2s;
}
.hover-lift:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
}

/* Effet brillance carte */
.card-shine {
  position: relative;
  overflow: hidden;
}
.card-shine::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    110deg,
    transparent 25%,
    rgba(255,255,255,0.1) 50%,
    transparent 75%
  );
  transform: translateX(-100%);
  transition: transform 0.6s;
}
.card-shine:hover::after {
  transform: translateX(100%);
}
```

---

## Graphiques (Chart.js)

**Configuration de base** :

```jsx
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);
```

**Exemple de graphique** :

```jsx
<Line
  data={{
    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
    datasets: [{
      label: 'CA Facturé',
      data: [15000, 18000, 17500, 21000, 23000, 22500],
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4,
    }]
  }}
  options={{
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Évolution CA' }
    }
  }}
/>
```

---

## Service API

**Fichier** : `services/api.js`

```jsx
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Intercepteur requêtes : ajoute le token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercepteur réponses : gère les erreurs 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Exports des fonctions API
export const login = (email, password) => api.post('/auth/login', { email, password });
export const getAdminDashboard = (params) => api.get('/admin/dashboard', { params });
export const getPractitionerDashboard = () => api.get('/practitioner/dashboard');
// ... autres exports
```

---

*Suivant : [07_AUTHENTIFICATION.md](./07_AUTHENTIFICATION.md)*
