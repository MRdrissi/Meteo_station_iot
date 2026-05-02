import pandas as pd
import numpy as np
import os
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import LabelEncoder

# --- Configuration des chemins relatifs (Architecture MLOps) ---
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
PROCESSED_DATA_DIR = os.path.join(PROJECT_ROOT, "data", "processed")
MODELS_DIR = os.path.join(PROJECT_ROOT, "modeles_sauvegardes")

# S'assurer que le dossier de sauvegarde existe
os.makedirs(MODELS_DIR, exist_ok=True)

def entrainer_modeles_meteo():
    print(" Démarrage du pipeline d'entraînement massif (4 Modèles)...")

    # 1. Chargement des données
    chemin_csv = os.path.join(PROCESSED_DATA_DIR, "dataset_global_1an.csv")
    if not os.path.exists(chemin_csv):
        print(f" Erreur : Fichier processed introuvable -> {chemin_csv}")
        return

    print(" Chargement du dataset global...")
    df = pd.read_csv(chemin_csv)

    # Conversion du timestamp (au cas où il ait été perdu à la sauvegarde)
    df['timestamp'] = pd.to_datetime(df['timestamp'])

    # 2. Encodage des stations (Texte -> Nombres)
    print("🏷️ Encodage des identifiants de stations...")
    le = LabelEncoder()
    df['station_encoded'] = le.fit_transform(df['station_id'])

    # On sauvegarde ce dictionnaire de traduction pour FastAPI !
    joblib.dump(le, os.path.join(MODELS_DIR, "label_encoder.pkl"))

    # Les variables que nous voulons prédire
    variables_cibles = ['temperature', 'humidite', 'pression', 'vent']

    # Features communes (Les "indices" pour deviner le futur)
    # Remarque : On inclut les lags de la température comme indicateur général du climat
    features_base = [
        'station_encoded', 'temperature', 'humidite', 'pression', 'vent',
        'heure_sin', 'heure_cos', 'mois_sin', 'mois_cos',
        'temp_lag_1', 'temp_lag_2', 'temp_lag_3'
    ]

    # --- Boucle sur chaque variable cible ---
    for variable in variables_cibles:
        print(f"\n{'='*50}")
        print(f" ENTRAÎNEMENT DU MODÈLE : {variable.upper()}")
        print(f"{'='*50}")

        # Copie fraîche du dataframe pour ne pas perturber la boucle
        df_model = df.copy()

        # 3. Création de la Cible (Target) : Variable dans 1h
        df_model = df_model.sort_values(by=['station_id', 'timestamp'])
        col_cible = f"{variable}_cible_1h"
        df_model[col_cible] = df_model.groupby('station_id')[variable].shift(-1)

        # On supprime les dernières lignes de chaque station
        df_model = df_model.dropna(subset=[col_cible])

        # 4. Séparation des Features et Target
        df_model = df_model.sort_values(by='timestamp') # Respect chronologique
        X = df_model[features_base]
        y = df_model[col_cible]

        # 80% pour apprendre, 20% pour l'examen
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, shuffle=False)

        # 5. Entraînement de l'algorithme
        print(f" Apprentissage sur {len(X_train)} lignes...")
        modele = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
        modele.fit(X_train, y_train)

        # 6. Évaluation
        print(" Évaluation des performances...")
        predictions = modele.predict(X_test)

        mae = mean_absolute_error(y_test, predictions)
        rmse = np.sqrt(mean_squared_error(y_test, predictions))
        r2 = r2_score(y_test, predictions)

        # Formatage des unités pour l'affichage
        unites = {'temperature': '°C', 'humidite': '%', 'pression': 'hPa', 'vent': 'km/h'}
        unite = unites.get(variable, '')

        print(f"\n RÉSULTATS POUR {variable.upper()} :")
        print(f" - MAE : {mae:.2f} {unite}")
        print(f" - RMSE : {rmse:.2f} {unite}")

        # Validation du R2
        r2_status = "Bon" if r2 > 0.85 else "⚠️ À améliorer"
        print(f" - R² : {r2:.2f} [{r2_status}]")

        # 7. Stratégie de Déploiement (Batch Retraining Logic)
        chemin_modele = os.path.join(MODELS_DIR, f"model_{variable}.pkl")
        chemin_meta = os.path.join(MODELS_DIR, f"model_{variable}_meta.pkl")

        deployer_nouveau_modele = True

        # Vérification si un modèle existe déjà
        if os.path.exists(chemin_modele) and os.path.exists(chemin_meta):
            try:
                ancien_meta = joblib.load(chemin_meta)
                ancien_rmse = ancien_meta.get("rmse", float('inf'))

                print(f"\n Comparaison : Nouveau RMSE ({rmse:.2f}) vs Ancien RMSE ({ancien_rmse:.2f})")

                # Tolérance de 5% : Le nouveau modèle doit faire au moins 5% mieux ou pareil
                seuil_tolerance = ancien_rmse * 1.05

                if rmse < seuil_tolerance:
                    print(f" Nouveau modèle validé ! (RMSE < {seuil_tolerance:.2f})")
                else:
                    print(" Refus du nouveau modèle (Moins performant que l'existant avec tolérance).")
                    deployer_nouveau_modele = False
            except Exception as e:
                print(f" Impossible de lire l'ancien fichier _meta.pkl : {e}. Forçage du déploiement.")

        if deployer_nouveau_modele:
            # Sauvegarde du modèle
            joblib.dump(modele, chemin_modele)

            # Sauvegarde des métadonnées
            meta_data = {
                "variable": variable,
                "rmse": rmse,
                "mae": mae,
                "r2": r2,
                "date_entrainement": pd.Timestamp.now().isoformat()
            }
            joblib.dump(meta_data, chemin_meta)
            print(f" Sauvegarde réussie -> {chemin_modele}")
            print(f" Métadonnées sauvées -> {chemin_meta}")
        else:
            print(" Ancien modèle conservé.")

    print("\n PIPELINE TERMINÉ AVEC SUCCÈS !")

if __name__ == "__main__":
    entrainer_modeles_meteo()