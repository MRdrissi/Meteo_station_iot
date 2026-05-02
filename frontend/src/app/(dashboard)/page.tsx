"use client";

import {useEffect, useState} from "react";
import {weather, stations as stationsApi} from "@/lib/api";
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
    Eye,
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
        const interval = setInterval(fetchData, 15000);
        return () => clearInterval(interval);
    }, []);

    const refresh = () => {
        setRefreshing(true);
        fetchData();
    };

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
                <Loader2 className="w-8 h-8 animate-spin text-brand-600"/>
            </div>
        );
    }

    // Date commune
    const latestTime = stationIds.length > 0
        ? new Date(latestByStation[stationIds[0]]._time).toLocaleString("fr-FR")
        : null;

    return (
        <div>
            {/* En-tête */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
                    <p className="text-gray-500 mt-1">Données météorologiques en temps réel</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="px-3 py-2 text-sm font-sans border border-gray-300 rounded-lg
                                   focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none cursor-pointer"
                    >
                        <option value="ALL" className="font-sans">
                            Toutes les stations
                        </option>
                        {stationsList.map((s) => (
                            <option key={s.stationId} value={s.stationId} className="font-sans">
                                {s.city} ({s.stationId})
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={refresh}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-600
                                   bg-brand-50 hover:bg-brand-100 rounded-lg transition disabled:opacity-60 cursor-pointer"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}/>
                        Actualiser
                    </button>
                </div>
            </div>

            {/* Date commune */}
            {latestTime && (
                <div className="mb-4">
                    <span className="text-xs font-medium text-red-400 bg-red-50 px-3 py-1 rounded-full">
                        Dernière mise à jour : {latestTime}
                    </span>
                </div>
            )}

            {/* Cartes par station — grille 2 colonnes */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <Radio className="w-12 h-12 mx-auto mb-3 opacity-40"/>
                    <p>Aucune donnée reçue pour le moment</p>
                    <p className="text-sm mt-1">Vérifiez que le simulateur est en cours d&apos;exécution</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filtered.map((stationId) => {
                        const d = latestByStation[stationId];
                        const station = stationsList.find((s: any) => s.stationId === stationId);
                        const city = station?.city || stationId;
                        const status = station?.status || "ACTIVE";
                        const isOperational = status === "ACTIVE";

                        return (
                            <div
                                key={stationId}
                                className={`bg-white rounded-xl border p-5 ${
                                    isOperational ? "border-gray-200" : "border-gray-200 opacity-80"
                                }`}
                            >
                                {/* En-tête station */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2.5">
                                        {/* Point de statut */}
                                        <div
                                            className={`w-2 h-2 rounded-full ${
                                                status === "ACTIVE"
                                                    ? "bg-emerald-500 animate-pulse"
                                                    : status === "MAINTENANCE"
                                                        ? "bg-amber-500"
                                                        : "bg-gray-400"
                                            }`}
                                        />
                                        <h3 className="font-semibold text-gray-900 text-sm">{city}</h3>
                                        <span className="text-xs text-gray-400">{stationId}</span>
                                    </div>
                                    <Link
                                        href={`/stations/${station?.id || 0}`}
                                        className="p-1.5 text-gray-400 hover:text-brand-600
                                                   hover:bg-brand-50 rounded-lg transition"
                                    >
                                        <Eye className="w-4 h-4"/>
                                    </Link>
                                </div>

                                {/* Métriques */}
                                <div className="grid grid-cols-5 gap-2">
                                    <CompactMetric
                                        icon={Thermometer}
                                        value={isOperational ? `${d.temperature_c?.toFixed(1)}°` : "--"}
                                        color="text-orange-500"
                                        bg="bg-orange-50"
                                        disabled={!isOperational}
                                    />
                                    <CompactMetric
                                        icon={Droplets}
                                        value={isOperational ? `${d.humidity_pct?.toFixed(0)}%` : "--"}
                                        color="text-sky-500"
                                        bg="bg-sky-50"
                                        disabled={!isOperational}
                                    />
                                    <CompactMetric
                                        icon={Gauge}
                                        value={isOperational ? `${d.pressure_hpa?.toFixed(0)}` : "--"}
                                        unit={isOperational ? "hPa" : undefined}
                                        color="text-violet-500"
                                        bg="bg-violet-50"
                                        disabled={!isOperational}
                                    />
                                    <CompactMetric
                                        icon={Wind}
                                        value={isOperational ? `${d.wind_speed_kmh?.toFixed(1)}` : "--"}
                                        unit={isOperational ? "km/h" : undefined}
                                        color="text-teal-500"
                                        bg="bg-teal-50"
                                        disabled={!isOperational}
                                    />
                                    <CompactMetric
                                        icon={Sun}
                                        value={isOperational ? `${Math.round((d.luminosity_lux || 0) / 1000)}k` : "--"}
                                        unit={isOperational ? "lux" : undefined}
                                        color="text-amber-500"
                                        bg="bg-amber-50"
                                        disabled={!isOperational}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Placeholder ML */}
            <div className="mt-8 bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
                <p className="text-gray-400 text-sm font-medium">
                    Section prédictions Machine Learning — à intégrer prochainement
                </p>
            </div>
        </div>
    );
}

function CompactMetric({
                           icon: Icon,
                           value,
                           unit,
                           color,
                           bg,
                           disabled = false,
                       }: {
    icon: any;
    value: string;
    unit?: string;
    color: string;
    bg: string;
    disabled?: boolean;
}) {
    return (
        <div className={`rounded-lg p-3 flex flex-col items-center gap-1.5 ${
            disabled ? "bg-gray-50" : bg
        }`}>
            <Icon className={`w-4 h-4 ${disabled ? "text-gray-300" : color}`}/>
            <p className={`text-sm font-semibold leading-none ${
                disabled ? "text-gray-300" : "text-gray-900"
            }`}>{value}</p>
            {unit && <p className="text-[10px] text-gray-400 leading-none">{unit}</p>}
        </div>
    );
}