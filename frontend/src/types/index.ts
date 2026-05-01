export interface User {
    id: number;
    username: string;
    email: string;
    role: "USER" | "ADMIN";
    enabled: boolean;
    createdAt: string;
}

export interface Station {
    id: number;
    stationId: string;
    city: string;
    latitude: number;
    longitude: number;
    status: string;
    createdAt: string;
    lastSeenAt: string | null;
}

export interface WeatherData {
    _time: string;
    station_id: string;
    temperature_c: number;
    humidity_pct: number;
    pressure_hpa: number;
    wind_speed_kmh: number;
    luminosity_lux: number;
    battery_pct: number;
}

export interface AuthResponse {
    token: string;
    username: string;
    role: string;
}