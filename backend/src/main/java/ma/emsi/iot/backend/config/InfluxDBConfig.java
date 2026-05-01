package ma.emsi.iot.backend.config;

import com.influxdb.client.InfluxDBClient;
import com.influxdb.client.InfluxDBClientFactory;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class InfluxDBConfig {

    @Value("${influxdb.url}")
    private String url;

    @Value("${influxdb.token}")
    private String token;

    @Value("${influxdb.org}")
    private String org;

    private InfluxDBClient client;

    @Bean
    public InfluxDBClient influxDBClient() {
        client = InfluxDBClientFactory.create(url, token.toCharArray());
        return client;
    }

    @PreDestroy
    public void close() {
        if (client != null) client.close();
    }
}