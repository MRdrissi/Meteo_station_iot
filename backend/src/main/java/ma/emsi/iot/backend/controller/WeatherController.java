package ma.emsi.iot.backend.controller;

import ma.emsi.iot.backend.dto.WeatherPayload;
import ma.emsi.iot.backend.service.MockStorageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/meteo") // L'URL de base pour cette vitrine
public class WeatherController {

    private final MockStorageService mockStorageService;

    // Injection de notre base de données (Mock)
    public WeatherController(MockStorageService mockStorageService) {
        this.mockStorageService = mockStorageService;
    }

    // http://localhost:8080/api/meteo/historique
    @GetMapping("/historique")
    public ResponseEntity<List<WeatherPayload>> getHistorique() {
        List<WeatherPayload> data = mockStorageService.getHistorique();
        return ResponseEntity.ok(data); // Retourne la liste avec un code HTTP 200 (OK)
    }

    // http://localhost:8080/api/meteo/actuel
    @GetMapping("/actuel")
    public ResponseEntity<WeatherPayload> getDernierReleve() {
        WeatherPayload dernier = mockStorageService.getDernierReleve();
        if (dernier == null) {
            return ResponseEntity.noContent().build(); // Code HTTP 204 si c'est vide
        }
        return ResponseEntity.ok(dernier);
    }
}