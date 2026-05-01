package ma.emsi.iot.backend.service;

import ma.emsi.iot.backend.dto.WeatherPayload;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class MockStorageService {
    //fake BDD
    private final List<WeatherPayload> BDD = new CopyOnWriteArrayList<>();

    public void sauvegarder(WeatherPayload payload) {
        BDD.add(payload);
        System.out.println("[MOCK DB] Donnée propre sauvegardée ! (Total : " + BDD.size() + " relevés)");
    }

    // Récupérer tout l'historique (pour tracer des graphiques)
    public List<WeatherPayload> getHistorique() {
        return BDD;
    }

    // Récupérer uniquement la dernière valeur (pour l'affichage en temps réel)
    public WeatherPayload getDernierReleve() {
        if (BDD.isEmpty()) {
            return null; // Pas encore de données
        }
        return BDD.get(BDD.size() - 1); // Retourne le dernier élément de la liste
    }
}