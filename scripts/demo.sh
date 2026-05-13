#!/usr/bin/env bash
set -Eeuo pipefail

# =====================================================================
# DEMO LAUNCHER — Projet Meteo_station_iot
# Lance : Docker, ngrok, IA, script Python stations, pio run, Wokwi CLI
# Ne lance PAS backend/frontend : tu les lances après, devant le prof.
# =====================================================================

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$PROJECT_DIR/.env.demo"

STATION_DIR="$PROJECT_DIR/station-clion"
MAIN_CPP="$STATION_DIR/src/main.cpp"

IA_DIR="$PROJECT_DIR/ia_service"
IA_START="$IA_DIR/start_ia.sh"

SIM_DIR="$PROJECT_DIR/config/simulateur"
SIM_SCRIPT="$SIM_DIR/station_virtuelle.py"

RUNTIME_DIR="$PROJECT_DIR/.demo"
LOG_DIR="$RUNTIME_DIR/logs"
PID_DIR="$RUNTIME_DIR/pids"
CURRENT_NGROK_FILE="$RUNTIME_DIR/ngrok_current.env"

NGROK_CONTAINER="iot-ngrok"
MQTT_CONTAINER="mon_broker_mqtt"

RUN_PYTHON_STATIONS="${RUN_PYTHON_STATIONS:-true}"
RUN_WOKWI_CLI="${RUN_WOKWI_CLI:-true}"
WOKWI_TIMEOUT_MS="${WOKWI_TIMEOUT_MS:-86400000}"

mkdir -p "$LOG_DIR" "$PID_DIR"

green() { echo -e "\033[1;32m[OK]\033[0m $*"; }
blue()  { echo -e "\033[1;34m[INFO]\033[0m $*"; }
warn()  { echo -e "\033[1;33m[ATTENTION]\033[0m $*"; }
red()   { echo -e "\033[1;31m[ERREUR]\033[0m $*" >&2; }

save_env_var() {
  local key="$1"
  local value="$2"

  touch "$ENV_FILE"

  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  else
    echo "${key}=${value}" >> "$ENV_FILE"
  fi
}

load_env() {
  if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE"
    set +a
  fi
}

ask_ngrok_token_once() {
  load_env

  if [ -z "${NGROK_AUTHTOKEN:-}" ]; then
    echo
    warn "Token ngrok introuvable."
    echo "Colle ton NGROK_AUTHTOKEN. Il sera sauvegardé dans : $ENV_FILE"
    read -rsp "NGROK_AUTHTOKEN: " token
    echo

    if [ -z "$token" ]; then
      red "Token ngrok vide."
      exit 1
    fi

    save_env_var "NGROK_AUTHTOKEN" "$token"
    export NGROK_AUTHTOKEN="$token"
    green "Token ngrok sauvegardé."
  fi
}

ask_wokwi_token_optional() {
  load_env

  if [ "$RUN_WOKWI_CLI" != "true" ]; then
    return
  fi

  if ! command -v wokwi-cli >/dev/null 2>&1; then
    warn "wokwi-cli introuvable. La simulation Wokwi automatique sera ignorée."
    warn "Tu peux quand même lancer la simulation depuis CLion après pio run."
    RUN_WOKWI_CLI=false
    return
  fi

  if [ -z "${WOKWI_CLI_TOKEN:-}" ]; then
    echo
    warn "WOKWI_CLI_TOKEN introuvable."
    echo "La CLI Wokwi demande un token. Appuie sur Entrée pour ignorer Wokwi CLI."
    read -rsp "WOKWI_CLI_TOKEN optionnel: " wokwi_token
    echo

    if [ -z "$wokwi_token" ]; then
      warn "Wokwi CLI ignoré. Tu lanceras Wokwi depuis CLion."
      RUN_WOKWI_CLI=false
      return
    fi

    save_env_var "WOKWI_CLI_TOKEN" "$wokwi_token"
    export WOKWI_CLI_TOKEN="$wokwi_token"
    green "Token Wokwi CLI sauvegardé."
  fi
}

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    red "Commande manquante : $cmd"
    exit 1
  fi
}

wait_tcp_port() {
  local host="$1"
  local port="$2"
  local name="$3"
  local timeout="${4:-60}"

  blue "Attente de $name sur $host:$port ..."

  for i in $(seq 1 "$timeout"); do
    if python3 - "$host" "$port" <<'PY' >/dev/null 2>&1
import socket, sys
host = sys.argv[1]
port = int(sys.argv[2])
s = socket.socket()
s.settimeout(1)
s.connect((host, port))
s.close()
PY
    then
      green "$name prêt."
      return 0
    fi
    sleep 1
  done

  red "$name n'est pas prêt après ${timeout}s."
  return 1
}

stop_pid_file() {
  local file="$1"
  local name="$2"

  if [ -f "$file" ]; then
    local pid
    pid="$(cat "$file" || true)"

    if [ -n "$pid" ] && kill -0 "$pid" >/dev/null 2>&1; then
      blue "Arrêt de $name PID=$pid ..."
      kill "$pid" >/dev/null 2>&1 || true
      sleep 2
      kill -9 "$pid" >/dev/null 2>&1 || true
    fi

    rm -f "$file"
  fi
}

stop_aux() {
  blue "Arrêt des processus auxiliaires..."

  stop_pid_file "$PID_DIR/ia.pid" "IA FastAPI"
  stop_pid_file "$PID_DIR/python_stations.pid" "script Python stations"
  stop_pid_file "$PID_DIR/wokwi.pid" "Wokwi CLI"
  stop_pid_file "$PID_DIR/mqtt_monitor.pid" "monitor MQTT"

  docker rm -f "$NGROK_CONTAINER" >/dev/null 2>&1 || true

  green "Processus auxiliaires arrêtés."
}

docker_up() {
  blue "Lancement des conteneurs Docker..."
  cd "$PROJECT_DIR"
  docker compose up -d mosquitto postgres influxdb

  wait_tcp_port "127.0.0.1" "1883" "Mosquitto" 60
  wait_tcp_port "127.0.0.1" "5432" "PostgreSQL" 60
  wait_tcp_port "127.0.0.1" "8086" "InfluxDB" 90
}

start_ngrok() {
  ask_ngrok_token_once

  blue "Nettoyage ancien conteneur ngrok..."
  docker rm -f "$NGROK_CONTAINER" >/dev/null 2>&1 || true

  blue "Lancement ngrok TCP -> localhost:1883 ..."
  docker run -d \
    --name "$NGROK_CONTAINER" \
    --network host \
    -e NGROK_AUTHTOKEN="$NGROK_AUTHTOKEN" \
    ngrok/ngrok:latest tcp 1883 --log stdout \
    > /dev/null

  blue "Attente de l'API locale ngrok : http://127.0.0.1:4040/api/tunnels ..."

  local public_url=""
  for i in $(seq 1 60); do
    public_url="$(python3 - <<'PY' 2>/dev/null || true
import json, urllib.request
try:
    with urllib.request.urlopen("http://127.0.0.1:4040/api/tunnels", timeout=2) as r:
        data = json.load(r)
    for t in data.get("tunnels", []):
        url = t.get("public_url", "")
        if url.startswith("tcp://"):
            print(url)
            break
except Exception:
    pass
PY
)"
    if [ -n "$public_url" ]; then
      break
    fi
    sleep 1
  done

  if [ -z "$public_url" ]; then
    red "Impossible de récupérer le tunnel ngrok."
    echo "Logs ngrok :"
    docker logs "$NGROK_CONTAINER" --tail=80 || true
    exit 1
  fi

  local clean="${public_url#tcp://}"
  local host="${clean%:*}"
  local port="${clean##*:}"

  echo "NGROK_PUBLIC_URL=$public_url" > "$CURRENT_NGROK_FILE"
  echo "NGROK_HOST=$host" >> "$CURRENT_NGROK_FILE"
  echo "NGROK_PORT=$port" >> "$CURRENT_NGROK_FILE"

  green "Tunnel ngrok : $public_url"
  green "Host MQTT Wokwi : $host"
  green "Port MQTT Wokwi : $port"
}

patch_station_clion() {
  source "$CURRENT_NGROK_FILE"

  if [ ! -f "$MAIN_CPP" ]; then
    red "main.cpp introuvable : $MAIN_CPP"
    exit 1
  fi

  blue "Mise à jour automatique de station-clion/src/main.cpp ..."
  python3 - "$MAIN_CPP" "$NGROK_HOST" "$NGROK_PORT" <<'PY'
import re
import sys
from pathlib import Path

path = Path(sys.argv[1])
host = sys.argv[2]
port = sys.argv[3]

txt = path.read_text(encoding="utf-8")

txt = re.sub(
    r'const\s+char\s*\*\s*mqtt_server\s*=\s*"[^"]*"\s*;',
    f'const char* mqtt_server = "{host}";',
    txt
)

txt = re.sub(
    r'const\s+int\s+mqtt_port\s*=\s*\d+\s*;',
    f'const int mqtt_port = {port};',
    txt
)

path.write_text(txt, encoding="utf-8")
PY

  green "main.cpp mis à jour avec $NGROK_HOST:$NGROK_PORT"
}

patch_python_station_topic() {
  if [ ! -f "$SIM_SCRIPT" ]; then
    warn "Script Python stations introuvable : $SIM_SCRIPT"
    return
  fi

  blue "Correction du topic MQTT dans station_virtuelle.py si nécessaire..."
  python3 - "$SIM_SCRIPT" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
txt = path.read_text(encoding="utf-8")

old = 'topic = f"emsi/pfa/marwane_mouad/weather/ST-CASABLANCA/data"'
new = 'topic = f"emsi/pfa/marwane_mouad/weather/{station_id}/data"'

if old in txt:
    txt = txt.replace(old, new)
    path.write_text(txt, encoding="utf-8")
    print("Topic corrigé vers {station_id}.")
else:
    print("Topic déjà dynamique ou ligne différente.")
PY
}

pio_build() {
  require_cmd pio

  blue "Compilation PlatformIO : pio run ..."
  cd "$STATION_DIR"
  pio run | tee "$LOG_DIR/pio.log"

  green "Firmware PlatformIO compilé."
}

start_ia() {
  if [ ! -f "$IA_START" ]; then
    red "Script IA introuvable : $IA_START"
    exit 1
  fi

  chmod +x "$IA_START"
  stop_pid_file "$PID_DIR/ia.pid" "IA FastAPI"

  blue "Lancement du microservice IA en arrière-plan..."
  nohup "$IA_START" > "$LOG_DIR/ia.log" 2>&1 &
  echo $! > "$PID_DIR/ia.pid"

  blue "Attente de FastAPI sur localhost:8000 ..."
  for i in $(seq 1 180); do
    if curl -fsS "http://127.0.0.1:8000/docs" >/dev/null 2>&1; then
      green "IA FastAPI prête : http://localhost:8000/docs"
      return
    fi
    sleep 1
  done

  warn "IA pas encore prête après 180s. Elle peut être en train d'extraire/entraîner les modèles."
  warn "Regarde : tail -f $LOG_DIR/ia.log"
}

start_python_stations() {
  if [ "$RUN_PYTHON_STATIONS" != "true" ]; then
    warn "Script Python stations désactivé."
    return
  fi

  if [ ! -f "$SIM_SCRIPT" ]; then
    warn "Script Python stations introuvable : $SIM_SCRIPT"
    return
  fi

  stop_pid_file "$PID_DIR/python_stations.pid" "script Python stations"

  blue "Préparation venv Python pour le simulateur stations..."
  if [ ! -x "$RUNTIME_DIR/venv/bin/python" ]; then
    python3 -m venv "$RUNTIME_DIR/venv"
  fi

  "$RUNTIME_DIR/venv/bin/pip" install --quiet --upgrade pip
  "$RUNTIME_DIR/venv/bin/pip" install --quiet paho-mqtt openmeteo-requests requests-cache pandas numpy

  blue "Lancement du script Python stations..."
  cd "$SIM_DIR"
  nohup "$RUNTIME_DIR/venv/bin/python" "$SIM_SCRIPT" > "$LOG_DIR/python_stations.log" 2>&1 &
  echo $! > "$PID_DIR/python_stations.pid"

  green "Script Python stations lancé."
}

start_mqtt_monitor() {
  stop_pid_file "$PID_DIR/mqtt_monitor.pid" "monitor MQTT"

  blue "Lancement d'un monitor MQTT dans les logs..."
  docker exec -i "$MQTT_CONTAINER" mosquitto_sub \
    -h localhost \
    -p 1883 \
    -u backend \
    -P backend123 \
    -t "emsi/pfa/marwane_mouad/weather/+/data" \
    -v \
    > "$LOG_DIR/mqtt_messages.log" 2>&1 &

  echo $! > "$PID_DIR/mqtt_monitor.pid"
  green "Monitor MQTT lancé : $LOG_DIR/mqtt_messages.log"
}

start_wokwi() {
  ask_wokwi_token_optional

  if [ "$RUN_WOKWI_CLI" != "true" ]; then
    warn "Wokwi CLI non lancé. Lance la simulation depuis CLion si tu veux le visuel."
    return
  fi

  stop_pid_file "$PID_DIR/wokwi.pid" "Wokwi CLI"

  blue "Lancement Wokwi CLI en arrière-plan..."
  cd "$PROJECT_DIR"

  nohup env WOKWI_CLI_TOKEN="$WOKWI_CLI_TOKEN" \
    wokwi-cli "$STATION_DIR" \
      --timeout "$WOKWI_TIMEOUT_MS" \
      --timeout-exit-code 0 \
      --serial-log-file "$LOG_DIR/wokwi_serial.log" \
    > "$LOG_DIR/wokwi.log" 2>&1 &

  echo $! > "$PID_DIR/wokwi.pid"

  green "Wokwi CLI lancé."
  green "Serial Wokwi : $LOG_DIR/wokwi_serial.log"
}

status() {
  echo "==================== STATUS DEMO ===================="
  echo "Projet : $PROJECT_DIR"
  echo

  echo "Docker :"
  docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "mon_broker_mqtt|meteo_postgres|meteo_influxdb|iot-ngrok" || true
  echo

  echo "Ports :"
  ss -ltnp 2>/dev/null | grep -E ":1883|:5432|:8086|:8000|:4040" || true
  echo

  if [ -f "$CURRENT_NGROK_FILE" ]; then
    echo "Ngrok courant :"
    cat "$CURRENT_NGROK_FILE"
    echo
  fi

  echo "PIDs :"
  for f in "$PID_DIR"/*.pid; do
    [ -e "$f" ] || continue
    name="$(basename "$f")"
    pid="$(cat "$f" || true)"
    if [ -n "$pid" ] && kill -0 "$pid" >/dev/null 2>&1; then
      echo "  $name -> actif PID=$pid"
    else
      echo "  $name -> arrêté"
    fi
  done

  echo
  echo "Logs : $LOG_DIR"
  echo "====================================================="
}

start_all() {
  require_cmd docker
  require_cmd python3
  require_cmd curl

  echo "====================================================="
  echo " DÉMARRAGE AUTOMATIQUE DE LA DÉMO IOT MÉTÉO"
  echo "====================================================="

  load_env

  docker_up
  start_ngrok
  patch_station_clion
  patch_python_station_topic
  pio_build
  start_ia
  start_python_stations
  start_mqtt_monitor
  start_wokwi

  echo
  green "Préparation terminée."
  echo
  echo "À lancer maintenant manuellement :"
  echo
  echo "Backend :"
  echo "  cd $PROJECT_DIR/backend"
  echo "  mvn spring-boot:run"
  echo
  echo "Frontend :"
  echo "  cd $PROJECT_DIR/frontend"
  echo "  npm run dev"
  echo
  echo "Vérification MQTT :"
  echo "  tail -f $LOG_DIR/mqtt_messages.log"
  echo
  echo "Logs IA :"
  echo "  tail -f $LOG_DIR/ia.log"
  echo
  echo "Logs Wokwi :"
  echo "  tail -f $LOG_DIR/wokwi_serial.log"
  echo
  status
}

case "${1:-start}" in
  start)
    start_all
    ;;
  stop)
    stop_aux
    ;;
  down)
    stop_aux
    blue "Arrêt des conteneurs Docker..."
    cd "$PROJECT_DIR"
    docker compose down
    green "Docker arrêté."
    ;;
  status)
    status
    ;;
  logs)
    echo "Logs disponibles dans : $LOG_DIR"
    ls -lh "$LOG_DIR"
    ;;
  *)
    echo "Usage : $0 {start|stop|down|status|logs}"
    exit 1
    ;;
esac
