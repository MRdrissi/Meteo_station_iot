package ma.emsi.iot.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PredictionRequest {
    private String station_id;
    private double temperature;
    private double humidite;
    private double pression;
    private double vent;
    private double temp_lag_1;
    private double temp_lag_2;
    private double temp_lag_3;
    private int heure;
    private int mois;
}