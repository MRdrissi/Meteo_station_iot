"use client";

import { useEffect, useState } from "react";
import { weather, stations as stationsApi } from "@/lib/api";
import Link from "next/link";
import {
    Thermometer,
    Droplets,
    Wind,
    Gauge,
    Sun,
    RefreshCw,
    Loader2,
    Radio,
} from "lucide-react";

export default function DashboardPage() {
    const [data, setData] = useState<any[]>([]);
    const [stationsList, setStationsList] = useState<any[]>([]);
    const [filter, setFilter] = useState("ALL");
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            const [weatherData, stationsData] = await Promise.all([
                weather.getLatest(),
                stationsApi.getAll(),
            ]);
            setData(weatherData);
            setStationsList(stationsData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 15000); // Rafraîchir toutes les 15s
        return () => clearInterval(interval);
    }, []);

    const refresh = () => {
        setRefreshing(true);
        fetchData();
    };

    // Grouper les données par station (prendre la plus récente)
    const latestByStation = data.reduce((acc: Record<string, any>, row: any) => {
        const sid = row.station_id;
        if (!acc[sid] || new Date(row._time) > new Date(acc[sid]._time)) {
            acc[sid] = row;
        }
        return acc;
    }, {});

    const stationIds = Object.keys(latestByStation);
    const filtered =
        filter === "ALL" ? stationIds : stationIds.filter((s) => s === filter);

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
                    <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
                    <p className="text-gray-500 mt-1">Données météorologiques en temps réel</p>
                </div>
                <button
                    onClick={refresh}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-600
                     bg-brand-50 hover:bg-brand-100 rounded-lg transition disabled:opacity-60"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                    Actualiser
                </button>
            </div>

            {/* Filtre par station */}
            <div className="flex items-center gap-3 mb-6">
                <span className="text-sm font-medium text-gray-600">Filtrer :</span>
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg
                     focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                >
                    <option value="ALL">Toutes les stations</option>
                    {stationsList.map((s) => (
                        <option key={s.stationId} value={s.stationId}>
                            {s.city} ({s.stationId})
                        </option>
                    ))}
                </select>
            </div>

            {/* Cartes par station */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <Radio className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p>Aucune donnée reçue pour le moment</p>
                    <p className="text-sm mt-1">Vérifiez que le simulateur est en cours d&apos;exécution</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {filtered.map((stationId) => {
                        const d = latestByStation[stationId];
                        const station = stationsList.find((s: any) => s.stationId === stationId);
                        const city = station?.city || stationId;

                        return (
                            <div
                                key={stationId}
                                className="bg-white rounded-xl border border-gray-200 p-6"
                            >
                                <div className="flex items-center justify-between mb-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{city}</h3>
                                            <p className="text-xs text-gray-400">{stationId}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">
                      {new Date(d._time).toLocaleString("fr-FR")}
                    </span>
                                        <Link
                                            href={`/stations/${station?.id || 0}`}
                                            className="text-xs text-brand-600 hover:underline font-medium"
                                        >
                                            Voir détails →
                                        </Link>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                    <MetricCard
                                        icon={Thermometer}
                                        label="Température"
                                        value={`${d.temperature_c?.toFixed(1)}°C`}
                                        color="text-orange-500"
                                    />
                                    <MetricCard
                                        icon={Droplets}
                                        label="Humidité"
                                        value={`${d.humidity_pct?.toFixed(0)}%`}
                                        color="text-sky-500"
                                    />
                                    <MetricCard
                                        icon={Gauge}
                                        label="Pression"
                                        value={`${d.pressure_hpa?.toFixed(0)} hPa`}
                                        color="text-violet-500"
                                    />
                                    <MetricCard
                                        icon={Wind}
                                        label="Vent"
                                        value={`${d.wind_speed_kmh?.toFixed(1)} km/h`}
                                        color="text-teal-500"
                                    />
                                    <MetricCard
                                        icon={Sun}
                                        label="Luminosité"
                                        value={`${(d.luminosity_lux || 0).toLocaleString()} lux`}
                                        color="text-amber-500"
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Placeholder pour les prédictions ML */}
            <div className="mt-10 bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
                <p className="text-gray-400 text-sm font-medium">
                    Section prédictions ML — à intégrer prochainement
                </p>
            </div>
        </div>
    );
}

function MetricCard({
                        icon: Icon,
                        label,
                        value,
                        color,
                    }: {
    icon: any;
    label: string;
    value: string;
    color: string;
}) {
    return (
        <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="text-xs text-gray-500 font-medium">{label}</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">{value}</p>
        </div>
    );
}