package ma.emsi.iot.backend.controller;

import ma.emsi.iot.backend.dto.DashboardResponse;
import ma.emsi.iot.backend.dto.WeatherPayload;
import ma.emsi.iot.backend.service.InfluxStorageService;
import ma.emsi.iot.backend.service.WeatherQueryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/meteo") // L'URL de base pour cette vitrine
public class WeatherController {

    private final InfluxStorageService influxStorageService;
    private final WeatherQueryService weatherQueryService;

    // Injection de la vraie base de données par constructeur
    public WeatherController(InfluxStorageService influxStorageService , WeatherQueryService weatherQueryService) {
        this.influxStorageService = influxStorageService;
        this.weatherQueryService = weatherQueryService;
    }

    // http://localhost:8080/api/meteo/historique
    @GetMapping("/historique")
    public ResponseEntity<List<WeatherPayload>> getHistorique() {
        // On récupère les 50 dernières données d'InfluxDB pour remplir les graphiques
        List<WeatherPayload> data = influxStorageService.getHistorique(20);
        return ResponseEntity.ok(data); // Retourne la liste avec un code HTTP 200 (OK)
    }

    // http://localhost:8080/api/meteo/actuel
    @GetMapping("/actuel")
    public ResponseEntity<WeatherPayload> getDernierReleve() {
        // On demande uniquement la toute dernière ligne enregistrée (limite = 1)
        List<WeatherPayload> data = influxStorageService.getHistorique(1);

        if (data == null || data.isEmpty()) {
            return ResponseEntity.noContent().build(); // Code HTTP 204 si la base est vide
        }

        return ResponseEntity.ok(data.get(0)); // On extrait le premier et unique élément de la liste
    }

    @GetMapping("/{stationId}/latest")
    public ResponseEntity<DashboardResponse> getDashboardData(@PathVariable String stationId) {

        // 1. On demande à l'orchestrateur de préparer le gros JSON
        DashboardResponse response = weatherQueryService.getDashboardData(stationId);

        // 2. Si la base est vide ou la station inconnue, on renvoie un statut 204 (No Content)
        if (response == null) {
            return ResponseEntity.noContent().build();
        }

        // 3. Sinon, on renvoie un statut 200 (OK) avec les données
        return ResponseEntity.ok(response);
    }
}