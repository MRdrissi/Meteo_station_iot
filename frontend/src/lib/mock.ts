// ═══════════════════════════════════════════════════════
// MOCK DATA — Données fictives pour développement frontend
// Mettre USE_MOCKS = false dans api.ts quand le backend est prêt
// ═══════════════════════════════════════════════════════

// ─── Stations ───

export const MOCK_STATIONS = [
    {
        id: 1,
        stationId: "ST-CASABLANCA",
        city: "Casablanca",
        latitude: 33.57,
        longitude: -7.58,
        status: "ACTIVE",
        createdAt: "2025-09-15T10:00:00",
        lastSeenAt: new Date().toISOString(),
    },
    {
        id: 2,
        stationId: "ST-RABAT",
        city: "Rabat",
        latitude: 34.02,
        longitude: -6.84,
        status: "ACTIVE",
        createdAt: "2025-09-15T10:00:00",
        lastSeenAt: new Date().toISOString(),
    },
    {
        id: 3,
        stationId: "ST-MARRAKECH",
        city: "Marrakech",
        latitude: 31.63,
        longitude: -8.01,
        status: "ACTIVE",
        createdAt: "2025-09-15T10:00:00",
        lastSeenAt: new Date().toISOString(),
    },
    {
        id: 4,
        stationId: "ST-TANGER",
        city: "Tanger",
        latitude: 35.77,
        longitude: -5.81,
        status: "MAINTENANCE",
        createdAt: "2025-09-15T10:00:00",
        lastSeenAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
        id: 5,
        stationId: "ST-FES",
        city: "Fès",
        latitude: 34.03,
        longitude: -5.0,
        status: "ACTIVE",
        createdAt: "2025-09-15T10:00:00",
        lastSeenAt: new Date().toISOString(),
    },
];

// ─── Utilisateurs ───

export const MOCK_USERS = [
    {
        id: 1,
        username: "admin",
        email: "admin@meteo.ma",
        role: "ADMIN",
        enabled: true,
        createdAt: "2025-09-15T10:00:00",
    },
    {
        id: 2,
        username: "mouad",
        email: "mouad@emsi.ma",
        role: "USER",
        enabled: true,
        createdAt: "2025-10-01T14:30:00",
    },
    {
        id: 3,
        username: "marwane",
        email: "marwane@emsi.ma",
        role: "USER",
        enabled: true,
        createdAt: "2025-10-01T14:35:00",
    },
    {
        id: 4,
        username: "test_user",
        email: "test@emsi.ma",
        role: "USER",
        enabled: false,
        createdAt: "2026-01-10T09:00:00",
    },
];

// ─── Générateur de données météo réalistes ───

// Données de base par station (climat réel approximatif)
const STATION_CLIMATE: Record<string, { tempBase: number; humBase: number; windBase: number }> = {
    "ST-CASABLANCA": { tempBase: 23, humBase: 65, windBase: 14 },
    "ST-RABAT": { tempBase: 22, humBase: 70, windBase: 12 },
    "ST-MARRAKECH": { tempBase: 28, humBase: 35, windBase: 10 },
    "ST-TANGER": { tempBase: 21, humBase: 75, windBase: 18 },
    "ST-FES": { tempBase: 25, humBase: 45, windBase: 8 },
};

function randomAround(base: number, variance: number): number {
    return +(base + (Math.random() - 0.5) * 2 * variance).toFixed(1);
}

function estimateLuminosity(date: Date): number {
    const hour = date.getHours() + date.getMinutes() / 60;
    const value = Math.max(0, Math.sin((Math.PI * hour) / 24));
    return Math.round(value * 100000);
}

function generateWeatherPoint(stationId: string, time: Date) {
    const climate = STATION_CLIMATE[stationId] || { tempBase: 22, humBase: 55, windBase: 12 };
    const hour = time.getHours();

    // Variation jour/nuit sur la température
    const tempOffset = hour >= 6 && hour <= 18 ? 3 : -3;

    return {
        _time: time.toISOString(),
        station_id: stationId,
        temperature_c: randomAround(climate.tempBase + tempOffset, 2),
        humidity_pct: randomAround(climate.humBase, 8),
        pressure_hpa: randomAround(1013, 5),
        wind_speed_kmh: randomAround(climate.windBase, 4),
        luminosity_lux: estimateLuminosity(time),
        battery_pct: Math.round(85 + Math.random() * 15),
    };
}

// ─── Fonctions mock exportées ───

export function mockGetLatestWeather() {
    const now = new Date();
    return MOCK_STATIONS.map((s) => generateWeatherPoint(s.stationId, now));
}

export function mockGetStationWeather(stationId: string, range: string): any[] {
    const now = Date.now();
    const hours = range === "1h" ? 1 : range === "6h" ? 6 : range === "24h" ? 24 : 6;
    const points: any[] = [];

    // Un point toutes les 15 secondes = 240/heure → trop, on prend 1 par minute
    for (let i = 0; i < hours * 4; i++) {
        const time = new Date(now - i * 15 * 60 * 1000); // 1 point toutes les 15 min
        points.push(generateWeatherPoint(stationId, time));
    }

    return points;
}

export function mockLogin(username: string, password: string) {
    const user = MOCK_USERS.find((u) => u.username === username);
    if (!user) throw new Error("Utilisateur introuvable");
    // En mode mock, on accepte n'importe quel mot de passe
    return {
        token: "mock-jwt-token-" + Date.now(),
        username: user.username,
        role: user.role,
    };
}

export function mockRegister(username: string, password: string, email: string) {
    return {
        token: "mock-jwt-token-" + Date.now(),
        username,
        role: "USER",
    };
}

export function mockGetMe() {
    // Retourner l'admin par défaut en mode mock
    return { id: 1, username: "admin", email: "admin@meteo.ma", role: "ADMIN" };
}