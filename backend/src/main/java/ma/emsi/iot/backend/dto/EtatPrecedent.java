package ma.emsi.iot.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class EtatPrecedent {
    double temperature;
    double humidite;
    double pression;
}
