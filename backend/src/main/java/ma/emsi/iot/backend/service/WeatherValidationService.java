package ma.emsi.iot.backend.service;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import ma.emsi.iot.backend.dto.EtatPrecedent;
import ma.emsi.iot.backend.dto.WeatherPayload;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Data
@AllArgsConstructor

public class WeatherValidationService {

    final Map<String, EtatPrecedent> memoireStations = new ConcurrentHashMap<>();
    public boolean isPayloadValid(WeatherPayload payload) {



        // 1. Sécurité anti-crash (si un capteur envoie un JSON vide)
        if (payload == null || payload.getSensors() == null || payload.getMetadata() == null || payload.getSystem() == null) {
            System.err.println("REJET : Données corrompues / incomplètes.");
            return false;
        }


        double temp = payload.getSensors().getTemperature_c();
        double humidity = payload.getSensors().getHumidity_pct();
        double wind = payload.getSensors().getWind_speed_kmh();
        double pressure = payload.getSensors().getPressure_hpa();
        int luminosity = payload.getSensors().getLuminosity_lux();
        int battery = payload.getSystem().getBattery_pct();

        String stationId = payload.getMetadata().getStation_id();

        // 2. Filtre de Température (-20°C à 60°C)
        if (temp < -20.0 || temp > 60.0) {
            System.err.println("REJET [" + stationId + "] : Température impossible (" + temp + "°C)");
            return false;
        }

        // 3. Filtre d'Humidité (0% à 100%)
        if (humidity < 0.0 || humidity > 100.0) {
            System.err.println(" REJET [" + stationId + "] : Humidité impossible (" + humidity + "%)");
            return false;
        }

        // 4. Filtre de Vent (Pas de vent négatif)
        if (wind < 0.0) {
            System.err.println("REJET [" + stationId + "] : Vent négatif détecté (" + wind + " km/h)");
            return false;
        }

        // 5. Filtre de Pression Atmosphérique (800 à 1200 hPa)
        if (pressure < 800.0 || pressure > 1200.0) {
            System.err.println("REJET [" + stationId + "] : Pression aberrante (" + pressure + " hPa)");
            return false;
        }

        // 6. Filtre de Luminosité (>= 0 lux)
        if (luminosity < 0) {
            System.err.println("REJET [" + stationId + "] : Luminosité négative (" + luminosity + " lux)");
            return false;
        }

        // 7. Filtre de Batterie système (0% à 100%)
        if (battery < 0 || battery > 100) {
            System.err.println("REJET [" + stationId + "] : Niveau de batterie invalide (" + battery + " %)");
            return false;
        }

        //Level2
        if(memoireStations.containsKey(stationId)) {
            EtatPrecedent avant = memoireStations.get(stationId);

            // Limite 1 : Température (max 5°C de saut)
            if (Math.abs(temp - avant.getTemperature()) > 5.0) {
                System.err.println("REJET NIV 2 : Saut de température.");
                return false;
            }

            // Limite 2 : Pression (max 10 hPa de saut)
            if (Math.abs(pressure - avant.getPression()) > 10.0) {
                System.err.println("REJET NIV 2 : Chute de pression impossible.");
                return false;
            }

            // Limite 3 : Humidité (max 20% de saut)
            if (Math.abs(humidity - avant.getHumidite()) > 20.0) {
                System.err.println("REJET NIV 2 : Saut d'humidité suspect.");
                return false;
            }
        }



        memoireStations.put(stationId,new EtatPrecedent(temp,humidity,pressure));
        return true;
    }

}
