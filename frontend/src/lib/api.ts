const API_BASE = "http://localhost:8080/api";

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

    return res.json();
}

// ─── Auth ───
export const auth = {
    login: (username: string, password: string) =>
        request<{ token: string; username: string; role: string }>("/auth/login", {
            method: "POST",
            body: JSON.stringify({ username, password }),
        }),
    register: (username: string, password: string, email: string) =>
        request<{ token: string; username: string; role: string }>("/auth/register", {
            method: "POST",
            body: JSON.stringify({ username, password, email }),
        }),
    me: () => request<{ id: number; username: string; email: string; role: string }>("/auth/me"),
};

// ─── Stations ───
export const stations = {
    getAll: () => request<any[]>("/stations"),
    getById: (id: number) => request<any>(`/stations/${id}`),
    create: (data: any) => request("/stations", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: any) =>
        request(`/stations/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => request(`/stations/${id}`, { method: "DELETE" }),
};

// ─── Users ───
export const users = {
    getAll: () => request<any[]>("/users"),
    getById: (id: number) => request<any>(`/users/${id}`),
    create: (data: any) => request("/users", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: any) =>
        request(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => request(`/users/${id}`, { method: "DELETE" }),
};

// ─── Weather ───
export const weather = {
    getLatest: () => request<any[]>("/weather/latest"),
    getByStation: (stationId: string, range = "24h") =>
        request<any[]>(`/weather/station/${stationId}?range=${range}`),
};