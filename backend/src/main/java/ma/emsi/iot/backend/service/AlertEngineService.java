package ma.emsi.iot.backend.service;

import ma.emsi.iot.backend.dto.AlerteDTO;
import ma.emsi.iot.backend.dto.MesuresDTO;
import ma.emsi.iot.backend.dto.WeatherPayload;
import ma.emsi.iot.backend.service.notification.AlertNotifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AlertEngineService {

    @Value("${alertes.seuil.vent-critique}")
    private double seuilVent;

    @Value("${alertes.seuil.temp-max}")
    private double seuilTempMax;

    @Value("${alertes.seuil.temp-min}")
    private double seuilTempMin;

    @Value("${alertes.seuil.batterie-faible}")
    private int seuilBatterie;

    private final Map<String, ArrayDeque<Double>> historiqueVent = new ConcurrentHashMap<>();
    private static final int TAILLE_FENETRE_VENT = 3;

    private final AlertNotifier notifier;

    public AlertEngineService(AlertNotifier notifier) {
        this.notifier = notifier;
    }

    // =========================================================================
    // 1. MÉTHODE POUR LE PIPELINE MQTT (Background / Asynchrone)
    // =========================================================================
    public void analyser(WeatherPayload payload) {
        String stationId = payload.getMetadata().getStation_id();
        double temp = payload.getSensors().getTemperature_c();
        double wind = payload.getSensors().getWind_speed_kmh();
        int battery = payload.getSystem().getBattery_pct();

        if (temp >= seuilTempMax) {
            notifier.notifier(stationId, "ALERTE ROUGE", "Canicule détectée (" + temp + " °C)");
        } else if (temp <= seuilTempMin) {
            notifier.notifier(stationId, "ALERTE ORANGE", "Risque de gel (" + temp + " °C)");
        }

        if (battery <= seuilBatterie) {
            notifier.notifier(stationId, "MAINTENANCE", "Batterie faible (" + battery + " %)");
        }

        ArrayDeque<Double> fenetre = historiqueVent.computeIfAbsent(stationId, k -> new ArrayDeque<>());
        synchronized (fenetre) {
            fenetre.addLast(wind);
            if (fenetre.size() > TAILLE_FENETRE_VENT) {
                fenetre.removeFirst();
            }
            if (fenetre.size() == TAILLE_FENETRE_VENT) {
                double moyenne = fenetre.stream()
                        .mapToDouble(Double::doubleValue)
                        .average()
                        .orElse(0.0);

                if (moyenne >= seuilVent) {
                    double moyenneArrondie = Math.round(moyenne * 100.0) / 100.0;
                    notifier.notifier(stationId, "ALERTE TEMPÊTE", "Vents violents soutenus (Moyenne: " + moyenneArrondie + " km/h)");
                    fenetre.clear();
                }
            }
        }
    }

    // =========================================================================
    // 2. MÉTHODE POUR L'API REST FRONTEND (Polling temps réel)
    // =========================================================================
    public List<AlerteDTO> verifierMesures(MesuresDTO mesures) {
        List<AlerteDTO> alertes = new ArrayList<>();
        String timestampActuel = Instant.now().toString();

        // Vérification Température
        if (mesures.getTemperature() >= seuilTempMax) {
            alertes.add(AlerteDTO.builder()
                    .niveau("CRITIQUE")
                    .message("Canicule détectée (" + mesures.getTemperature() + " °C)")
                    .timestamp(timestampActuel)
                    .build());
        } else if (mesures.getTemperature() <= seuilTempMin) {
            alertes.add(AlerteDTO.builder()
                    .niveau("ATTENTION")
                    .message("Risque de gel (" + mesures.getTemperature() + " °C)")
                    .timestamp(timestampActuel)
                    .build());
        }

        // Vérification Batterie
        if (mesures.getBatterie() <= seuilBatterie) {
            alertes.add(AlerteDTO.builder()
                    .niveau("MAINTENANCE")
                    .message("Batterie faible (" + mesures.getBatterie() + " %)")
                    .timestamp(timestampActuel)
                    .build());
        }

        // Vérification Vent (Instantanée pour le dashboard)
        if (mesures.getVent() >= seuilVent) {
            alertes.add(AlerteDTO.builder()
                    .niveau("CRITIQUE")
                    .message("Vent fort détecté (" + mesures.getVent() + " km/h)")
                    .timestamp(timestampActuel)
                    .build());
        }

        return alertes;
    }
}