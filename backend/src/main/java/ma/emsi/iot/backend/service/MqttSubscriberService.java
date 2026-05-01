package ma.emsi.iot.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
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

    private final InfluxDBService influxDBService;
    private final StationRepository stationRepository;

    public MqttSubscriberService(InfluxDBService influxDBService,
                                 StationRepository stationRepository) {
        this.influxDBService = influxDBService;
        this.stationRepository = stationRepository;
    }

    @PostConstruct
    public void connect() {
        try {
            MqttClient client = new MqttClient(brokerUrl, clientId);
            MqttConnectOptions options = new MqttConnectOptions();
            options.setAutomaticReconnect(true);
            options.setCleanSession(true);

            // ─── Authentification broker privé ───
            options.setUserName(username);
            options.setPassword(password.toCharArray());

            client.connect(options);
            System.out.println("BACKEND CONNECTÉ AU BROKER PRIVÉ : " + brokerUrl);

            ObjectMapper mapper = new ObjectMapper();

            client.subscribe(topic, (topicReçu, message) -> {
                String payload = new String(message.getPayload());

                try {
                    WeatherPayload weatherData = mapper.readValue(payload, WeatherPayload.class);
                    String stationId = weatherData.getMetadata().getStation_id();

                    // 1. Écrire dans InfluxDB (données temps réel)
                    influxDBService.saveWeatherData(weatherData);

                    // 2. Mettre à jour lastSeenAt dans PostgreSQL
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
                    System.err.println("❌ Erreur traitement : " + e.getMessage());
                }
            });

        } catch (MqttException e) {
            System.err.println("Erreur MQTT : " + e.getMessage());
        }
    }
}