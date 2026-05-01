"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { CloudSun, Loader2 } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
    const { login } = useAuth();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await login(username, password);
        } catch (err: any) {
            setError(err.message || "Identifiants incorrects");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Panneau gauche — décoratif */}
            <div className="hidden lg:flex lg:w-1/2 bg-brand-900 flex-col justify-between p-12 text-white">
                <div className="flex items-center gap-3">
                    <CloudSun className="w-8 h-8 text-brand-300" />
                    <span className="text-xl font-semibold tracking-tight uppercase">Mesos</span>
                </div>
                <div>
                    <h1 className="text-4xl font-bold leading-tight mb-4">
                        Surveillez vos stations<br />en temps réel
                    </h1>
                    <p className="text-brand-300 text-lg max-w-lg">
                        Température, humidité, pression, vent — toutes vos données
                        centralisées dans un tableau de bord unique.
                    </p>
                </div>
                <p className="text-brand-400 text-sm font-medium">EMSI — Projet IoT 2026</p>
            </div>

            {/* Panneau droit — formulaire */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-sm">
                    <div className="lg:hidden flex items-center gap-2 mb-10">
                        <CloudSun className="w-7 h-7 text-brand-600" />
                        <span className="text-lg font-semibold uppercase">Mesos</span>
                    </div>

                    <h2 className="text-2xl font-bold mb-1">Connexion</h2>
                    <p className="text-gray-500 mb-8">Accédez à votre tableau de bord</p>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Nom d&apos;utilisateur
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300
                           focus:ring-2 focus:ring-brand-500 focus:border-brand-500
                           outline-none transition"
                                placeholder="username"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Mot de passe
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300
                           focus:ring-2 focus:ring-brand-500 focus:border-brand-500
                           outline-none transition"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white
                         rounded-lg font-medium transition flex items-center justify-center gap-2
                         disabled:opacity-60 cursor-pointer"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Se connecter
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm text-gray-500">
                        Pas encore de compte ?{" "}
                        <Link href="/register" className="text-brand-600 hover:underline font-medium">
                            S&apos;inscrire
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}