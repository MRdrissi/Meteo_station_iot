package ma.emsi.iot.backend.dto;

import lombok.Data;

@Data
public class PredictionResponse {
    private double temperature_1h;
    private double humidite_1h;
    private double pression_1h;
    private double vent_1h;
}