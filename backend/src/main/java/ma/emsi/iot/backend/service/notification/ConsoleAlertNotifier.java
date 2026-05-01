package ma.emsi.iot.backend.service.notification;

import org.springframework.stereotype.Service;

@Service
public class ConsoleAlertNotifier implements AlertNotifier {
    @Override
    public void notifier(String stationId, String niveau, String message) {
        // Selon le niveau, on peut changer l'affichage
        System.err.println("[" + niveau + "] STATION " + stationId + " : " + message);
    }
}