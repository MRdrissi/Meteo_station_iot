package ma.emsi.iot.backend.service;

import ma.emsi.iot.backend.dto.WeatherPayload;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList; // <-- L'IMPORT IMPORTANT

@Service
public class MockStorageService {

    // Fake BDD (Thread-Safe !)
    private final List<WeatherPayload> BDD = new CopyOnWriteArrayList<>();

    public void sauvegarder(WeatherPayload payload) {
        BDD.add(payload);
        System.out.println("[MOCK DB] Donnée propre sauvegardée ! (Total : " + BDD.size() + " relevés)");
    }
}