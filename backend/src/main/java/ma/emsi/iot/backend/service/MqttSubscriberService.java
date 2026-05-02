package ma.emsi.iot.backend.service;


import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import ma.emsi.iot.backend.dto.WeatherPayload;
import org.eclipse.paho.client.mqttv3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;


@Service
public class MqttSubscriberService {

    @Value("${mqtt.broker.url}")
    private String brokerUrl;

    @Value("${mqtt.client.id}")
    private String clientId;

    @Value("${mqtt.topic}")
    private String topic;

    private final WeatherValidationService validationService;
    //private final MockStorageService mockStorageService;
    private final AlertEngineService alertEngineService;
    private final InfluxStorageService influxStorageService;
    private MqttClient client;

    public MqttSubscriberService(WeatherValidationService validationService,InfluxStorageService influxStorageService /*MockStorageService mockStorageService*/, AlertEngineService alertEngineService) {
        this.validationService = validationService;
        this.influxStorageService = influxStorageService;
        this.alertEngineService = alertEngineService;
    }

    @PostConstruct
    public void connect() {
        try {
            // 1. Initialisation du client
            client = new MqttClient(brokerUrl, clientId);
            MqttConnectOptions options = new MqttConnectOptions();
            options.setAutomaticReconnect(true);
            options.setCleanSession(true);

            // 2. Connexion
            client.connect(options);
            System.out.println("BACKEND CONNECTÉ AU BROKER : " + brokerUrl);

            // 3. Abonnement et écoute en temps réel
            /*client.subscribe(topic, (topicReçu, message) -> {
                String payload = new String(message.getPayload());
                System.out.println("-------------------------------------------------");
                System.out.println("NOUVEAU MESSAGE SUR LE TOPIC : " + topicReçu);
                System.out.println("JSON BRUT : " + payload);
            });*/

            // 3. Abonnement et écoute en temps réel
            ObjectMapper mapper = new ObjectMapper(); // Le traducteur JSON -> Java

            client.subscribe(topic, (topicReçu, message) -> {


                try {
                    // Désérialisation  ici !
                    String payload = new String(message.getPayload());
                    WeatherPayload weatherData = mapper.readValue(payload, WeatherPayload.class);

                    System.out.println("-------------------------------------------------");

                    if (validationService.isPayloadValid(weatherData)) {
                        System.out.println("🟢 [" + weatherData.getMetadata().getStation_id() + "] Validation réussie.");
                        influxStorageService.sauvegarder(weatherData); // On envoie en base
                        System.out.println("Station : " + weatherData.getMetadata().getStation_id());
                        System.out.println("Température extraite : " + weatherData.getSensors().getTemperature_c() + " °C");
                        System.out.println("Vitesse du vent : " + weatherData.getSensors().getWind_speed_kmh() + " km/h");
                        System.out.println("Pression : " + weatherData.getSensors().getPressure_hpa() + " hpa");
                        System.out.println("Luminosité : " + weatherData.getSensors().getLuminosity_lux() + " //");
                        System.out.println("Humidité : " + weatherData.getSensors().getHumidity_pct() + " %");

                        alertEngineService.analyser(weatherData);


                    } else {
                        // On ne fait RIEN, la donnée mauvaise est détruite.
                        System.out.println("🔴 Donnée ignorée.");
                    }


                } catch (Exception e) {
                    System.err.println(" Erreur de lecture du JSON : " + e.getMessage());
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
                client.disconnect(); // On se déconnecte du Broker
                client.close();      // On libère les ressources Paho MQTT
                System.out.println("Déconnexion MQTT propre réussie lors de l'arrêt du serveur.");
            }
        } catch (MqttException e) {
            System.err.println(" Erreur lors de la déconnexion MQTT : " + e.getMessage());
        }
    }
}