package ma.emsi.iot.backend.service;

import ma.emsi.iot.backend.dto.WeatherPayload;
import ma.emsi.iot.backend.service.notification.AlertNotifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayDeque;
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

    // Utilisation de ArrayDeque (plus performant) au lieu de LinkedList
    private final Map<String, ArrayDeque<Double>> historiqueVent = new ConcurrentHashMap<>();
    private static final int TAILLE_FENETRE_VENT = 3;

    // Injection de l'interface (Découplage parfait !)
    private final AlertNotifier notifier;

    public AlertEngineService(AlertNotifier notifier) {
        this.notifier = notifier;
    }

    public void analyser(WeatherPayload payload) {
        String stationId = payload.getMetadata().getStation_id();
        double temp = payload.getSensors().getTemperature_c();
        double wind = payload.getSensors().getWind_speed_kmh();
        int battery = payload.getSystem().getBattery_pct();

        // 1. ALERTES IMMÉDIATES
        if (temp >= seuilTempMax) {
            notifier.notifier(stationId, "ALERTE ROUGE", "Canicule détectée (" + temp + " °C)");
        } else if (temp <= seuilTempMin) {
            notifier.notifier(stationId, "ALERTE ORANGE", "Risque de gel (" + temp + " °C)");
        }

        if (battery <= seuilBatterie) {
            notifier.notifier(stationId, "MAINTENANCE", "Batterie faible (" + battery + " %)");
        }

        // 2. ALERTES COMPLEXES (Avec Synchronisation et Streams)
        ArrayDeque<Double> fenetre = historiqueVent.computeIfAbsent(stationId, k -> new ArrayDeque<>());

        // BLOC SYNCHRONISÉ : Sécurité absolue contre les accès simultanés
        synchronized (fenetre) {
            fenetre.addLast(wind); // addLast est spécifique à Deque

            if (fenetre.size() > TAILLE_FENETRE_VENT) {
                fenetre.removeFirst();
            }

            if (fenetre.size() == TAILLE_FENETRE_VENT) {
                // Utilisation des Streams pour un code ultra propre
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
}