import paho.mqtt.client as mqtt
import json, time, math, random
from datetime import datetime, timezone
import openmeteo_requests
import requests_cache

# --- Config ---
BROKER = "localhost"          # <-- changé : broker privé local
PORT = 1883
SEND_INTERVAL = 15

# --- Authentification broker privé ---
MQTT_USERNAME = "simulateur"
MQTT_PASSWORD = "simu123"

cache_session = requests_cache.CachedSession('.cache', expire_after=3600)
openmeteo = openmeteo_requests.Client(session=cache_session)

#verif coordonnees  https://open-meteo.com/en/docs
REAL_STATIONS = {
    "ST-CASABLANCA":  {"lat": 33.57, "lon": -7.58},
    "ST-RABAT":        {"lat": 34.02, "lon": -6.84},
    "ST-MARRAKECH":    {"lat": 31.63, "lon": -8.01},
    "ST-TANGER":       {"lat": 35.77, "lon": -5.81},
    "ST-FES":          {"lat": 34.03, "lon": -5.00}
}

def estimate_luminosity(hour):
    value = max(0, math.sin(math.pi * hour / 24))
    return int(value * 100000)

def fetch_real_weather_data(lat, lon):
    # identique à avant, mais on enlève wind_gusts_10m pour coller à l'ESP32
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat, "longitude": lon,
        "current": ["temperature_2m", "relative_humidity_2m",
                    "surface_pressure", "wind_speed_10m"]
    }
    # La suite de votre fonction (try/except) doit être ici
    # Pour l'exemple, je retourne des données factices si la fonction n'est pas complète
    try:
        responses = openmeteo.weather_api(url, params=params)
        #response = requests.get(url, params=params) temps reel -> commenter cash-session = ...
        response = responses[0]
        current = response.Current()
        return {
            "temperature_c": round(current.Variables(0).Value(), 1),
            "humidity_pct": current.Variables(1).Value(),
            "pressure_hpa": round(current.Variables(2).Value(), 1),
            "wind_speed_kmh": round(current.Variables(3).Value(), 1),
        }
    except Exception as e:
        print(f"Erreur API Open-Meteo: {e}")
        return None


# MQTT — avec authentification
client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
client.connect(BROKER, PORT, 60)
client.loop_start()

while True:
    # Correction 2 : Utiliser la méthode recommandée pour obtenir l'heure UTC
    now = datetime.now(timezone.utc)
    hour_now = now.hour + now.minute / 60.0
    for station_id, coords in REAL_STATIONS.items():
        data = fetch_real_weather_data(coords["lat"], coords["lon"])
        if data:
            payload = {
                "metadata": {
                    "station_id": station_id,
                    # Correction 3 : Assurer le format d'horodatage "Z"
                    "timestamp": now.isoformat().replace('+00:00', 'Z'),
                    "source": "real-api",
                    "type": "real"
                },
                "sensors": {
                    **data,
                    "luminosity_lux": estimate_luminosity(hour_now)
                },
                "system": {"battery_pct": 99}
            }
            topic = f"emsi/pfa/marwane_mouad/weather/{station_id}/data"
            client.publish(topic, json.dumps(payload))
            print(f"[{station_id}] -> {payload['sensors']}")
    time.sleep(SEND_INTERVAL)