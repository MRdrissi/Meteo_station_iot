package ma.emsi.iot.backend.service;

import com.influxdb.client.InfluxDBClient;
import com.influxdb.client.WriteApiBlocking;
import com.influxdb.client.domain.WritePrecision;
import com.influxdb.client.write.Point;
import ma.emsi.iot.backend.dto.WeatherPayload;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class InfluxDBService {

    private final WriteApiBlocking writeApi;
    private final String bucket;
    private final String org;

    public InfluxDBService(
            InfluxDBClient influxDBClient,
            @Value("${influxdb.bucket}") String bucket,
            @Value("${influxdb.org}") String org) {
        this.writeApi = influxDBClient.getWriteApiBlocking();
        this.bucket = bucket;
        this.org = org;
    }

    public void saveWeatherData(WeatherPayload payload) {
        Point point = Point
                .measurement("weather")
                .addTag("station_id", payload.getMetadata().getStation_id())
                .addTag("source", payload.getMetadata().getSource())
                .addField("temperature_c", payload.getSensors().getTemperature_c())
                .addField("humidity_pct", payload.getSensors().getHumidity_pct())
                .addField("pressure_hpa", payload.getSensors().getPressure_hpa())
                .addField("wind_speed_kmh", payload.getSensors().getWind_speed_kmh())
                .addField("luminosity_lux", payload.getSensors().getLuminosity_lux())
                .addField("battery_pct", payload.getSystem().getBattery_pct())
                .time(Instant.parse(payload.getMetadata().getTimestamp()), WritePrecision.MS);

        writeApi.writePoint(bucket, org, point);
    }
}