"use client";

import { useAuth } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            </div>
        );
    }

    if (!user) return null; // Redirigé par AuthProvider

    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 ml-64 flex flex-col">
                <Topbar />
                <main className="flex-1 p-8">{children}</main>
            </div>
        </div>
    );
}