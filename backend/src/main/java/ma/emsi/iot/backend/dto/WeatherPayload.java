package ma.emsi.iot.backend.dto;

import lombok.Data;

@Data
public class WeatherPayload {
    private Metadata metadata;
    private Sensors sensors;
    private SystemData system;

    @Data
    public static class Metadata {
        private String station_id;
        private String timestamp;
        private String source;
        private String type;
    }

    @Data
    public static class Sensors {
        private double temperature_c;
        private double humidity_pct;
        private double pressure_hpa;
        private double wind_speed_kmh;
        private int luminosity_lux;
    }

    @Data
    public static class SystemData {
        private int battery_pct;
    }
}
