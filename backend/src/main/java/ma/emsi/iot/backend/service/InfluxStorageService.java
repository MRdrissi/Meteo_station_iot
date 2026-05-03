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
import ma.emsi.iot.backend.dto.WeatherPayload;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

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
    WriteApiBlocking writeApi;

    @PostConstruct
    public void init() {
        // Initialisation du client InfluxDB au démarrage
        this.client = InfluxDBClientFactory.create(url, token.toCharArray(), org, bucket);
        this.writeApi = client.getWriteApiBlocking();
        System.out.println("CLIENT INFLUXDB CONNECTÉ");
    }

    public void sauvegarder(WeatherPayload payload) {

        // 2. On transforme l'objet Java en un "Point" InfluxDB
        // "mesure_meteo" est le nom de la table
        Point point = Point
                .measurement("mesure_meteo")
                .addTag("station_id", payload.getMetadata().getStation_id())// Tag = Index pour recherche rapide
                .addTag("source", payload.getMetadata().getType())
                .addTag("type" , payload.getMetadata().getType())
                .addField("temperature", payload.getSensors().getTemperature_c()) // Field = Donnée numérique
                .addField("humidite", payload.getSensors().getHumidity_pct())
                .addField("pression", payload.getSensors().getPressure_hpa())
                .addField("vent", payload.getSensors().getWind_speed_kmh())
                .addField("luminosite", payload.getSensors().getLuminosity_lux())
                .addField("batterie", payload.getSystem().getBattery_pct())
                //.time(Instant.now(), WritePrecision.NS); // On ajoute le timestamp précis ← heure du backend, pas du capteur
                .time(Instant.parse(payload.getMetadata().getTimestamp()), WritePrecision.NS);

        // 3. Envoi effectif à la base de données
        writeApi.writePoint(point);
        System.out.println("[INFLUXDB] Donnée persistée pour la station : " + payload.getMetadata().getStation_id());

    }

    public List<Double> getDernieresTemperatures(String stationId, int limite) {
        List<Double> temperatures = new ArrayList<>();

        // Requête FLUX : On remonte sur 24h, on filtre par station et par température, on trie du plus récent au plus ancien, et on limite.
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
            System.err.println("⚠️ Erreur lors de la lecture d'InfluxDB : " + e.getMessage());
        }

        return temperatures;
    }

    @PreDestroy
    public void close() {
        if (client != null) {
            client.close();
            System.out.println("Connexion InfluxDB fermée proprement.");
        }
    }
}