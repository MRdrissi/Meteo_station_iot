package ma.emsi.iot.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class HistoriquePointDTO {
    private String timestamp;
    private double temperature;
    private double humidite;
    private double pression;
    private double vent;
}