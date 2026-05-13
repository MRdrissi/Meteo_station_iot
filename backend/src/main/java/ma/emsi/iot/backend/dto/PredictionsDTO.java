package ma.emsi.iot.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PredictionsDTO {
    private HorizonDTO previsions_1h;
    private HorizonDTO previsions_6h;
    private HorizonDTO previsions_24h;

    public PredictionsDTO(HorizonDTO previsions_1h, HorizonDTO previsions_6h, HorizonDTO previsions_24h) {
        this.previsions_1h = previsions_1h;
        this.previsions_6h = previsions_6h;
        this.previsions_24h = previsions_24h;
    }
}