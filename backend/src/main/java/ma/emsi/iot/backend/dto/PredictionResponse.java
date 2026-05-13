package ma.emsi.iot.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PredictionResponse {

    private HorizonData previsions_1h;
    private HorizonData previsions_6h;
    private HorizonData previsions_24h;

    // Classe interne pour représenter un bloc de prédiction (Temp, Hum, Press, Vent)
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HorizonData {
        // ⚠️ Utilisation de 'Double' (Objet) obligatoire pour accepter les 'null' de FastAPI
        private Double temperature;
        private Double humidite;
        private Double pression;
        private Double vent;
    }
}