package ma.emsi.iot.backend.service.notification;



public interface AlertNotifier {
    void notifier(String stationId, String niveau, String message);
}