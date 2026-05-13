from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict
import joblib
import numpy as np
import pandas as pd
import os
from contextlib import asynccontextmanager

# --- Configuration des chemins ---
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
MODELS_DIR = os.path.join(PROJECT_ROOT, "modeles_sauvegardes")

# Variables globales (RAM)
modeles = {}
label_encoder = None

# ==========================================
# 1. RÈGLES MÉTIER : CONFIDENTIALITÉ / FIABILITÉ
# ==========================================
REGLES_FIABILITE = {
    1: ['temperature', 'humidite', 'pression', 'vent'],
    6: ['temperature', 'humidite', 'pression'],
    24: ['temperature', 'pression']
}

# ==========================================
# 2. LIFESPAN (Gestion moderne du démarrage)
# ==========================================
def charger_modeles():
    global modeles, label_encoder
    print("\n DÉMARRAGE DU SERVEUR API...")
    try:
        # Chargement de l'encodeur
        encodeur_path = os.path.join(MODELS_DIR, "label_encoder.pkl")
        if os.path.exists(encodeur_path):
            label_encoder = joblib.load(encodeur_path)
        else:
            print(f" Erreur : label_encoder.pkl introuvable dans {MODELS_DIR}")
            return

        # Chargement sélectif des modèles
        total_charges = 0
        for horizon, variables in REGLES_FIABILITE.items():
            modeles[horizon] = {}
            for var in variables:
                chemin = os.path.join(MODELS_DIR, f"model_{var}_{horizon}h.pkl")
                if os.path.exists(chemin):
                    modeles[horizon][var] = joblib.load(chemin)
                    total_charges += 1
                    print(f"   Chargé : {var} (+{horizon}h)")
                else:
                    print(f"   Introuvable : {chemin}")

        print(f"\n {total_charges} modèles fiables chargés sur 12 possibles.")
    except Exception as e:
        print(f" Erreur critique lors du chargement : {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ce code s'exécute au démarrage
    charger_modeles()
    yield
    # (Tu pourrais mettre ici du code de nettoyage pour l'extinction, ex: fermer des connexions BDD)
    print(" Arrêt du serveur API. Nettoyage...")

# Initialisation de l'application avec le lifespan
app = FastAPI(
    title="Météo ML API (Sélective)",
    description="Microservice d'inférence intelligent avec Health Check.",
    lifespan=lifespan
)

# ==========================================
# 3. SCHÉMAS DES DONNÉES (DTOs)
# ==========================================
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

class HorizonResponse(BaseModel):
    temperature: Optional[float] = None
    humidite: Optional[float] = None
    pression: Optional[float] = None
    vent: Optional[float] = None

class PredictionAllResponse(BaseModel):
    previsions_1h: HorizonResponse
    previsions_6h: HorizonResponse
    previsions_24h: HorizonResponse

# ==========================================
# 4. ENDPOINTS D'ADMINISTRATION / MONITORING
# ==========================================

@app.get("/health", tags=["Monitoring"])
def health_check():
    """Vérifie si le serveur est en vie et combien de modèles sont actifs."""
    total = sum(len(v) for v in modeles.values())
    status = "ok" if total > 0 else "degraded"
    return {
        "status": status,
        "modeles_charges": total,
        "encodeur_charge": label_encoder is not None
    }

@app.get("/modeles/info", tags=["Monitoring"])
def info_modeles():
    """Expose les métriques (RMSE, R²) des modèles actuellement en production."""
    infos = []
    # On parcourt les modèles actuellement en RAM
    for horizon, vars_dict in modeles.items():
        for var in vars_dict.keys():
            meta_path = os.path.join(MODELS_DIR, f"model_{var}_{horizon}h_meta.pkl")
            if os.path.exists(meta_path):
                meta_data = joblib.load(meta_path)
                infos.append(meta_data)
            else:
                infos.append({"variable": var, "horizon": horizon, "status": "Pas de metadata trouvée"})

    return {
        "regles_fiabilite": REGLES_FIABILITE,
        "modeles_actifs": infos
    }

# ==========================================
# 5. ENDPOINT D'INFÉRENCE : "ALL-IN-ONE"
# ==========================================
@app.post("/predict/all", response_model=PredictionAllResponse, tags=["Inférence"])
def faire_prediction_globale(request: PredictionRequest):
    if not label_encoder or not modeles:
        raise HTTPException(status_code=500, detail="L'API n'est pas prête (modèles non chargés).")

    try:
        try:
            station_encoded = label_encoder.transform([request.station_id])[0]
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Station inconnue : {request.station_id}")

        heure_sin = np.sin(2 * np.pi * request.heure / 24)
        heure_cos = np.cos(2 * np.pi * request.heure / 24)
        mois_sin = np.sin(2 * np.pi * request.mois / 12)
        mois_cos = np.cos(2 * np.pi * request.mois / 12)

        df_input = pd.DataFrame([[
            station_encoded, request.temperature, request.humidite,
            request.pression, request.vent, heure_sin, heure_cos,
            mois_sin, mois_cos, request.temp_lag_1, request.temp_lag_2,
            request.temp_lag_3
        ]], columns=[
            'station_encoded', 'temperature', 'humidite', 'pression', 'vent',
            'heure_sin', 'heure_cos', 'mois_sin', 'mois_cos',
            'temp_lag_1', 'temp_lag_2', 'temp_lag_3'
        ])

        reponse_finale = {}
        for horizon in [1, 6, 24]:
            resultats_horizon = {}
            for var in REGLES_FIABILITE.get(horizon, []):
                if var in modeles.get(horizon, {}):
                    pred = modeles[horizon][var].predict(df_input)[0]
                    resultats_horizon[var] = round(pred, 2)
            reponse_finale[f"previsions_{horizon}h"] = HorizonResponse(**resultats_horizon)

        return PredictionAllResponse(**reponse_finale)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur interne d'inférence : {str(e)}")