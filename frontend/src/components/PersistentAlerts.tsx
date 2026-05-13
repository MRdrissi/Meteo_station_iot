"use client";

import { AlertTriangle, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface PersistentAlertsProps {
    alerts: any[];
}

export default function PersistentAlerts({ alerts }: PersistentAlertsProps) {
    const [dismissed, setDismissed] = useState<string[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem("dismissed-weather-alerts");
        if (saved) {
            setDismissed(JSON.parse(saved));
        }
    }, []);

    const normalizedAlerts = useMemo(() => {
        return alerts.map((a) => {
            const stationId = a.station_id || a.stationId || a.station || "UNKNOWN";
            const type = a.type || a.niveau || a.severity || "ALERTE";
            const message = a.message || a.description || "Alerte météo détectée";
            const timestamp = a.timestamp || a.time || "";

            return {
                ...a,
                id: `${stationId}-${type}-${message}-${timestamp}`,
                stationId,
                type,
                message,
                timestamp,
            };
        });
    }, [alerts]);

    const visibleAlerts = normalizedAlerts.filter((a) => !dismissed.includes(a.id));

    const dismiss = (id: string) => {
        const next = [...dismissed, id];
        setDismissed(next);
        localStorage.setItem("dismissed-weather-alerts", JSON.stringify(next));
    };

    if (!visibleAlerts.length) return null;

    return (
        <div className="fixed top-20 right-6 z-[9999] flex flex-col gap-3 w-[360px] pointer-events-none">
            {visibleAlerts.map((alert) => (
                <div
                    key={alert.id}
                    className="pointer-events-auto bg-red-50 border border-red-200 text-red-900
                               rounded-xl shadow-lg p-4 animate-[slideIn_0.3s_ease-out]"
                >
                    <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold">
                                    {alert.type}
                                </p>
                                <button
                                    onClick={() => dismiss(alert.id)}
                                    className="text-red-400 hover:text-red-700 transition cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <p className="text-sm mt-1">
                                {alert.message}
                            </p>

                            <div className="flex items-center justify-between mt-2 text-xs text-red-500">
                                <span>{alert.stationId}</span>
                                {alert.timestamp && (
                                    <span>{new Date(alert.timestamp).toLocaleString("fr-FR")}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}