package ma.emsi.iot.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResponse {
    private String station_id;
    private String timestamp;
    private String statut;

    private MesuresDTO mesures;
    private PredictionsDTO predictions;
    private List<AlerteDTO> alertes; // ⚠️ Une liste pour gérer plusieurs alertes !
}