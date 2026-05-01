"use client";

import { useAuth } from "@/lib/auth";
import { UserCircle } from "lucide-react";

export default function Topbar() {
    const { user } = useAuth();

    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-end px-8">
            <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">{user?.username}</span>
                <div className="w-9 h-9 bg-brand-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {user?.username?.charAt(0).toUpperCase()}
                </div>
            </div>
        </header>
    );
}