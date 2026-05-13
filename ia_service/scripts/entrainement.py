import pandas as pd
import numpy as np
import os
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import LabelEncoder

# --- Configuration des chemins ---
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
PROCESSED_DATA_DIR = os.path.join(PROJECT_ROOT, "data", "processed")
MODELS_DIR = os.path.join(PROJECT_ROOT, "modeles_sauvegardes")

os.makedirs(MODELS_DIR, exist_ok=True)

def pipeline_entrainement_massif():
    print("DÉMARRAGE DU BATCH RETRAINING MAÎTRE...")

    # 1. Chargement des données
    chemin_csv = os.path.join(PROCESSED_DATA_DIR, "dataset_global_1an.csv")
    if not os.path.exists(chemin_csv):
        print(f" Erreur : Dataset introuvable -> {chemin_csv}")
        return

    df = pd.read_csv(chemin_csv)
    df['timestamp'] = pd.to_datetime(df['timestamp'])

    # 2. Encodage des stations
    print("Gestion de l'encodeur de stations...")
    le = LabelEncoder()
    df['station_encoded'] = le.fit_transform(df['station_id'])
    joblib.dump(le, os.path.join(MODELS_DIR, "label_encoder.pkl"))

    # --- CONFIGURATION DU BATCH ---
    horizons = [1, 6, 24] # Tes 3 horizons temporels en heures
    variables_cibles = ['temperature', 'humidite', 'pression', 'vent']

    features_base = [
        'station_encoded', 'temperature', 'humidite', 'pression', 'vent',
        'heure_sin', 'heure_cos', 'mois_sin', 'mois_cos',
        'temp_lag_1', 'temp_lag_2', 'temp_lag_3'
    ]

    total_modeles = len(horizons) * len(variables_cibles)
    compteur = 1

    # ==========================================
    # LA DOUBLE BOUCLE MAGIQUE (Horizons -> Variables)
    # ==========================================
    for horizon in horizons:
        print(f"\n{'='*60}")
        print(f" DÉBUT DU CYCLE POUR L'HORIZON : +{horizon} HEURES")
        print(f"{'='*60}")

        for variable in variables_cibles:
            print(f"\n[{compteur}/{total_modeles}] Entraînement {variable.upper()} à +{horizon}h...")
            compteur += 1

            df_model = df.copy()
            df_model = df_model.sort_values(by=['station_id', 'timestamp'])

            # Décalage dynamique selon l'horizon de la boucle
            col_cible = f"{variable}_cible_{horizon}h"
            df_model[col_cible] = df_model.groupby('station_id')[variable].shift(-horizon)
            df_model = df_model.dropna(subset=[col_cible])

            # Séparation chronologique
            df_model = df_model.sort_values(by='timestamp')
            X = df_model[features_base]
            y = df_model[col_cible]

            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, shuffle=False)

            # Entraînement
            modele = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
            modele.fit(X_train, y_train)

            # Évaluation
            predictions = modele.predict(X_test)
            mae = mean_absolute_error(y_test, predictions)
            rmse = np.sqrt(mean_squared_error(y_test, predictions))
            r2 = r2_score(y_test, predictions)

            print(f"   > MAE: {mae:.2f} | RMSE: {rmse:.2f} | R²: {r2:.2f}")

            # --- Logique MLOps : Batch Retraining Safeguard ---
            nom_modele = f"model_{variable}_{horizon}h.pkl"
            nom_meta = f"model_{variable}_{horizon}h_meta.pkl"

            chemin_modele = os.path.join(MODELS_DIR, nom_modele)
            chemin_meta = os.path.join(MODELS_DIR, nom_meta)

            deployer = True

            if os.path.exists(chemin_modele) and os.path.exists(chemin_meta):
                try:
                    ancien_meta = joblib.load(chemin_meta)
                    ancien_rmse = ancien_meta.get("rmse", float('inf'))

                    seuil_tolerance = ancien_rmse * 1.05
                    if rmse < seuil_tolerance:
                        print(f"   Validé (Nouveau RMSE {rmse:.2f} < Tolérance {seuil_tolerance:.2f})")
                    else:
                        print(f"   Refusé (Le modèle en prod est meilleur : RMSE {ancien_rmse:.2f})")
                        deployer = False
                except Exception:
                    pass # En cas de fichier corrompu, on écrase

            if deployer:
                joblib.dump(modele, chemin_modele)
                joblib.dump({
                    "variable": variable,
                    "horizon": horizon,
                    "rmse": rmse,
                    "mae": mae,
                    "r2": r2,
                    "date": pd.Timestamp.now().isoformat()
                }, chemin_meta)
                print(f"   Enregistré -> {nom_modele}")

    print("\n PIPELINE BATCH RETRAINING TERMINÉ !")

if __name__ == "__main__":
    pipeline_entrainement_massif()