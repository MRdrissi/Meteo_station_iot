package ma.emsi.iot.backend.service;

import ma.emsi.iot.backend.dto.PredictionRequest;
import ma.emsi.iot.backend.dto.PredictionResponse;
import ma.emsi.iot.backend.dto.WeatherPayload;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;

@Service
public class IaPredictionService {

    private final InfluxStorageService influxService;
    private final RestTemplate restTemplate;

    @Value("${ia.api.url}")
    private String fastApiUrl;

    // Mapping MQTT IDs → ML IDs
    private static final Map<String, String> STATION_MAPPING = Map.of(
            "ST-CASABLANCA",  "STATION_CASA",
            "ST-RABAT",       "STATION_RABAT",
            "ST-MARRAKECH",   "STATION_MARRAKECH",
            "ST-TANGER",      "STATION_TANGER",
            "ST-FES",         "STATION_IFRAN"
    );

    //  Constructor injection
    public IaPredictionService(InfluxStorageService influxService, RestTemplate restTemplate) {
        this.influxService = influxService;
        this.restTemplate = restTemplate;
    }

    public PredictionResponse fairePrediction(WeatherPayload payload) {
        String stationId    = payload.getMetadata().getStation_id();
        double tempActuelle = payload.getSensors().getTemperature_c();

        // 1. Mapping station_id MQTT → station_id ML
        String stationMl = STATION_MAPPING.getOrDefault(stationId, stationId);

        // 2. Récupération des Lags depuis InfluxDB
        List<Double> historiques = influxService.getDernieresTemperatures(stationId, 3);

        // Cold Start : si pas encore assez de données en base
        double lag1 = historiques.size() > 0 ? historiques.get(0) : tempActuelle;
        double lag2 = historiques.size() > 1 ? historiques.get(1) : lag1;
        double lag3 = historiques.size() > 2 ? historiques.get(2) : lag2;

        // 3. Extraction heure et mois depuis le timestamp du capteur
        ZonedDateTime dateCapteur = Instant.parse(payload.getMetadata().getTimestamp())
                .atZone(ZoneId.of("Africa/Casablanca"));

        // 4. Construction de la requête FastAPI
        PredictionRequest request = PredictionRequest.builder()
                .station_id(stationMl)                          // ← ID mappé
                .temperature(tempActuelle)
                .humidite(payload.getSensors().getHumidity_pct())
                .pression(payload.getSensors().getPressure_hpa())
                .vent(payload.getSensors().getWind_speed_kmh())
                .temp_lag_1(lag1)
                .temp_lag_2(lag2)
                .temp_lag_3(lag3)
                .heure(dateCapteur.getHour())
                .mois(dateCapteur.getMonthValue())
                .build();

        // 5. Appel HTTP POST vers FastAPI
        try {
            // ATTENTION : On ajoute "/predict/all" à la fin de l'URL
            String endpoint = fastApiUrl + "/predict/all";

            PredictionResponse response = restTemplate.postForObject(
                    endpoint, request, PredictionResponse.class
            );

            // On vérifie que la réponse n'est pas nulle et on affiche un petit résumé
            if (response != null && response.getPrevisions_1h() != null) {
                System.out.println(" [IA] Prédictions reçues pour " + stationId + " :");
                System.out.println("   -> Dans 1h  : " + response.getPrevisions_1h().getTemperature() + "°C");
                System.out.println("   -> Dans 6h  : " + response.getPrevisions_6h().getTemperature() + "°C");
                System.out.println("   -> Dans 24h : " + response.getPrevisions_24h().getTemperature() + "°C");
            }

            return response;

        } catch (Exception e) {
            System.err.println("[IA] FastAPI indisponible ou erreur : " + e.getMessage());
            return null; // Spring Boot continue sans crasher
        }


    }
}