package ma.emsi.iot.backend.service;

import com.influxdb.client.InfluxDBClient;
import com.influxdb.client.InfluxDBClientFactory;
import com.influxdb.client.WriteApiBlocking;
import com.influxdb.client.domain.WritePrecision;
import com.influxdb.client.write.Point;
import com.influxdb.query.FluxRecord;
import com.influxdb.query.FluxTable;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;

// Imports de tes DTOs
import ma.emsi.iot.backend.dto.LatestDataResponse;
import ma.emsi.iot.backend.dto.MesuresDTO;
import ma.emsi.iot.backend.dto.StationInfoDTO;
import ma.emsi.iot.backend.dto.WeatherPayload.Metadata;
import ma.emsi.iot.backend.dto.WeatherPayload.Sensors;
import ma.emsi.iot.backend.dto.WeatherPayload.SystemData; // ⚠️ Adapte ce nom selon la vraie classe de ton DTO (ex: SystemInfo)
import ma.emsi.iot.backend.dto.WeatherPayload;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class InfluxStorageService {

    @Value("${influxdb.url}")
    private String url;

    @Value("${influxdb.token}")
    private String token;

    @Value("${influxdb.org}")
    private String org;

    @Value("${influxdb.bucket}")
    private String bucket;

    private InfluxDBClient client;
    private WriteApiBlocking writeApi;

    @PostConstruct
    public void init() {
        // Initialisation du client InfluxDB au démarrage
        this.client = InfluxDBClientFactory.create(url, token.toCharArray(), org, bucket);
        this.writeApi = client.getWriteApiBlocking();
        System.out.println("✅ CLIENT INFLUXDB CONNECTÉ");
    }

    // =========================================================
    // 1. ÉCRITURE : Sauvegarder la donnée venant de MQTT
    // =========================================================
    public void sauvegarder(WeatherPayload payload) {
        Point point = Point
                .measurement("mesure_meteo")
                .addTag("station_id", payload.getMetadata().getStation_id())
                .addTag("source", payload.getMetadata().getType())
                .addTag("type" , payload.getMetadata().getType())
                .addField("temperature", payload.getSensors().getTemperature_c())
                .addField("humidite", payload.getSensors().getHumidity_pct())
                .addField("pression", payload.getSensors().getPressure_hpa())
                .addField("vent", payload.getSensors().getWind_speed_kmh())
                .addField("luminosite", payload.getSensors().getLuminosity_lux())
                .addField("batterie", payload.getSystem().getBattery_pct())
                .time(Instant.parse(payload.getMetadata().getTimestamp()), WritePrecision.NS);

        writeApi.writePoint(point);
        System.out.println("💾 [INFLUXDB] Donnée persistée pour la station : " + payload.getMetadata().getStation_id());
    }

    // =========================================================
    // 2. LECTURE (IA) : Récupérer uniquement les Lags
    // =========================================================
    public List<Double> getDernieresTemperatures(String stationId, int limite) {
        List<Double> temperatures = new ArrayList<>();

        String flux = String.format(
                "from(bucket: \"%s\") " +
                        "|> range(start: -24h) " +
                        "|> filter(fn: (r) => r[\"_measurement\"] == \"mesure_meteo\") " +
                        "|> filter(fn: (r) => r[\"station_id\"] == \"%s\") " +
                        "|> filter(fn: (r) => r[\"_field\"] == \"temperature\") " +
                        "|> sort(columns: [\"_time\"], desc: true) " +
                        "|> limit(n: %d)", bucket, stationId, limite);

        try {
            List<FluxTable> tables = client.getQueryApi().query(flux, org);
            for (FluxTable table : tables) {
                for (FluxRecord record : table.getRecords()) {
                    temperatures.add((Double) record.getValueByKey("_value"));
                }
            }
        } catch (Exception e) {
            System.err.println("️ Erreur lors de la lecture des lags InfluxDB : " + e.getMessage());
        }

        return temperatures;
    }

    public Optional<LatestDataResponse> getDerniereMesure(String stationId) {
        // SÉCURITÉ : Validation de l'ID (lettres, chiffres, tirets uniquement)
        if (stationId == null || !stationId.matches("^[a-zA-Z0-9_-]+$")) {
            System.err.println("⚠️ Tentative d'injection ou ID invalide : " + stationId);
            return Optional.empty();
        }

        // ⏱️ LOGIQUE : On cherche sur 24h au lieu de 1h au cas où le capteur a un retard
        String flux = String.format("""
        from(bucket: "%s")
            |> range(start: -24h)
            |> filter(fn: (r) => r["_measurement"] == "mesure_meteo")
            |> filter(fn: (r) => r["station_id"] == "%s")
            |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
            |> sort(columns: ["_time"], desc: true)
            |> limit(n: 1)
        """, bucket, stationId);

        try {
            List<FluxTable> tables = client.getQueryApi().query(flux, org);

            for (FluxTable table : tables) {
                for (FluxRecord record : table.getRecords()) {

                    MesuresDTO mesures = MesuresDTO.builder()
                            .temperature(getDouble(record, "temperature"))
                            .humidite(getDouble(record, "humidite"))
                            .pression(getDouble(record, "pression"))
                            .vent(getDouble(record, "vent"))
                            .luminosite(getInt(record, "luminosite"))
                            .batterie(getInt(record, "batterie"))
                            .build();

                    return Optional.of(LatestDataResponse.builder()
                            .station_id(stationId)
                            .timestamp(record.getTime().toString())
                            .statut("actif")
                            .mesures(mesures)
                            .build());
                }
            }
        } catch (Exception e) {
            System.err.println("⚠️ Erreur InfluxDB getDerniereMesure : " + e.getMessage());
        }

        return Optional.empty();
    }

    // =========================================================
    // 3. LECTURE (CONTROLLER) : Reconstruire l'historique complet
    // =========================================================
    public List<WeatherPayload> getHistorique(int limite) {
        List<WeatherPayload> historique = new ArrayList<>();

        // Utilisation de "pivot" pour remettre tous les champs sur une seule ligne
        String flux = String.format(
                "from(bucket: \"%s\") " +
                        "|> range(start: -24h) " +
                        "|> filter(fn: (r) => r[\"_measurement\"] == \"mesure_meteo\") " +
                        "|> pivot(rowKey:[\"_time\"], columnKey: [\"_field\"], valueColumn: \"_value\") " +
                        "|> sort(columns: [\"_time\"], desc: true) " +
                        "|> limit(n: %d)", bucket, limite);

        try {
            List<FluxTable> tables = client.getQueryApi().query(flux, org);

            for (FluxTable table : tables) {
                for (FluxRecord record : table.getRecords()) {

                    // 1. Reconstruction des Metadata
                    Metadata metadata = new Metadata();
                    metadata.setStation_id((String) record.getValueByKey("station_id"));
                    // On récupère le tag "source" ou "type" selon ton choix lors de l'enregistrement
                    metadata.setType((String) record.getValueByKey("source"));
                    metadata.setTimestamp(record.getTime() != null ? record.getTime().toString() : "");

                    // 2. Reconstruction des Sensors (SÉCURISÉE)
                    Sensors sensors = new Sensors();

                    Object tempObj = record.getValueByKey("temperature");
                    if (tempObj instanceof Number) sensors.setTemperature_c(((Number) tempObj).doubleValue());

                    Object humObj = record.getValueByKey("humidite");
                    if (humObj instanceof Number) sensors.setHumidity_pct(((Number) humObj).doubleValue());

                    Object presObj = record.getValueByKey("pression");
                    if (presObj instanceof Number) sensors.setPressure_hpa(((Number) presObj).doubleValue());

                    Object ventObj = record.getValueByKey("vent");
                    if (ventObj instanceof Number) sensors.setWind_speed_kmh(((Number) ventObj).doubleValue());

                    // Utilisation de .intValue() pour la luminosité
                    Object lumObj = record.getValueByKey("luminosite");
                    if (lumObj instanceof Number) sensors.setLuminosity_lux(((Number) lumObj).intValue());

                    // 3. Reconstruction du System Data (SÉCURISÉE)
                    SystemData systemData = new SystemData();
                    Object batObj = record.getValueByKey("batterie");
                    // Utilisation de .intValue() pour la batterie
                    if (batObj instanceof Number) systemData.setBattery_pct(((Number) batObj).intValue());

                    // 4. Assemblage final
                    WeatherPayload payload = new WeatherPayload();
                    payload.setMetadata(metadata);
                    payload.setSensors(sensors);
                    payload.setSystem(systemData);

                    historique.add(payload);
                }
            }
        } catch (Exception e) {
            System.err.println("⚠️ Erreur lors de la lecture de l'historique InfluxDB : " + e.getMessage());
            e.printStackTrace(); // Utile pour voir la ligne exacte en cas d'autre type de crash
        }

        return historique;
    }

    public List<StationInfoDTO> getStationsActives() {
        List<StationInfoDTO> stations = new ArrayList<>();

        String flux = String.format("""
        from(bucket: "%s")
            |> range(start: -24h)
            |> filter(fn: (r) => r["_measurement"] == "mesure_meteo")
            |> filter(fn: (r) => r["_field"] == "temperature")
            |> group(columns: ["station_id"])
            |> last()
        """, bucket);

        try {
            List<FluxTable> tables = client.getQueryApi().query(flux, org);

            for (FluxTable table : tables) {
                for (FluxRecord record : table.getRecords()) {
                    String stationId = (String) record.getValueByKey("station_id");
                    stations.add(StationInfoDTO.builder()
                            .station_id(stationId)
                            .statut("actif")
                            .derniere_maj(record.getTime().toString())
                            .build());
                }
            }
        } catch (Exception e) {
            System.err.println("⚠️ Erreur InfluxDB getStationsActives : " + e.getMessage());
        }

        return stations;
    }

    // Évite les NullPointerException lors de la lecture des records
    private double getDouble(FluxRecord record, String field) {
        Object value = record.getValueByKey(field);
        return value != null ? ((Number) value).doubleValue() : 0.0;
    }

    private int getInt(FluxRecord record, String field) {
        Object value = record.getValueByKey(field);
        return value != null ? ((Number) value).intValue() : 0;
    }

    // =========================================================
    // 4. NETTOYAGE : Fermeture propre de la base
    // =========================================================
    @PreDestroy
    public void close() {
        if (client != null) {
            client.close();
            System.out.println("🔌 Connexion InfluxDB fermée proprement.");
        }
    }
}