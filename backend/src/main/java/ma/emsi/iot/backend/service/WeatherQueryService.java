package ma.emsi.iot.backend.service;

import lombok.RequiredArgsConstructor;
import ma.emsi.iot.backend.dto.*;
import ma.emsi.iot.backend.service.AlertEngineService;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;


@Service
@RequiredArgsConstructor
public class WeatherQueryService {

    private final InfluxStorageService influxStorageService;
    private final IaPredictionService iaPredictionService;
    private final AlertEngineService alertEngineService;

    public DashboardResponse getDashboardData(String stationId) {

        // 1. LECTURE INFLUXDB
        Optional<LatestDataResponse> optActuel = influxStorageService.getDerniereMesure(stationId);
        if (optActuel.isEmpty()) {
            return null;
        }
        LatestDataResponse actuel = optActuel.get();

        // 2. APPEL FASTAPI (Avec les Mappers)
        PredictionsDTO predictions = null;
        try {
            // A. On convertit pour l'IA
            WeatherPayload payloadPourIA = convertToPayload(actuel);

            // B. On appelle l'IA (qui retourne un PredictionResponse)
            PredictionResponse reponseIA = iaPredictionService.fairePrediction(payloadPourIA);

            // C. On convertit pour le Frontend
            predictions = convertToPredictionsDTO(reponseIA);

        } catch (Exception e) {
            System.err.println(" [IA] Service FastAPI indisponible : " + e.getMessage());
        }

        // 3. MOTEUR D'ALERTES
        List<AlerteDTO> alertesActives = new ArrayList<>();
        try {
            alertesActives = alertEngineService.verifierMesures(actuel.getMesures());
        } catch (Exception e) {
            System.err.println("️ [ALERTES] Erreur du moteur de règles : " + e.getMessage());
        }

        // 4. ASSEMBLAGE FINAL
        return DashboardResponse.builder()
                .station_id(actuel.getStation_id())
                .timestamp(actuel.getTimestamp())
                .statut(actuel.getStatut())
                .mesures(actuel.getMesures())
                .predictions(predictions)
                .alertes(alertesActives)
                .build();
    }

    // =========================================================
    // MAPPERS (Méthodes utilitaires de conversion)
    // =========================================================

    /**
     * Frontend (LatestDataResponse) -> IA (WeatherPayload)
     */
    private WeatherPayload convertToPayload(LatestDataResponse actuel) {
        WeatherPayload payload = new WeatherPayload();

        WeatherPayload.Metadata metadata = new WeatherPayload.Metadata();
        metadata.setStation_id(actuel.getStation_id());
        metadata.setTimestamp(actuel.getTimestamp());
        payload.setMetadata(metadata);

        WeatherPayload.Sensors sensors = new WeatherPayload.Sensors();
        sensors.setTemperature_c(actuel.getMesures().getTemperature());
        sensors.setHumidity_pct(actuel.getMesures().getHumidite());
        sensors.setPressure_hpa(actuel.getMesures().getPression());
        sensors.setWind_speed_kmh(actuel.getMesures().getVent());
        sensors.setLuminosity_lux(actuel.getMesures().getLuminosite());
        payload.setSensors(sensors);

        WeatherPayload.SystemData systemData = new WeatherPayload.SystemData();
        systemData.setBattery_pct(actuel.getMesures().getBatterie());
        payload.setSystem(systemData);

        return payload;
    }

    /**
     * IA (PredictionResponse) -> Frontend (PredictionsDTO)
     */
    private PredictionsDTO convertToPredictionsDTO(PredictionResponse aiResponse) {
        if (aiResponse == null) return null;

        return new PredictionsDTO(
                convertHorizon(aiResponse.getPrevisions_1h()),
                convertHorizon(aiResponse.getPrevisions_6h()),
                convertHorizon(aiResponse.getPrevisions_24h())
        );
    }

    /**
     * IA (HorizonData) -> Frontend (HorizonDTO)
     */
    private HorizonDTO convertHorizon(PredictionResponse.HorizonData data) {
        if (data == null) return null;

        return new HorizonDTO(
                data.getTemperature(),
                data.getHumidite(),
                data.getPression(),
                data.getVent()
        );
    }
}