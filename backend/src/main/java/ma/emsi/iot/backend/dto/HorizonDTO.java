package ma.emsi.iot.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class HorizonDTO {
    private Double temperature;  // Double (pas double) → peut être null
    private Double humidite;
    private Double pression;
    private Double vent;

    public HorizonDTO(Double temperature, Double humidite, Double pression, Double vent) {
        this.temperature = temperature;
        this.humidite = humidite;
        this.pression = pression;
        this.vent = vent;
    }
}