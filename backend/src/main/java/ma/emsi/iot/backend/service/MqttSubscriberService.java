package ma.emsi.iot.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import ma.emsi.iot.backend.dto.WeatherPayload;
import ma.emsi.iot.backend.repository.StationRepository;
import org.eclipse.paho.client.mqttv3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class MqttSubscriberService {

    @Value("${mqtt.broker.url}")
    private String brokerUrl;

    @Value("${mqtt.client.id}")
    private String clientId;

    @Value("${mqtt.topic}")
    private String topic;

    @Value("${mqtt.username}")
    private String username;

    @Value("${mqtt.password}")
    private String password;

    private final WeatherValidationService validationService;
    private final InfluxStorageService influxStorageService;
    private final AlertEngineService alertEngineService;
    private final IaPredictionService iaPredictionService;
    private final StationRepository stationRepository;

    private MqttClient client;

    public MqttSubscriberService(
            WeatherValidationService validationService,
            InfluxStorageService influxStorageService,
            AlertEngineService alertEngineService,
            IaPredictionService iaPredictionService,
            StationRepository stationRepository
    ) {
        this.validationService = validationService;
        this.influxStorageService = influxStorageService;
        this.alertEngineService = alertEngineService;
        this.iaPredictionService = iaPredictionService;
        this.stationRepository = stationRepository;
    }

    @PostConstruct
    public void connect() {
        try {
            client = new MqttClient(brokerUrl, clientId);

            MqttConnectOptions options = new MqttConnectOptions();
            options.setAutomaticReconnect(true);
            options.setCleanSession(true);

            // Authentification broker privé local
            options.setUserName(username);
            options.setPassword(password.toCharArray());

            client.connect(options);
            System.out.println("BACKEND CONNECTÉ AU BROKER PRIVÉ : " + brokerUrl);

            ObjectMapper mapper = new ObjectMapper();

            client.subscribe(topic, (topicRecu, message) -> {
                String payload = new String(message.getPayload());

                try {
                    WeatherPayload weatherData = mapper.readValue(payload, WeatherPayload.class);

                    if (!validationService.isPayloadValid(weatherData)) {
                        System.out.println("Donnée météo ignorée : payload invalide.");
                        return;
                    }

                    String stationId = weatherData.getMetadata().getStation_id();

                    // 1. Sauvegarde InfluxDB avec la convention du module météo p2
                    influxStorageService.sauvegarder(weatherData);

                    // 2. Appel IA FastAPI
                    iaPredictionService.fairePrediction(weatherData);

                    // 3. Analyse alertes
                    alertEngineService.analyser(weatherData);

                    // 4. Mise à jour PostgreSQL : dernière activité de la station
                    stationRepository.findByStationId(stationId).ifPresent(station -> {
                        station.setLastSeenAt(LocalDateTime.now());
                        stationRepository.save(station);
                    });

                    System.out.println("──────────────────────────────────────────────");
                    System.out.println("Station : " + stationId);
                    System.out.println("Température : " + weatherData.getSensors().getTemperature_c() + " °C");
                    System.out.println("Humidité : " + weatherData.getSensors().getHumidity_pct() + " %");
                    System.out.println("Pression : " + weatherData.getSensors().getPressure_hpa() + " hPa");
                    System.out.println("Vent : " + weatherData.getSensors().getWind_speed_kmh() + " km/h");
                    System.out.println("Luminosité : " + weatherData.getSensors().getLuminosity_lux() + " lux");
                    System.out.println("Sauvegardé dans InfluxDB / PostgreSQL");

                } catch (Exception e) {
                    System.err.println("Erreur traitement MQTT : " + e.getMessage());
                }
            });

        } catch (MqttException e) {
            System.err.println("Erreur MQTT : " + e.getMessage());
        }
    }

    @PreDestroy
    public void disconnect() {
        try {
            if (client != null && client.isConnected()) {
                client.disconnect();
                client.close();
                System.out.println("Déconnexion MQTT propre réussie.");
            }
        } catch (MqttException e) {
            System.err.println("Erreur lors de la déconnexion MQTT : " + e.getMessage());
        }
    }
}