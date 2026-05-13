#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include <time.h>

#define DHTPIN 4
#define DHTTYPE DHT22
#define LDRPIN 34
#define POT_PRESS_PIN 35
#define POT_VENT_PIN 32

DHT dht(DHTPIN, DHTTYPE);

// Wokwi WiFi
const char* ssid = "Wokwi-GUEST";
const char* wifi_password = "";

//
const char* mqtt_server = "5.tcp.eu.ngrok.io";
const int mqtt_port = 19992;

// Compte Mosquitto de publication
const char* mqtt_user = "simulateur";
const char* mqtt_password = "simu123";

// Station connue par ton backend
const char* station_id = "ST-CASABLANCA";
const char* mqtt_topic = "emsi/pfa/marwane_mouad/weather/ST-CASABLANCA/data";

WiFiClient espClient;
PubSubClient client(espClient);

int battery_pct = 100;
unsigned long lastExecutionTime = 0;

void syncTime() {
  Serial.print("Synchronisation NTP");

  configTime(0, 0, "pool.ntp.org", "time.google.com", "time.nist.gov");

  struct tm timeinfo;
  int attempts = 0;

  while (!getLocalTime(&timeinfo) && attempts < 20) {
    Serial.print(".");
    delay(500);
    attempts++;
  }

  if (attempts >= 20) {
    Serial.println(" echec");
  } else {
    Serial.println(" OK");
  }
}

String getIsoTimestampUtc() {
  time_t now;
  time(&now);

  if (now < 1700000000) {
    return "";
  }

  struct tm timeinfo;
  gmtime_r(&now, &timeinfo);

  char buffer[25];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);

  return String(buffer);
}

void setup_wifi() {
  delay(10);

  Serial.println();
  Serial.println("Connexion au WiFi Wokwi-GUEST");

  WiFi.begin(ssid, wifi_password, 6);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi connecte");
  Serial.print("IP ESP32 simulee : ");
  Serial.println(WiFi.localIP());
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Connexion MQTT...");

    String clientId = "ESP32-Wokwi-";
    clientId += String(random(0xffff), HEX);

    if (client.connect(clientId.c_str(), mqtt_user, mqtt_password)) {
      Serial.println(" connecte au broker Mosquitto prive");
    } else {
      Serial.print(" echec, code = ");
      Serial.println(client.state());
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("--- Demarrage station meteo ESP32 simulee ---");

  dht.begin();

  setup_wifi();
  syncTime();

  client.setServer(mqtt_server, mqtt_port);
  client.setBufferSize(1024);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }

  client.loop();

  if (millis() - lastExecutionTime > 5000) {
    lastExecutionTime = millis();

    float temperature_c = dht.readTemperature();
    float humidity_pct = dht.readHumidity();

    if (isnan(temperature_c) || isnan(humidity_pct)) {
      Serial.println("Erreur lecture DHT22");
      return;
    }

    int ldr_raw = analogRead(LDRPIN);
    int pot_press_raw = analogRead(POT_PRESS_PIN);
    int pot_vent_raw = analogRead(POT_VENT_PIN);

    float luminosity_lux = map(ldr_raw, 0, 4095, 100000, 0);
    float pressure_hpa = 980.0 + ((float) pot_press_raw / 4095.0) * (1040.0 - 980.0);
    float wind_speed_kmh = ((float) pot_vent_raw / 4095.0) * 150.0;

    if (battery_pct > 0) {
      battery_pct -= 1;
    }

    String timestamp = getIsoTimestampUtc();

    if (timestamp == "") {
      Serial.println("Temps non synchronise, message ignore");
      syncTime();
      return;
    }

    JsonDocument doc;

    doc["metadata"]["station_id"] = station_id;
    doc["metadata"]["timestamp"] = timestamp;
    doc["metadata"]["source"] = "wokwi-clion";
    doc["metadata"]["type"] = "real";

    doc["sensors"]["temperature_c"] = temperature_c;
    doc["sensors"]["humidity_pct"] = humidity_pct;
    doc["sensors"]["pressure_hpa"] = pressure_hpa;
    doc["sensors"]["luminosity_lux"] = luminosity_lux;
    doc["sensors"]["wind_speed_kmh"] = wind_speed_kmh;

    doc["system"]["battery_pct"] = battery_pct;

    String payload;
    serializeJson(doc, payload);

    bool ok = client.publish(mqtt_topic, payload.c_str());

    if (ok) {
      Serial.println("Message MQTT publie :");
      Serial.println(payload);
    } else {
      Serial.println("Erreur publication MQTT");
    }
  }
}