import requests
import pandas as pd
import time
import numpy as np
import os

# --- Configuration des chemins absolus (Architecture MLOps) ---
# __file__ pointe vers le script actuel (scripts/0_extraction_donnees.py)
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR) # On remonte à ia_service/

RAW_DATA_DIR = os.path.join(PROJECT_ROOT, "data", "raw")
PROCESSED_DATA_DIR = os.path.join(PROJECT_ROOT, "data", "processed")

# Création des dossiers s'ils n'existent pas encore
os.makedirs(RAW_DATA_DIR, exist_ok=True)
os.makedirs(PROCESSED_DATA_DIR, exist_ok=True)
# -------------------------------------------------------------

def get_with_retry(url, params, max_retries=3, delay=5):
    for attempt in range(1, max_retries + 1):
        try:
            reponse = requests.get(url, params=params, timeout=10)
            if reponse.status_code == 200:
                return reponse.json()
            elif reponse.status_code == 429:
                print(f"    Rate limit atteint (Essai {attempt}/{max_retries}). Pause de {delay}s...")
                time.sleep(delay)
            else:
                print(f"    Erreur API (Code {reponse.status_code}, Essai {attempt}/{max_retries})")
                time.sleep(delay)
        except requests.exceptions.RequestException as e:
            print(f"    Erreur réseau : {e} (Essai {attempt}/{max_retries}). Pause de {delay}s...")
            time.sleep(delay)
    return None

def telecharger_historique_multistations():
    print("Démarrage du téléchargement massif vers l'architecture structurée...")

    stations = {
        "STATION_RABAT": {"lat": 34.0209, "lon": -6.8416},
        "STATION_CASA": {"lat": 33.5731, "lon": -7.5898},
        "STATION_MARRAKECH": {"lat": 31.6295, "lon": -8.0361},
        "STATION_TANGER": {"lat": 35.7595, "lon": -5.8340},
        "STATION_IFRANE": {"lat": 33.5228, "lon": -5.1071}
    }

    url = "https://archive-api.open-meteo.com/v1/archive"
    liste_dataframes = []

    for station_id, coords in stations.items():
        print(f"\n Traitement de la station : {station_id}...")

        params = {
            "latitude": coords["lat"],
            "longitude": coords["lon"],
            "start_date": "2023-01-01",
            "end_date": "2023-12-31",
            "hourly": "temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m",
            "timezone": "Africa/Casablanca"
        }

        data = get_with_retry(url, params)

        if data:
            df_station = pd.DataFrame({
                "timestamp": data["hourly"]["time"],
                "station_id": station_id,
                "temperature": data["hourly"]["temperature_2m"],
                "humidite": data["hourly"]["relative_humidity_2m"],
                "pression": data["hourly"]["surface_pressure"],
                "vent": data["hourly"]["wind_speed_10m"]
            })

            # Feature Engineering
            df_station['timestamp'] = pd.to_datetime(df_station['timestamp'])
            df_station['heure'] = df_station['timestamp'].dt.hour
            df_station['mois'] = df_station['timestamp'].dt.month

            df_station['heure_sin'] = np.sin(2 * np.pi * df_station['heure'] / 24)
            df_station['heure_cos'] = np.cos(2 * np.pi * df_station['heure'] / 24)
            df_station['mois_sin'] = np.sin(2 * np.pi * df_station['mois'] / 12)
            df_station['mois_cos'] = np.cos(2 * np.pi * df_station['mois'] / 12)

            # Lags
            df_station = df_station.sort_values('timestamp')
            df_station['temp_lag_1'] = df_station['temperature'].shift(1)
            df_station['temp_lag_2'] = df_station['temperature'].shift(2)
            df_station['temp_lag_3'] = df_station['temperature'].shift(3)

            df_station = df_station.dropna()

            # Sauvegarde de la donnée BRUTE (Raw)
            nom_fichier_station = f"dataset_{station_id}_2023.csv"
            chemin_raw = os.path.join(RAW_DATA_DIR, nom_fichier_station)
            df_station.to_csv(chemin_raw, index=False)
            print(f"    💾 Brute sauvegardée dans : {chemin_raw}")

            liste_dataframes.append(df_station)
            time.sleep(1)
        else:
            print(f"     Échec définitif pour {station_id}.")

    if liste_dataframes:
        print("\n Fusion et création du Dataset Processed...")
        df_global = pd.concat(liste_dataframes, ignore_index=True)

        # Sauvegarde de la donnée FINALE (Processed)
        chemin_processed = os.path.join(PROCESSED_DATA_DIR, "dataset_global_1an.csv")
        df_global.to_csv(chemin_processed, index=False)

        print(f" SUCCÈS TOTAL ! {len(df_global)} lignes sauvegardées dans le dossier 'processed'.")

if __name__ == "__main__":
    telecharger_historique_multistations()