"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { auth as authApi } from "./api";

interface UserInfo {
    id: number;
    username: string;
    email: string;
    role: "USER" | "ADMIN";
}

interface AuthCtx {
    user: UserInfo | null;
    loading: boolean;
    login: (username: string, password: string) => Promise<void>;
    register: (username: string, password: string, email: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    // Vérifier le token au chargement
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            setLoading(false);
            if (pathname !== "/login" && pathname !== "/register") {
                router.push("/login");
            }
            return;
        }
        authApi
            .me()
            .then((data) => {
                setUser(data as UserInfo);
            })
            .catch(() => {
                localStorage.removeItem("token");
                router.push("/login");
            })
            .finally(() => setLoading(false));
    }, []);

    const login = async (username: string, password: string) => {
        const res = await authApi.login(username, password);
        localStorage.setItem("token", res.token);
        const me = await authApi.me();
        setUser(me as UserInfo);
        router.push("/");
    };

    const register = async (username: string, password: string, email: string) => {
        const res = await authApi.register(username, password, email);
        localStorage.setItem("token", res.token);
        const me = await authApi.me();
        setUser(me as UserInfo);
        router.push("/");
    };

    const logout = () => {
        localStorage.removeItem("token");
        setUser(null);
        router.push("/login");
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);