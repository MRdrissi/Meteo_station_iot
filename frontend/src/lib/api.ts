import {
    MOCK_STATIONS,
    MOCK_USERS,
    mockGetLatestWeather,
    mockGetStationWeather,
    mockLogin,
    mockRegister,
    mockGetMe,
} from "./mock";

// ═══════════════════════════════════════════════════════
// FLAGS PAR MODULE — true = mock, false = vrai backend
// Quand ton collaborateur aura fini les endpoints météo,
// passe MOCK_WEATHER à false
// ═══════════════════════════════════════════════════════
const MOCK_AUTH    = false;   // ← connecté au vrai backend
const MOCK_STATION = false;   // ← connecté au vrai backend
const MOCK_USER    = false;   // ← connecté au vrai backend
const MOCK_WEATHER = true;    // ← reste en mock (pas encore d'endpoint)

const API_BASE =
    typeof window !== "undefined"
        ? `http://${window.location.hostname}:8080/api`
        : "http://localhost:8080/api";

function getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = getToken();
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${path}`, {...options, headers});

    if (res.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login";
        throw new Error("Non authentifié");
    }

    if (res.status === 403) {
        throw new Error("Accès refusé — permissions insuffisantes");
    }

    if (!res.ok) {
        const err = await res.json().catch(() => ({error: "Erreur serveur"}));
        throw new Error(err.error || err.message || `Erreur ${res.status}`);
    }

    if (res.status === 204) return {} as T;
    return res.json();
}

// ═══════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════
export const auth = {
    login: async (username: string, password: string) => {
        if (MOCK_AUTH) return mockLogin(username, password);
        return request<{ token: string; username: string; role: string }>("/auth/login", {
            method: "POST",
            body: JSON.stringify({username, password}),
        });
    },

    register: async (username: string, password: string, email: string) => {
        if (MOCK_AUTH) return mockRegister(username, password, email);
        return request<{ token: string; username: string; role: string }>("/auth/register", {
            method: "POST",
            body: JSON.stringify({username, password, email}),
        });
    },

    me: async () => {
        if (MOCK_AUTH) return mockGetMe();
        return request<{ id: number; username: string; email: string; role: string }>("/auth/me");
    },
};

// ═══════════════════════════════════════════════════════
// STATIONS
// ═══════════════════════════════════════════════════════
export const stations = {
    getAll: async () => {
        if (MOCK_STATION) return [...MOCK_STATIONS];
        return request<any[]>("/stations");
    },

    getById: async (id: number) => {
        if (MOCK_STATION) {
            const found = MOCK_STATIONS.find((s) => s.id === id);
            if (!found) throw new Error("Station introuvable");
            return {...found};
        }
        return request<any>(`/stations/${id}`);
    },

    create: async (data: any) => {
        if (MOCK_STATION) {
            const newStation = {...data, id: Date.now(), createdAt: new Date().toISOString(), lastSeenAt: null};
            MOCK_STATIONS.push(newStation);
            return newStation;
        }
        return request("/stations", {method: "POST", body: JSON.stringify(data)});
    },

    update: async (id: number, data: any) => {
        if (MOCK_STATION) {
            const idx = MOCK_STATIONS.findIndex((s) => s.id === id);
            if (idx === -1) throw new Error("Station introuvable");
            MOCK_STATIONS[idx] = {...MOCK_STATIONS[idx], ...data};
            return {...MOCK_STATIONS[idx]};
        }
        return request(`/stations/${id}`, {method: "PUT", body: JSON.stringify(data)});
    },

    delete: async (id: number) => {
        if (MOCK_STATION) {
            const idx = MOCK_STATIONS.findIndex((s) => s.id === id);
            if (idx !== -1) MOCK_STATIONS.splice(idx, 1);
            return {};
        }
        return request(`/stations/${id}`, {method: "DELETE"});
    },
};

// ═══════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════
export const users = {
    getAll: async () => {
        if (MOCK_USER) return [...MOCK_USERS];
        return request<any[]>("/users");
    },

    getById: async (id: number) => {
        if (MOCK_USER) {
            const found = MOCK_USERS.find((u) => u.id === id);
            if (!found) throw new Error("Utilisateur introuvable");
            return {...found};
        }
        return request<any>(`/users/${id}`);
    },

    create: async (data: any) => {
        if (MOCK_USER) {
            const newUser = {...data, id: Date.now(), enabled: true, createdAt: new Date().toISOString()};
            MOCK_USERS.push(newUser);
            return newUser;
        }
        return request("/users", {method: "POST", body: JSON.stringify(data)});
    },

    update: async (id: number, data: any) => {
        if (MOCK_USER) {
            const idx = MOCK_USERS.findIndex((u) => u.id === id);
            if (idx === -1) throw new Error("Utilisateur introuvable");
            MOCK_USERS[idx] = {...MOCK_USERS[idx], ...data};
            return {...MOCK_USERS[idx]};
        }
        return request(`/users/${id}`, {method: "PUT", body: JSON.stringify(data)});
    },

    delete: async (id: number) => {
        if (MOCK_USER) {
            const idx = MOCK_USERS.findIndex((u) => u.id === id);
            if (idx !== -1) MOCK_USERS.splice(idx, 1);
            return {};
        }
        return request(`/users/${id}`, {method: "DELETE"});
    },
};

// ═══════════════════════════════════════════════════════
// WEATHER — reste en mock jusqu'à ce que le collaborateur
// implémente WeatherController + WeatherService
// ═══════════════════════════════════════════════════════
export const weather = {
    getLatest: async () => {
        if (MOCK_WEATHER) return mockGetLatestWeather();
        return request<any[]>("/weather/latest");
    },

    getByStation: async (stationId: string, range = "24h") => {
        if (MOCK_WEATHER) return mockGetStationWeather(stationId, range);
        return request<any[]>(`/weather/station/${stationId}?range=${range}`);
    },
};