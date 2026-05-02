"use client";

import { useEffect, useState } from "react";
import { users as usersApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Plus,
    Loader2,
    UserCheck,
    UserX,
    Search,
    Pencil,
} from "lucide-react";

export default function UsersPage() {
    const { user: currentUser } = useAuth();
    const router = useRouter();
    const [usersList, setUsersList] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [newUser, setNewUser] = useState({ username: "", email: "", password: "", role: "USER" });
    const [saving, setSaving] = useState(false);

    const toast = useToast();

    // Rediriger si pas ADMIN
    useEffect(() => {
        if (currentUser && currentUser.role !== "ADMIN") {
            router.push("/");
        }
    }, [currentUser, router]);

    useEffect(() => {
        usersApi
            .getAll()
            .then(setUsersList)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const filtered = usersList.filter(
        (u) =>
            u.username.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase())
    );

    const handleAddUser = async () => {
        setSaving(true);
        try {
            const created = await usersApi.create(newUser);
            setUsersList([...usersList, created]);
            setShowAdd(false);
            setNewUser({ username: "", email: "", password: "", role: "USER" });
            toast.success(`Utilisateur ${created.username || newUser.username} créé`);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
                    <p className="text-gray-500 mt-1">Gérez les comptes et les rôles</p>
                </div>
                <button
                    onClick={() => setShowAdd(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white
                     rounded-lg hover:bg-brand-700 transition text-sm font-medium cursor-pointer"
                >
                    <Plus className="w-4 h-4" />
                    Nouvel utilisateur
                </button>
            </div>

            {/* Barre de recherche */}
            <div className="relative mb-6 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Rechercher par nom ou email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300
                     focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm"
                />
            </div>

            {/* Modal ajout (inline) */}
            {showAdd && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                    <h2 className="font-semibold text-gray-900 mb-4">Créer un utilisateur</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <input
                            placeholder="Nom d'utilisateur"
                            value={newUser.username}
                            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                            className="px-3 py-2 rounded-lg border border-gray-300 text-sm
                         focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                        <input
                            placeholder="Email"
                            type="email"
                            value={newUser.email}
                            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                            className="px-3 py-2 rounded-lg border border-gray-300 text-sm
                         focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                        <input
                            placeholder="Mot de passe"
                            type="password"
                            value={newUser.password}
                            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                            className="px-3 py-2 rounded-lg border border-gray-300 text-sm
                         focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                        <select
                            value={newUser.role}
                            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                            className="px-3 py-2 rounded-lg border border-gray-300 text-sm
                             focus:ring-2 focus:ring-brand-500 outline-none font-sans cursor-pointer"
                        >
                            <option value="USER" className="font-sans cursor-pointer">Utilisateur</option>
                            <option value="ADMIN" className="font-sans cursor-pointer">Administrateur</option>
                        </select>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={handleAddUser}
                            disabled={saving}
                            className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium
                         hover:bg-brand-700 transition disabled:opacity-60 cursor-pointer"
                        >
                            {saving ? "Création..." : "Créer"}
                        </button>
                        <button
                            onClick={() => setShowAdd(false)}
                            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm
                         hover:bg-gray-200 transition cursor-pointer"
                        >
                            Annuler
                        </button>
                    </div>
                </div>
            )}

            {/* Tableau */}
            <div className="bg-white rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                    <thead>
                    <tr className="text-left text-gray-400 text-xs uppercase border-b border-gray-100">
                        <th className="px-6 py-4 font-medium">Utilisateur</th>
                        <th className="px-6 py-4 font-medium">Email</th>
                        <th className="px-6 py-4 font-medium">Rôle</th>
                        <th className="px-6 py-4 font-medium">Statut</th>
                        <th className="px-6 py-4 font-medium">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filtered.map((u) => (
                        <tr
                            key={u.id}
                            className="border-b border-gray-50 hover:bg-gray-50/50 transition"
                        >
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center
                                    justify-center text-brand-700 font-semibold text-xs">
                                        {u.username.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-medium text-gray-900">{u.username}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-gray-600">{u.email}</td>
                            <td className="px-6 py-4">
                  <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          u.role === "ADMIN"
                              ? "bg-brand-100 text-brand-700"
                              : "bg-gray-100 text-gray-600"
                      }`}
                  >
                    {u.role}
                  </span>
                            </td>
                            <td className="px-6 py-4">
                                {u.enabled ? (
                                    <span className="flex items-center gap-1.5 text-emerald-600">
                      <UserCheck className="w-4 h-4" /> Actif
                    </span>
                                ) : (
                                    <span className="flex items-center gap-1.5 text-gray-400">
                      <UserX className="w-4 h-4" /> Désactivé
                    </span>
                                )}
                            </td>
                            <td className="px-6 py-4">
                                <Link
                                    href={`/users/${u.id}`}
                                    className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition inline-flex"
                                >
                                    <Pencil className="w-4 h-4" />
                                </Link>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}