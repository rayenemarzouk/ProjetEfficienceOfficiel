import json
import os
from pathlib import Path
from datetime import datetime

import pandas as pd
import numpy as np
from pymongo import MongoClient
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import cross_val_score
from sklearn.metrics import mean_absolute_error, mean_squared_error
from joblib import dump

ROOT = Path(__file__).resolve().parent
BACKEND_ENV = ROOT / 'backend' / '.env'
PREDICTION_PATH = ROOT / 'backend' / 'python_ml_prediction.json'
MODEL_DIR = ROOT / 'backend'
MODEL_DIR.mkdir(parents=True, exist_ok=True)

FEATURE_COLUMNS = [
    'nbPatients',
    'montantEncaisse',
    'nbRdv',
    'nbNouveauxPatients',
    'nbHeures',
    'montantPropositions',
    'montantAccepte'
]
TARGET_COLUMN = 'montantFacture'

COLLECTION_KEYWORDS = {
    'realisations': ['analyse', 'realisation'],
    'rdvs': ['analyse', 'rendez'],
    'jours_ouverts': ['analyse', 'jours'],
    'devis': ['analyse', 'devis']
}


def load_mongodb_uri():
    uri = os.environ.get('MONGODB_URI')
    if uri:
        return uri
    if BACKEND_ENV.exists():
        for line in BACKEND_ENV.read_text().splitlines():
            line = line.strip()
            if line.startswith('MONGODB_URI='):
                return line.split('=', 1)[1].strip().strip('"').strip("'")
    raise EnvironmentError('MONGODB_URI introuvable. Ajoutez-le dans backend/.env ou définissez la variable d\'environnement.')


def locate_collection(db, keywords):
    collection_names = db.list_collection_names()
    for name in collection_names:
        name_lower = name.lower()
        if all(k in name_lower for k in keywords):
            return db[name]
    raise KeyError(f"Aucune collection trouvée pour les mots-clés : {keywords}. Collections disponibles : {collection_names}")


def load_data():
    uri = load_mongodb_uri()
    client = MongoClient(uri)
    db = client.get_default_database()
    if db is None:
        dbname = uri.split('/')[-1].split('?')[0]
        db = client[dbname]

    print('Collections disponibles :', db.list_collection_names())

    raw = {}
    for key, keywords in COLLECTION_KEYWORDS.items():
        col = locate_collection(db, keywords)
        raw[key] = pd.DataFrame(list(col.find({}, {'_id': 0})))
        print(f'- Chargé {len(raw[key])} documents pour {key} ({col.name})')

    return raw['realisations'], raw['rdvs'], raw['jours_ouverts'], raw['devis']


def build_dataset(realisations, rdvs, jours_ouverts, devis):
    df_real = realisations.copy()
    df_real['mois'] = df_real['mois'].astype(str)
    df_real['praticien'] = df_real['praticien'].astype(str)

    def normalize_df(df, cols):
        df = df.copy()
        df['mois'] = df['mois'].astype(str)
        df['praticien'] = df['praticien'].astype(str)
        return df[['praticien', 'mois'] + cols]

    df_rdv = normalize_df(rdvs, ['nbRdv', 'nbNouveauxPatients'])
    df_jours = normalize_df(jours_ouverts, ['nbHeures'])
    df_devis = normalize_df(devis, ['montantPropositions', 'montantAccepte'])

    df = df_real.merge(df_rdv, on=['praticien', 'mois'], how='left')
    df = df.merge(df_jours, on=['praticien', 'mois'], how='left')
    df = df.merge(df_devis, on=['praticien', 'mois'], how='left')

    for col in FEATURE_COLUMNS:
        if col not in df.columns:
            df[col] = np.nan
        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

    df[TARGET_COLUMN] = pd.to_numeric(df[TARGET_COLUMN], errors='coerce')
    df = df.dropna(subset=[TARGET_COLUMN]).reset_index(drop=True)
    return df


def train_models(df):
    X = df[FEATURE_COLUMNS].values
    y = df[TARGET_COLUMN].values

    model_lr = LinearRegression()
    model_lr.fit(X, y)
    score_lr = model_lr.score(X, y)
    preds_lr = model_lr.predict(X)

    model_rf = RandomForestRegressor(n_estimators=100, random_state=42)
    scores_rf = cross_val_score(model_rf, X, y, cv=min(5, len(X)), scoring='r2')
    model_rf.fit(X, y)
    preds_rf = model_rf.predict(X)

    metrics = {
        'n_samples': len(df),
        'r2_linear_regression': float(np.round(score_lr, 4)),
        'r2_random_forest_cv': [float(np.round(v, 4)) for v in scores_rf],
        'r2_random_forest_mean': float(np.round(np.mean(scores_rf), 4)),
        'mae_linear_regression': float(np.round(mean_absolute_error(y, preds_lr), 2)),
        'mse_linear_regression': float(np.round(mean_squared_error(y, preds_lr), 2)),
        'mae_random_forest': float(np.round(mean_absolute_error(y, preds_rf), 2)),
        'mse_random_forest': float(np.round(mean_squared_error(y, preds_rf), 2))
    }

    return model_lr, model_rf, preds_lr, preds_rf, metrics


def build_output(df, preds_lr, preds_rf, metrics, model_lr):
    predictions = []
    for _, row in df.iterrows():
        predictions.append({
            'praticien': row['praticien'],
            'mois': row['mois'],
            'actual': float(row[TARGET_COLUMN]),
            'predicted_linear': float(np.round(preds_lr[_], 2)),
            'predicted_random_forest': float(np.round(preds_rf[_], 2)),
            'delta_linear': float(np.round(preds_lr[_] - row[TARGET_COLUMN], 2))
        })

    summary = {
        'model': 'LinearRegression',
        'features': FEATURE_COLUMNS,
        'coefficients': dict(zip(FEATURE_COLUMNS, [float(np.round(c, 4)) for c in model_lr.coef_])),
        'intercept': float(np.round(model_lr.intercept_, 4)),
        'metrics': metrics,
        'generated_at': datetime.utcnow().isoformat() + 'Z',
        'sample_prediction': predictions[-1] if predictions else None
    }

    return {'summary': summary, 'predictions': predictions}


def save_output(output):
    with PREDICTION_PATH.open('w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)


def main():
    realisations, rdvs, jours_ouverts, devis = load_data()
    df = build_dataset(realisations, rdvs, jours_ouverts, devis)

    if df.empty:
        raise ValueError('Le dataset est vide après fusion des données. Vérifiez les collections MongoDB et les noms de champs.')

    print('Dataset final :', df.shape)
    print(df[[*FEATURE_COLUMNS, TARGET_COLUMN]].head())

    model_lr, model_rf, preds_lr, preds_rf, metrics = train_models(df)

    output = build_output(df, preds_lr, preds_rf, metrics, model_lr)
    save_output(output)

    dump(model_lr, MODEL_DIR / 'ml_model_linear_regression.joblib')
    dump(model_rf, MODEL_DIR / 'ml_model_random_forest.joblib')

    print('\nModèles entraînés avec succès et sauvegardés :')
    print('- ml_model_linear_regression.joblib')
    print('- ml_model_random_forest.joblib')
    print('- backend/python_ml_prediction.json')
    print('\nRésumé :')
    print(json.dumps(output['summary'], indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
