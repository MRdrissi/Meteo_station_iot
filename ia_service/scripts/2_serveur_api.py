from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import numpy as np
import pandas as pd
import os

app = FastAPI(
    title="Météo ML API",
    description="Microservice d'inférence pour prédire la météo à +1h"
)

# --- Configuration des chemins ---
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
MODELS_DIR = os.path.join(PROJECT_ROOT, "modeles_sauvegardes")

# Variables globales qui garderont les cerveaux en mémoire vive (RAM)
modeles = {}
label_encoder = None

# ==========================================
# 1. SCHÉMAS DES DONNÉES (DTOs)
# ==========================================

# Ce que Spring Boot envoie (Identique à ton schéma)
class PredictionRequest(BaseModel):
    station_id: str
    temperature: float
    humidite: float
    pression: float
    vent: float
    temp_lag_1: float
    temp_lag_2: float
    temp_lag_3: float
    heure: int
    mois: int

# Ce que FastAPI renvoie
class PredictionResponse(BaseModel):
    temperature_1h: float
    humidite_1h: float
    pression_1h: float
    vent_1h: float

# ==========================================
# 2. ÉVÉNEMENT DE DÉMARRAGE
# ==========================================
@app.on_event("startup")
def charger_modeles():
    global modeles, label_encoder
    print(" Démarrage du serveur API...")
    try:
        # Chargement du traducteur de texte
        label_encoder = joblib.load(os.path.join(MODELS_DIR, "label_encoder.pkl"))

        # Chargement des 4 modèles
        for var in ['temperature', 'humidite', 'pression', 'vent']:
            chemin = os.path.join(MODELS_DIR, f"model_{var}.pkl")
            modeles[var] = joblib.load(chemin)

        print(" Tous les modèles (.pkl) sont chargés en mémoire (RAM) et prêts !")
    except Exception as e:
        print(f" Erreur critique lors du chargement : {e}")

# ==========================================
# 3. LE ENDPOINT POST /predict
# ==========================================
@app.post("/predict", response_model=PredictionResponse)
def faire_prediction(request: PredictionRequest):
    if not label_encoder or not modeles:
        raise HTTPException(status_code=500, detail="Modèles non chargés.")

    try:
        # Étape A : Encodage de l'identifiant
        try:
            station_encoded = label_encoder.transform([request.station_id])[0]
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Station inconnue pour le ML : {request.station_id}")

        # Étape B : Calcul interne des features trigonométriques (Ton exigence !)
        heure_sin = np.sin(2 * np.pi * request.heure / 24)
        heure_cos = np.cos(2 * np.pi * request.heure / 24)
        mois_sin = np.sin(2 * np.pi * request.mois / 12)
        mois_cos = np.cos(2 * np.pi * request.mois / 12)

        # Étape C : Préparation de la ligne de données
        #  L'ordre doit être EXACTEMENT le même que dans 1_entrainement.py
        colonnes = [
            'station_encoded', 'temperature', 'humidite', 'pression', 'vent',
            'heure_sin', 'heure_cos', 'mois_sin', 'mois_cos',
            'temp_lag_1', 'temp_lag_2', 'temp_lag_3'
        ]

        valeurs = [[
            station_encoded, request.temperature, request.humidite,
            request.pression, request.vent, heure_sin, heure_cos,
            mois_sin, mois_cos, request.temp_lag_1, request.temp_lag_2,
            request.temp_lag_3
        ]]

        # On le met dans un DataFrame pour rassurer Scikit-Learn (évite les warnings)
        df_input = pd.DataFrame(valeurs, columns=colonnes)

        # Étape D : Les 4 prédictions
        temp_pred = modeles['temperature'].predict(df_input)[0]
        hum_pred = modeles['humidite'].predict(df_input)[0]
        pres_pred = modeles['pression'].predict(df_input)[0]
        vent_pred = modeles['vent'].predict(df_input)[0]

        # Étape E : Retour du JSON (arrondi à 2 décimales pour être propre)
        return PredictionResponse(
            temperature_1h=round(temp_pred, 2),
            humidite_1h=round(hum_pred, 2),
            pression_1h=round(pres_pred, 2),
            vent_1h=round(vent_pred, 2)
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur d'inférence : {str(e)}")