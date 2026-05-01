"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
    CloudSun,
    LayoutDashboard,
    Radio,
    Users,
    LogOut,
} from "lucide-react";

const NAV_ITEMS = [
    { href: "/", label: "Tableau de bord", icon: LayoutDashboard, roles: ["USER", "ADMIN"] },
    { href: "/stations", label: "Stations", icon: Radio, roles: ["USER", "ADMIN"] },
    { href: "/users", label: "Utilisateurs", icon: Users, roles: ["ADMIN"] },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    return (
        <aside className="w-64 bg-brand-950 text-white flex flex-col min-h-screen fixed left-0 top-0">
            {/* Logo */}
            <div className="px-6 py-6 border-b border-white/10">
                <Link href="/" className="flex items-center gap-2.5">
                    <CloudSun className="w-7 h-7 text-brand-400" />
                    <span className="text-lg font-semibold tracking-tight uppercase">Mesos</span>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1">
                {NAV_ITEMS.filter((item) => user && item.roles.includes(user.role)).map((item) => {
                    // Actif si c'est exactement "/" ou si le pathname commence par le href
                    const isActive =
                        item.href === "/"
                            ? pathname === "/"
                            : pathname.startsWith(item.href);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition
                ${
                                isActive
                                    ? "bg-brand-600 text-white"
                                    : "text-gray-300 hover:bg-white/5 hover:text-white"
                            }`}
                        >
                            <item.icon className="w-5 h-5" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* Pied — rôle + déconnexion */}
            <div className="px-4 py-4 border-t border-white/10 space-y-3">
                <p className="text-xs text-gray-400 px-2">
                    Connecté en tant que{" "}
                    <span className="font-semibold text-gray-200">{user?.role}</span>
                </p>
                <button
                    onClick={logout}
                    className="flex items-center gap-2 w-full px-4 py-2 rounded-lg text-sm
                     text-gray-400 hover:bg-white/5 hover:text-white transition cursor-pointer"
                >
                    <LogOut className="w-4 h-4" />
                    Déconnexion
                </button>
            </div>
        </aside>
    );
}