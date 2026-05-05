package ma.emsi.iot.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AlerteDTO {
    private String niveau;    // ROUGE / ORANGE / TEMPETE / MAINTENANCE
    private String message;
    private String timestamp;
}