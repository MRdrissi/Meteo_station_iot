package ma.emsi.iot.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MesuresDTO {
    private double temperature;
    private double humidite;
    private double pression;
    private double vent;
    private int    luminosite;
    private int    batterie;
}