package ma.emsi.iot.backend.controller;

import ma.emsi.iot.backend.entity.Station;
import ma.emsi.iot.backend.service.StationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stations")
public class StationController {

    private final StationService stationService;

    public StationController(StationService stationService) {
        this.stationService = stationService;
    }

    // ─── GET → USER + ADMIN ───

    @GetMapping
    public List<Station> getAllStations() {
        return stationService.getAllStations();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Station> getStation(@PathVariable Long id) {
        return ResponseEntity.ok(stationService.getStationById(id));
    }

    // ─── POST / PUT / DELETE → ADMIN uniquement ───

    @PostMapping
    public ResponseEntity<Station> createStation(@RequestBody Station station) {
        return ResponseEntity.ok(stationService.createStation(station));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Station> updateStation(@PathVariable Long id, @RequestBody Station updated) {
        return ResponseEntity.ok(stationService.updateStation(id, updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteStation(@PathVariable Long id) {
        stationService.deleteStation(id);
        return ResponseEntity.noContent().build();
    }
}