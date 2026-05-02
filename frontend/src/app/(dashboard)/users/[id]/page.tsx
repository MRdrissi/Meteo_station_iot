"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { users as usersApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, Save, Loader2, UserCog } from "lucide-react";

export default function UserDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user: currentUser } = useAuth();

    const [userData, setUserData] = useState<any>(null);
    const [form, setForm] = useState({ email: "", role: "USER", enabled: true, password: "" });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (currentUser && currentUser.role !== "ADMIN") {
            router.push("/");
            return;
        }
        usersApi
            .getById(Number(id))
            .then((u) => {
                setUserData(u);
                setForm({ email: u.email, role: u.role, enabled: u.enabled, password: "" });
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [id, currentUser, router]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload: any = { email: form.email, role: form.role, enabled: form.enabled };
            if (form.password) payload.password = form.password;
            const updated = await usersApi.update(Number(id), payload);
            setUserData(updated);
            alert("Utilisateur mis à jour");
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    const toggleEnabled = async () => {
        const updated = { ...form, enabled: !form.enabled };
        setForm(updated);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            </div>
        );
    }

    if (!userData) return <p className="text-gray-500">Utilisateur introuvable</p>;

    return (
        <div className="max-w-2xl mx-auto w-full">
            <button
                onClick={() => router.back()}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 cursor-pointer"
            >
                <ArrowLeft className="w-4 h-4" />
                Retour à la liste
            </button>

            <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-brand-100 rounded-xl flex items-center justify-center">
                    <UserCog className="w-7 h-7 text-brand-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{userData.username}</h1>
                    <p className="text-gray-500 text-sm">
                        Créé le {new Date(userData.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-6">
                    Modifier l&apos;utilisateur
                </h2>

                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300
                         focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Nouveau mot de passe (laisser vide pour ne pas changer)
                        </label>
                        <input
                            type="password"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300
                         focus:ring-2 focus:ring-brand-500 outline-none"
                            placeholder="••••••••"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Rôle</label>
                        <select
                            value={form.role}
                            onChange={(e) => setForm({ ...form, role: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300
                             focus:ring-2 focus:ring-brand-500 outline-none font-sans cursor-pointer"
                        >
                            <option value="USER" className="font-sans">Utilisateur — lecture seule</option>
                            <option value="ADMIN" className="font-sans">Administrateur — accès complet</option>
                        </select>
                    </div>

                    <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                        <div>
                            <p className="text-sm font-medium text-gray-700">Compte actif</p>
                            <p className="text-xs text-gray-500">
                                Un compte désactivé ne peut plus se connecter
                            </p>
                        </div>
                        <button
                            onClick={toggleEnabled}
                            className={`relative w-11 h-6 rounded-full transition cursor-pointer ${
                                form.enabled ? "bg-brand-600" : "bg-gray-300"
                            }`}
                        >
              <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform
                  ${form.enabled ? "translate-x-5" : "translate-x-0"}`}
              />
                        </button>
                    </div>

                    <div className="flex justify-center w-full">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white
                             rounded-lg hover:bg-brand-700 transition text-sm font-medium
                             disabled:opacity-60 cursor-pointer"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Enregistrer les modifications
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}