package ma.emsi.iot.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity @Table(name = "stations")
@Data @NoArgsConstructor
public class Station {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String stationId;       // ex: "ST-CASABLANCA"

    private String city;            // ex: "Casablanca"
    private double latitude;
    private double longitude;

    @Column(nullable = false)
    private String status = "ACTIVE";   // ACTIVE, INACTIVE, MAINTENANCE

    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime lastSeenAt;
}