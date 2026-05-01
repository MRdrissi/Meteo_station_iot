package ma.emsi.iot.backend.service;

import ma.emsi.iot.backend.dto.WeatherPayload;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class MockStorageService {
    //Fake BDD
    private final List<WeatherPayload> BDD = new ArrayList<>();

    public void sauvegarder(WeatherPayload payload) {
        BDD.add(payload);
        System.out.println("[MOCK DB] Donnée propre sauvegardée ! (Total : " + BDD.size() + " relevés)");
    }
}
