# API PHP Efficience Analytics

API pour connecter l'app Horizons (React) à la base MySQL Hostinger.

## Installation

1. Uploadez tout le contenu de ce dossier dans `public_html/api/` sur Hostinger
2. Modifiez `config.php` avec vos identifiants MySQL :
   - `$username` : Votre utilisateur MySQL
   - `$password` : Votre mot de passe MySQL

## Endpoints

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/health.php` | GET | Test de connexion |
| `/api/get-praticiens.php` | GET | Liste des praticiens |
| `/api/get-data.php?table=X` | GET | Données d'une table |
| `/api/get-dashboard.php` | GET | Dashboard complet |
| `/api/get-monthly-stats.php` | GET | Stats mensuelles |

## Paramètres

### get-data.php
- `table` (requis) : analyse_devis, analyse_jours_ouverts, analyse_realisation, analyse_rendezvous, encours
- `praticien` (optionnel) : JC, DV, ER, etc.
- `mois` (optionnel) : Format YYYYMMDD (ex: 20250101)
- `limit` (optionnel) : Nombre max de résultats

### get-dashboard.php
- `praticien` (optionnel) : Filtrer par praticien

### get-monthly-stats.php
- `praticien` (optionnel) : Filtrer par praticien
- `year` (optionnel) : Année (défaut: année en cours)

## Exemples

```bash
# Test de connexion
curl https://efficience-analytics-eu-783177.hostingersite.com/api/health.php

# Liste des praticiens
curl https://efficience-analytics-eu-783177.hostingersite.com/api/get-praticiens.php

# Données JC
curl https://efficience-analytics-eu-783177.hostingersite.com/api/get-dashboard.php?praticien=JC

# Stats 2025
curl https://efficience-analytics-eu-783177.hostingersite.com/api/get-monthly-stats.php?year=2025&praticien=JC
```

## Structure des tables MySQL

- `analyse_devis` : Praticien, Mois, Nb_devis, Montant_propositions, Nb_des_devis_acceptes, Montant_accepte
- `analyse_jours_ouverts` : Praticien, Mois, Nb_heures
- `analyse_realisation` : Praticien, Mois, Nb_patients, Montant_facture, Montant_encaisse
- `analyse_rendezvous` : Praticien, Mois, Nb_rdv, Duree_totale_rdv, Nb_patients, Nb_nouveaux_patients
- `encours` : Type, Valeur
