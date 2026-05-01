package ma.emsi.iot.backend.service;

import ma.emsi.iot.backend.entity.Station;
import ma.emsi.iot.backend.repository.StationRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class StationService {

    private final StationRepository stationRepository;

    public StationService(StationRepository stationRepository) {
        this.stationRepository = stationRepository;
    }

    // ─── Lecture ───

    public List<Station> getAllStations() {
        return stationRepository.findAll();
    }

    public Station getStationById(Long id) {
        return stationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Station introuvable avec l'id : " + id));
    }

    public Station getStationByStationId(String stationId) {
        return stationRepository.findByStationId(stationId)
                .orElseThrow(() -> new IllegalArgumentException("Station introuvable : " + stationId));
    }

    // ─── Écriture (ADMIN) ───

    public Station createStation(Station station) {
        if (stationRepository.findByStationId(station.getStationId()).isPresent()) {
            throw new IllegalArgumentException("La station " + station.getStationId() + " existe déjà");
        }
        return stationRepository.save(station);
    }

    public Station updateStation(Long id, Station updated) {
        Station station = getStationById(id);
        station.setCity(updated.getCity());
        station.setLatitude(updated.getLatitude());
        station.setLongitude(updated.getLongitude());
        station.setStatus(updated.getStatus());
        return stationRepository.save(station);
    }

    public void deleteStation(Long id) {
        if (!stationRepository.existsById(id)) {
            throw new IllegalArgumentException("Station introuvable avec l'id : " + id);
        }
        stationRepository.deleteById(id);
    }
}