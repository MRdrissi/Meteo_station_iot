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
// BASCULER ICI : true = données fictives, false = vrai backend
// ═══════════════════════════════════════════════════════
const USE_MOCKS = true;

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

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
        throw new Error("Non authentifié");
    }

    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erreur serveur" }));
        throw new Error(err.error || `Erreur ${res.status}`);
    }

    if (res.status === 204) return {} as T;
    return res.json();
}

// ═══════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════
export const auth = {
    login: async (username: string, password: string) => {
        if (USE_MOCKS) return mockLogin(username, password);
        return request<{ token: string; username: string; role: string }>("/auth/login", {
            method: "POST",
            body: JSON.stringify({ username, password }),
        });
    },

    register: async (username: string, password: string, email: string) => {
        if (USE_MOCKS) return mockRegister(username, password, email);
        return request<{ token: string; username: string; role: string }>("/auth/register", {
            method: "POST",
            body: JSON.stringify({ username, password, email }),
        });
    },

    me: async () => {
        if (USE_MOCKS) return mockGetMe();
        return request<{ id: number; username: string; email: string; role: string }>("/auth/me");
    },
};

// ═══════════════════════════════════════════════════════
// STATIONS
// ═══════════════════════════════════════════════════════
export const stations = {
    getAll: async () => {
        if (USE_MOCKS) return [...MOCK_STATIONS];
        return request<any[]>("/stations");
    },

    getById: async (id: number) => {
        if (USE_MOCKS) {
            const found = MOCK_STATIONS.find((s) => s.id === id);
            if (!found) throw new Error("Station introuvable");
            return { ...found };
        }
        return request<any>(`/stations/${id}`);
    },

    create: async (data: any) => {
        if (USE_MOCKS) {
            const newStation = { ...data, id: Date.now(), createdAt: new Date().toISOString(), lastSeenAt: null };
            MOCK_STATIONS.push(newStation);
            return newStation;
        }
        return request("/stations", { method: "POST", body: JSON.stringify(data) });
    },

    update: async (id: number, data: any) => {
        if (USE_MOCKS) {
            const idx = MOCK_STATIONS.findIndex((s) => s.id === id);
            if (idx === -1) throw new Error("Station introuvable");
            MOCK_STATIONS[idx] = { ...MOCK_STATIONS[idx], ...data };
            return { ...MOCK_STATIONS[idx] };
        }
        return request(`/stations/${id}`, { method: "PUT", body: JSON.stringify(data) });
    },

    delete: async (id: number) => {
        if (USE_MOCKS) {
            const idx = MOCK_STATIONS.findIndex((s) => s.id === id);
            if (idx !== -1) MOCK_STATIONS.splice(idx, 1);
            return {};
        }
        return request(`/stations/${id}`, { method: "DELETE" });
    },
};

// ═══════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════
export const users = {
    getAll: async () => {
        if (USE_MOCKS) return [...MOCK_USERS];
        return request<any[]>("/users");
    },

    getById: async (id: number) => {
        if (USE_MOCKS) {
            const found = MOCK_USERS.find((u) => u.id === id);
            if (!found) throw new Error("Utilisateur introuvable");
            return { ...found };
        }
        return request<any>(`/users/${id}`);
    },

    create: async (data: any) => {
        if (USE_MOCKS) {
            const newUser = {
                ...data,
                id: Date.now(),
                enabled: true,
                createdAt: new Date().toISOString(),
            };
            MOCK_USERS.push(newUser);
            return newUser;
        }
        return request("/users", { method: "POST", body: JSON.stringify(data) });
    },

    update: async (id: number, data: any) => {
        if (USE_MOCKS) {
            const idx = MOCK_USERS.findIndex((u) => u.id === id);
            if (idx === -1) throw new Error("Utilisateur introuvable");
            MOCK_USERS[idx] = { ...MOCK_USERS[idx], ...data };
            return { ...MOCK_USERS[idx] };
        }
        return request(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) });
    },

    delete: async (id: number) => {
        if (USE_MOCKS) {
            const idx = MOCK_USERS.findIndex((u) => u.id === id);
            if (idx !== -1) MOCK_USERS.splice(idx, 1);
            return {};
        }
        return request(`/users/${id}`, { method: "DELETE" });
    },
};

// ═══════════════════════════════════════════════════════
// WEATHER (données capteurs)
// ═══════════════════════════════════════════════════════
export const weather = {
    getLatest: async () => {
        if (USE_MOCKS) return mockGetLatestWeather();
        return request<any[]>("/weather/latest");
    },

    getByStation: async (stationId: string, range = "24h") => {
        if (USE_MOCKS) return mockGetStationWeather(stationId, range);
        return request<any[]>(`/weather/station/${stationId}?range=${range}`);
    },
};