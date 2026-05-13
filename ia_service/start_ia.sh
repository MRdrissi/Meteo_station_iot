#!/usr/bin/env bash
set -euo pipefail

# ==========================================================
# Lancement automatique du microservice IA météo
# ==========================================================

IA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$IA_DIR/scripts"
MODELS_DIR="$IA_DIR/modeles_sauvegardes"
DATASET="$IA_DIR/data/processed/dataset_global_1an.csv"

echo "=================================================="
echo " DÉMARRAGE DU MICROSERVICE IA MÉTÉO"
echo "=================================================="

# 1. Utiliser le venv déjà actif si disponible
if [ -n "${VIRTUAL_ENV:-}" ] && [ -x "$VIRTUAL_ENV/bin/python" ]; then
    VENV_DIR="$VIRTUAL_ENV"
    echo "[OK] Environnement virtuel déjà actif : $VENV_DIR"

elif [ -x "$IA_DIR/.venv/bin/python" ]; then
    VENV_DIR="$IA_DIR/.venv"
    echo "[OK] Environnement virtuel trouvé : $VENV_DIR"

elif [ -x "$SCRIPTS_DIR/.venv/bin/python" ]; then
    VENV_DIR="$SCRIPTS_DIR/.venv"
    echo "[OK] Environnement virtuel trouvé : $VENV_DIR"

elif [ -x "$IA_DIR/../.venv/bin/python" ]; then
    VENV_DIR="$IA_DIR/../.venv"
    echo "[OK] Environnement virtuel trouvé : $VENV_DIR"

else
    VENV_DIR="$IA_DIR/.venv"
    echo "[INFO] Aucun environnement virtuel trouvé. Création dans : $VENV_DIR"
    python3 -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"

# 2. Vérifier les dépendances sans réinstaller à chaque fois
echo "[INFO] Vérification des dépendances Python..."

python3 - <<'PY' || {
import requests
import pandas
import numpy
import sklearn
import joblib
import fastapi
import uvicorn
import pydantic
PY
    echo "[INFO] Dépendances manquantes. Installation..."
    pip install --no-cache-dir requests pandas numpy scikit-learn joblib fastapi uvicorn pydantic
}

echo "[OK] Dépendances Python prêtes."

# 3. Vérifier le dataset
if [ ! -f "$DATASET" ]; then
    echo "[ATTENTION] Dataset introuvable : $DATASET"
    echo "[INFO] Lancement de l'extraction des données..."

    cd "$SCRIPTS_DIR"

    if [ -f "extraction_donnees.py" ]; then
        python3 extraction_donnees.py
    elif [ -f "0_extraction_donnees.py" ]; then
        python3 0_extraction_donnees.py
    else
        echo "[ERREUR] Aucun script d'extraction trouvé."
        exit 1
    fi
else
    echo "[OK] Dataset trouvé."
fi

# 4. Vérifier les modèles IA
if [ ! -f "$MODELS_DIR/label_encoder.pkl" ]; then
    echo "[ATTENTION] Modèles IA introuvables."
    echo "[INFO] Lancement de l'entraînement..."

    cd "$SCRIPTS_DIR"

    if [ -f "entrainement.py" ]; then
        python3 entrainement.py
    elif [ -f "1_entrainement.py" ]; then
        python3 1_entrainement.py
    else
        echo "[ERREUR] Aucun script d'entraînement trouvé."
        exit 1
    fi
else
    echo "[OK] Modèles IA déjà présents."
    echo "[INFO] Aucun ré-entraînement nécessaire."
fi

# 5. Lancer FastAPI
cd "$SCRIPTS_DIR"

if [ ! -f "inference_api.py" ]; then
    echo "[ERREUR] inference_api.py introuvable dans $SCRIPTS_DIR"
    exit 1
fi

echo "=================================================="
echo " LANCEMENT DE FASTAPI"
echo " API  : http://localhost:8000"
echo " DOCS : http://localhost:8000/docs"
echo "=================================================="

uvicorn inference_api:app --host 0.0.0.0 --port 8000