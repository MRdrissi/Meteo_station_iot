"use client";

import { useEffect, useState } from "react";
import { stations as stationsApi, weather } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import {
    Plus,
    Loader2,
    Search,
    Radio,
    MapPin,
    Battery,
    Thermometer,
    Eye,
    Pencil,
    Trash2,
} from "lucide-react";

export default function StationsListPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === "ADMIN";

    const [stationsList, setStationsList] = useState<any[]>([]);
    const [latestWeather, setLatestWeather] = useState<Record<string, any>>({});
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [loading, setLoading] = useState(true);

    // Modal d'ajout
    const [showAdd, setShowAdd] = useState(false);
    const [newStation, setNewStation] = useState({
        stationId: "",
        city: "",
        latitude: 0,
        longitude: 0,
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const [stations, weatherData] = await Promise.all([
                    stationsApi.getAll(),
                    weather.getLatest(),
                ]);
                setStationsList(stations);

                // Indexer par station_id
                const weatherMap: Record<string, any> = {};
                weatherData.forEach((w: any) => {
                    weatherMap[w.station_id] = w;
                });
                setLatestWeather(weatherMap);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // Filtrage
    const filtered = stationsList.filter((s) => {
        const matchSearch =
            s.city.toLowerCase().includes(search.toLowerCase()) ||
            s.stationId.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === "ALL" || s.status === statusFilter;
        return matchSearch && matchStatus;
    });

    // Ajout de station
    const handleAddStation = async () => {
        setSaving(true);
        try {
            const created = await stationsApi.create(newStation);
            setStationsList([...stationsList, created]);
            setShowAdd(false);
            setNewStation({ stationId: "", city: "", latitude: 0, longitude: 0 });
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    // Suppression
    const handleDelete = async (id: number, city: string) => {
        if (!confirm(`Supprimer la station ${city} ?`)) return;
        try {
            await stationsApi.delete(id);
            setStationsList(stationsList.filter((s) => s.id !== id));
        } catch (err: any) {
            alert(err.message);
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
            {/* En-tête */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Stations</h1>
                    <p className="text-gray-500 mt-1">
                        {stationsList.length} station{stationsList.length > 1 ? "s" : ""} enregistrée{stationsList.length > 1 ? "s" : ""}
                    </p>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => setShowAdd(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white
                       rounded-lg hover:bg-brand-700 transition text-sm font-medium cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        Nouvelle station
                    </button>
                )}
            </div>

            {/* Recherche + Filtre */}
            <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Rechercher par ville ou identifiant..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300
                       focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2.5 text-sm border border-gray-300 rounded-lg
               focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none font-sans cursor-pointer"
                >
                    <option value="ALL" className="font-sans">Tous les statuts</option>
                    <option value="ACTIVE" className="font-sans">Active</option>
                    <option value="INACTIVE" className="font-sans">Inactive</option>
                    <option value="MAINTENANCE" className="font-sans">Maintenance</option>
                </select>
            </div>

            {/* Formulaire d'ajout inline */}
            {showAdd && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                    <h2 className="font-semibold text-gray-900 mb-4">Ajouter une station</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <input
                            placeholder="ID (ex: ST-AGADIR)"
                            value={newStation.stationId}
                            onChange={(e) => setNewStation({ ...newStation, stationId: e.target.value })}
                            className="px-3 py-2 rounded-lg border border-gray-300 text-sm
                         focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                        <input
                            placeholder="Ville"
                            value={newStation.city}
                            onChange={(e) => setNewStation({ ...newStation, city: e.target.value })}
                            className="px-3 py-2 rounded-lg border border-gray-300 text-sm
                         focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                        <input
                            placeholder="Latitude"
                            type="number"
                            step="0.01"
                            value={newStation.latitude || ""}
                            onChange={(e) => setNewStation({ ...newStation, latitude: +e.target.value })}
                            className="px-3 py-2 rounded-lg border border-gray-300 text-sm
                         focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                        <input
                            placeholder="Longitude"
                            type="number"
                            step="0.01"
                            value={newStation.longitude || ""}
                            onChange={(e) => setNewStation({ ...newStation, longitude: +e.target.value })}
                            className="px-3 py-2 rounded-lg border border-gray-300 text-sm
                         focus:ring-2 focus:ring-brand-500 outline-none"
                        />
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={handleAddStation}
                            disabled={saving || !newStation.stationId || !newStation.city}
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

            {/* Tableau des stations */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                    <tr className="text-left text-gray-400 text-xs uppercase border-b border-gray-100">
                        <th className="px-6 py-4 font-medium">Station</th>
                        <th className="px-6 py-4 font-medium">Coordonnées</th>
                        <th className="px-6 py-4 font-medium">Statut</th>
                        <th className="px-6 py-4 font-medium">Temp. actuelle</th>
                        <th className="px-6 py-4 font-medium">Batterie</th>
                        <th className="px-6 py-4 font-medium">Dernière activité</th>
                        <th className="px-6 py-4 font-medium">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filtered.map((s) => {
                        const w = latestWeather[s.stationId];
                        return (
                            <tr
                                key={s.id}
                                className="border-b border-gray-50 hover:bg-gray-50/50 transition"
                            >
                                {/* Station info */}
                                <td className="px-4 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 bg-brand-50 rounded-lg flex items-center justify-center shrink-0">
                                            <Radio className="w-4 h-4 text-brand-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 whitespace-nowrap">{s.city}</p>
                                            <p className="text-xs text-gray-400 whitespace-nowrap">{s.stationId}</p>
                                        </div>
                                    </div>
                                </td>

                                {/* Coordonnées */}
                                <td className="px-6 py-4 text-gray-500">
                                    <div className="flex items-center gap-1.5">
                                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                        <span className="whitespace-nowrap">{s.latitude}, {s.longitude}</span>
                                    </div>
                                </td>

                                {/* Statut */}
                                <td className="px-4 py-4">
                    <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            s.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-700"
                                : s.status === "MAINTENANCE"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-gray-100 text-gray-500"
                        }`}
                    >
                      <span
                          className={`w-1.5 h-1.5 rounded-full ${
                              s.status === "ACTIVE"
                                  ? "bg-emerald-500"
                                  : s.status === "MAINTENANCE"
                                      ? "bg-amber-500"
                                      : "bg-gray-400"
                          }`}
                      />
                        {s.status}
                    </span>
                                </td>

                                {/* Température */}
                                <td className="px-6 py-4">
                                    {w ? (
                                        <div className="flex items-center gap-1.5">
                                            <Thermometer className="w-3.5 h-3.5 text-orange-400" />
                                            <span className="font-medium text-gray-900">
                          {w.temperature_c?.toFixed(1)}°C
                        </span>
                                        </div>
                                    ) : (
                                        <span className="text-gray-300">—</span>
                                    )}
                                </td>

                                {/* Batterie */}
                                <td className="px-6 py-4">
                                    {w ? (
                                        <div className="flex items-center gap-2">
                                            <Battery className="w-4 h-4 text-gray-400" />
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${
                                                            w.battery_pct > 50
                                                                ? "bg-emerald-500"
                                                                : w.battery_pct > 20
                                                                    ? "bg-amber-500"
                                                                    : "bg-red-500"
                                                        }`}
                                                        style={{ width: `${w.battery_pct}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-gray-500">{w.battery_pct}%</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-gray-300">—</span>
                                    )}
                                </td>

                                {/* Dernière activité */}
                                <td className="px-6 py-4 text-gray-500 text-xs">
                                    {s.lastSeenAt
                                        ? new Date(s.lastSeenAt).toLocaleString("fr-FR")
                                        : "Jamais"}
                                </td>

                                {/* Actions */}
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-1">
                                        <Link
                                            href={`/stations/${s.id}`}
                                            className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50
                                   rounded-lg transition"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Link>
                                        {isAdmin && (
                                            <>
                                                <Link
                                                    href={`/stations/${s.id}`}
                                                    className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50
                                       rounded-lg transition"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(s.id, s.city)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer
                                       rounded-lg transition"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>

                {/* État vide */}
                {filtered.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                        <Radio className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Aucune station trouvée</p>
                    </div>
                )}
            </div>
        </div>
    );
}