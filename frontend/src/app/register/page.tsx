"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { CloudSun, Loader2 } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
    const { register } = useAuth();
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await register(username, password, email);
        } catch (err: any) {
            setError(err.message || "Erreur lors de l'inscription");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Panneau gauche */}
            <div className="hidden lg:flex lg:w-1/2 bg-brand-900 flex-col justify-between p-12 text-white">
                <div className="flex items-center gap-3">
                    <CloudSun className="w-8 h-8 text-brand-300" />
                    <span className="text-xl font-semibold tracking-tight uppercase">Mesos</span>
                </div>
                <div>
                    <h1 className="text-4xl font-bold leading-tight mb-4">
                        Rejoignez la plateforme
                    </h1>
                    <p className="text-brand-300 text-lg max-w-md">
                        Créez un compte pour consulter les données météorologiques
                        de toutes les stations connectées.
                    </p>
                </div>
                <p className="text-brand-400 text-sm font-medium">EMSI — Projet IoT 2026</p>
            </div>

            {/* Panneau droit */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-sm">
                    <div className="lg:hidden flex items-center gap-2 mb-10">
                        <CloudSun className="w-7 h-7 text-brand-600" />
                        <span className="text-lg font-semibold uppercase">Mesos</span>
                    </div>

                    <h2 className="text-2xl font-bold mb-1">Inscription</h2>
                    <p className="text-gray-500 mb-8">Créez votre compte utilisateur</p>

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
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300
                           focus:ring-2 focus:ring-brand-500 focus:border-brand-500
                           outline-none transition"
                                placeholder="email@example.com"
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
                            Créer mon compte
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm text-gray-500">
                        Déjà un compte ?{" "}
                        <Link href="/login" className="text-brand-600 hover:underline font-medium">
                            Se connecter
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}