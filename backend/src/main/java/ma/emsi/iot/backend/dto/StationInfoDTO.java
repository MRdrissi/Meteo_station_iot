package ma.emsi.iot.backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StationInfoDTO {
    private String station_id;
    private String statut;
    private String derniere_maj;
}