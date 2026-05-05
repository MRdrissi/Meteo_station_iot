package ma.emsi.iot.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LatestDataResponse {
    private String       station_id;
    private String       timestamp;
    private String       statut;
    private MesuresDTO   mesures;
    private PredictionsDTO predictions;
    private AlerteDTO    alerte;      // peut être null
}