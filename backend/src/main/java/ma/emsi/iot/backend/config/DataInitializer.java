package ma.emsi.iot.backend.config;

import ma.emsi.iot.backend.entity.Station;
import ma.emsi.iot.backend.entity.User;
import ma.emsi.iot.backend.repository.StationRepository;
import ma.emsi.iot.backend.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final StationRepository stationRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UserRepository userRepository,
                           StationRepository stationRepository,
                           PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.stationRepository = stationRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {

        // ══════════════════════════════════════
        // ADMIN initial
        // ══════════════════════════════════════
        if (!userRepository.existsByUsername("admin")) {
            User admin = new User();
            admin.setUsername("admin");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setEmail("admin@meteo.ma");
            admin.setRole(User.Role.ADMIN);
            userRepository.save(admin);
            System.out.println("Compte ADMIN créé (admin / admin123)");
        }

        // ══════════════════════════════════════
        // Stations initiales
        // ══════════════════════════════════════
        createStationIfNotExists("ST-CASABLANCA", "Casablanca", 33.57, -7.58);
        createStationIfNotExists("ST-RABAT",      "Rabat",      34.02, -6.84);
        createStationIfNotExists("ST-MARRAKECH",  "Marrakech",  31.63, -8.01);
        createStationIfNotExists("ST-TANGER",     "Tanger",     35.77, -5.81);
        createStationIfNotExists("ST-FES",        "Fès",        34.03, -5.00);
    }

    private void createStationIfNotExists(String stationId, String city, double lat, double lon) {
        if (stationRepository.findByStationId(stationId).isEmpty()) {
            Station station = new Station();
            station.setStationId(stationId);
            station.setCity(city);
            station.setLatitude(lat);
            station.setLongitude(lon);
            stationRepository.save(station);
            System.out.println("Station créée : " + stationId);
        }
    }
}