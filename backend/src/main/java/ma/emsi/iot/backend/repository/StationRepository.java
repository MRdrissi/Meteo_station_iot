package ma.emsi.iot.backend.repository;

import ma.emsi.iot.backend.entity.Station;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface StationRepository extends JpaRepository<Station, Long> {
    Optional<Station> findByStationId(String stationId);
}