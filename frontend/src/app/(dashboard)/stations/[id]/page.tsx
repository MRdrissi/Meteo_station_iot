"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { stations as stationsApi, weather } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
    ArrowLeft,
    Save,
    Trash2,
    Loader2,
    MapPin,
    Battery,
    Radio,
} from "lucide-react";

export default function StationDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const isAdmin = user?.role === "ADMIN";

    const [station, setStation] = useState<any>(null);
    const [weatherData, setWeatherData] = useState<any[]>([]);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ city: "", latitude: 0, longitude: 0, status: "" });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const s = await stationsApi.getById(Number(id));
                setStation(s);
                setForm({
                    city: s.city,
                    latitude: s.latitude,
                    longitude: s.longitude,
                    status: s.status,
                });
                const w = await weather.getByStation(s.stationId, "6h");
                setWeatherData(w);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const updated = await stationsApi.update(Number(id), form);
            setStation(updated);
            setEditing(false);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Supprimer cette station ?")) return;
        try {
            await stationsApi.delete(Number(id));
            router.push("/");
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

    if (!station) {
        return <p className="text-gray-500">Station introuvable</p>;
    }

    const lastWeather = weatherData[0];

    return (
        <div>
            {/* Retour */}
            <button
                onClick={() => router.back()}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 cursor-pointer"
            >
                <ArrowLeft className="w-4 h-4" />
                Retour
            </button>

            {/* En-tête */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center">
                        <Radio className="w-6 h-6 text-brand-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{station.city}</h1>
                        <p className="text-gray-500 text-sm">{station.stationId}</p>
                    </div>
                    <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            station.status === "ACTIVE"
                                ? "bg-emerald-100 text-emerald-700"
                                : station.status === "MAINTENANCE"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-gray-100 text-gray-600"
                        }`}
                    >
            {station.status}
          </span>
                </div>
                {isAdmin && (
                    <div className="flex items-center gap-2">
                        {!editing ? (
                            <button
                                onClick={() => setEditing(true)}
                                className="px-4 py-2 text-sm font-medium bg-brand-600 text-white
                           rounded-lg hover:bg-brand-700 transition cursor-pointer"
                            >
                                Modifier
                            </button>
                        ) : (
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium
                           bg-brand-600 text-white rounded-lg hover:bg-brand-700
                           transition disabled:opacity-60 cursor-pointer"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Enregistrer
                            </button>
                        )}
                        <button
                            onClick={handleDelete}
                            className="px-4 py-2.5 text-sm font-medium text-red-800
                         bg-red-100 hover:bg-red-200 rounded-lg transition cursor-pointer"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Infos de la station */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
                        Informations
                    </h2>
                    {editing ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                                <input
                                    value={form.city}
                                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300
                             focus:ring-2 focus:ring-brand-500 outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={form.latitude}
                                        onChange={(e) => setForm({ ...form, latitude: +e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300
                               focus:ring-2 focus:ring-brand-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={form.longitude}
                                        onChange={(e) => setForm({ ...form, longitude: +e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300
                               focus:ring-2 focus:ring-brand-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                                <select
                                    value={form.status}
                                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300
                                     focus:ring-2 focus:ring-brand-500 outline-none font-sans"
                                >
                                    <option value="ACTIVE" className="font-sans">ACTIVE</option>
                                    <option value="INACTIVE" className="font-sans">INACTIVE</option>
                                    <option value="MAINTENANCE" className="font-sans">MAINTENANCE</option>
                                </select>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3 text-sm">
                            <InfoRow icon={MapPin} label="Coordonnées" value={`${station.latitude}, ${station.longitude}`} />
                            <InfoRow icon={Radio} label="Statut" value={station.status} />
                            <InfoRow
                                icon={Battery}
                                label="Batterie"
                                value={lastWeather ? `${lastWeather.battery_pct}%` : "—"}
                            />
                            <InfoRow label="Dernière activité" value={
                                station.lastSeenAt
                                    ? new Date(station.lastSeenAt).toLocaleString("fr-FR")
                                    : "Jamais"
                            } />
                            <InfoRow label="Créée le" value={new Date(station.createdAt).toLocaleDateString("fr-FR")} />
                        </div>
                    )}
                </div>

                {/* Dernières mesures */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
                        Dernière mesure
                    </h2>
                    {lastWeather ? (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <MetricBlock label="Température" value={`${lastWeather.temperature_c?.toFixed(1)}°C`} />
                            <MetricBlock label="Humidité" value={`${lastWeather.humidity_pct?.toFixed(0)}%`} />
                            <MetricBlock label="Pression" value={`${lastWeather.pressure_hpa?.toFixed(0)} hPa`} />
                            <MetricBlock label="Vent" value={`${lastWeather.wind_speed_kmh?.toFixed(1)} km/h`} />
                            <MetricBlock label="Luminosité" value={`${(lastWeather.luminosity_lux || 0).toLocaleString()} lux`} />
                            <MetricBlock label="Batterie" value={`${lastWeather.battery_pct}%`} />
                        </div>
                    ) : (
                        <p className="text-gray-400 text-sm">Aucune donnée reçue</p>
                    )}
                </div>
            </div>

            {/* Historique (tableau) */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
                    Historique (6 dernières heures)
                </h2>
                {weatherData.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                            <tr className="text-left text-gray-400 text-xs uppercase border-b border-gray-100">
                                <th className="pb-3 font-medium">Heure</th>
                                <th className="pb-3 font-medium">Temp.</th>
                                <th className="pb-3 font-medium">Humid.</th>
                                <th className="pb-3 font-medium">Pression</th>
                                <th className="pb-3 font-medium">Vent</th>
                                <th className="pb-3 font-medium">Lux</th>
                            </tr>
                            </thead>
                            <tbody>
                            {weatherData.slice(0, 20).map((row: any, i: number) => (
                                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition">
                                    <td className="py-2.5 text-gray-600">
                                        {new Date(row._time).toLocaleTimeString("fr-FR")}
                                    </td>
                                    <td className="py-2.5">{row.temperature_c?.toFixed(1)}°C</td>
                                    <td className="py-2.5">{row.humidity_pct?.toFixed(0)}%</td>
                                    <td className="py-2.5">{row.pressure_hpa?.toFixed(0)} hPa</td>
                                    <td className="py-2.5">{row.wind_speed_kmh?.toFixed(1)} km/h</td>
                                    <td className="py-2.5">{(row.luminosity_lux || 0).toLocaleString()}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-gray-400 text-sm">Aucune donnée disponible</p>
                )}
            </div>
        </div>
    );
}

function InfoRow({ icon: Icon, label, value }: { icon?: any; label: string; value: string }) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-2 text-gray-500">
                {Icon && <Icon className="w-4 h-4" />}
                <span>{label}</span>
            </div>
            <span className="font-medium text-gray-900">{value}</span>
        </div>
    );
}

function MetricBlock({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="font-semibold text-gray-900">{value}</p>
        </div>
    );
}